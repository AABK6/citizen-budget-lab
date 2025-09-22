import { useMemo, useReducer } from 'react';
import type { ScenarioResult } from '@/lib/types';
import type {
  BuildLens,
  LegoPiece,
  MassCategory,
  PolicyLever,
  PopularIntent,
} from './types';

export type BuildState = {
  year: number;
  initialLoading: boolean;
  scenarioLoading: boolean;
  error: string | null;
  scenarioError: string | null;
  scenarioResult: ScenarioResult | null;
  scenarioId: string | null;
  spendingPieces: LegoPiece[];
  revenuePieces: LegoPiece[];
  masses: MassCategory[];
  policyLevers: PolicyLever[];
  popularIntents: PopularIntent[];
  isPanelExpanded: boolean;
  isRevenuePanelExpanded: boolean;
  selectedCategory: MassCategory | null;
  selectedRevenueCategory: LegoPiece | null;
  suggestedLevers: PolicyLever[];
  targetInput: string;
  revenueTargetInput: string;
  lens: BuildLens;
  expandedFamilies: string[];
};

type BuildAction =
  | { type: 'SET_YEAR'; year: number }
  | { type: 'PATCH'; payload: Partial<BuildState> }
  | { type: 'SET_SCENARIO_RESULT'; result: ScenarioResult | null; scenarioId?: string }
  | { type: 'SET_SELECTED_CATEGORY'; category: MassCategory | null }
  | { type: 'SET_SELECTED_REVENUE_CATEGORY'; category: LegoPiece | null }
  | { type: 'TOGGLE_PANEL'; expanded?: boolean }
  | { type: 'TOGGLE_REVENUE_PANEL'; expanded?: boolean }
  | { type: 'SET_LENS'; lens: BuildLens }
  | { type: 'TOGGLE_FAMILY'; value: string }
  | { type: 'RESET_EXPANDED_FAMILIES'; values?: string[] };

function reducer(state: BuildState, action: BuildAction): BuildState {
  switch (action.type) {
    case 'SET_YEAR':
      return { ...state, year: action.year };
    case 'PATCH':
      return { ...state, ...action.payload };
    case 'SET_SCENARIO_RESULT':
      return {
        ...state,
        scenarioResult: action.result,
        scenarioId: action.scenarioId ?? state.scenarioId,
        scenarioLoading: false,
        scenarioError: null,
      };
    case 'SET_SELECTED_CATEGORY':
      return { ...state, selectedCategory: action.category };
    case 'SET_SELECTED_REVENUE_CATEGORY':
      return { ...state, selectedRevenueCategory: action.category };
    case 'TOGGLE_PANEL':
      return { ...state, isPanelExpanded: action.expanded ?? !state.isPanelExpanded };
    case 'TOGGLE_REVENUE_PANEL':
      return { ...state, isRevenuePanelExpanded: action.expanded ?? !state.isRevenuePanelExpanded };
    case 'SET_LENS':
      return { ...state, lens: action.lens };
    case 'TOGGLE_FAMILY': {
      const exists = state.expandedFamilies.includes(action.value);
      return {
        ...state,
        expandedFamilies: exists
          ? state.expandedFamilies.filter((f) => f !== action.value)
          : [...state.expandedFamilies, action.value],
      };
    }
    case 'RESET_EXPANDED_FAMILIES':
      return { ...state, expandedFamilies: action.values ?? [] };
    default:
      return state;
  }
}

function createInitialState(initialYear: number): BuildState {
  return {
    year: initialYear,
    initialLoading: true,
    scenarioLoading: false,
    error: null,
    scenarioError: null,
    scenarioResult: null,
    scenarioId: null,
    spendingPieces: [],
    revenuePieces: [],
    masses: [],
    policyLevers: [],
    popularIntents: [],
    isPanelExpanded: false,
    isRevenuePanelExpanded: false,
    selectedCategory: null,
    selectedRevenueCategory: null,
    suggestedLevers: [],
    targetInput: '',
    revenueTargetInput: '',
    lens: 'mass',
    expandedFamilies: [],
  };
}

export function useBuildState(initialYear: number) {
  const [state, dispatch] = useReducer(reducer, initialYear, createInitialState);

  const actions = useMemo(
    () => ({
      setYear: (year: number) => dispatch({ type: 'SET_YEAR', year }),
      setInitialLoading: (value: boolean) =>
        dispatch({ type: 'PATCH', payload: { initialLoading: value } }),
      setError: (message: string | null) =>
        dispatch({ type: 'PATCH', payload: { error: message } }),
      setScenarioError: (message: string | null) =>
        dispatch({ type: 'PATCH', payload: { scenarioError: message, scenarioLoading: false } }),
      setScenarioLoading: (value: boolean) =>
        dispatch({ type: 'PATCH', payload: { scenarioLoading: value } }),
      setScenarioResult: (result: ScenarioResult | null, scenarioId?: string) =>
        dispatch({ type: 'SET_SCENARIO_RESULT', result, scenarioId }),
      setScenarioId: (id: string | null) =>
        dispatch({ type: 'PATCH', payload: { scenarioId: id } }),
      setData: (payload: Partial<Pick<BuildState, 'spendingPieces' | 'revenuePieces' | 'masses' | 'policyLevers' | 'popularIntents'>>) =>
        dispatch({
          type: 'PATCH',
          payload: {
            ...payload,
            initialLoading: false,
            error: null,
          },
        }),
      setSuggestedLevers: (levers: PolicyLever[]) =>
        dispatch({ type: 'PATCH', payload: { suggestedLevers: levers } }),
      setTargetInput: (value: string) =>
        dispatch({ type: 'PATCH', payload: { targetInput: value } }),
      setRevenueTargetInput: (value: string) =>
        dispatch({ type: 'PATCH', payload: { revenueTargetInput: value } }),
      setSelectedCategory: (category: MassCategory | null) =>
        dispatch({ type: 'SET_SELECTED_CATEGORY', category }),
      setSelectedRevenueCategory: (category: LegoPiece | null) =>
        dispatch({ type: 'SET_SELECTED_REVENUE_CATEGORY', category }),
      setLens: (lens: BuildLens) => dispatch({ type: 'SET_LENS', lens }),
      togglePanel: (expanded?: boolean) => dispatch({ type: 'TOGGLE_PANEL', expanded }),
      toggleRevenuePanel: (expanded?: boolean) => dispatch({ type: 'TOGGLE_REVENUE_PANEL', expanded }),
      toggleFamily: (family: string) => dispatch({ type: 'TOGGLE_FAMILY', value: family }),
      resetExpandedFamilies: () => dispatch({ type: 'RESET_EXPANDED_FAMILIES' }),
    }),
    [],
  );

  return { state, dispatch, actions };
}
