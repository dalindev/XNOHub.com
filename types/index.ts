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
