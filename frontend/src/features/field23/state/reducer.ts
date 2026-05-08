import type {
  ArticleDiffOut,
  ArticleOut,
  ChangeType,
  CommentContributionOut,
  ConsultationReportArticleSection,
  ConsultationReportTotals,
  ItemAttributionOut,
} from '../types'

export type StepStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface Field23ReportDraft {
  totals: ConsultationReportTotals
  articles_section: ConsultationReportArticleSection[]
  final_preview_text: string
  llm_status: 'ok' | 'fallback' | 'partial' | null
}

export const initialField23ReportDraft: Field23ReportDraft = {
  totals: {
    comments_total: 0,
    adopted_total: 0,
    not_adopted_total: 0,
    participants_total: 0,
  },
  articles_section: [],
  final_preview_text: '',
  llm_status: null,
}

export interface Field23State {
  currentStep: 1 | 2 | 3 | 4

  // Step 1
  initialFile: File | null
  finalFile: File | null

  // Step 2
  splitInitialStatus: StepStatus
  splitFinalStatus: StepStatus
  initialArticles: ArticleOut[]
  finalArticles: ArticleOut[]
  splitInitialError: string | null
  splitFinalError: string | null

  // Compare
  normalizeBefore: boolean
  compareStatus: StepStatus
  diffs: ArticleDiffOut[]
  compareError: string | null
  filterChangeTypes: Set<ChangeType>
  filterAttributionLikelihoods: Set<CommentContributionOut['contribution_likelihood']>
  filterMinFraction: number
  filterArticleQuery: string

  // Diff viewer selection
  selectedDiffIndex: number | null

  // Step 5 (attribution)
  attributionStatus: StepStatus
  attributionResults: Record<number, ItemAttributionOut>
  attributionError: string | null

  // Step 4 (consultation report)
  reportStatus: StepStatus
  reportError: string | null
  reportDraft: Field23ReportDraft

  /** User clicked «Ολοκληρώθηκε» στο τελικό βήμα · εμφανίζεται στην αρχική. */
  flowCompleted: boolean
}

export type Field23Action =
  | { type: 'SET_INITIAL_FILE'; file: File }
  | { type: 'SET_FINAL_FILE'; file: File }
  | { type: 'SPLIT_INITIAL_LOADING' }
  | { type: 'SPLIT_INITIAL_SUCCESS'; articles: ArticleOut[] }
  | { type: 'SPLIT_INITIAL_ERROR'; error: string }
  | { type: 'SPLIT_FINAL_LOADING' }
  | { type: 'SPLIT_FINAL_SUCCESS'; articles: ArticleOut[] }
  | { type: 'SPLIT_FINAL_ERROR'; error: string }
  | { type: 'SET_NORMALIZE'; value: boolean }
  | { type: 'COMPARE_LOADING' }
  | { type: 'COMPARE_SUCCESS'; diffs: ArticleDiffOut[] }
  | { type: 'COMPARE_ERROR'; error: string }
  | { type: 'TOGGLE_FILTER_CHANGE_TYPE'; changeType: ChangeType }
  | {
      type: 'TOGGLE_FILTER_ATTRIBUTION_LIKELIHOOD'
      likelihood: CommentContributionOut['contribution_likelihood']
    }
  | { type: 'SET_FILTER_FRACTION'; value: number }
  | { type: 'SET_FILTER_QUERY'; query: string }
  | { type: 'SELECT_DIFF'; index: number | null }
  | { type: 'ATTRIBUTION_LOADING' }
  | { type: 'ATTRIBUTION_SUCCESS'; results: ItemAttributionOut[] }
  | { type: 'ATTRIBUTION_ERROR'; error: string }
  | {
      type: 'SET_COMMENT_ADOPTED'
      diffIndex: number
      commentId: string
      adopted: boolean
    }
  | {
      type: 'REPORT_GENERATION_LOADING'
    }
  | {
      type: 'REPORT_GENERATION_SUCCESS'
      draft: Field23ReportDraft
    }
  | { type: 'REPORT_GENERATION_ERROR'; error: string }
  | { type: 'GO_TO_STEP'; step: 1 | 2 | 3 | 4 }
  | { type: 'MARK_FLOW_COMPLETED' }
  | { type: 'RESET_FIELD23_WORKFLOW' }

export const ALL_CHANGE_TYPES: ChangeType[] = ['added', 'removed', 'modified', 'unchanged']
export const ALL_ATTRIBUTION_LIKELIHOODS: CommentContributionOut['contribution_likelihood'][] = [
  'none',
  'low',
  'medium',
  'high',
]

export const initialField23State: Field23State = {
  currentStep: 1,
  initialFile: null,
  finalFile: null,
  splitInitialStatus: 'idle',
  splitFinalStatus: 'idle',
  initialArticles: [],
  finalArticles: [],
  splitInitialError: null,
  splitFinalError: null,
  normalizeBefore: false,
  compareStatus: 'idle',
  diffs: [],
  compareError: null,
  filterChangeTypes: new Set(ALL_CHANGE_TYPES),
  filterAttributionLikelihoods: new Set(ALL_ATTRIBUTION_LIKELIHOODS),
  filterMinFraction: 0,
  filterArticleQuery: '',
  selectedDiffIndex: null,
  attributionStatus: 'idle',
  attributionResults: {},
  attributionError: null,
  reportStatus: 'idle',
  reportError: null,
  reportDraft: initialField23ReportDraft,
  flowCompleted: false,
}

function invalidateCompare(): Partial<Field23State> {
  return {
    compareStatus: 'idle', diffs: [], compareError: null,
    selectedDiffIndex: null,
    attributionStatus: 'idle', attributionResults: {}, attributionError: null,
    flowCompleted: false,
  }
}

function invalidateAttribution(): Partial<Field23State> {
  return {
    attributionStatus: 'idle',
    attributionError: null,
    reportStatus: 'idle',
    reportError: null,
    reportDraft: initialField23ReportDraft,
  }
}

export function field23Reducer(state: Field23State, action: Field23Action): Field23State {
  switch (action.type) {
    case 'SET_INITIAL_FILE':
      return {
        ...state, initialFile: action.file,
        splitInitialStatus: 'idle', initialArticles: [], splitInitialError: null,
        ...invalidateCompare(),
      }
    case 'SET_FINAL_FILE':
      return {
        ...state, finalFile: action.file,
        splitFinalStatus: 'idle', finalArticles: [], splitFinalError: null,
        ...invalidateCompare(),
      }
    case 'SPLIT_INITIAL_LOADING':
      return { ...state, splitInitialStatus: 'loading', splitInitialError: null }
    case 'SPLIT_INITIAL_SUCCESS':
      return { ...state, splitInitialStatus: 'ready', initialArticles: action.articles, splitInitialError: null, ...invalidateCompare() }
    case 'SPLIT_INITIAL_ERROR':
      return { ...state, splitInitialStatus: 'error', splitInitialError: action.error }
    case 'SPLIT_FINAL_LOADING':
      return { ...state, splitFinalStatus: 'loading', splitFinalError: null }
    case 'SPLIT_FINAL_SUCCESS':
      return { ...state, splitFinalStatus: 'ready', finalArticles: action.articles, splitFinalError: null, ...invalidateCompare() }
    case 'SPLIT_FINAL_ERROR':
      return { ...state, splitFinalStatus: 'error', splitFinalError: action.error }
    case 'SET_NORMALIZE':
      return { ...state, normalizeBefore: action.value, ...invalidateCompare() }
    case 'COMPARE_LOADING':
      return { ...state, compareStatus: 'loading', compareError: null, ...invalidateAttribution() }
    case 'COMPARE_SUCCESS':
      return { ...state, compareStatus: 'ready', diffs: action.diffs, compareError: null, ...invalidateAttribution() }
    case 'COMPARE_ERROR':
      return { ...state, compareStatus: 'error', compareError: action.error }
    case 'TOGGLE_FILTER_CHANGE_TYPE': {
      const next = new Set(state.filterChangeTypes)
      if (next.has(action.changeType)) { next.delete(action.changeType) } else { next.add(action.changeType) }
      return { ...state, filterChangeTypes: next }
    }
    case 'TOGGLE_FILTER_ATTRIBUTION_LIKELIHOOD': {
      const next = new Set(state.filterAttributionLikelihoods)
      if (next.has(action.likelihood)) {
        next.delete(action.likelihood)
      } else {
        next.add(action.likelihood)
      }
      return { ...state, filterAttributionLikelihoods: next }
    }
    case 'SET_FILTER_FRACTION':
      return { ...state, filterMinFraction: action.value }
    case 'SET_FILTER_QUERY':
      return { ...state, filterArticleQuery: action.query }
    case 'SELECT_DIFF':
      return { ...state, selectedDiffIndex: action.index, ...invalidateAttribution() }
    case 'ATTRIBUTION_LOADING':
      return { ...state, attributionStatus: 'loading', attributionError: null }
    case 'ATTRIBUTION_SUCCESS': {
      const resultsMap = { ...state.attributionResults }
      action.results.forEach((r) => {
        const contributions = r.contributions.map((c) => ({
          ...c,
          adopted: typeof c.adopted === 'boolean' ? c.adopted : false,
        }))
        resultsMap[r.item_index] = { ...r, contributions }
      })
      return { ...state, attributionStatus: 'ready', attributionResults: resultsMap, attributionError: null }
    }
    case 'ATTRIBUTION_ERROR':
      return { ...state, attributionStatus: 'error', attributionError: action.error }
    case 'SET_COMMENT_ADOPTED': {
      const target = state.attributionResults[action.diffIndex]
      if (!target) return state
      return {
        ...state,
        attributionResults: {
          ...state.attributionResults,
          [action.diffIndex]: {
            ...target,
            contributions: target.contributions.map((c) =>
              c.comment_id === action.commentId ? { ...c, adopted: action.adopted } : c,
            ),
          },
        },
      }
    }
    case 'REPORT_GENERATION_LOADING':
      return { ...state, reportStatus: 'loading', reportError: null }
    case 'REPORT_GENERATION_SUCCESS':
      return {
        ...state,
        reportStatus: 'ready',
        reportError: null,
        reportDraft: action.draft,
      }
    case 'REPORT_GENERATION_ERROR':
      return { ...state, reportStatus: 'error', reportError: action.error }
    case 'GO_TO_STEP':
      return { ...state, currentStep: action.step }
    case 'MARK_FLOW_COMPLETED':
      return { ...state, flowCompleted: true }
    case 'RESET_FIELD23_WORKFLOW':
      return { ...initialField23State }
    default:
      return state
  }
}
