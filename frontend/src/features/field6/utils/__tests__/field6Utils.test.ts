import { describe, expect, it } from 'vitest'
import { buildEurostatText, countWords, parseFactsText } from '../index'

describe('parseFactsText', () => {
  it('parses FACT_i style lines', () => {
    const text = 'FACT_i: Greece increased unemployment.\nFACT_ii: Youth rates rose.'
    const result = parseFactsText(text)
    expect(result).toHaveLength(2)
    expect(result![0]).toContain('Greece')
  })

  it('falls back to newline splitting', () => {
    const text = 'Line one\nLine two\nLine three'
    const result = parseFactsText(text)
    expect(result).toHaveLength(3)
  })

  it('returns null for empty text', () => {
    expect(parseFactsText('')).toBeNull()
    expect(parseFactsText('   ')).toBeNull()
  })
})

describe('buildEurostatText', () => {
  it('produces the expected Greek format', () => {
    const entries = [
      {
        countryCode: 'GR',
        entry: {
          name: 'Greece',
          values: { '2022': 12.5 },
          indicator: 'Youth unemployment',
          dataset_id: 'lfsa_urgan',
          url: 'https://ec.europa.eu/eurostat/lfsa_urgan',
        },
        selectedYears: ['2022'],
      },
    ]
    const text = buildEurostatText('Ανεργία Νέων', entries)
    expect(text).toContain('Eurostat — Ανεργία Νέων')
    expect(text).toContain('Greece: 12.5% (2022)')
    expect(text).toContain('lfsa_urgan')
    expect(text).toContain('Πηγή: Eurostat')
  })

  it('returns empty string for no entries', () => {
    expect(buildEurostatText('Any', [])).toBe('')
  })
})

describe('countWords', () => {
  it('counts words correctly', () => {
    expect(countWords('Hello world')).toBe(2)
    expect(countWords('  ')).toBe(0)
    expect(countWords('')).toBe(0)
  })
})
