export interface Rep {
  rep_address: string;
  est_payment: string | null;
  donation_address: string | null;
  weight: number;
  delegators: number;
  uptime: string;
  synced: number;
  website: string | null;
  latitude: number;
  longitude: number;
  alias: string | null;
  uptime_over: {
    week: number;
    day: number;
  };
  score: number;
  donation: string | null;
  lastVoted: string;
}
