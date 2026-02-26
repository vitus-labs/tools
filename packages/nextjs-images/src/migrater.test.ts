import { describe, expect, it, vi } from 'vitest'
import { showWarning } from './migrater'

describe('showWarning', () => {
  it('should log a warning message to console', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

    showWarning()

    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0][0]).toContain('No package found')
    spy.mockRestore()
  })
})
