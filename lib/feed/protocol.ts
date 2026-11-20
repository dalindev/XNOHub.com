import type { NanoConfirmation } from '@/types/index';

export type FeedState = 'idle' | 'connecting' | 'open' | 'retrying' | 'silent' | 'sample';

export type PageToFeed = { type: 'start'; urls: string[] } | { type: 'stop' };

export type FeedToPage =
  | { type: 'confirmations'; items: NanoConfirmation[] }
  | { type: 'status'; state: FeedState; url?: string; retryInMs?: number };

export interface FeedStatus {
  state: FeedState;
  url?: string;
}
