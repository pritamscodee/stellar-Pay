import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { publishVoteEvent, publishPollCreatedEvent } from '../services/backend'

const ORIGINAL_URL = import.meta.env.VITE_BACKEND_URL

describe('Backend Service', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:3001')
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('publishVoteEvent calls fetch with correct params', async () => {
    const mockFetch = vi.mocked(globalThis.fetch).mockResolvedValue(new Response('ok'))

    await publishVoteEvent('poll123', 'GCZVEJZJNM', 0, 1234567890, 'txhash123')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain('event_type=vote')
    expect(url).toContain('poll_id=poll123')
    expect(url).toContain('voter=GCZVEJZJNM')
    expect(url).toContain('option_index=0')
  })

  it('publishPollCreatedEvent calls fetch with correct params', async () => {
    const mockFetch = vi.mocked(globalThis.fetch).mockResolvedValue(new Response('ok'))

    await publishPollCreatedEvent('poll123', 'Best blockchain?', 'GCZVEJZJNM', 5000, 'txhash123')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain('event_type=poll_created')
    expect(url).toContain('question=Best+blockchain%3F')
    expect(url).toContain('creator=GCZVEJZJNM')
  })

  it('publish functions handle fetch errors gracefully', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new Error('network error'))

    await expect(publishVoteEvent('poll123', 'GCZVEJZJNM', 0, 1234567890, 'txhash123')).resolves.toBeUndefined()
    await expect(publishPollCreatedEvent('poll123', 'Best blockchain?', 'GCZVEJZJNM', 5000, 'txhash123')).resolves.toBeUndefined()
  })
})
