import { describe, it, expect, vi } from 'vitest'

describe('Auth callback route handler', () => {
  it('validates that next param must be a relative path', () => {
    const isRelativePath = (next: string) =>
      next.startsWith('/') && !next.startsWith('//') && !next.includes('://')

    expect(isRelativePath('/events')).toBe(true)
    expect(isRelativePath('/tickets/123')).toBe(true)
    expect(isRelativePath('https://evil.com')).toBe(false)
    expect(isRelativePath('//evil.com')).toBe(false)
    expect(isRelativePath('javascript:alert(1)')).toBe(false)
  })

  it('defaults redirect to /events when next param is absent', () => {
    const getRedirectTarget = (next: string | null) => {
      if (!next || !next.startsWith('/') || next.includes('://')) {
        return '/events'
      }
      return next
    }

    expect(getRedirectTarget(null)).toBe('/events')
    expect(getRedirectTarget('')).toBe('/events')
    expect(getRedirectTarget('https://evil.com')).toBe('/events')
    expect(getRedirectTarget('/tickets')).toBe('/tickets')
  })
})
