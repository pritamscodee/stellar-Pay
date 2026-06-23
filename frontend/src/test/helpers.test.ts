import { describe, it, expect } from 'vitest'

function truncateKey(key: string, chars = 6): string {
  if (key.length <= chars * 2 + 3) return key
  return `${key.slice(0, chars)}...${key.slice(-chars)}`
}

function validatePollQuestion(question: string): boolean {
  return question.trim().length > 0 && question.length <= 200
}

function validateOptions(options: string[]): boolean {
  return options.length >= 2 && options.every((o) => o.trim().length > 0)
}

describe('Helpers', () => {
  it('truncateKey shortens long keys', () => {
    const key = 'GCZVEJZJNMPHXP3GKCHI33YUSN7BJTU3OWNDLSDEUQOO4UGRIQWHBEHK'
    const result = truncateKey(key)
    expect(result).toBe('GCZVEJ...WHBEHK')
    expect(result.length).toBeLessThan(key.length)
  })

  it('truncateKey returns short keys unchanged', () => {
    const key = 'GCZVEJ'
    expect(truncateKey(key)).toBe('GCZVEJ')
  })

  it('validatePollQuestion rejects empty questions', () => {
    expect(validatePollQuestion('')).toBe(false)
    expect(validatePollQuestion('  ')).toBe(false)
  })

  it('validatePollQuestion accepts valid questions', () => {
    expect(validatePollQuestion('Best blockchain?')).toBe(true)
  })

  it('validateOptions rejects less than 2 options', () => {
    expect(validateOptions(['only'])).toBe(false)
    expect(validateOptions([])).toBe(false)
  })

  it('validateOptions rejects empty option strings', () => {
    expect(validateOptions(['valid', ''])).toBe(false)
    expect(validateOptions(['valid', '  '])).toBe(false)
  })

  it('validateOptions accepts valid options', () => {
    expect(validateOptions(['Stellar', 'Ethereum', 'Solana'])).toBe(true)
  })
})
