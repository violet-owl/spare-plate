export type Role = 'donor' | 'runner' | 'host';

export type FoodType = 'prepared_meal' | 'baked_goods' | 'produce' | 'packaged' | 'drinks';
export type CarrySize = 'one_bag' | 'one_box' | 'needs_car';
export type TempNeeds = 'cold' | 'room_temp' | 'hot';
export type ListingStatus = 'posted' | 'claimed' | 'picked_up' | 'delivered' | 'cancelled';
export type TravelMode = 'walk' | 'bike' | 'car';
export type AgeBracket = 'under_18' | 'adult';
export type DonorType = 'individual' | 'business';
export type BusinessType = 'cafe' | 'restaurant' | 'grocery' | 'bakery' | 'other';
export type SiteType = 'community_fridge' | 'church_pantry' | 'small_org' | 'other';

export interface Area {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
}

export interface Profile {
  id: string;
  role: Role;
  area_id: string | null;
  display_name: string;
  phone: string | null;
  contact_person: string | null;
  created_at: string;
  donor_type: DonorType | null;
  business_type: BusinessType | null;
  usual_close_time: string | null;
  address: string | null;
  pickup_instructions: string | null;
  travel_mode: TravelMode | null;
  age_bracket: AgeBracket | null;
  school_group: string | null;
  site_type: SiteType | null;
  site_address: string | null;
  site_lat: number | null;
  site_lng: number | null;
  site_hours: string | null;
  open_days: string | null;
  open_hour: number | null;
  close_hour: number | null;
  cold_capable: boolean;
  total_pounds: number;
  total_donations: number;
  total_hours: number;
  total_deliveries: number;
  total_deliveries_received: number;
  summary_since: string;
}

export interface Listing {
  id: string;
  donor_id: string;
  area_id: string;
  food_text: string;
  food_type: FoodType;
  quantity: number;
  unit: string;
  carry_size: CarrySize;
  pickup_by: string;
  temp_needs: TempNeeds;
  address: string;
  pickup_instructions: string | null;
  allergens: string | null;
  photo_url: string | null;
  shelf_life_hours: number;
  pounds: number;
  safety_confirmed: boolean;
  created_at: string;
  status: ListingStatus;
  runner_id: string | null;
  claimed_at: string | null;
  site_id: string | null;
  delivery_code: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  expires_at: string | null;
}

export interface Site {
  host_id: string;
  area_id: string | null;
  site_name: string;
  site_type: SiteType;
  site_address: string | null;
  site_lat: number | null;
  site_lng: number | null;
  site_hours: string | null;
  open_days: string | null;
  open_hour: number | null;
  close_hour: number | null;
  cold_capable: boolean;
  phone: string | null;
  contact_person: string | null;
}

export interface AvailableFood {
  id: string;
  food_text: string;
  food_type: FoodType;
  photo_url: string | null;
  delivered_at: string;
  expires_at: string;
  shelf_life_hours: number;
  temp_needs: TempNeeds;
  area_id: string;
  site_name: string;
  site_address: string | null;
  site_lat: number | null;
  site_lng: number | null;
  phone: string | null;
  site_hours: string | null;
  open_hour: number | null;
  close_hour: number | null;
  cold_capable: boolean;
  host_id: string;
}

export interface IncomingDelivery {
  id: string;
  food_text: string;
  food_type: FoodType;
  quantity: number;
  unit: string;
  carry_size: CarrySize;
  status: ListingStatus;
  runner_name: string;
  delivery_code: string;
  claimed_at: string;
  picked_up_at: string | null;
  donor_name: string;
  temp_needs: TempNeeds;
}

export interface CommunityTotals {
  id: number;
  total_pounds: number;
  total_meals: number;
  total_deliveries: number;
  updated_at: string;
}

export const FOOD_TYPE_LABELS: Record<FoodType, string> = {
  prepared_meal: 'Prepared meal',
  baked_goods: 'Baked goods',
  produce: 'Produce',
  packaged: 'Packaged',
  drinks: 'Drinks',
};

export const FOOD_TYPE_SHELF_LIFE: Record<FoodType, number> = {
  prepared_meal: 12,
  baked_goods: 24,
  produce: 48,
  packaged: 72,
  drinks: 48,
};

export const CARRY_SIZE_LABELS: Record<CarrySize, string> = {
  one_bag: 'One bag',
  one_box: 'One box',
  needs_car: 'Needs a car',
};

export const TEMP_LABELS: Record<TempNeeds, string> = {
  cold: 'Keep cold',
  room_temp: 'Room temp',
  hot: 'Keep hot',
};

export const STATUS_LABELS: Record<ListingStatus, string> = {
  posted: 'Posted',
  claimed: 'Claimed',
  picked_up: 'Picked up',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const TRAVEL_LABELS: Record<TravelMode, string> = {
  walk: 'Walk',
  bike: 'Bike',
  car: 'Car',
};

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  cafe: 'Cafe',
  restaurant: 'Restaurant',
  grocery: 'Grocery',
  bakery: 'Bakery',
  other: 'Other',
};

export const SITE_TYPE_LABELS: Record<SiteType, string> = {
  community_fridge: 'Community fridge',
  church_pantry: 'Church pantry',
  small_org: 'Small organization',
  other: 'Other',
};
