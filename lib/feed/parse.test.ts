import { describe, expect, it } from 'vitest';
import { backoffMs, createDedupe, parseFeedMessage } from './parse';

const message = {
  account: 'nano_a',
  amount: '1000000000000000000000000000000',
  hash: 'H1',
  confirmation_type: 'active_quorum',
  block: {
    type: 'state',
    account: 'nano_a',
    previous: 'P',
    representative: 'nano_rep',
    balance: '0',
    link: 'L',
    link_as_account: 'nano_b',
    signature: 'S',
    work: 'W',
    subtype: 'send'
  }
};

describe('parseFeedMessage', () => {
  it('reads a node websocket confirmation', () => {
    const raw = JSON.stringify({ topic: 'confirmation', time: '1', message });
    expect(parseFeedMessage(raw).map((c) => c.message.hash)).toEqual(['H1']);
  });

  it('ignores acks, other topics and junk', () => {
    expect(parseFeedMessage('{"ack":"subscribe"}')).toEqual([]);
    expect(parseFeedMessage(JSON.stringify({ topic: 'vote', message: {} }))).toEqual([]);
    expect(parseFeedMessage('not json')).toEqual([]);
  });

  it('unpacks a repeater batch of bare messages or full confirmations', () => {
    const raw = JSON.stringify({
      dtg: '2026',
      topic: 'confirmation',
      blocks: [message, { topic: 'confirmation', time: '2', message: { ...message, hash: 'H2' } }, { junk: 1 }]
    });
    expect(parseFeedMessage(raw).map((c) => c.message.hash)).toEqual(['H1', 'H2']);
  });
});

describe('createDedupe', () => {
  it('flags repeats and forgets the oldest past capacity', () => {
    const d = createDedupe(2);
    expect(d.seen('a')).toBe(false);
    expect(d.seen('a')).toBe(true);
    d.seen('b');
    d.seen('c'); // evicts a
    expect(d.seen('a')).toBe(false);
    expect(d.size).toBe(2);
  });
});

describe('backoffMs', () => {
  it('doubles from 1s and caps at 30s', () => {
    const mid = () => 0.5;
    expect(backoffMs(0, mid)).toBe(1000);
    expect(backoffMs(3, mid)).toBe(8000);
    expect(backoffMs(20, mid)).toBe(30000);
  });
});
