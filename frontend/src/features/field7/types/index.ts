export type SDGDecision = 'pending' | 'accepted' | 'rejected'

export interface SubtargetMatch {
  code: string
  title: string
  reasoning: string
}

export interface SDGMatch {
  sdg_id: number
  sdg_title: string
  subtargets: SubtargetMatch[]
}

export interface ClassifyResponse {
  matches: SDGMatch[]
  error?: string | null
}
