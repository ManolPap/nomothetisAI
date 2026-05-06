import type { EurostatCountryEntry, WebSource } from '../types'

/**
 * Parse facts_text into an array of individual fact strings.
 * Handles lines prefixed with FACT_i, FACT_ii, FACT_iii, etc., or plain numbered/bullet lines.
 * Returns null if the text cannot be meaningfully parsed.
 */
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
