import type { EurostatCountryEntry, FactCategory, FactItem, FactsPayload, WebSource } from '../types'

/**
 * Parse facts_text into an array of individual fact strings.
 * Handles lines prefixed with FACT_i, FACT_ii, FACT_iii, etc., or plain numbered/bullet lines.
 * Returns null if the text cannot be meaningfully parsed.
 */
export const FACT_CATEGORY_LABELS: Record<FactCategory, string> = {
  i: 'Χώρες ΕΕ/ΟΟΣΑ',
  ii: 'Όργανα ΕΕ',
  iii: 'Διεθνείς Οργανισμοί',
}

export function factItemToDisplayText(it: FactItem): string {
  return [it.subject, it.instrument, it.finding, it.source_url]
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join(' | ')
}

export type FlatFactEntry = { flatIndex: number; category: FactCategory; item: FactItem }

export function flattenField6Facts(facts: FactsPayload | null): FlatFactEntry[] {
  if (!facts) return []
  const out: FlatFactEntry[] = []
  let idx = 0
  const push = (category: FactCategory, items: FactItem[]) => {
    for (const item of items) {
      out.push({ flatIndex: idx++, category, item })
    }
  }
  push('i', facts.i)
  push('ii', facts.ii)
  push('iii', facts.iii)
  return out
}

function factPrefixForCategory(cat: FactCategory): string {
  if (cat === 'i') return 'FACT_i'
  if (cat === 'ii') return 'FACT_ii'
  return 'FACT_iii'
}

/** Γραμμές προς σύνθεση από structured facts + επιλεγμένα indices (flatten order). */
export function buildSelectedFactsTextFromStructured(
  facts: FactsPayload | null,
  selectedIndices: Set<number>,
): string | null {
  const flat = flattenField6Facts(facts)
  if (flat.length === 0) return null
  const lines: string[] = []
  for (const i of [...selectedIndices].sort((a, b) => a - b)) {
    const entry = flat[i]
    if (!entry) continue
    const p = factPrefixForCategory(entry.category)
    const it = entry.item
    lines.push(`${p}: ${it.subject} | ${it.instrument} | ${it.finding} | ${it.source_url}`)
  }
  return lines.length > 0 ? lines.join('\n') : null
}

export function parseFactsText(factsText: string): string[] | null {
  if (!factsText.trim()) return null

  // Try to split by FACT_ prefix
  const factPattern = /FACT_[ivxlcdm]+:?\s*/gi
  if (factPattern.test(factsText)) {
    const parts = factsText.split(/FACT_[ivxlcdm]+:?\s*/gi).filter((p) => p.trim().length > 0)
    if (parts.length > 0) return parts.map((p) => p.trim())
  }

  // Fall back to line-based split
  const lines = factsText
    .split('\n')
    .map((l) => l.replace(/^[\d\-•]+\.?\s*/, '').trim())
    .filter(Boolean)

  return lines.length > 0 ? lines : null
}

/**
 * Build the eurostat_text string in the exact format the backend expects before synthesis.
 */
export function buildEurostatText(
  indicatorName: string,
  selectedEntries: Array<{ countryCode: string; entry: EurostatCountryEntry; selectedYears: string[] }>,
): string {
  if (selectedEntries.length === 0) return ''

  const lines = selectedEntries.map(({ entry, selectedYears }) => {
    const values = selectedYears
      .filter((y) => entry.values[y] != null)
      .map((y) => `${entry.values[y]}% (${y})`)
      .join(', ')
    return `${entry.name}: ${values}`
  })

  const datasetId = selectedEntries[0]?.entry.dataset_id ?? ''
  const url = selectedEntries[0]?.entry.url ?? ''

  return `Eurostat — ${indicatorName} για χώρες που εφάρμοσαν συναφείς πρακτικές:\n${lines.join(', ')}\n(Πηγή: Eurostat, ${datasetId}, ${url})`
}

export function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

export function buildSelectedSources(sources: WebSource[], selectedUrls: Set<string>): WebSource[] {
  return sources.filter((s) => selectedUrls.has(s.url))
}
