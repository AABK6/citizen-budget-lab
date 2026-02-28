#!/usr/bin/env node
/**
 * Human-like live UI vote checks with Playwright.
 *
 * Runs multiple visible journeys, performs many interactions,
 * then submits a vote and captures network payloads + artifacts.
 */

import fs from "node:fs";
import path from "node:path";

const VOTE_SUMMARY_QUERY = `
query VoteSummary($limit: Int!) {
  voteSummary(limit: $limit) {
    scenarioId
    votes
    lastVoteTs
  }
}
`;

function parseArgs(argv) {
  const out = {
    baseUrl: "https://budget-citoyen.fr",
    runId: "",
    respondentPrefix: "",
    journeyCount: 5,
    output: "",
    artifactDir: "",
    videoDir: "",
    timeoutMs: 90000,
    headless: true,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--base-url") out.baseUrl = String(argv[++i] || out.baseUrl);
    else if (arg === "--run-id") out.runId = String(argv[++i] || out.runId);
    else if (arg === "--respondent-prefix") out.respondentPrefix = String(argv[++i] || "");
    else if (arg === "--journey-count") out.journeyCount = Number(argv[++i] || out.journeyCount);
    else if (arg === "--output") out.output = String(argv[++i] || "");
    else if (arg === "--artifact-dir") out.artifactDir = String(argv[++i] || "");
    else if (arg === "--video-dir") out.videoDir = String(argv[++i] || "");
    else if (arg === "--timeout-ms") out.timeoutMs = Number(argv[++i] || out.timeoutMs);
    else if (arg === "--headed") out.headless = false;
    else if (arg === "--headless") out.headless = true;
  }
  if (!out.respondentPrefix) throw new Error("Missing --respondent-prefix");
  if (!out.output) throw new Error("Missing --output");
  if (!Number.isFinite(out.journeyCount) || out.journeyCount < 1) {
    throw new Error("Invalid --journey-count");
  }
  return out;
}

function ensureDirForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function ensureDir(dirPath) {
  if (!dirPath) return;
  fs.mkdirSync(dirPath, { recursive: true });
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function safeJsonParse(text, fallback = {}) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function extractScenarioIdFromUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("scenarioId");
  } catch {
    return null;
  }
}

async function gqlVoteSummary(baseUrl, limit = 10000) {
  const url = `${baseUrl.replace(/\/$/, "")}/api/graphql`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: VOTE_SUMMARY_QUERY,
      variables: { limit },
    }),
  });
  const status = response.status;
  const raw = await response.text();
  const payload = safeJsonParse(raw, { _invalid_json: raw });
  const rows = Array.isArray(payload?.data?.voteSummary) ? payload.data.voteSummary : [];
  const map = new Map();
  for (const row of rows) {
    if (!row || !row.scenarioId) continue;
    map.set(String(row.scenarioId), Number(row.votes || 0));
  }
  return { status, payload, rows, map };
}

async function waitForVoteIncrement(baseUrl, scenarioId, beforeVotes, timeoutMs, pollMs = 1200) {
  const started = Date.now();
  const polls = [];
  let lastVotes = beforeVotes;
  while (Date.now() - started < timeoutMs) {
    try {
      const summary = await gqlVoteSummary(baseUrl);
      const current = Number(summary.map.get(scenarioId) || 0);
      lastVotes = Math.max(lastVotes, current);
      const ok = current >= beforeVotes + 1;
      polls.push({ ts: Date.now(), currentVotes: current, ok });
      if (ok) {
        return {
          ok: true,
          beforeVotes,
          afterVotes: current,
          targetVotes: beforeVotes + 1,
          polls,
        };
      }
    } catch (err) {
      polls.push({ ts: Date.now(), error: String(err), ok: false });
    }
    await sleep(pollMs);
  }
  return {
    ok: false,
    beforeVotes,
    afterVotes: lastVotes,
    targetVotes: beforeVotes + 1,
    polls,
  };
}

async function gotoWithRetries(page, url, timeoutMs, attempts = 4) {
  let lastErr = null;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
      return;
    } catch (err) {
      lastErr = err;
      if (i < attempts) await sleep(1000 * i);
    }
  }
  throw lastErr || new Error(`Failed to navigate: ${url}`);
}

function submitVoteResponseDetector(response) {
  try {
    if (!response.url().includes("/api/graphql")) return false;
    if (response.request().method() !== "POST") return false;
    const postData = (response.request().postData() || "").toLowerCase();
    return postData.includes("submitvote");
  } catch {
    return false;
  }
}

async function waitForScenarioId(surface, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const sid = extractScenarioIdFromUrl(surface.url());
    if (sid) return sid;
    await sleep(250);
  }
  return null;
}

async function maybeClick(locator, timeoutMs = 1200) {
  try {
    const count = await locator.count();
    if (!count) return false;
    await locator.first().click({ timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

async function setFirstVisibleRange(surface, value) {
  const slider = surface.locator('input[type="range"]:visible').first();
  await slider.waitFor({ timeout: 5000 });
  await slider.evaluate((el, val) => {
    const input = el;
    input.value = String(val);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function clickBackArrow(surface) {
  const ok = await surface.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    for (const btn of buttons) {
      const icon = btn.querySelector(".material-icons");
      const visible = btn instanceof HTMLElement && btn.offsetParent !== null;
      if (!visible || !icon) continue;
      if ((icon.textContent || "").trim() === "arrow_back") {
        btn.click();
        return true;
      }
    }
    return false;
  });
  if (!ok) throw new Error("Back arrow not found");
}

async function clickNthMassCard(surface, index) {
  const card = surface.locator("#left-panel-list .space-y-3.p-1 > div.group.relative").nth(index);
  await card.waitFor({ timeout: 8000 });
  await card.click({ timeout: 5000 });
}

async function clickFirstRevenueFamilyCard(surface) {
  const ok = await surface.evaluate(() => {
    const roots = Array.from(document.querySelectorAll("div.space-y-3.p-1"));
    for (const root of roots) {
      const title = root.querySelector("div.text-xs.font-bold.uppercase");
      if (!title) continue;
      if (!(title.textContent || "").toLowerCase().includes("familles de recettes")) continue;
      const cards = Array.from(root.querySelectorAll("div.group.relative.cursor-pointer"));
      const firstVisible = cards.find((el) => el instanceof HTMLElement && el.offsetParent !== null);
      if (firstVisible) {
        firstVisible.click();
        return true;
      }
    }
    return false;
  });
  if (!ok) throw new Error("Revenue family card not found");
}

async function clickFirstReformCard(surface, panelSelector) {
  const ok = await surface.evaluate((selector) => {
    const root = selector ? document.querySelector(selector) : document;
    if (!root) return false;
    const cards = Array.from(root.querySelectorAll("div.group.relative.p-2.px-3.rounded-lg.border.cursor-pointer"));
    const firstVisible = cards.find((el) => el instanceof HTMLElement && el.offsetParent !== null);
    if (firstVisible) {
      firstVisible.click();
      return true;
    }
    return false;
  }, panelSelector || "");
  if (!ok) throw new Error("No reform card found");
}

async function toggleReformFromDrawer(surface) {
  const addBtn = surface.getByRole("button", { name: /Ajouter au scénario/i }).first();
  if (await maybeClick(addBtn, 4000)) return { action: "added" };

  const removeBtn = surface.getByRole("button", { name: /Retirer du scénario/i }).first();
  if (await maybeClick(removeBtn, 4000)) return { action: "removed" };

  throw new Error("Reform drawer action button not found");
}

async function runStep(trace, name, fn) {
  const startedAt = Date.now();
  try {
    await fn();
    trace.push({ name, ok: true, startedAt, finishedAt: Date.now() });
    return true;
  } catch (err) {
    trace.push({
      name,
      ok: false,
      startedAt,
      finishedAt: Date.now(),
      error: String(err),
    });
    return false;
  }
}

async function performHumanManipulations(surface, trace) {
  await runStep(trace, "dismiss_tutorial", async () => {
    await maybeClick(surface.getByRole("button", { name: /Passer/i }).first(), 2000);
  });

  await runStep(trace, "spending_open_card_1", async () => {
    await maybeClick(surface.getByRole("button", { name: /Vos Orientations/i }).first(), 2000);
    await clickNthMassCard(surface, 0);
  });

  await runStep(trace, "spending_set_plus_8_apply", async () => {
    await maybeClick(surface.getByRole("button", { name: /±25%/i }).first(), 2000);
    await setFirstVisibleRange(surface, 8);
    await surface.locator('button:visible:has-text("Appliquer")').first().click({ timeout: 5000 });
  });

  await runStep(trace, "spending_back_to_list", async () => {
    await clickBackArrow(surface);
  });

  await runStep(trace, "spending_open_card_2", async () => {
    await clickNthMassCard(surface, 1);
  });

  await runStep(trace, "spending_set_minus_6_apply", async () => {
    await maybeClick(surface.getByRole("button", { name: /±25%/i }).first(), 2000);
    await setFirstVisibleRange(surface, -6);
    await surface.locator('button:visible:has-text("Appliquer")').first().click({ timeout: 5000 });
  });

  await runStep(trace, "spending_back_again", async () => {
    await clickBackArrow(surface);
  });

  await runStep(trace, "left_tab_reforms", async () => {
    await surface.getByRole("button", { name: /Mesures Concrètes/i }).first().click({ timeout: 5000 });
  });

  await runStep(trace, "left_add_reform", async () => {
    await clickFirstReformCard(surface, "#left-panel-list");
    await toggleReformFromDrawer(surface);
  });

  await runStep(trace, "right_tab_revenues", async () => {
    await surface.getByRole("button", { name: /^Recettes$/i }).last().click({ timeout: 5000 });
  });

  await runStep(trace, "revenue_open_family", async () => {
    await clickFirstRevenueFamilyCard(surface);
  });

  await runStep(trace, "revenue_set_plus_7_apply", async () => {
    await maybeClick(surface.getByRole("button", { name: /±25%/i }).first(), 2000);
    await setFirstVisibleRange(surface, 7);
    await surface.locator('button:visible:has-text("Appliquer")').first().click({ timeout: 5000 });
  });

  await runStep(trace, "revenue_set_minus_4_apply", async () => {
    await setFirstVisibleRange(surface, -4);
    await surface.locator('button:visible:has-text("Appliquer")').first().click({ timeout: 5000 });
  });

  await runStep(trace, "revenue_back", async () => {
    await clickBackArrow(surface);
  });

  await runStep(trace, "right_tab_reforms", async () => {
    const tabs = surface.getByRole("button", { name: /Mesures Concrètes/i });
    const count = await tabs.count();
    const target = count > 1 ? tabs.nth(1) : tabs.first();
    await target.click({ timeout: 5000 });
  });

  await runStep(trace, "right_add_reform", async () => {
    await clickFirstReformCard(surface, "body");
    await toggleReformFromDrawer(surface);
  });

  await runStep(trace, "scoreboard_toggle_unit", async () => {
    await maybeClick(surface.getByRole("button", { name: /^%$/i }).first(), 2000);
  });
}

async function submitVote(surface, networkPage, timeoutMs) {
  await surface.evaluate(() => {
    const desktop = document.getElementById("scoreboard-vote-btn");
    const mobile = document.getElementById("scoreboard-vote-btn-mobile");
    const target = desktop || mobile;
    if (target) target.click();
  });
  await maybeClick(surface.locator("#scoreboard-vote-btn:visible, #scoreboard-vote-btn-mobile:visible").first(), 4000);

  const modalReady = await Promise.race([
    surface
      .getByRole("heading", { name: /Voter ce Budget/i })
      .first()
      .waitFor({ timeout: 12000 })
      .then(() => true)
      .catch(() => false),
    surface
      .getByRole("button", { name: /Déposer mon vote/i })
      .first()
      .waitFor({ timeout: 12000 })
      .then(() => true)
      .catch(() => false),
  ]);
  if (!modalReady) {
    throw new Error("vote modal did not open");
  }

  const submitBtn = surface.getByRole("button", { name: /Déposer mon vote/i }).last();
  const started = Date.now();
  let response = null;

  while (!response && Date.now() - started < timeoutMs) {
    const responsePromise = networkPage
      .waitForResponse((r) => submitVoteResponseDetector(r), { timeout: 9000 })
      .catch(() => null);

    await submitBtn.click({ timeout: 4000, force: true }).catch(async () => {
      await surface.press("body", "Enter").catch(() => {});
    });

    response = await responsePromise;
    if (!response) await sleep(500);
  }

  if (!response) {
    throw new Error("submitVote response not observed");
  }

  const requestPayload = safeJsonParse(response.request().postData() || "{}", {});
  const responsePayload = await response.json().catch(() => ({}));

  return {
    status: response.status(),
    requestPayload,
    responsePayload,
    ok: Boolean(response.status() === 200 && responsePayload?.data?.submitVote === true),
  };
}

async function confirmScenarioHasVote(baseUrl, scenarioId, timeoutMs) {
  if (!scenarioId) {
    return {
      ok: true,
      skipped: true,
      reason: "missing_scenario_id",
      polls: [],
    };
  }
  const started = Date.now();
  const polls = [];
  while (Date.now() - started < timeoutMs) {
    try {
      const summary = await gqlVoteSummary(baseUrl);
      const current = Number(summary.map.get(scenarioId) || 0);
      polls.push({ ts: Date.now(), currentVotes: current, ok: current >= 1 });
      if (current >= 1) {
        return {
          ok: true,
          skipped: false,
          scenarioId,
          currentVotes: current,
          polls,
        };
      }
    } catch (err) {
      polls.push({ ts: Date.now(), error: String(err), ok: false });
    }
    await sleep(1500);
  }
  return {
    ok: false,
    skipped: false,
    scenarioId,
    polls,
  };
}

async function directFlow(page, cfg, journey) {
  const respondentId = `${cfg.respondentPrefix}J${String(journey.index).padStart(2, "0")}`;
  const base = cfg.baseUrl.replace(/\/$/, "");
  const url = `${base}/build?source=live_human&journey=${encodeURIComponent(journey.journeyId)}&ID=${encodeURIComponent(respondentId)}`;

  await gotoWithRetries(page, url, cfg.timeoutMs, 4);
  await sleep(7000);
  const scenarioIdFromUrl = await waitForScenarioId(page, 15000);
  const beforeVotesFromUrlScenario =
    scenarioIdFromUrl
      ? Number((await gqlVoteSummary(cfg.baseUrl)).map.get(scenarioIdFromUrl) || 0)
      : null;

  const manipTrace = [];
  await performHumanManipulations(page, manipTrace);
  await page.keyboard.press("Escape").catch(() => {});
  await page.keyboard.press("Escape").catch(() => {});

  const screenshots = [];
  if (cfg.artifactDir) {
    const beforePath = path.join(cfg.artifactDir, `${journey.journeyId}-before-vote.png`);
    await page.screenshot({ path: beforePath, fullPage: true });
    screenshots.push(beforePath);
  }

  const submit = await submitVote(page, page, cfg.timeoutMs);
  const scenarioIdFromSubmit = String(submit?.requestPayload?.variables?.scenarioId || "");
  const scenarioId = scenarioIdFromSubmit || scenarioIdFromUrl || null;

  if (cfg.artifactDir) {
    const afterPath = path.join(cfg.artifactDir, `${journey.journeyId}-after-vote.png`);
    await page.screenshot({ path: afterPath, fullPage: true });
    screenshots.push(afterPath);
  }

  const increment = await confirmScenarioHasVote(cfg.baseUrl, scenarioId, 45000);
  const beforeVotes = scenarioId && scenarioIdFromUrl && scenarioId === scenarioIdFromUrl
    ? beforeVotesFromUrlScenario
    : null;

  return {
    journeyId: journey.journeyId,
    flow: journey.flow,
    respondentId,
    scenarioId,
    beforeVotes,
    beforeScenarioId: scenarioIdFromUrl || null,
    manipulationsPerformed: manipTrace,
    interactionCount: manipTrace.filter((x) => x.ok).length,
    submitVoteStatus: submit.status,
    submitVoteRequestVariables: submit.requestPayload?.variables || {},
    submitVoteResponsePayload: submit.responsePayload,
    submitVoteRequestCount: 1,
    voteIncrement: increment,
    screenshots,
    pageUrl: page.url(),
    ok: Boolean(submit.ok && increment.ok),
  };
}

async function waitForQualtricsFrame(page, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const frame = page
      .frames()
      .find((f) => f.url().includes("/build?source=qualtrics") || f.url().includes("/build?source=live_human"));
    if (frame) return frame;
    await sleep(300);
  }
  return null;
}

async function qualtricsIframeFlow(page, cfg, journey) {
  const respondentId = `${cfg.respondentPrefix}J${String(journey.index).padStart(2, "0")}`;
  const base = cfg.baseUrl.replace(/\/$/, "");
  const iframeSrc = `${base}/build?source=qualtrics&journey=${encodeURIComponent(journey.journeyId)}&ID=${encodeURIComponent(respondentId)}`;

  await page.goto("about:blank", { waitUntil: "domcontentloaded" });
  await page.setContent(
    `<!doctype html>
<html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0">
<script>
window.__cblMessages = [];
window.addEventListener("message", (event) => { window.__cblMessages.push(event.data); });
</script>
<iframe id="cbl" src="${iframeSrc}" style="width:100vw;height:100vh;border:0"></iframe>
</body></html>`,
    { waitUntil: "domcontentloaded" }
  );

  const frame = await waitForQualtricsFrame(page, cfg.timeoutMs);
  if (!frame) throw new Error("Qualtrics iframe not found");

  await sleep(7000);
  const scenarioIdFromUrl = await waitForScenarioId(frame, 20000);
  const beforeVotesFromUrlScenario =
    scenarioIdFromUrl
      ? Number((await gqlVoteSummary(cfg.baseUrl)).map.get(scenarioIdFromUrl) || 0)
      : null;

  const manipTrace = [];
  await performHumanManipulations(frame, manipTrace);
  await frame.press("body", "Escape").catch(() => {});
  await frame.press("body", "Escape").catch(() => {});

  const screenshots = [];
  if (cfg.artifactDir) {
    const beforePath = path.join(cfg.artifactDir, `${journey.journeyId}-before-vote.png`);
    await page.screenshot({ path: beforePath, fullPage: true });
    screenshots.push(beforePath);
  }

  const submit = await submitVote(frame, page, cfg.timeoutMs);
  const scenarioIdFromSubmit = String(submit?.requestPayload?.variables?.scenarioId || "");
  const scenarioId = scenarioIdFromSubmit || scenarioIdFromUrl || null;

  if (cfg.artifactDir) {
    const afterPath = path.join(cfg.artifactDir, `${journey.journeyId}-after-vote.png`);
    await page.screenshot({ path: afterPath, fullPage: true });
    screenshots.push(afterPath);
  }

  const increment = await confirmScenarioHasVote(cfg.baseUrl, scenarioId, 45000);
  const beforeVotes = scenarioId && scenarioIdFromUrl && scenarioId === scenarioIdFromUrl
    ? beforeVotesFromUrlScenario
    : null;

  const messages = await page.evaluate(() => window.__cblMessages || []);
  const qualMessages = Array.isArray(messages)
    ? messages.filter((msg) => msg && msg.type === "CBL_VOTE_SUBMITTED_V1")
    : [];

  return {
    journeyId: journey.journeyId,
    flow: journey.flow,
    respondentId,
    scenarioId,
    beforeVotes,
    beforeScenarioId: scenarioIdFromUrl || null,
    manipulationsPerformed: manipTrace,
    interactionCount: manipTrace.filter((x) => x.ok).length,
    submitVoteStatus: submit.status,
    submitVoteRequestVariables: submit.requestPayload?.variables || {},
    submitVoteResponsePayload: submit.responsePayload,
    submitVoteRequestCount: 1,
    voteIncrement: increment,
    qualtricsMessageCount: qualMessages.length,
    sampleQualtricsMessage: qualMessages[0] || null,
    screenshots,
    pageUrl: page.url(),
    frameUrl: frame.url(),
    ok: Boolean(submit.ok && increment.ok && qualMessages.length > 0),
  };
}

function buildJourneys(count) {
  const out = [];
  for (let i = 1; i <= count; i += 1) {
    const flow = "direct";
    out.push({
      index: i,
      journeyId: `J${String(i).padStart(2, "0")}`,
      flow,
    });
  }
  return out;
}

async function runJourney(browser, cfg, journey) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    ...(cfg.videoDir
      ? {
          recordVideo: {
            dir: cfg.videoDir,
            size: { width: 1440, height: 1200 },
          },
        }
      : {}),
  });

  await context.addInitScript(() => {
    try {
      Object.defineProperty(window, "CompressionStream", {
        value: undefined,
        configurable: true,
      });
    } catch {
      // noop
    }
  });

  const page = await context.newPage();
  const gqlEvents = [];

  const onRequest = (request) => {
    if (!request.url().includes("/api/graphql")) return;
    const body = request.postData() || "";
    const lower = body.toLowerCase();
    let op = "other";
    if (lower.includes("submitvote")) op = "submitVote";
    else if (lower.includes("runscenario")) op = "runScenario";
    else if (lower.includes("votesummary")) op = "voteSummary";
    gqlEvents.push({
      type: "request",
      op,
      at: Date.now(),
      url: request.url(),
    });
  };

  const onResponse = (response) => {
    if (!response.url().includes("/api/graphql")) return;
    const body = response.request().postData() || "";
    const lower = body.toLowerCase();
    let op = "other";
    if (lower.includes("submitvote")) op = "submitVote";
    else if (lower.includes("runscenario")) op = "runScenario";
    else if (lower.includes("votesummary")) op = "voteSummary";
    gqlEvents.push({
      type: "response",
      op,
      at: Date.now(),
      url: response.url(),
      status: response.status(),
    });
  };

  page.on("request", onRequest);
  page.on("response", onResponse);

  const startedAt = new Date().toISOString();
  let result;
  let videoPath = null;
  const video = page.video();

  try {
    if (journey.flow === "qualtrics_iframe") {
      result = await qualtricsIframeFlow(page, cfg, journey);
    } else {
      result = await directFlow(page, cfg, journey);
    }
  } catch (err) {
    result = {
      journeyId: journey.journeyId,
      flow: journey.flow,
      ok: false,
      error: String(err),
      pageUrl: page.url(),
    };
  } finally {
    page.off("request", onRequest);
    page.off("response", onResponse);
    await context.close();
    if (video) {
      videoPath = await video.path().catch(() => null);
    }
  }

  return {
    ...result,
    startedAt,
    finishedAt: new Date().toISOString(),
    videoPath,
    gqlEventsTail: gqlEvents.slice(-120),
  };
}

async function main() {
  const opts = parseArgs(process.argv);
  ensureDirForFile(opts.output);
  ensureDir(opts.artifactDir);
  ensureDir(opts.videoDir);

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

  const startedAt = new Date().toISOString();
  const journeys = buildJourneys(opts.journeyCount);
  const output = {
    ok: false,
    startedAt,
    finishedAt: null,
    baseUrl: opts.baseUrl,
    runId: opts.runId || null,
    respondentPrefix: opts.respondentPrefix,
    journeyCount: journeys.length,
    headless: opts.headless,
    journeys: [],
  };

  try {
    for (const journey of journeys) {
      const result = await runJourney(browser, opts, journey);
      output.journeys.push(result);
    }
    output.ok = output.journeys.length > 0 && output.journeys.every((j) => Boolean(j.ok));
    if (!output.ok) {
      output.error = "one or more journeys failed";
    }
  } finally {
    await browser.close();
  }

  output.finishedAt = new Date().toISOString();
  fs.writeFileSync(opts.output, JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output, null, 2));
  process.exit(output.ok ? 0 : 2);
}

main().catch((err) => {
  console.error(String(err));
  process.exit(2);
});
