#!/usr/bin/env node
/**
 * Live UI vote checks with Playwright.
 *
 * Requires Playwright Node package:
 *   npm install -D playwright
 *   npx playwright install chromium
 */

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const out = {
    baseUrl: "https://budget-citoyen.fr",
    respondentPrefix: "",
    output: "",
    artifactDir: "",
    timeoutMs: 45000,
    headless: true,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--base-url") out.baseUrl = String(argv[++i] || out.baseUrl);
    else if (arg === "--respondent-prefix") out.respondentPrefix = String(argv[++i] || "");
    else if (arg === "--output") out.output = String(argv[++i] || "");
    else if (arg === "--artifact-dir") out.artifactDir = String(argv[++i] || "");
    else if (arg === "--timeout-ms") out.timeoutMs = Number(argv[++i] || out.timeoutMs);
    else if (arg === "--headed") out.headless = false;
    else if (arg === "--headless") out.headless = true;
  }
  if (!out.respondentPrefix) {
    throw new Error("Missing --respondent-prefix");
  }
  if (!out.output) {
    throw new Error("Missing --output");
  }
  return out;
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

async function gotoWithRetries(page, url, timeoutMs, attempts = 4) {
  let lastErr = null;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
      return;
    } catch (err) {
      lastErr = err;
      if (i < attempts) {
        await page.waitForTimeout(1000 * i);
      }
    }
  }
  throw lastErr || new Error(`Failed to navigate to ${url}`);
}

function submitVoteDetector(timeoutMs) {
  return async (response) => {
    try {
      if (!response.url().includes("/api/graphql")) return false;
      if (response.request().method() !== "POST") return false;
      const postData = response.request().postData() || "";
      if (!postData.toLowerCase().includes("submitvote")) return false;
      return true;
    } catch {
      return false;
    }
  };
}

async function tryClick(locator) {
  try {
    await locator.click({ timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function directFlow(page, opts) {
  const gqlEvents = [];
  const onRequest = (request) => {
    if (!request.url().includes("/api/graphql")) return;
    const body = request.postData() || "";
    const lower = body.toLowerCase();
    let op = "other";
    if (lower.includes("submitvote")) op = "submitVote";
    else if (lower.includes("runscenario")) op = "runScenario";
    gqlEvents.push({ type: "request", op, url: request.url(), at: Date.now() });
  };
  const onResponse = (response) => {
    if (!response.url().includes("/api/graphql")) return;
    const body = response.request().postData() || "";
    const lower = body.toLowerCase();
    let op = "other";
    if (lower.includes("submitvote")) op = "submitVote";
    else if (lower.includes("runscenario")) op = "runScenario";
    gqlEvents.push({
      type: "response",
      op,
      url: response.url(),
      status: response.status(),
      at: Date.now(),
    });
  };
  page.on("request", onRequest);
  page.on("response", onResponse);

  const respondentId = `${opts.respondentPrefix}UI_DIRECT_001`;
  const url = `${opts.baseUrl.replace(/\/$/, "")}/build?source=live_ui&ID=${encodeURIComponent(respondentId)}`;
  try {
    await gotoWithRetries(page, url, opts.timeoutMs, 4);
  } catch (err) {
    page.off("request", onRequest);
    page.off("response", onResponse);
    return {
      flow: "direct",
      ok: false,
      error: `navigation failed: ${String(err)}`,
      debug: { pageUrl: page.url(), gqlEvents: gqlEvents.slice(-40) },
    };
  }
  await page.waitForTimeout(7000);
  try {
    await page.waitForURL(/scenarioId=/, { timeout: opts.timeoutMs });
  } catch (err) {
    page.off("request", onRequest);
    page.off("response", onResponse);
    return {
      flow: "direct",
      ok: false,
      error: "scenarioId was not observed in URL before vote",
      debug: { pageUrl: page.url(), gqlEvents: gqlEvents.slice(-40), detail: String(err) },
    };
  }

  await tryClick(page.getByRole("button", { name: /Passer/i }));
  await page.waitForTimeout(1000);

  await page.setViewportSize({ width: 1440, height: 1200 });
  const voteButton = page.locator("#scoreboard-vote-btn:visible, #scoreboard-vote-btn-mobile:visible").first();
  await voteButton.click({ timeout: opts.timeoutMs, force: true });
  await page.waitForTimeout(800);
  await page.getByRole("heading", { name: /Voter ce Budget/i }).first().waitFor({ timeout: 12000 });

  const submitBtn = page.getByRole("button", { name: /Déposer mon vote/i }).last();
  const started = Date.now();
  let response = null;
  while (!response && Date.now() - started < opts.timeoutMs) {
    const responsePromise = page.waitForResponse(submitVoteDetector(opts.timeoutMs), {
      timeout: 8000,
    }).catch(() => null);
    await submitBtn.click({ timeout: 5000, force: true }).catch(async () => {
      await page.keyboard.press("Enter").catch(() => {});
    });
    if (!response) {
      await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll("button"));
        const matches = nodes.filter((node) => {
          const text = (node.textContent || "").toLowerCase();
          return text.includes("déposer mon vote") && node.offsetParent !== null;
        });
        const target = matches.length ? matches[matches.length - 1] : null;
        if (target) target.click();
      }).catch(() => {});
    }
    response = await responsePromise;
    if (!response) {
      await page.waitForTimeout(600);
    }
  }
  if (!response) {
    page.off("request", onRequest);
    page.off("response", onResponse);
    return {
      flow: "direct",
      ok: false,
      error: "submitVote network response not observed in direct flow",
      debug: { pageUrl: page.url(), gqlEvents: gqlEvents.slice(-60) },
    };
  }

  const requestPayload = JSON.parse(response.request().postData() || "{}");
  const responsePayload = await response.json().catch(() => ({}));

  if (opts.artifactDir) {
    fs.mkdirSync(opts.artifactDir, { recursive: true });
    await page.screenshot({ path: path.join(opts.artifactDir, "ui-direct.png"), fullPage: true });
  }
  page.off("request", onRequest);
  page.off("response", onResponse);

  return {
    flow: "direct",
    ok: Boolean(response.status() === 200 && responsePayload?.data?.submitVote === true),
    status: response.status(),
    requestVariables: requestPayload?.variables || {},
    responsePayload,
    pageUrl: page.url(),
  };
}

async function waitForFrame(page, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const frame = page
      .frames()
      .find((f) => f.url().includes("/build?source=qualtrics") || f.url().includes("/build?source=live_ui"));
    if (frame) return frame;
    await page.waitForTimeout(250);
  }
  throw new Error("Timed out waiting for Qualtrics iframe frame");
}

async function qualtricsIframeFlow(page, opts) {
  const gqlEvents = [];
  const onRequest = (request) => {
    if (!request.url().includes("/api/graphql")) return;
    const body = request.postData() || "";
    const lower = body.toLowerCase();
    let op = "other";
    if (lower.includes("submitvote")) op = "submitVote";
    else if (lower.includes("runscenario")) op = "runScenario";
    gqlEvents.push({ type: "request", op, url: request.url(), at: Date.now() });
  };
  const onResponse = (response) => {
    if (!response.url().includes("/api/graphql")) return;
    const body = response.request().postData() || "";
    const lower = body.toLowerCase();
    let op = "other";
    if (lower.includes("submitvote")) op = "submitVote";
    else if (lower.includes("runscenario")) op = "runScenario";
    gqlEvents.push({
      type: "response",
      op,
      url: response.url(),
      status: response.status(),
      at: Date.now(),
    });
  };
  page.on("request", onRequest);
  page.on("response", onResponse);

  const respondentId = `${opts.respondentPrefix}UI_QUAL_001`;
  const iframeSrc = `${opts.baseUrl.replace(/\/$/, "")}/build?source=qualtrics&ID=${encodeURIComponent(respondentId)}`;
  await page.goto("about:blank", { waitUntil: "domcontentloaded" });
  await page.setContent(
    `<!doctype html>
<html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0">
<script>
window.__cblMessages = [];
window.addEventListener("message", (event) => {
  window.__cblMessages.push(event.data);
});
</script>
<iframe id="cbl" src="${iframeSrc}" style="width:100vw;height:100vh;border:0"></iframe>
</body></html>`,
    { waitUntil: "domcontentloaded" }
  );
  let frame;
  try {
    frame = await waitForFrame(page, opts.timeoutMs);
  } catch (err) {
    page.off("request", onRequest);
    page.off("response", onResponse);
    return {
      flow: "qualtrics_iframe",
      ok: false,
      error: "qualtrics iframe not found",
      debug: { pageUrl: page.url(), gqlEvents: gqlEvents.slice(-40), detail: String(err) },
    };
  }
  await page.waitForTimeout(7000);
  try {
    await frame.waitForURL(/scenarioId=/, { timeout: opts.timeoutMs });
  } catch (err) {
    page.off("request", onRequest);
    page.off("response", onResponse);
    return {
      flow: "qualtrics_iframe",
      ok: false,
      error: "scenarioId was not observed in iframe URL before vote",
      debug: { frameUrl: frame.url(), gqlEvents: gqlEvents.slice(-40), detail: String(err) },
    };
  }

  await tryClick(frame.getByRole("button", { name: /Passer/i }));
  await frame.locator("#scoreboard-vote-btn:visible, #scoreboard-vote-btn-mobile:visible").first().click({ timeout: opts.timeoutMs, force: true });
  await page.waitForTimeout(800);
  await frame.getByRole("heading", { name: /Voter ce Budget/i }).first().waitFor({ timeout: 12000 });

  const submitBtn = frame.getByRole("button", { name: /Déposer mon vote/i }).last();
  const started = Date.now();
  let response = null;
  while (!response && Date.now() - started < opts.timeoutMs) {
    const responsePromise = page.waitForResponse(submitVoteDetector(opts.timeoutMs), {
      timeout: 8000,
    }).catch(() => null);
    await submitBtn.click({ timeout: 5000, force: true }).catch(async () => {
      await frame.press("body", "Enter").catch(() => {});
    });
    if (!response) {
      await frame.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll("button"));
        const matches = nodes.filter((node) => {
          const text = (node.textContent || "").toLowerCase();
          return text.includes("déposer mon vote") && node.offsetParent !== null;
        });
        const target = matches.length ? matches[matches.length - 1] : null;
        if (target) target.click();
      }).catch(() => {});
    }
    response = await responsePromise;
    if (!response) {
      await page.waitForTimeout(600);
    }
  }
  if (!response) {
    page.off("request", onRequest);
    page.off("response", onResponse);
    return {
      flow: "qualtrics_iframe",
      ok: false,
      error: "submitVote network response not observed in qualtrics iframe flow",
      debug: { frameUrl: frame.url(), gqlEvents: gqlEvents.slice(-60) },
    };
  }

  const requestPayload = JSON.parse(response.request().postData() || "{}");
  const responsePayload = await response.json().catch(() => ({}));
  await page.waitForTimeout(1500);

  const messages = await page.evaluate(() => window.__cblMessages || []);
  const qualtricsMessages = Array.isArray(messages)
    ? messages.filter((m) => m && m.type === "CBL_VOTE_SUBMITTED_V1")
    : [];

  if (opts.artifactDir) {
    fs.mkdirSync(opts.artifactDir, { recursive: true });
    await page.screenshot({ path: path.join(opts.artifactDir, "ui-qualtrics-iframe.png"), fullPage: true });
  }
  page.off("request", onRequest);
  page.off("response", onResponse);

  return {
    flow: "qualtrics_iframe",
    ok: Boolean(
      response.status() === 200 &&
      responsePayload?.data?.submitVote === true &&
      qualtricsMessages.length > 0
    ),
    status: response.status(),
    requestVariables: requestPayload?.variables || {},
    responsePayload,
    messageCount: qualtricsMessages.length,
    sampleMessage: qualtricsMessages[0] || null,
  };
}

async function main() {
  const opts = parseArgs(process.argv);
  ensureDir(opts.output);
  if (opts.artifactDir) fs.mkdirSync(opts.artifactDir, { recursive: true });

  let playwrightPkg;
  try {
    playwrightPkg = await import("playwright");
  } catch (err) {
    const result = {
      ok: false,
      error: "Playwright package is not installed. Run `npm install -D playwright && npx playwright install chromium`.",
      detail: String(err),
    };
    fs.writeFileSync(opts.output, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    process.exit(2);
  }

  const { chromium } = playwrightPkg;
  const browser = await chromium.launch({ headless: opts.headless });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
  });
  // In Playwright Chromium, CompressionStream can stall in this flow.
  // Force the frontend fallback path (no gzip) for deterministic automation.
  await context.addInitScript(() => {
    try {
      Object.defineProperty(window, "CompressionStream", {
        value: undefined,
        configurable: true,
      });
    } catch {
      // no-op
    }
  });
  const page = await context.newPage();

  const startedAt = new Date().toISOString();
  const result = {
    ok: false,
    startedAt,
    baseUrl: opts.baseUrl,
    respondentPrefix: opts.respondentPrefix,
    flows: [],
  };

  try {
    try {
      const direct = await directFlow(page, opts);
      result.flows.push(direct);
    } catch (err) {
      result.flows.push({ flow: "direct", ok: false, error: String(err) });
    }
    try {
      const qual = await qualtricsIframeFlow(page, opts);
      result.flows.push(qual);
    } catch (err) {
      result.flows.push({ flow: "qualtrics_iframe", ok: false, error: String(err) });
    }
    result.ok = result.flows.length >= 2 && result.flows.every((f) => Boolean(f.ok));
    if (!result.ok && !result.error) {
      result.error = "one or more UI flows failed";
    }
  } finally {
    await context.close();
    await browser.close();
  }

  result.finishedAt = new Date().toISOString();
  fs.writeFileSync(opts.output, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 2);
}

main().catch((err) => {
  console.error(String(err));
  process.exit(2);
});
