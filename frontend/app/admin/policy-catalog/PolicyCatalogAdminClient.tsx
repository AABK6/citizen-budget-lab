'use client';

import { useEffect, useMemo, useState } from 'react';
import yaml from 'js-yaml';
import { gqlRequest } from '@/lib/graphql';
import {
  ArrowDown, ArrowUp, ArrowUpDown,
  AlertCircle, Link as LinkIcon, AlertTriangle,
  Filter, Trash2, Plus, ExternalLink, TrendingUp,
  Check, X, FileText, BarChart3, Users, Globe, ShieldAlert,
  Search, List, LayoutGrid, Database
} from 'lucide-react';

// --- INTERFACES ---

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

interface Pushback {
  type: string;
  description: string;
  source?: string;
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
  pushbacks: Pushback[];
  params_schema: Record<string, any>;
  impact?: Impact;
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
  'w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600';

const textareaClass =
  'w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all';

const sectionHeaderClass =
  'text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2 flex items-center gap-2';

// --- HELPER COMPONENTS ---

const SortHeader = ({ label, id, currentKey, currentDir, onSort }: { label: string, id: string, currentKey: string, currentDir: string, onSort: (id: string) => void }) => {
  const isActive = currentKey === id;
  return (
    <th
      className={`px-3 py-2 text-left cursor-pointer hover:bg-slate-800 transition-colors select-none group ${isActive ? 'bg-slate-800/50' : ''}`}
      onClick={() => onSort(id)}
    >
      <div className="flex items-center gap-1">
        <span className={isActive ? 'text-indigo-400' : ''}>{label}</span>
        <span className={`text-slate-500 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
          {isActive ? (currentDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
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
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max max-w-[200px] px-2 py-1 bg-slate-800 text-slate-200 text-[10px] rounded shadow-xl z-50 pointer-events-none border border-slate-700">
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
        <label className={sectionHeaderClass}><LinkIcon size={12} /> Sources & Liens</label>
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

export const PushbackManager = ({ pushbacks, onChange }: { pushbacks: Pushback[], onChange: (next: Pushback[]) => void }) => {
  const updatePb = (index: number, field: keyof Pushback, val: string) => {
    const next = [...pushbacks];
    next[index] = { ...next[index], [field]: val };
    onChange(next);
  };
  const removePb = (index: number) => {
    onChange(pushbacks.filter((_, i) => i !== index));
  };
  const addPb = () => {
    onChange([...pushbacks, { type: 'social', description: '' }]);
  };

  return (
    <div className="space-y-3 p-4 rounded-xl border border-slate-800 bg-slate-900/50">
      <div className="flex items-center justify-between">
        <label className={sectionHeaderClass}><ShieldAlert size={12} /> Risques & Vigilance</label>
        <button onClick={addPb} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[10px] uppercase font-bold">
          <Plus size={12} /> Ajouter
        </button>
      </div>
      {pushbacks.map((pb, idx) => (
        <div key={idx} className="space-y-2 pb-3 border-b border-slate-800 last:border-0 relative group">
          <div className="flex gap-2">
            <select
              value={pb.type}
              onChange={(e) => updatePb(idx, 'type', e.target.value)}
              className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-300"
            >
              <option value="social">Social</option>
              <option value="economic">Éco</option>
              <option value="legal">Juridique</option>
              <option value="political">Politique</option>
            </select>
            <input
              value={pb.source || ''}
              onChange={(e) => updatePb(idx, 'source', e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-300"
              placeholder="Source du risque (ex: Sénat)"
            />
            <button onClick={() => removePb(idx)} className="text-slate-600 hover:text-rose-500"><Trash2 size={14}/></button>
          </div>
          <textarea
            value={pb.description}
            onChange={(e) => updatePb(idx, 'description', e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 h-16"
            placeholder="Description du point de vigilance..."
          />
        </div>
      ))}
      {pushbacks.length === 0 && <p className="text-[10px] text-slate-600 italic">Aucun risque documenté.</p>}
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
              className="w-full bg-slate-950 border border-slate-700 rounded px-1 py-1 text-[11px] text-center text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
        ))}
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
    pushbacks: Array.isArray(raw?.pushbacks) ? raw.pushbacks.map((pb: any) => ({
      type: String(pb.type || 'social'),
      description: String(pb.description || ''),
      source: pb.source ? String(pb.source) : undefined
    })) : [],
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
      if (issueFilter === 'MISSING_SOURCE') { if (!lever.sources?.some(s => s.includes('http'))) return false; }
      if (issueFilter === 'MISSING_MAPPING') { if (Object.keys(lever.mission_mapping || {}).length > 0) return false; }
      if (issueFilter === 'ZERO_IMPACT') { if (lever.fixed_impact_eur !== 0) return false; }

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
  }, [catalog, search, familyFilter, missionFilter, sortKey, sortDir, issueFilter]);

  const activeLever = activeId ? catalog.find(l => l.id === activeId) : null;

  const missionColumns = useMemo(() => {
    const ids = new Set<string>();
    catalog.forEach(l => Object.keys(l.mission_mapping || {}).forEach(m => ids.add(m)));
    return Array.from(ids).sort().map(id => ({ id, label: missionLabelMap[id] || id }));
  }, [catalog, missionLabelMap]);

  return (
    <div className="h-full overflow-hidden flex flex-col bg-slate-950 text-slate-100 font-sans">
      <style jsx global>{`
        option {
          background-color: #0f172a !important; /* slate-900 */
          color: white !important;
        }
      `}</style>
      {showDiff && (
        <DiffModal oldText={initialYamlText} newText={view === 'yaml' ? yamlText : dumpYaml(catalog)} onConfirm={executeSave} onCancel={() => setShowDiff(false)} />
      )}

      <header className="px-6 py-3 border-b border-slate-800 bg-slate-900 shadow-xl flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-inner"><Database size={20} className="text-white"/></div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Policy Catalog <span className="text-indigo-400">Back-Office</span></h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Admin Console • {catalog.length} leviers</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-slate-800 rounded-lg p-1 mr-4 border border-slate-700">
            <button onClick={() => setView('table')} className={`px-3 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${view === 'table' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><List size={14}/> LISTE</button>
            <button onClick={() => setView('mission')} className={`px-3 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${view === 'mission' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><LayoutGrid size={14}/> MISSIONS</button>
            <button onClick={() => setView('yaml')} className={`px-3 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${view === 'yaml' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><FileText size={14}/> YAML</button>
          </div>
          <button onClick={fetchCatalog} className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold border border-slate-700 transition-all" disabled={loading}>RECHARGER</button>
          <button onClick={validateCatalog} className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold shadow-lg shadow-indigo-900/20 transition-all" disabled={validating}>VALIDER</button>
          <button onClick={() => setShowDiff(true)} className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold shadow-lg shadow-emerald-900/20 transition-all" disabled={saving}>ENREGISTRER</button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex">
        {/* LIST PANEL */}
        <section className="flex-1 border-r border-slate-800 flex flex-col bg-slate-950">
          <div className="p-4 bg-slate-900/30 border-b border-slate-800 space-y-3 shadow-inner">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input value={search} onChange={e => setSearch(e.target.value)} className={`${inputClass} pl-10 h-10`} placeholder="Rechercher par ID, Libellé ou Description..." />
              </div>
              <select value={issueFilter} onChange={e => setIssueFilter(e.target.value as any)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/50">
                <option value="ALL">Tout le catalogue</option>
                <option value="MISSING_SOURCE">⚠️ Source manquante</option>
                <option value="MISSING_MAPPING">🚫 Mapping manquant</option>
                <option value="ZERO_IMPACT">ℹ️ Impact nul</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-slate-500" />
                <select value={familyFilter} onChange={e => setFamilyFilter(e.target.value)} className="bg-transparent text-xs font-bold text-slate-300 outline-none hover:text-white transition-colors">
                  <option value="ALL">TOUTES LES FAMILLES</option>
                  {FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="h-4 w-px bg-slate-800" />
              <div className="flex items-center gap-2">
                <LayoutGrid size={14} className="text-slate-500" />
                <select value={missionFilter} onChange={e => setMissionFilter(e.target.value)} className="bg-transparent text-xs font-bold text-slate-300 outline-none hover:text-white transition-colors">
                  <option value="ALL">TOUTES LES MISSIONS</option>
                  {missionColumns.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
              <div className="flex-1" />
              <p className="text-[10px] text-slate-500 font-mono">{filteredRows.length} résultats sur {catalog.length}</p>
            </div>
          </div>

          <div className="flex-1 overflow-auto relative">
            {view === 'yaml' ? (
              <textarea value={yamlText} onChange={e => { setYamlText(e.target.value); setRawDirty(true); }} className="w-full h-full p-6 bg-slate-950 font-mono text-sm leading-relaxed text-slate-300 outline-none" spellCheck={false} />
            ) : view === 'mission' ? (
              <div className="p-0">
                <table className="w-full text-[11px] border-separate border-spacing-0">
                  <thead className="bg-slate-900 sticky top-0 z-10 shadow">
                    <tr>
                      <th className="p-3 text-left border-b border-slate-800 w-64 bg-slate-900">Levier</th>
                      {missionColumns.map(m => (
                        <th key={m.id} className="p-2 text-center border-b border-slate-800 min-w-[80px] group">
                          <div className="rotate-[-45deg] origin-bottom-left translate-y-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]" title={m.label}>{m.label}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map(({ lever }) => (
                      <tr key={lever.id} className={`hover:bg-slate-900/50 group ${activeId === lever.id ? 'bg-indigo-500/5' : ''}`} onClick={() => setActiveId(lever.id)}>
                        <td className="p-3 border-b border-slate-800/50 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]" title={lever.label}>{lever.label}</td>
                        {missionColumns.map(m => {
                          const val = lever.mission_mapping?.[m.id];
                          return (
                            <td key={m.id} className={`p-2 text-center border-b border-slate-800/50 border-r border-slate-800/20 font-mono ${val ? 'bg-indigo-500/10 text-indigo-300 font-bold' : 'text-slate-700'}`}>
                              {val ? val.toFixed(2) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead className="bg-slate-900 sticky top-0 z-10 shadow">
                  <tr>
                    <SortHeader label="ID" id="id" currentKey={sortKey} currentDir={sortDir} onSort={handleHeaderSort} />
                    <SortHeader label="FAMILLE" id="family" currentKey={sortKey} currentDir={sortDir} onSort={handleHeaderSort} />
                    <SortHeader label="LABEL" id="label" currentKey={sortKey} currentDir={sortDir} onSort={handleHeaderSort} />
                    <SortHeader label="IMPACT" id="impact" currentKey={sortKey} currentDir={sortDir} onSort={handleHeaderSort} />
                    <th className="px-3 py-2 text-center border-b border-slate-800">Q</th>
                    <th className="px-3 py-2 text-center border-b border-slate-800">SRC</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-950">
                  {filteredRows.map(({ lever }) => (
                    <tr key={lever.id} onClick={() => setActiveId(lever.id)} className={`group border-b border-slate-800/50 cursor-pointer transition-colors ${activeId === lever.id ? 'bg-indigo-500/10' : 'hover:bg-slate-900'}`}>
                      <td className="px-3 py-3 font-mono text-[10px] text-slate-500 border-b border-slate-800/50 group-hover:text-slate-300">{lever.id}</td>
                      <td className="px-3 py-3 border-b border-slate-800/50"><span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-400">{lever.family}</span></td>
                      <td className="px-3 py-3 font-medium text-slate-200 border-b border-slate-800/50">{lever.label}</td>
                      <td className={`px-3 py-3 text-right font-mono text-xs border-b border-slate-800/50 ${lever.fixed_impact_eur >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {(lever.fixed_impact_eur / 1e9).toFixed(1)} Md€
                      </td>
                      <td className="px-3 py-3 text-center border-b border-slate-800/50">
                        <div className="flex gap-1 justify-center">
                          {Object.keys(lever.mission_mapping).length === 0 && <QualityBadge type="error" tooltip="Mapping Mission manquant" />}
                          {lever.fixed_impact_eur === 0 && <QualityBadge type="warning" tooltip="Impact nul" />}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center border-b border-slate-800/50">
                        {lever.sources?.some(s => s.includes('http')) ? <LinkIcon size={14} className="text-blue-400 mx-auto" /> : <span className="text-slate-700">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* EDITOR PANEL */}
        <section className="w-[450px] bg-slate-900 border-l border-slate-800 overflow-y-auto z-10 shadow-2xl">
          {activeLever ? (
            <div className="p-6 space-y-8 animate-in slide-in-from-right duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">Édition du levier</h2>
                  <div className="flex gap-2">
                    <button className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all" title="Dupliquer"><LayoutGrid size={16}/></button>
                    <button className="p-2 rounded bg-slate-800 hover:bg-rose-900 text-slate-400 hover:text-rose-400 transition-all" title="Supprimer"><Trash2 size={16}/></button>
                  </div>
                </div>
                <div className="space-y-3 p-4 rounded-xl border border-slate-800 bg-slate-950/50 shadow-inner">
                  <div className="space-y-1">
                    <label className={sectionHeaderClass}>ID & Famille</label>
                    <div className="flex gap-2">
                      <input value={activeLever.id} readOnly className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-slate-500 opacity-70 cursor-not-allowed" />
                      <select value={activeLever.family} onChange={e => updateLever(activeLever.id, l => ({ ...l, family: e.target.value }))} className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] font-bold text-indigo-400">
                        {FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className={sectionHeaderClass}>Libellé principal</label>
                    <input value={activeLever.label} onChange={e => updateLever(activeLever.id, l => ({ ...l, label: e.target.value }))} className={`${inputClass} font-bold`} placeholder="Libellé long..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={sectionHeaderClass}>Short Label</label>
                      <input value={activeLever.short_label || ''} onChange={e => updateLever(activeLever.id, l => ({ ...l, short_label: e.target.value }))} className={inputClass} placeholder="ISF, Retraites..." />
                    </div>
                    <div className="space-y-1">
                      <label className={sectionHeaderClass}>Popularité (0-1)</label>
                      <input type="number" step="0.1" value={activeLever.popularity || 0} onChange={e => updateLever(activeLever.id, l => ({ ...l, popularity: Number(e.target.value) }))} className={inputClass} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className={sectionHeaderClass}><FileText size={12} /> Description</label>
                <textarea value={activeLever.description} onChange={e => updateLever(activeLever.id, l => ({ ...l, description: e.target.value }))} className={`${textareaClass} h-32 text-xs leading-relaxed`} placeholder="Expliquez la mesure, son périmètre et ses enjeux..." />
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={sectionHeaderClass}><BarChart3 size={12}/> Impact Annuel</label>
                    <div className="relative">
                      <input type="number" step="0.1" value={activeLever.fixed_impact_eur / 1e9} onChange={e => updateLever(activeLever.id, l => ({ ...l, fixed_impact_eur: Number(e.target.value) * 1e9 }))} className={`${inputClass} font-mono`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">Md€</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className={sectionHeaderClass}>Côté Budget</label>
                    <select value={activeLever.budget_side || ''} onChange={e => updateLever(activeLever.id, l => ({ ...l, budget_side: e.target.value || undefined }))} className={inputClass}>
                      <option value="">Auto (Family)</option>
                      {BUDGET_SIDES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <TrajectoryEditor fixed={activeLever.fixed_impact_eur} schedule={activeLever.impact_schedule_eur} onChange={next => updateLever(activeLever.id, l => ({ ...l, impact_schedule_eur: next }))} />
              </div>

              <div className="space-y-4 p-4 rounded-xl border border-slate-800 bg-slate-950/50">
                <label className={sectionHeaderClass}><Globe size={12}/> Impacts Macro & Sociaux</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase font-bold">PIB (pts %)</label>
                    <input type="number" step="0.01" value={activeLever.impact?.gdpImpactPct || 0} onChange={e => updateLever(activeLever.id, l => ({ ...l, impact: { ...l.impact, gdpImpactPct: Number(e.target.value) } }))} className={`${inputClass} text-xs`} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase font-bold">Emplois</label>
                    <input type="number" value={activeLever.impact?.jobsImpactCount || 0} onChange={e => updateLever(activeLever.id, l => ({ ...l, impact: { ...l.impact, jobsImpactCount: Number(e.target.value) } }))} className={`${inputClass} text-xs`} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase font-bold">Ménages impactés</label>
                    <input type="number" value={activeLever.impact?.householdsImpacted || 0} onChange={e => updateLever(activeLever.id, l => ({ ...l, impact: { ...l.impact, householdsImpacted: Number(e.target.value) } }))} className={`${inputClass} text-xs`} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase font-bold">D10 (Riches) €</label>
                    <input type="number" value={activeLever.impact?.decile10ImpactEur || 0} onChange={e => updateLever(activeLever.id, l => ({ ...l, impact: { ...l.impact, decile10ImpactEur: Number(e.target.value) } }))} className={`${inputClass} text-xs`} />
                  </div>
                </div>
              </div>

              <PushbackManager pushbacks={activeLever.pushbacks || []} onChange={next => updateLever(activeLever.id, l => ({ ...l, pushbacks: next }))} />

              <SourceManager sources={activeLever.sources || []} onChange={next => updateLever(activeLever.id, l => ({ ...l, sources: next }))} />

              <div className="space-y-4 p-4 rounded-xl border border-slate-800 bg-slate-900/50 shadow-lg">
                <label className={sectionHeaderClass}><ShieldAlert size={12}/> Paramètres de Mise en œuvre</label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer"><input type="checkbox" checked={activeLever.feasibility.law} onChange={e => updateLever(activeLever.id, l => ({ ...l, feasibility: { ...l.feasibility, law: e.target.checked } }))} className="rounded border-slate-700 bg-slate-950 text-indigo-500" /> Loi requise</label>
                  <div className="flex items-center gap-2"><span className="text-[10px] text-slate-500 uppercase font-bold">Délai Admin:</span><input type="number" value={activeLever.feasibility.adminLagMonths} onChange={e => updateLever(activeLever.id, l => ({ ...l, feasibility: { ...l.feasibility, adminLagMonths: Number(e.target.value) } }))} className="w-12 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-center font-mono" /></div>
                </div>
                <textarea value={activeLever.feasibility.notes || ''} onChange={e => updateLever(activeLever.id, l => ({ ...l, feasibility: { ...l.feasibility, notes: e.target.value } }))} className={`${textareaClass} text-[10px] h-16`} placeholder="Notes sur la faisabilité..." />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-4">
              <div className="bg-slate-800/50 p-4 rounded-full"><Search size={48} className="opacity-20"/></div>
              <p className="italic text-sm">Sélectionnez un levier dans la liste pour l&apos;éditer</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const DiffLineItem = ({ line }: { line: DiffLine }) => (
  <div className={`whitespace-pre-wrap px-2 font-mono text-[11px] leading-tight ${ 
    line.type === 'add' ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500' :
    line.type === 'remove' ? 'bg-rose-500/10 text-rose-400 border-l-2 border-rose-500 line-through opacity-50' :
    'text-slate-500 opacity-80'
  }`}>
    <span className="inline-block w-6 select-none opacity-30">{line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
    </span>
    {line.text || ' '}
  </div>
);

const DiffModal = ({ oldText, newText, onConfirm, onCancel }: { oldText: string, newText: string, onConfirm: () => void, onCancel: () => void }) => {
  const lines = useMemo(() => simpleDiff(oldText, newText), [oldText, newText]);
  const hasChanges = lines.some(l => l.type !== 'same');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2 text-emerald-400">
            <FileText size={20} />
            <h2 className="text-lg font-bold">Révision des changements (YAML)</h2>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
        </div>
        
        <div className="flex-1 overflow-auto p-6 bg-slate-950 shadow-inner">
          {!hasChanges ? (
            <div className="h-full flex items-center justify-center text-slate-500 italic">Aucun changement détecté.</div>
          ) : (
            <div className="space-y-px">
              {lines.map((line, idx) => <DiffLineItem key={idx} line={line} />)}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex justify-between items-center">
          <p className="text-xs text-slate-500 italic">Les modifications seront écrites directement dans data/policy_levers.yaml</p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="px-6 py-2 rounded-lg text-sm font-bold text-slate-400 hover:bg-slate-800 transition-all">ANNULER</button>
            <button onClick={onConfirm} disabled={!hasChanges} className="px-8 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white shadow-lg shadow-emerald-900/40 disabled:opacity-50 transition-all flex items-center gap-2 uppercase tracking-wide">
              <Check size={18} /> CONFIRMER L&apos;ENREGISTREMENT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};