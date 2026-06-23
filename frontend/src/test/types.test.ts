import { describe, it, expect } from 'vitest'
import type { PollInfo, VoteEvent, PollCreatedEvent, BackendEvent } from '../types'

describe('Types', () => {
  it('validates PollInfo structure', () => {
    const poll: PollInfo = {
      question: 'Best blockchain?',
      options: ['Stellar', 'Ethereum'],
      deadline: 5000,
      owner: 'GCZVEJZJNMPHXP3GKCHI33YUSN7BJTU3OWNDLSDEUQOO4UGRIQWHBEHK',
      totalVotes: 0,
    }

    expect(poll.question).toBe('Best blockchain?')
    expect(poll.options).toHaveLength(2)
    expect(poll.totalVotes).toBe(0)
  })

  it('validates VoteEvent structure', () => {
    const event: VoteEvent = {
      pollId: 'poll123',
      voter: 'GCZVEJZJNMPHXP3GKCHI33YUSN7BJTU3OWNDLSDEUQOO4UGRIQWHBEHK',
      optionIndex: 0,
      timestamp: 1234567890,
      txHash: 'abc123',
    }

    expect(event.pollId).toBe('poll123')
    expect(event.optionIndex).toBe(0)
  })

  it('validates PollCreatedEvent structure', () => {
    const event: PollCreatedEvent = {
      pollId: 'poll123',
      question: 'Best blockchain?',
      creator: 'GCZVEJZJNMPHXP3GKCHI33YUSN7BJTU3OWNDLSDEUQOO4UGRIQWHBEHK',
      deadline: 5000,
      txHash: 'abc123',
    }

    expect(event.question).toBe('Best blockchain?')
    expect(event.creator).toContain('GCZVEJZJNMPH')
  })

  it('validates BackendEvent discrimination', () => {
    const voteEvent: BackendEvent = {
      type: 'Vote',
      data: {
        pollId: 'poll123',
        voter: 'GCZVEJZJNMPHXP3GKCHI33YUSN7BJTU3OWNDLSDEUQOO4UGRIQWHBEHK',
        optionIndex: 0,
        timestamp: 1234567890,
        txHash: 'abc123',
      },
    }

    const createdEvent: BackendEvent = {
      type: 'PollCreated',
      data: {
        pollId: 'poll456',
        question: 'Best blockchain?',
        creator: 'GCZVEJZJNMPHXP3GKCHI33YUSN7BJTU3OWNDLSDEUQOO4UGRIQWHBEHK',
        deadline: 5000,
        txHash: 'def456',
      },
    }

    expect(voteEvent.type).toBe('Vote')
    expect(createdEvent.type).toBe('PollCreated')
    if (voteEvent.type === 'Vote') {
      expect(voteEvent.data.optionIndex).toBe(0)
    }
  })
})
