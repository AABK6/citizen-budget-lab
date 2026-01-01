'use client';

import { useEffect, useMemo, useState } from 'react';
import yaml from 'js-yaml';

interface Feasibility {
  law: boolean;
  adminLagMonths: number;
  notes?: string;
}

interface Impact {
  householdsImpacted?: number;
  decile1ImpactEur?: number;
  decile10ImpactEur?: number;
  gdpImpactPct?: number;
  jobsImpactCount?: number;
}

interface Lever {
  id: string;
  family: string;
  label: string;
  description: string;
  short_label?: string;
  fixed_impact_eur: number;
  impact_schedule_eur?: number[];
  budget_side?: string;
  dimension?: string;
  major_amendment?: boolean;
  popularity?: number;
  active: boolean;
  mass_mapping: Record<string, number>;
  feasibility: Feasibility;
  conflicts_with: string[];
  sources: string[];
  params_schema: Record<string, any>;
  impact?: Impact;
}

interface ValidationResult {
  ok: boolean;
  errors?: string[];
}

const FAMILIES = [
  'PENSIONS',
  'TAXES',
  'TAX_EXPENDITURES',
  'HEALTH',
  'DEFENSE',
  'STAFFING',
  'SUBSIDIES',
  'CLIMATE',
  'SOCIAL_SECURITY',
  'PROCUREMENT',
  'OPERATIONS',
  'OTHER',
];

const BUDGET_SIDES = ['SPENDING', 'REVENUE', 'BOTH'];

const MASS_LABELS: Record<string, string> = {
  '01': 'Services publics généraux',
  '02': 'Défense',
  '03': 'Ordre public',
  '04': 'Affaires économiques',
  '05': 'Environnement',
  '06': 'Logement',
  '07': 'Santé',
  '08': 'Culture et loisirs',
  '09': 'Éducation',
  '10': 'Protection sociale',
};

const MASS_FORMATTER = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

const SORT_OPTIONS = [
  { id: 'order', label: 'Ordre manuel' },
  { id: 'id', label: 'ID' },
  { id: 'label', label: 'Libelle' },
  { id: 'family', label: 'Famille' },
  { id: 'impact', label: 'Impact (EUR)' },
];

const inputClass =
  'w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50';

const textareaClass =
  'w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50';

function normalizeMapping(value: any): Record<string, number> {
  const out: Record<string, number> = {};
  if (!value || typeof value !== 'object') {
    return out;
  }
  for (const [key, raw] of Object.entries(value)) {
    const num = typeof raw === 'number' ? raw : Number(raw);
    out[String(key)] = Number.isFinite(num) ? num : 0;
  }
  return out;
}

function normalizeLever(raw: any): Lever {
  return {
    id: String(raw?.id || ''),
    family: String(raw?.family || 'OTHER'),
    label: String(raw?.label || ''),
    description: String(raw?.description || ''),
    short_label: raw?.short_label ? String(raw.short_label) : undefined,
    fixed_impact_eur: Number(raw?.fixed_impact_eur || 0),
    impact_schedule_eur: Array.isArray(raw?.impact_schedule_eur) ? raw.impact_schedule_eur.map((v: any) => Number(v)) : undefined,
    budget_side: raw?.budget_side ? String(raw.budget_side) : undefined,
    dimension: raw?.dimension ? String(raw.dimension) : undefined,
    major_amendment: raw?.major_amendment ?? undefined,
    popularity: raw?.popularity ?? undefined,
    active: raw?.active === false ? false : true,
    mass_mapping: normalizeMapping(raw?.mass_mapping),
    feasibility: {
      law: Boolean(raw?.feasibility?.law),
      adminLagMonths: Number(raw?.feasibility?.adminLagMonths || 0),
      notes: raw?.feasibility?.notes ? String(raw.feasibility.notes) : undefined,
    },
    conflicts_with: Array.isArray(raw?.conflicts_with) ? raw.conflicts_with.map(String) : [],
    sources: Array.isArray(raw?.sources) ? raw.sources.map(String) : [],
    params_schema: (raw?.params_schema && typeof raw.params_schema === 'object') ? raw.params_schema : {},
    impact: (raw?.impact && typeof raw.impact === 'object') ? raw.impact : undefined,
  };
}

function serializeLever(lever: Lever): Record<string, any> {
  const { active, ...rest } = lever;
  const out: Record<string, any> = { ...rest };
  if (active === false) {
    out.active = false;
  }
  return out;
}

function dumpYaml(data: Lever[]): string {
  return yaml.dump(data.map(serializeLever), { noRefs: true, sortKeys: false, lineWidth: 120 });
}

function parseYaml(text: string): Lever[] {
  const parsed = yaml.load(text);
  if (!Array.isArray(parsed)) {
    throw new Error('Le YAML doit contenir une liste de leviers.');
  }
  return parsed.map(normalizeLever);
}

function listToLines(items: string[]): string {
  return items.join('\n');
}

function linesToList(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatMassValue(value: number | undefined): string {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return '-';
  }
  return MASS_FORMATTER.format(value);
}

export default function PolicyCatalogAdminClient() {
  const [yamlText, setYamlText] = useState('');
  const [rawDirty, setRawDirty] = useState(false);
  const [catalog, setCatalog] = useState<Lever[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState('ALL');
  const [massFilter, setMassFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState('order');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<'table' | 'pivot' | 'yaml'>('table');
  const [bulkFamily, setBulkFamily] = useState('');
  const [bulkBudget, setBulkBudget] = useState('');

  const [paramsText, setParamsText] = useState('');
  const [impactText, setImpactText] = useState('');
  const [impactScheduleText, setImpactScheduleText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [mappingKey, setMappingKey] = useState('');
  const [mappingValue, setMappingValue] = useState('');

  const fetchCatalog = async () => {
    setLoading(true);
    setLoadError(null);
    setStatus(null);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['x-admin-token'] = token;
      const res = await fetch('/api/admin/policy-catalog', { headers, cache: 'no-store' });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const text = await res.text();
      const parsed = parseYaml(text);
      setCatalog(parsed);
      setYamlText(text);
      setParseError(null);
      setRawDirty(false);
    } catch (err: any) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load catalog');
    } finally {
      setLoading(false);
    }
  };

  const validateCatalog = async () => {
    setValidating(true);
    setErrors([]);
    setStatus(null);
    try {
      const payloadYaml = view === 'yaml' ? yamlText : dumpYaml(catalog);
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (token) headers['x-admin-token'] = token;
      const res = await fetch('/api/admin/policy-catalog', {
        method: 'POST',
        headers,
        body: JSON.stringify({ yaml: payloadYaml }),
      });
      const payload = (await res.json()) as ValidationResult;
      if (!res.ok) {
        throw new Error(payload?.errors?.join('\n') || `HTTP ${res.status}`);
      }
      const errs = payload.errors || [];
      setErrors(errs);
      setStatus(errs.length === 0 ? 'Validation OK.' : 'Validation failed.');
    } catch (err: any) {
      setErrors([err instanceof Error ? err.message : 'Validation failed']);
      setStatus('Validation failed.');
    } finally {
      setValidating(false);
    }
  };

  const saveCatalog = async () => {
    setSaving(true);
    setErrors([]);
    setStatus(null);
    try {
      const payloadYaml = view === 'yaml' ? yamlText : dumpYaml(catalog);
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (token) headers['x-admin-token'] = token;
      const res = await fetch('/api/admin/policy-catalog', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ yaml: payloadYaml }),
      });
      const payload = await res.json();
      if (!res.ok) {
        const errs = payload?.errors || [`HTTP ${res.status}`];
        throw new Error(errs.join('\n'));
      }
      setYamlText(payloadYaml);
      setRawDirty(false);
      try {
        setCatalog(parseYaml(payloadYaml));
      } catch (err) {
        // Validation passed server-side; keep table state.
      }
      const backup = payload.backup_path ? ` Backup: ${payload.backup_path}` : '';
      setStatus(`Enregistre dans ${payload.path}.${backup}`);
    } catch (err: any) {
      setErrors([err instanceof Error ? err.message : 'Save failed']);
      setStatus('Enregistrement echoue.');
    } finally {
      setSaving(false);
    }
  };

  const downloadCatalog = () => {
    const payloadYaml = view === 'yaml' ? yamlText : dumpYaml(catalog);
    const blob = new Blob([payloadYaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'policy_levers.yaml';
    link.click();
    URL.revokeObjectURL(url);
    setStatus('Downloaded policy_levers.yaml.');
  };

  const copyCatalog = async () => {
    try {
      await navigator.clipboard.writeText(yamlText);
      setStatus('YAML copied to clipboard.');
    } catch (err) {
      setStatus('Copy failed.');
    }
  };

  const applyYaml = () => {
    try {
      const parsed = parseYaml(yamlText);
      setCatalog(parsed);
      setParseError(null);
      setRawDirty(false);
      setStatus('YAML loaded into the table.');
    } catch (err: any) {
      setParseError(err instanceof Error ? err.message : 'Invalid YAML');
    }
  };

  const setCatalogAndYaml = (next: Lever[]) => {
    setCatalog(next);
    if (view === 'yaml' && !rawDirty) {
      setYamlText(dumpYaml(next));
    }
  };

  const updateLever = (id: string, updater: (lever: Lever) => Lever) => {
    setCatalogAndYaml(
      catalog.map((item) => (item.id === id ? updater(item) : item))
    );
  };

  const swapLever = (index: number, direction: number) => {
    const target = index + direction;
    if (target < 0 || target >= catalog.length) return;
    const next = [...catalog];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    setCatalogAndYaml(next);
  };

  const addLever = () => {
    const base = 'new_lever';
    let suffix = catalog.length + 1;
    let candidate = `${base}_${suffix}`;
    const ids = new Set(catalog.map((l) => l.id));
    while (ids.has(candidate)) {
      suffix += 1;
      candidate = `${base}_${suffix}`;
    }
    const next: Lever = {
      id: candidate,
      family: 'OTHER',
      label: 'Nouveau levier',
      description: '',
      fixed_impact_eur: 0,
      active: true,
      mass_mapping: {},
      feasibility: { law: false, adminLagMonths: 0 },
      conflicts_with: [],
      sources: [],
      params_schema: {},
    };
    const updated = [...catalog, next];
    setCatalogAndYaml(updated);
    setActiveId(candidate);
  };

  const duplicateLever = (id: string) => {
    const lever = catalog.find((item) => item.id === id);
    if (!lever) return;
    const copy = { ...lever, id: `${lever.id}_copy` } as Lever;
    const ids = new Set(catalog.map((l) => l.id));
    let candidate = copy.id;
    let i = 2;
    while (ids.has(candidate)) {
      candidate = `${copy.id}_${i}`;
      i += 1;
    }
    copy.id = candidate;
    const updated = [...catalog, copy];
    setCatalogAndYaml(updated);
    setActiveId(candidate);
  };

  const deleteLever = (id: string) => {
    const updated = catalog.filter((item) => item.id !== id);
    setCatalogAndYaml(updated);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  useEffect(() => {
    fetchCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (catalog.length === 0) {
      setActiveId(null);
      return;
    }
    if (!activeId || !catalog.some((item) => item.id === activeId)) {
      setActiveId(catalog[0].id);
    }
  }, [catalog, activeId]);

  useEffect(() => {
    if (!activeId) return;
    const active = catalog.find((item) => item.id === activeId);
    if (!active) return;
    setParamsText(JSON.stringify(active.params_schema || {}, null, 2));
    setImpactText(JSON.stringify(active.impact || {}, null, 2));
    setImpactScheduleText(active.impact_schedule_eur ? active.impact_schedule_eur.join(', ') : '');
    setJsonError(null);
    setMappingKey('');
    setMappingValue('');
  }, [activeId, catalog]);

  const filteredRows = useMemo(() => {
    const rows = catalog.map((lever, index) => ({ lever, index }));
    const q = search.trim().toLowerCase();
    const filtered = rows.filter(({ lever }) => {
      if (familyFilter !== 'ALL' && lever.family !== familyFilter) return false;
      if (massFilter !== 'ALL') {
        const hasMapping = Object.keys(lever.mass_mapping || {}).length > 0;
        if (massFilter === 'NONE') {
          return !hasMapping;
        }
        if (!lever.mass_mapping || lever.mass_mapping[massFilter] === undefined) {
          return false;
        }
      }
      if (!q) return true;
      const hay = `${lever.id} ${lever.label} ${lever.description}`.toLowerCase();
      return hay.includes(q);
    });

    if (sortKey === 'order') {
      return filtered;
    }

    const dir = sortDir === 'asc' ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      let av: any = '';
      let bv: any = '';
      if (sortKey === 'id') {
        av = a.lever.id;
        bv = b.lever.id;
      } else if (sortKey === 'label') {
        av = a.lever.label;
        bv = b.lever.label;
      } else if (sortKey === 'family') {
        av = a.lever.family;
        bv = b.lever.family;
      } else if (sortKey === 'impact') {
        av = a.lever.fixed_impact_eur || 0;
        bv = b.lever.fixed_impact_eur || 0;
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });
    return sorted;
  }, [catalog, search, familyFilter, massFilter, sortKey, sortDir]);

  const massTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const code of Object.keys(MASS_LABELS)) {
      totals[code] = 0;
    }
    for (const { lever } of filteredRows) {
      for (const [code, value] of Object.entries(lever.mass_mapping || {})) {
        if (totals[code] === undefined) continue;
        const num = Number(value);
        if (Number.isFinite(num)) {
          totals[code] += num;
        }
      }
    }
    return totals;
  }, [filteredRows]);

  const applySortOrder = () => {
    if (sortKey === 'order') return;
    const dir = sortDir === 'asc' ? 1 : -1;
    const sortedAll = [...catalog].sort((a, b) => {
      let av: any = '';
      let bv: any = '';
      if (sortKey === 'id') {
        av = a.id;
        bv = b.id;
      } else if (sortKey === 'label') {
        av = a.label;
        bv = b.label;
      } else if (sortKey === 'family') {
        av = a.family;
        bv = b.family;
      } else if (sortKey === 'impact') {
        av = a.fixed_impact_eur || 0;
        bv = b.fixed_impact_eur || 0;
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });
    setCatalogAndYaml(sortedAll);
    setStatus('Ordre applique.');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const bulkApply = () => {
    if (!bulkFamily && !bulkBudget) return;
    const next = catalog.map((lever) => {
      if (!selectedIds.has(lever.id)) return lever;
      return {
        ...lever,
        family: bulkFamily || lever.family,
        budget_side: bulkBudget || lever.budget_side,
      };
    });
    setCatalogAndYaml(next);
    setStatus('Mise a jour appliquee.');
  };

  const activeLever = activeId ? catalog.find((item) => item.id === activeId) : null;

  const mappingEntries = Object.entries(activeLever?.mass_mapping || {});
  const conflictsText = listToLines(activeLever?.conflicts_with || []);
  const sourcesText = listToLines(activeLever?.sources || []);

  const updateMapping = (entries: Array<[string, number]>) => {
    const updated: Record<string, number> = {};
    entries.forEach(([key, value]) => {
      const trimmed = key.trim();
      if (!trimmed) return;
      updated[trimmed] = Number(value);
    });
    if (activeId) {
      updateLever(activeId, (lever) => ({ ...lever, mass_mapping: updated }));
    }
  };

  const addMappingEntry = () => {
    if (!mappingKey.trim()) return;
    const value = Number(mappingValue || 0);
    const nextEntries = [...mappingEntries, [mappingKey.trim(), value] as [string, number]];
    updateMapping(nextEntries);
    setMappingKey('');
    setMappingValue('');
  };

  const applyJsonField = (field: 'params_schema' | 'impact', text: string) => {
    try {
      const parsed = text.trim() ? JSON.parse(text) : {};
      if (activeId) {
        updateLever(activeId, (lever) => ({ ...lever, [field]: parsed }));
      }
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  };

  const applyImpactSchedule = () => {
    const values = impactScheduleText
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v));
    if (activeId) {
      updateLever(activeId, (lever) => ({
        ...lever,
        impact_schedule_eur: values.length ? values : undefined,
      }));
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-950 text-slate-100 px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Admin - Policy Catalog</p>
            <h1 className="text-3xl font-semibold">Policy Lever Catalog Editor</h1>
            <p className="text-slate-400">
              Vue tableur pour modifier les leviers, leurs mappings et leurs familles. Enregistre directement le YAML puis commit.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={fetchCatalog}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
              disabled={loading}
            >
              {loading ? 'Chargement...' : 'Recharger fichier'}
            </button>
            <button
              onClick={validateCatalog}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm"
              disabled={validating}
            >
              {validating ? 'Validation...' : 'Valider contenu'}
            </button>
            <button
              onClick={saveCatalog}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm"
              disabled={saving}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button
              onClick={copyCatalog}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
            >
              Copier YAML
            </button>
            <button
              onClick={downloadCatalog}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
            >
              Telecharger YAML
            </button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Admin token (optionnel)</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className={inputClass}
              placeholder="x-admin-token"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => setView('table')}
              className={`px-4 py-2 rounded-lg text-sm ${view === 'table' ? 'bg-slate-800' : 'bg-slate-900 border border-slate-800'}`}
            >
              Table
            </button>
            <button
              onClick={() => setView('pivot')}
              className={`px-4 py-2 rounded-lg text-sm ${view === 'pivot' ? 'bg-slate-800' : 'bg-slate-900 border border-slate-800'}`}
            >
              Vue masses
            </button>
            <button
              onClick={() => {
                setView('yaml');
                setYamlText(dumpYaml(catalog));
                setRawDirty(false);
              }}
              className={`px-4 py-2 rounded-lg text-sm ${view === 'yaml' ? 'bg-slate-800' : 'bg-slate-900 border border-slate-800'}`}
            >
              YAML
            </button>
          </div>
        </div>

        {loadError && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-200">
            {loadError}
          </div>
        )}
        {parseError && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200">
            {parseError}
          </div>
        )}

        {status && <div className="text-sm text-slate-400">{status}</div>}

        {errors.length > 0 && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3">
            <p className="text-sm font-semibold text-rose-200 mb-2">Validation errors</p>
            <ul className="text-sm text-rose-100 space-y-1">
              {errors.map((err, idx) => (
                <li key={idx}>• {err}</li>
              ))}
            </ul>
          </div>
        )}

        {view === 'yaml' ? (
          <div className="space-y-3">
            <textarea
              value={yamlText}
              onChange={(e) => {
                setYamlText(e.target.value);
                setRawDirty(true);
              }}
              className={`${textareaClass} min-h-[520px]`}
              spellCheck={false}
            />
            <div className="flex gap-2">
              <button
                onClick={applyYaml}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm"
              >
                Charger dans la table
              </button>
              <button
                onClick={() => {
                  setYamlText(dumpYaml(catalog));
                  setRawDirty(false);
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
              >
                Reset YAML
              </button>
            </div>
          </div>
        ) : view === 'pivot' ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] text-sm">
                <thead className="bg-slate-900/80 text-slate-400 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Levier</th>
                    <th className="px-3 py-2 text-left">Famille</th>
                    {Object.entries(MASS_LABELS).map(([code, label]) => (
                      <th key={code} className="px-3 py-2 text-left">
                        <div className="text-xs font-semibold">{code}</div>
                        <div className="text-[11px] text-slate-500">{label}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(({ lever }) => (
                    <tr
                      key={lever.id}
                      className={`border-t border-slate-800/70 ${lever.active === false ? 'opacity-60' : ''}`}
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="font-mono text-xs text-slate-300">{lever.id}</div>
                        <div className="text-slate-200">{lever.label}</div>
                      </td>
                      <td className="px-3 py-2">{lever.family}</td>
                      {Object.keys(MASS_LABELS).map((code) => {
                        const value = lever.mass_mapping?.[code];
                        return (
                          <td key={`${lever.id}-${code}`} className="px-3 py-2 text-right text-slate-200">
                            {formatMassValue(value)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900/80 text-slate-300">
                  <tr className="border-t border-slate-800/70">
                    <td className="px-3 py-2 font-semibold">Total</td>
                    <td className="px-3 py-2 text-xs text-slate-500">Somme des poids</td>
                    {Object.keys(MASS_LABELS).map((code) => (
                      <td key={`total-${code}`} className="px-3 py-2 text-right font-semibold">
                        {formatMassValue(massTotals[code])}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr] lg:items-start">
            <section className="space-y-4 order-2 lg:order-1 min-w-0">
              <div className="flex flex-wrap gap-3 items-center">
                <button
                  onClick={addLever}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm"
                >
                  + Nouveau levier
                </button>
                <button
                  onClick={applySortOrder}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
                >
                  Appliquer le tri
                </button>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={inputClass}
                  placeholder="Recherche (id, label, description)"
                />
                <select
                  value={familyFilter}
                  onChange={(e) => setFamilyFilter(e.target.value)}
                  className={inputClass}
                >
                  <option value="ALL">Toutes les familles</option>
                  {FAMILIES.map((fam) => (
                    <option key={fam} value={fam}>{fam}</option>
                  ))}
                </select>
                <select
                  value={massFilter}
                  onChange={(e) => setMassFilter(e.target.value)}
                  className={inputClass}
                >
                  <option value="ALL">Tous les mappings</option>
                  <option value="NONE">Sans mapping</option>
                  {Object.entries(MASS_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value)}
                  className={inputClass}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
                <select
                  value={sortDir}
                  onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
                  className={inputClass}
                >
                  <option value="asc">Asc</option>
                  <option value="desc">Desc</option>
                </select>
              </div>

              {selectedIds.size > 0 && (
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2">
                  <div className="text-sm text-slate-300">Selection: {selectedIds.size} elements</div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={bulkFamily}
                      onChange={(e) => setBulkFamily(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Famille (bulk)</option>
                      {FAMILIES.map((fam) => (
                        <option key={fam} value={fam}>{fam}</option>
                      ))}
                    </select>
                    <select
                      value={bulkBudget}
                      onChange={(e) => setBulkBudget(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Budget side (bulk)</option>
                      {BUDGET_SIDES.map((side) => (
                        <option key={side} value={side}>{side}</option>
                      ))}
                    </select>
                    <button
                      onClick={bulkApply}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
                    >
                      Appliquer
                    </button>
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm"
                    >
                      Vider la selection
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-900/80 text-slate-400 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left">Sel</th>
                        <th className="px-3 py-2 text-left">Ordre</th>
                        <th className="px-3 py-2 text-left">ID</th>
                        <th className="px-3 py-2 text-left">Famille</th>
                        <th className="px-3 py-2 text-left">Label</th>
                        <th className="px-3 py-2 text-left">Impact</th>
                        <th className="px-3 py-2 text-left">Mapping</th>
                        <th className="px-3 py-2 text-left">Conflicts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map(({ lever, index }) => {
                        const isActive = lever.id === activeId;
                        const isSelected = selectedIds.has(lever.id);
                        const isInactive = lever.active === false;
                        const mappingSummary = Object.entries(lever.mass_mapping || {})
                          .map(([k, v]) => `${MASS_LABELS[k] || k} (${k}):${v}`)
                          .join(' ');
                        return (
                          <tr
                            key={lever.id}
                            className={`border-t border-slate-800/70 ${isActive ? 'bg-indigo-500/10' : 'hover:bg-slate-800/40'} ${isInactive ? 'opacity-60' : ''}`}
                            onClick={() => setActiveId(lever.id)}
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleSelect(lever.id);
                                }}
                              />
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    swapLever(index, -1);
                                  }}
                                  className="px-2 py-1 rounded bg-slate-800 text-xs"
                                >
                                  Up
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    swapLever(index, 1);
                                  }}
                                  className="px-2 py-1 rounded bg-slate-800 text-xs"
                                >
                                  Down
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-slate-300">{lever.id}</td>
                            <td className="px-3 py-2">{lever.family}</td>
                            <td className="px-3 py-2 max-w-[240px]">
                              <div className="truncate" title={lever.label}>{lever.label}</div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">{lever.fixed_impact_eur.toLocaleString()}</td>
                            <td className="px-3 py-2 max-w-[220px]">
                              <div className="truncate" title={mappingSummary}>{mappingSummary || '-'}</div>
                            </td>
                            <td className="px-3 py-2 text-center">{lever.conflicts_with?.length || 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-4 order-1 lg:order-2 lg:sticky lg:top-6 lg:max-h-[80vh] lg:overflow-auto self-start">
              {!activeLever ? (
                <p className="text-slate-400">Selectionne un levier pour l'editer.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Detail</p>
                      <h2 className="text-xl font-semibold">{activeLever.label || activeLever.id}</h2>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => duplicateLever(activeLever.id)}
                        className="px-3 py-2 rounded bg-slate-800 text-xs"
                      >
                        Dupliquer
                      </button>
                      <button
                        onClick={() => deleteLever(activeLever.id)}
                        className="px-3 py-2 rounded bg-rose-600 text-xs"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <label className="text-xs text-slate-400">ID</label>
                    <input
                      value={activeLever.id}
                      onChange={(e) => updateLever(activeLever.id, (lever) => ({ ...lever, id: e.target.value }))}
                      className={inputClass}
                    />

                    <label className="text-xs text-slate-400">Actif</label>
                    <label className="flex items-center gap-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={activeLever.active !== false}
                        onChange={(e) =>
                          updateLever(activeLever.id, (lever) => ({ ...lever, active: e.target.checked }))
                        }
                      />
                      Visible dans la simulation
                    </label>

                    <label className="text-xs text-slate-400">Famille</label>
                    <select
                      value={activeLever.family}
                      onChange={(e) => updateLever(activeLever.id, (lever) => ({ ...lever, family: e.target.value }))}
                      className={inputClass}
                    >
                      {FAMILIES.map((fam) => (
                        <option key={fam} value={fam}>{fam}</option>
                      ))}
                    </select>

                    <label className="text-xs text-slate-400">Label</label>
                    <input
                      value={activeLever.label}
                      onChange={(e) => updateLever(activeLever.id, (lever) => ({ ...lever, label: e.target.value }))}
                      className={inputClass}
                    />

                    <label className="text-xs text-slate-400">Description</label>
                    <textarea
                      value={activeLever.description}
                      onChange={(e) => updateLever(activeLever.id, (lever) => ({ ...lever, description: e.target.value }))}
                      className={`${textareaClass} min-h-[120px]`}
                    />

                    <label className="text-xs text-slate-400">Impact fixe (EUR)</label>
                    <input
                      type="number"
                      value={activeLever.fixed_impact_eur}
                      onChange={(e) => updateLever(activeLever.id, (lever) => ({ ...lever, fixed_impact_eur: Number(e.target.value) }))}
                      className={inputClass}
                    />

                    <label className="text-xs text-slate-400">Impact schedule (CSV)</label>
                    <div className="flex gap-2">
                      <input
                        value={impactScheduleText}
                        onChange={(e) => setImpactScheduleText(e.target.value)}
                        className={inputClass}
                        placeholder="-500000000, -2000000000, ..."
                      />
                      <button
                        onClick={applyImpactSchedule}
                        className="px-3 py-2 rounded bg-slate-800 text-xs"
                      >
                        Appliquer
                      </button>
                    </div>

                    <label className="text-xs text-slate-400">Budget side</label>
                    <select
                      value={activeLever.budget_side || ''}
                      onChange={(e) => updateLever(activeLever.id, (lever) => ({ ...lever, budget_side: e.target.value || undefined }))}
                      className={inputClass}
                    >
                      <option value="">Auto</option>
                      {BUDGET_SIDES.map((side) => (
                        <option key={side} value={side}>{side}</option>
                      ))}
                    </select>

                    <label className="text-xs text-slate-400">Major amendment</label>
                    <select
                      value={activeLever.major_amendment ? 'true' : 'false'}
                      onChange={(e) => updateLever(activeLever.id, (lever) => ({ ...lever, major_amendment: e.target.value === 'true' }))}
                      className={inputClass}
                    >
                      <option value="false">Non</option>
                      <option value="true">Oui</option>
                    </select>

                    <label className="text-xs text-slate-400">Feasibility</label>
                    <div className="grid gap-2">
                      <div className="flex gap-2">
                        <select
                          value={activeLever.feasibility.law ? 'true' : 'false'}
                          onChange={(e) => updateLever(activeLever.id, (lever) => ({
                            ...lever,
                            feasibility: { ...lever.feasibility, law: e.target.value === 'true' },
                          }))}
                          className={inputClass}
                        >
                          <option value="false">Law: Non</option>
                          <option value="true">Law: Oui</option>
                        </select>
                        <input
                          type="number"
                          value={activeLever.feasibility.adminLagMonths}
                          onChange={(e) => updateLever(activeLever.id, (lever) => ({
                            ...lever,
                            feasibility: { ...lever.feasibility, adminLagMonths: Number(e.target.value) },
                          }))}
                          className={inputClass}
                          placeholder="Admin lag (months)"
                        />
                      </div>
                      <textarea
                        value={activeLever.feasibility.notes || ''}
                        onChange={(e) => updateLever(activeLever.id, (lever) => ({
                          ...lever,
                          feasibility: { ...lever.feasibility, notes: e.target.value },
                        }))}
                        className={`${textareaClass} min-h-[80px]`}
                        placeholder="Notes"
                      />
                    </div>

                    <label className="text-xs text-slate-400">Mass mapping</label>
                    <div className="space-y-2">
                      {mappingEntries.map(([key, value], idx) => (
                        <div key={`${key}-${idx}`} className="flex gap-2">
                          <input
                            value={key}
                            onChange={(e) => {
                              const next = [...mappingEntries];
                              next[idx] = [e.target.value, value];
                              updateMapping(next as Array<[string, number]>);
                            }}
                            className={inputClass}
                            placeholder="Mass ID"
                            list="mass-ids"
                          />
                          <input
                            type="number"
                            value={value}
                            onChange={(e) => {
                              const next = [...mappingEntries];
                              next[idx] = [key, Number(e.target.value)];
                              updateMapping(next as Array<[string, number]>);
                            }}
                            className={inputClass}
                            placeholder="Weight"
                          />
                          <button
                            onClick={() => {
                              const next = mappingEntries.filter((_, i) => i !== idx);
                              updateMapping(next as Array<[string, number]>);
                            }}
                            className="px-2 rounded bg-rose-600 text-xs"
                          >
                            X
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          value={mappingKey}
                          onChange={(e) => setMappingKey(e.target.value)}
                          className={inputClass}
                          placeholder="Mass ID"
                          list="mass-ids"
                        />
                        <input
                          type="number"
                          value={mappingValue}
                          onChange={(e) => setMappingValue(e.target.value)}
                          className={inputClass}
                          placeholder="Weight"
                        />
                        <button
                          onClick={addMappingEntry}
                          className="px-3 rounded bg-slate-800 text-xs"
                        >
                          Ajouter
                        </button>
                      </div>
                      <datalist id="mass-ids">
                        {Object.entries(MASS_LABELS).map(([code, label]) => (
                          <option key={code} value={code}>{label}</option>
                        ))}
                      </datalist>
                    </div>

                    <label className="text-xs text-slate-400">Conflicts (1 par ligne)</label>
                    <textarea
                      value={conflictsText}
                      onChange={(e) => updateLever(activeLever.id, (lever) => ({
                        ...lever,
                        conflicts_with: linesToList(e.target.value),
                      }))}
                      className={`${textareaClass} min-h-[80px]`}
                    />

                    <label className="text-xs text-slate-400">Sources (1 par ligne)</label>
                    <textarea
                      value={sourcesText}
                      onChange={(e) => updateLever(activeLever.id, (lever) => ({
                        ...lever,
                        sources: linesToList(e.target.value),
                      }))}
                      className={`${textareaClass} min-h-[80px]`}
                    />

                    <label className="text-xs text-slate-400">Params schema (JSON)</label>
                    <textarea
                      value={paramsText}
                      onChange={(e) => setParamsText(e.target.value)}
                      className={`${textareaClass} min-h-[100px]`}
                    />
                    <button
                      onClick={() => applyJsonField('params_schema', paramsText)}
                      className="px-3 py-2 rounded bg-slate-800 text-xs"
                    >
                      Appliquer JSON
                    </button>

                    <label className="text-xs text-slate-400">Impact (JSON)</label>
                    <textarea
                      value={impactText}
                      onChange={(e) => setImpactText(e.target.value)}
                      className={`${textareaClass} min-h-[100px]`}
                    />
                    <button
                      onClick={() => applyJsonField('impact', impactText)}
                      className="px-3 py-2 rounded bg-slate-800 text-xs"
                    >
                      Appliquer JSON
                    </button>

                    {jsonError && (
                      <div className="text-xs text-rose-300">{jsonError}</div>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
