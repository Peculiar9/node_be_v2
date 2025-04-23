interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface Distance {
  value: number;
  unit: string; // e.g., "km"
}

interface ChargerDetail {
  type: string; // e.g., "J1772" convert to UpperCase before comparison
  power: string; // e.g., "7 kW"
  status: string; // e.g., "Available"
  icon: string; // URL to icon image, e.g., "https://example.com/icons/j1772.png"
}

interface EnergyPricing {
  timeRange: string; // e.g., "12:00am - 4:00am"
  rate: number;
  unit: string; // e.g., "USD/kWh"
}

interface ParkingPricing {
  cost: number;
  unit: string; // e.g., "USD/hour"
}

interface Network {
  name: string;
  website: string | null;
}

interface AdditionalInfo {
  openDate: string; // e.g., "1995-08-30"
  geocodeStatus: string; // e.g., "GPS"
  lastConfirmed: string; // e.g., "2023-01-10"
}

interface CheckIn {
  user: string;
  vehicle: string;
  timestamp: string; // ISO format, e.g., "2023-12-28T15:34:00"
  comment: string;
}

interface Review {
  user: string;
  rating: number; // e.g., 5
  timestamp: string; // ISO format, e.g., "2024-02-20T08:04:00"
  comment: string;
}

export interface ChargingStationReadDTO {
  id: string;
  name: string;
  address: Address;
  coordinates: Coordinates;
  contact: string;
  distance: Distance;
  chargers: {
    total: number;
    available: number;
    types: string[]; // e.g., ["J1772", "NEMA520"]
    details: ChargerDetail[];
  };
  pricing: {
    energy: EnergyPricing[];
    parking: ParkingPricing;
    idleFee?: number; // Optional, in USD/minute
  };
  operationalHours: string; // e.g., "24/7"
  network: Network;
  facilityType: string; // e.g., "PARKING_GARAGE"
  amenities: string[]; // e.g., ["Restrooms", "Wi-Fi"]
  accessRestrictions: string; // e.g., "Public"
  additionalInfo: AdditionalInfo;
  checkIns: CheckIn[];
  reviews: {
    averageRating: number; // e.g., 4.5
    total: number; // e.g., 128
    list: Review[];
  };
}