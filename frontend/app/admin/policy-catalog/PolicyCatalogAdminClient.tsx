'use client';

import { useEffect, useMemo, useState } from 'react';
import yaml from 'js-yaml';
import { gqlRequest } from '@/lib/graphql';
import { 
  ArrowDown, ArrowUp, ArrowUpDown, 
  AlertCircle, Link as LinkIcon, AlertTriangle, 
  Filter, Trash2, Plus, ExternalLink, TrendingUp,
  Check, X, FileText
} from 'lucide-react';

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
  cofog_mapping: Record<string, number>;
  mission_mapping: Record<string, number>;
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
  'PENSIONS', 'TAXES', 'TAX_EXPENDITURES', 'HEALTH', 'DEFENSE', 
  'STAFFING', 'SUBSIDIES', 'CLIMATE', 'SOCIAL_SECURITY', 
  'PROCUREMENT', 'OPERATIONS', 'OTHER',
];

const BUDGET_SIDES = ['SPENDING', 'REVENUE', 'BOTH'];

const COFOG_LABELS: Record<string, string> = {
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

const MAPPING_FORMATTER = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

const inputClass =
  'w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all';

const textareaClass =
  'w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all';

// --- HELPER COMPONENTS ---

const SortHeader = ({ label, id, currentKey, currentDir, onSort }: { label: string, id: string, currentKey: string, currentDir: string, onSort: (id: string) => void }) => {
  const isActive = currentKey === id;
  return (
    <th 
      className="px-3 py-2 text-left cursor-pointer hover:bg-slate-800 transition-colors select-none group"
      onClick={() => onSort(id)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className={`text-slate-500 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
          {isActive ? (currentDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} />}
        </span>
      </div>
    </th>
  );
};

const QualityBadge = ({ type, tooltip }: { type: 'error' | 'warning', tooltip: string }) => {
  const color = type === 'error' ? 'text-rose-500' : 'text-amber-500';
  const Icon = type === 'error' ? AlertCircle : AlertTriangle;
  return (
    <div className={`group relative ${color}`}>
      <Icon size={14} />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max max-w-[200px] px-2 py-1 bg-slate-800 text-slate-200 text-xs rounded shadow-xl z-50">
        {tooltip}
      </div>
    </div>
  );
};

export const SourceManager = ({ sources, onChange }: { sources: string[], onChange: (next: string[]) => void }) => {
  const updateSource = (index: number, val: string) => {
    const next = [...sources];
    next[index] = val;
    onChange(next);
  };
  const removeSource = (index: number) => {
    onChange(sources.filter((_, i) => i !== index));
  };
  const addSource = () => {
    onChange([...sources, '']);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-400 uppercase font-bold tracking-wider">Sources & Liens</label>
        <button onClick={addSource} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[10px] uppercase font-bold">
          <Plus size={12} /> Ajouter
        </button>
      </div>
      {sources.map((src, idx) => (
        <div key={idx} className="flex gap-2 group">
          <div className="relative flex-1">
            <input
              value={src}
              onChange={(e) => updateSource(idx, e.target.value)}
              className={inputClass}
              placeholder="Nom de la source ou URL"
            />
            {src.includes('http') && (
              <a href={src} target="_blank" rel="noreferrer" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400">
                <ExternalLink size={14} />
              </a>
            )}
          </div>
          <button onClick={() => removeSource(idx)} className="text-slate-600 hover:text-rose-500 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      {sources.length === 0 && <p className="text-[10px] text-slate-600 italic text-center py-2">Aucune source renseignée.</p>}
    </div>
  );
};

export const TrajectoryEditor = ({ fixed, schedule, onChange }: { fixed: number, schedule?: number[], onChange: (next: number[]) => void }) => {
  const years = [2026, 2027, 2028, 2029, 2030];
  const currentValues = schedule && schedule.length >= 5 ? schedule : years.map(() => fixed);
  
  const updateYear = (index: number, val: string) => {
    const next = [...currentValues];
    const num = Number(val) * 1e9;
    next[index] = Number.isFinite(num) ? num : 0;
    onChange(next);
  };

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-3 space-y-3">
      <div className="flex items-center gap-2 text-indigo-400 mb-1">
        <TrendingUp size={16} />
        <span className="text-xs font-bold uppercase tracking-wider">Trajectoire 5 ans (Md€)</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {years.map((year, idx) => (
          <div key={year} className="space-y-1">
            <div className="text-[10px] text-center text-slate-500 font-mono">{year}</div>
            <input
              type="number"
              step="0.1"
              value={currentValues[idx] / 1e9}
              onChange={(e) => updateYear(idx, e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-1 py-1 text-[11px] text-center text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
        ))}
      </div>
      <p className="text-[9px] text-slate-500 italic leading-tight">
        Valeurs en Milliards d&apos;euros. 2026 doit idéalement correspondre à l'impact fixe.
      </p>
    </div>
  );
};

// --- DIFF LOGIC ---

type DiffLine = { type: 'add' | 'remove' | 'same', text: string };

export function simpleDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];
  
  let i = 0, j = 0;
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      result.push({ type: 'same', text: oldLines[i] });
      i++; j++;
    } else if (i < oldLines.length && (j >= newLines.length || !newLines.slice(j).includes(oldLines[i]))) {
      result.push({ type: 'remove', text: oldLines[i] });
      i++;
    } else if (j < newLines.length) {
      result.push({ type: 'add', text: newLines[j] });
      j++;
    }
  }
  return result;
}

const DiffModal = ({ oldText, newText, onConfirm, onCancel }: { oldText: string, newText: string, onConfirm: () => void, onCancel: () => void }) => {
  const lines = useMemo(() => simpleDiff(oldText, newText), [oldText, newText]);
  const hasChanges = lines.some(l => l.type !== 'same');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400">
            <FileText size={20} />
            <h2 className="text-lg font-bold">Révision des changements (YAML)</h2>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs leading-relaxed">
          {!hasChanges ? (
            <div className="h-full flex items-center justify-center text-slate-500 italic">Aucun changement détecté.</div>
          ) : (
            lines.map((line, idx) => (
              <div key={idx} className={`whitespace-pre-wrap px-2 ${ 
                line.type === 'add' ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500' :
                line.type === 'remove' ? 'bg-rose-500/10 text-rose-400 border-l-2 border-rose-500 line-through opacity-50' :
                'text-slate-500'
              }`}>
                <span className="inline-block w-6 select-none opacity-30">{line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}</span>
                {line.text || ' '}
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800">Annuler</button>
          <button 
            onClick={onConfirm} 
            disabled={!hasChanges}
            className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-bold shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Check size={16} /> Confirmer et Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

// --- UTILS ---

function normalizeMapping(value: any): Record<string, number> {
  const out: Record<string, number> = {};
  if (!value || typeof value !== 'object') return out;
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
    impact_schedule_eur: Array.isArray(raw?.impact_schedule_eur) ? raw.impact_schedule_eur.map(Number) : undefined,
    budget_side: raw?.budget_side ? String(raw.budget_side) : undefined,
    dimension: raw?.dimension ? String(raw.dimension) : undefined,
    major_amendment: raw?.major_amendment ?? undefined,
    popularity: raw?.popularity ?? undefined,
    active: raw?.active === false ? false : true,
    cofog_mapping: normalizeMapping(raw?.cofog_mapping ?? raw?.mass_mapping),
    mission_mapping: normalizeMapping(raw?.mission_mapping),
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
  if (active === false) out.active = false;
  return out;
}

function dumpYaml(data: Lever[]): string {
  return yaml.dump(data.map(serializeLever), { noRefs: true, sortKeys: false, lineWidth: 120 });
}

function parseYaml(text: string): Lever[] {
  const parsed = yaml.load(text);
  if (!Array.isArray(parsed)) throw new Error('Le YAML doit contenir une liste de leviers.');
  return parsed.map(normalizeLever);
}

// --- MAIN CLIENT COMPONENT ---

export default function PolicyCatalogAdminClient() {
  const [yamlText, setYamlText] = useState('');
  const [initialYamlText, setInitialYamlText] = useState('');
  const [rawDirty, setRawDirty] = useState(false);
  const [catalog, setCatalog] = useState<Lever[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Filtering & Sorting
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState('ALL');
  const [cofogFilter, setCofogFilter] = useState('ALL');
  const [missionFilter, setMissionFilter] = useState('ALL');
  const [issueFilter, setIssueFilter] = useState<'ALL' | 'MISSING_SOURCE' | 'MISSING_MAPPING' | 'ZERO_IMPACT'>('ALL');
  const [sortKey, setSortKey] = useState('order');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<'table' | 'mission' | 'yaml'>('table');
  
  const [missionLabelMap, setMissionLabelMap] = useState<Record<string, string>>({});

  const fetchCatalog = async () => {
    setLoading(true); setLoadError(null); setStatus(null);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['x-admin-token'] = token;
      const res = await fetch('/api/admin/policy-catalog', { headers, cache: 'no-store' });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const text = await res.text();
      setCatalog(parseYaml(text));
      setYamlText(text);
      setInitialYamlText(text);
      setParseError(null); setRawDirty(false);
    } catch (err: any) { setLoadError(err.message); } finally { setLoading(false); }
  };

  const validateCatalog = async () => {
    setValidating(true); setErrors([]); setStatus(null);
    try {
      const payloadYaml = view === 'yaml' ? yamlText : dumpYaml(catalog);
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (token) headers['x-admin-token'] = token;
      const res = await fetch('/api/admin/policy-catalog', {
        method: 'POST', headers, body: JSON.stringify({ yaml: payloadYaml }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.errors?.join('\n') || `HTTP ${res.status}`);
      setErrors(payload.errors || []);
      setStatus(payload.errors?.length === 0 ? 'Validation OK.' : 'Validation failed.');
    } catch (err: any) { setErrors([err.message]); setStatus('Validation failed.'); } finally { setValidating(false); }
  };

  const executeSave = async () => {
    setSaving(true); setErrors([]); setStatus(null);
    try {
      const payloadYaml = view === 'yaml' ? yamlText : dumpYaml(catalog);
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (token) headers['x-admin-token'] = token;
      const res = await fetch('/api/admin/policy-catalog', {
        method: 'PUT', headers, body: JSON.stringify({ yaml: payloadYaml }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.errors?.join('\n') || `HTTP ${res.status}`);
      setYamlText(payloadYaml);
      setInitialYamlText(payloadYaml);
      setRawDirty(false);
      setShowDiff(false);
      try { setCatalog(parseYaml(payloadYaml)); } catch {}
      setStatus(`Enregistré. Backup: ${payload.backup_path || 'N/A'}`);
    } catch (err: any) { setErrors([err.message]); setStatus('Échec sauvegarde.'); } finally { setSaving(false); }
  };

  const handleSaveClick = () => {
    setShowDiff(true);
  };

  const handleHeaderSort = (key: string) => {
    if (sortKey === key) { setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); } 
    else { setSortKey(key); setSortDir('asc'); }
  };

  const updateLever = (id: string, updater: (lever: Lever) => Lever) => {
    const next = catalog.map((item) => (item.id === id ? updater(item) : item));
    setCatalog(next);
    if (view === 'yaml' && !rawDirty) setYamlText(dumpYaml(next));
  };

  useEffect(() => { fetchCatalog(); }, []);

  useEffect(() => {
    const loadMissionLabels = async () => {
      try {
        const data = await gqlRequest(`query MissionLabels { missionLabels { id displayLabel } }`);
        const next: Record<string, string> = {};
        (data?.missionLabels || []).forEach((e: any) => next[String(e.id)] = String(e.displayLabel || e.id));
        setMissionLabelMap(next);
      } catch { setMissionLabelMap({}); }
    };
    loadMissionLabels();
  }, []);

  const filteredRows = useMemo(() => {
    const rows = catalog.map((lever, index) => ({ lever, index }));
    const q = search.trim().toLowerCase();
    const filtered = rows.filter(({ lever }) => {
      if (familyFilter !== 'ALL' && lever.family !== familyFilter) return false;
      if (issueFilter === 'MISSING_SOURCE') { if (lever.sources?.some(s => s.includes('http'))) return false; }
      if (issueFilter === 'MISSING_MAPPING') { if (Object.keys(lever.mission_mapping || {}).length > 0) return false; }
      if (issueFilter === 'ZERO_IMPACT') { if (lever.fixed_impact_eur !== 0) return false; }
      
      if (cofogFilter !== 'ALL') {
        if (cofogFilter === 'NONE') { if (Object.keys(lever.cofog_mapping || {}).length > 0) return false; }
        else if (lever.cofog_mapping?.[cofogFilter] === undefined) return false;
      }
      if (missionFilter !== 'ALL') {
        if (missionFilter === 'NONE') { if (Object.keys(lever.mission_mapping || {}).length > 0) return false; }
        else if (lever.mission_mapping?.[missionFilter] === undefined) return false;
      }
      if (!q) return true;
      return `${lever.id} ${lever.label} ${lever.description}`.toLowerCase().includes(q);
    });

    if (sortKey === 'order') return filtered;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let av: any = a.lever[sortKey as keyof Lever] ?? '';
      let bv: any = b.lever[sortKey as keyof Lever] ?? '';
      if (sortKey === 'impact') { av = a.lever.fixed_impact_eur; bv = b.lever.fixed_impact_eur; }
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [catalog, search, familyFilter, cofogFilter, missionFilter, sortKey, sortDir, issueFilter]);

  const activeLever = activeId ? catalog.find(l => l.id === activeId) : null;

  return (
    <div className="h-full overflow-hidden flex flex-col bg-slate-950 text-slate-100">
      {showDiff && (
        <DiffModal 
          oldText={initialYamlText} 
          newText={view === 'yaml' ? yamlText : dumpYaml(catalog)} 
          onConfirm={executeSave} 
          onCancel={() => setShowDiff(false)} 
        />
      )}

      <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Policy Catalog Back-Office</h1>
          <p className="text-xs text-slate-500">Gérez les leviers, trajectoires et sources.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchCatalog} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs" disabled={loading}>Recharger</button>
          <button onClick={validateCatalog} className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-xs" disabled={validating}>Valider</button>
          <button onClick={handleSaveClick} className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs" disabled={saving}>Enregistrer</button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex">
        {/* LIST PANEL */}
        <section className="w-2/3 border-r border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="flex gap-2">
              <input value={search} onChange={e => setSearch(e.target.value)} className={inputClass} placeholder="Recherche..." />
              <select value={issueFilter} onChange={e => setIssueFilter(e.target.value as any)} className="bg-slate-900 border border-slate-800 rounded-lg px-2 text-sm">
                <option value="ALL">Tous les statuts</option>
                <option value="MISSING_SOURCE">Source manquante</option>
                <option value="MISSING_MAPPING">Mapping manquant</option>
                <option value="ZERO_IMPACT">Impact nul</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={familyFilter} onChange={e => setFamilyFilter(e.target.value)} className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs">
                <option value="ALL">Toutes les familles</option>
                {FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <div className="flex-1" />
              <div className="flex gap-1">
                <button onClick={() => setView('table')} className={`px-3 py-1 rounded text-xs ${view === 'table' ? 'bg-indigo-600' : 'bg-slate-800'}`}>Liste</button>
                <button onClick={() => setView('mission')} className={`px-3 py-1 rounded text-xs ${view === 'mission' ? 'bg-indigo-600' : 'bg-slate-800'}`}>Missions</button>
                <button onClick={() => setView('yaml')} className={`px-3 py-1 rounded text-xs ${view === 'yaml' ? 'bg-indigo-600' : 'bg-slate-800'}`}>YAML</button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {view === 'yaml' ? (
              <textarea value={yamlText} onChange={e => { setYamlText(e.target.value); setRawDirty(true); }} className="w-full h-full p-4 bg-slate-950 font-mono text-sm" />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-900 sticky top-0 z-10 shadow-sm backdrop-blur-sm">
                  <tr>
                    <SortHeader label="ID" id="id" currentKey={sortKey} currentDir={sortDir} onSort={handleHeaderSort} />
                    <SortHeader label="Famille" id="family" currentKey={sortKey} currentDir={sortDir} onSort={handleHeaderSort} />
                    <SortHeader label="Label" id="label" currentKey={sortKey} currentDir={sortDir} onSort={handleHeaderSort} />
                    <SortHeader label="Impact" id="impact" currentKey={sortKey} currentDir={sortDir} onSort={handleHeaderSort} />
                    <th className="px-3 py-2 text-center">Q</th>
                    <th className="px-3 py-2 text-center">Src</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(({ lever }) => (
                    <tr key={lever.id} onClick={() => setActiveId(lever.id)} className={`border-t border-slate-800/50 cursor-pointer ${activeId === lever.id ? 'bg-indigo-500/10' : 'hover:bg-slate-900'}`}>
                      <td className="px-3 py-2 font-mono text-xs text-slate-400">{lever.id}</td>
                      <td className="px-3 py-2 text-xs">{lever.family}</td>
                      <td className="px-3 py-2 font-medium">{lever.label}</td>
                      <td className={`px-3 py-2 text-right font-mono ${lever.fixed_impact_eur >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {(lever.fixed_impact_eur / 1e9).toFixed(1)} Md€
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex gap-1 justify-center">
                          {Object.keys(lever.mission_mapping).length === 0 && <QualityBadge type="error" tooltip="Mapping manquant" />}
                          {lever.fixed_impact_eur === 0 && <QualityBadge type="warning" tooltip="Impact nul" />}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {lever.sources?.some(s => s.includes('http')) ? <LinkIcon size={14} className="text-blue-400 mx-auto" /> : <span className="text-slate-600">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* EDITOR PANEL */}
        <section className="w-1/3 bg-slate-900/30 p-6 overflow-y-auto space-y-6">
          {activeLever ? (
            <>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Identification</label>
                <input value={activeLever.id} readOnly className={`${inputClass} opacity-50 cursor-not-allowed`} />
                <input value={activeLever.label} onChange={e => updateLever(activeLever.id, l => ({ ...l, label: e.target.value }))} className={inputClass} placeholder="Libellé" />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Description</label>
                <textarea value={activeLever.description} onChange={e => updateLever(activeLever.id, l => ({ ...l, description: e.target.value }))} className={`${textareaClass} h-32`} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Impact Annuel (Md€)</label>
                  <input type="number" step="0.1" value={activeLever.fixed_impact_eur / 1e9} onChange={e => updateLever(activeLever.id, l => ({ ...l, fixed_impact_eur: Number(e.target.value) * 1e9 }))} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Budget Side</label>
                  <select value={activeLever.budget_side || ''} onChange={e => updateLever(activeLever.id, l => ({ ...l, budget_side: e.target.value || undefined }))} className={inputClass}>
                    <option value="">Auto</option>
                    {BUDGET_SIDES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <TrajectoryEditor fixed={activeLever.fixed_impact_eur} schedule={activeLever.impact_schedule_eur} onChange={next => updateLever(activeLever.id, l => ({ ...l, impact_schedule_eur: next }))} />
              
              <SourceManager sources={activeLever.sources || []} onChange={next => updateLever(activeLever.id, l => ({ ...l, sources: next }))} />

              <div className="space-y-4 p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Faisabilité</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={activeLever.feasibility.law} onChange={e => updateLever(activeLever.id, l => ({ ...l, feasibility: { ...l.feasibility, law: e.target.checked } }))} /> Loi requise</label>
                  <div className="flex-1 flex items-center gap-2"><span className="text-xs text-slate-400">Délai:</span><input type="number" value={activeLever.feasibility.adminLagMonths} onChange={e => updateLever(activeLever.id, l => ({ ...l, feasibility: { ...l.feasibility, adminLagMonths: Number(e.target.value) } }))} className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs" /></div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-600 italic">Sélectionnez un levier pour l&apos;éditer</div>
          )}
        </section>
      </div>
    </div>
  );
}
