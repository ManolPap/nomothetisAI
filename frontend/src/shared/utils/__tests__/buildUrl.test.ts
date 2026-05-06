import { describe, expect, it } from 'vitest'
import { buildUrl } from '../buildUrl'

describe('buildUrl', () => {
  it('prepends the API base to a path', () => {
    const url = buildUrl('/field6/extract-metadata')
    expect(url).toContain('/field6/extract-metadata')
  })

  it('handles path without leading slash', () => {
    const url = buildUrl('field9/suggest-indicators')
    expect(url).toContain('/field9/suggest-indicators')
  })

  it('does not produce a double-slash in the path', () => {
    const url = buildUrl('/field9/fetch-data')
    // strip the protocol part (http://) before checking
    const path = url.replace(/^https?:\/\/[^/]+/, '')
    expect(path).not.toContain('//')
  })
})
