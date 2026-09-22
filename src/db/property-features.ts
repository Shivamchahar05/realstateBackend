export const FURNISHING_ITEM_KEYS = [
  'FANS',
  'EXHAUST_FANS',
  'GEYSERS',
  'STOVE',
  'LIGHTS',
  'CURTAINS',
  'MODULAR_KITCHEN',
  'CHIMNEY',
  'WARDROBES',
  'AC_SPLIT',
  'AC_WINDOW',
  'SOFA',
  'DINING_TABLE',
  'BEDS',
  'WATER_PURIFIER',
  'WASHING_MACHINE',
  'REFRIGERATOR',
  'MICROWAVE',
  'TV',
  'SMART_LOCK',
] as const;

export type FurnishingItemKey = (typeof FURNISHING_ITEM_KEYS)[number];

export const FURNISHING_ITEM_LABELS: Record<FurnishingItemKey, string> = {
  FANS: 'Fans',
  EXHAUST_FANS: 'Exhaust Fans',
  GEYSERS: 'Geysers',
  STOVE: 'Stove',
  LIGHTS: 'Lights',
  CURTAINS: 'Curtains',
  MODULAR_KITCHEN: 'Modular Kitchen',
  CHIMNEY: 'Chimney',
  WARDROBES: 'Wardrobes',
  AC_SPLIT: 'Split ACs',
  AC_WINDOW: 'Window ACs',
  SOFA: 'Sofa',
  DINING_TABLE: 'Dining Table',
  BEDS: 'Beds',
  WATER_PURIFIER: 'Water Purifier',
  WASHING_MACHINE: 'Washing Machine',
  REFRIGERATOR: 'Refrigerator',
  MICROWAVE: 'Microwave',
  TV: 'TV',
  SMART_LOCK: 'Smart Lock / Access',
};

export const AMENITY_CATEGORIES = [
  'SPORTS',
  'SAFETY',
  'ENVIRONMENT',
  'CONVENIENCE',
  'PROPERTY',
] as const;

export type AmenityCategory = (typeof AMENITY_CATEGORIES)[number];

export const AMENITY_KEYS = [
  'GYMNASIUM',
  'SWIMMING_POOL',
  'KIDS_PLAY_AREA',
  'YOGA_AREA',
  'JOGGING_TRACK',
  'CLUBHOUSE',
  'SECURITY_24X7',
  'POWER_BACKUP',
  'WATER_SUPPLY_24X7',
  'CCTV',
  'FIRE_SAFETY',
  'LARGE_GREEN_AREA',
  'PARK',
  'ATTACHED_MARKET',
  'VISITOR_PARKING',
  'LIFT',
  'INTERCOM',
  'RAINWATER_HARVESTING',
  'SEWAGE_TREATMENT',
  'MAINTENANCE_STAFF',
] as const;

export type AmenityKey = (typeof AMENITY_KEYS)[number];

export const AMENITY_CATALOG: Record<
  AmenityKey,
  { label: string; category: AmenityCategory }
> = {
  GYMNASIUM: { label: 'Gymnasium', category: 'SPORTS' },
  SWIMMING_POOL: { label: 'Swimming Pool', category: 'SPORTS' },
  KIDS_PLAY_AREA: { label: "Kids' Play Area", category: 'SPORTS' },
  YOGA_AREA: { label: 'Yoga Area', category: 'SPORTS' },
  JOGGING_TRACK: { label: 'Jogging / Cycle Track', category: 'SPORTS' },
  CLUBHOUSE: { label: 'Clubhouse', category: 'CONVENIENCE' },
  SECURITY_24X7: { label: '24 x 7 Security', category: 'SAFETY' },
  POWER_BACKUP: { label: 'Power Backup', category: 'CONVENIENCE' },
  WATER_SUPPLY_24X7: { label: '24 x 7 Water Supply', category: 'CONVENIENCE' },
  CCTV: { label: 'CCTV Surveillance', category: 'SAFETY' },
  FIRE_SAFETY: { label: 'Fire Safety', category: 'SAFETY' },
  LARGE_GREEN_AREA: { label: 'Large Green Area', category: 'ENVIRONMENT' },
  PARK: { label: 'Park', category: 'ENVIRONMENT' },
  ATTACHED_MARKET: { label: 'Attached Market', category: 'CONVENIENCE' },
  VISITOR_PARKING: { label: 'Visitor Parking', category: 'PROPERTY' },
  LIFT: { label: 'Lift', category: 'PROPERTY' },
  INTERCOM: { label: 'Intercom', category: 'PROPERTY' },
  RAINWATER_HARVESTING: { label: 'Rain Water Harvesting', category: 'ENVIRONMENT' },
  SEWAGE_TREATMENT: { label: 'Sewage Treatment', category: 'ENVIRONMENT' },
  MAINTENANCE_STAFF: { label: 'Maintenance Staff', category: 'CONVENIENCE' },
};

export const NEARBY_CATEGORIES = [
  'METRO',
  'SCHOOL',
  'HOSPITAL',
  'MARKET',
  'HIGHWAY',
  'OTHER',
] as const;

export type NearbyCategory = (typeof NEARBY_CATEGORIES)[number];
