export type AgentStatus = 'pending' | 'verified' | 'rejected' | 'suspended';
export type OfficeKind = 'independent' | 'office' | 'chain';
export type SplitKind = 'pct' | 'each';
export type CoopStatus = 'pending' | 'countered' | 'signed' | 'declined' | 'cancelled' | 'expired';

export type Profile = {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  office_name: string | null;
  office_kind: OfficeKind;
  license_number: string | null;
  city: string | null;
  status: AgentStatus;
  is_admin: boolean;
  is_founder: boolean;
  offer_kind: SplitKind | null;
  offer_pct: number | null;
  onboarded_at: string | null;
  created_at: string;
};

export type Listing = {
  id: string;
  agent_id: string;
  title: string;
  city: string;
  area: string | null;
  rooms: number;
  sqm: number | null;
  floor: number | null;
  price: number;
  description: string | null;
  photo_urls: string[];
  video_url: string | null;
  has_signed_order: boolean;
  offer_kind: SplitKind;
  offer_pct: number | null;
  status: 'active' | 'under_contract' | 'sold' | 'withdrawn';
  created_at: string;
  agent?: Pick<Profile, 'id' | 'full_name' | 'office_name' | 'phone'> | null;
};

export type BuyerRequest = {
  id: string;
  agent_id: string;
  cities: string[];
  min_rooms: number;
  max_price: number;
  mortgage_approved: boolean;
  note: string | null;
  status: 'active' | 'closed';
  created_at: string;
  agent?: Pick<Profile, 'id' | 'full_name' | 'office_name'> | null;
};

export type Coop = {
  id: string;
  ref_code: string;
  listing_id: string;
  owner_id: string;
  requester_id: string;
  buyer_label: string;
  offered_kind: SplitKind;
  offered_pct: number | null;
  final_kind: SplitKind;
  final_pct: number | null;
  agreement_version: string;
  status: CoopStatus;
  requester_signed_at: string | null;
  owner_signed_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type Deal = {
  id: string;
  coop_id: string;
  reported_by: string;
  sale_price: number | null;
  status: 'reported' | 'verified' | 'disputed';
  reported_at: string;
};

export type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};
