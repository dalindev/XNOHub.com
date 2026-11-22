// One representative from public/data/reps.json (built by scripts/build-reps.mjs).
export interface RepNode {
  account: string;
  alias: string | null;
  weight: number; // Nano
  weightPercent: number; // of online weight
  online: boolean;
  principal: boolean;
  lat: number | null; // null: location unknown, listed but not drawn
  lon: number | null;
  city: string | null;
  country: string | null;
  version: string | null;
  lastSeen: number | null;
}

/** A live node that doesn't vote, with the place its network address resolves to. */
export interface RelayNode {
  lat: number;
  lon: number;
  city: string | null;
  country: string | null;
  version: string;
}

export interface RepsFile {
  generatedAt: string;
  sources: { reps: string; quorum: string; places?: string };
  onlineWeight: number;
  /** Live nodes seen on the network, voting or not. */
  liveNodes?: number;
  reps: RepNode[];
  /** Live nodes that don't vote, where their place is known. */
  nodes?: RelayNode[];
}

// Type for PrincipalsGeoInfo
export interface IPrincipalGeoInfo {
  rep_address: string;
  latitude: number;
  longitude: number;
  alias: string | null;
}

// Type for topCitiesGeo
export interface ICityGeo {
  lat: number;
  lon: number;
}

// Type for RepsOnline (base type before merging)
export interface IRepOnline {
  account: string;
  account_formatted: string;
  alias: string;
  is_known_account: boolean;
  last_telemetry_report: string;
  node_id: string | null;
  node_ip: string;
  node_maker: string | null;
  node_uptime: string;
  node_version: string;
  show_weight: boolean;
  votingweight: number;
  weight_formatted: string;
  weight_percent: number;
  location?: string | null;
  latitude?: number;
  longitude?: number;
}

// Final type for RepsOnline
export interface IRepData {
  account: string;
  account_formatted: string;
  alias: string;
  is_known_account: boolean;
  last_telemetry_report: string;
  node_id: string | null;
  node_ip: string;
  node_maker: string | null;
  node_uptime: string;
  node_version: string;
  show_weight: boolean;
  votingweight: number;
  weight_formatted: string;
  weight_percent: number;
  latitude: number;
  longitude: number;
  assigned_city?: boolean;
}

// Define the block type
interface Block {
  type: string;
  account: string;
  previous: string;
  representative: string;
  balance: string;
  link: string;
  link_as_account: string;
  signature: string;
  work: string;
  subtype: string;
}

// Define the election info type
interface ElectionInfo {
  duration: string;
  time: string;
  tally: string;
  final: string;
  blocks: string;
  voters: string;
  request_count: string;
}

// Define the message type
// interface ConfirmationMessage {
//   account: string;
//   amount: string;
//   hash: string;
//   confirmation_type: string;
//   election_info: ElectionInfo;
//   block: NanoBlock;
// }

interface ConfirmationMessage {
  account: string;
  amount: string;
  hash: string;
  confirmation_type: string;
  block: Block;
}

// Define the main confirmation type
export interface NanoConfirmation {
  topic: string;
  time: string;
  message: {
    account: string;
    amount: string;
    hash: string;
    confirmation_type: string;
    block: {
      type: string;
      account: string;
      previous: string;
      representative: string;
      balance: string;
      link: string;
      link_as_account: string;
      signature: string;
      work: string;
      subtype: string;
    };
  };
}
