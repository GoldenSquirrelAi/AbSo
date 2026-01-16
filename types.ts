
export type UserRole = 'guest' | 'buyer' | 'driver' | 'admin' | 'auction_admin';

export enum OrderStatus {
  PENDING = 'Pending',
  SCHEDULED = 'Scheduled',
  READY_FOR_PICKUP = 'Ready for Pickup',
  IN_TRANSIT = 'In Transit',
  DELIVERED = 'Delivered',
  EXCEPTION = 'Exception'
}

export interface AuctionItem {
  id: string;
  title: string;
  lotNumber: string;
  dimensions: string; // e.g. "Small", "Oversized"
  imageUrl?: string;
  quantity?: number;
  location?: string;
}

export interface Order {
  id: string;
  customerName: string;
  auctionHouse: string; // e.g. "Nellis Auction"
  pickupLocation: string; // Primary location for display
  pickupLocations?: string[]; // Support for multiple pickup locations
  dropoffAddress: string;
  items: AuctionItem[];
  status: OrderStatus;
  cost: number;
  scheduledDate?: string;
  
  // Location Data for Routing
  coordinates?: {
      lat: number;
      lng: number;
  };

  // New fields for user stories
  isReadyForPickup?: boolean;
  tip?: number;
  rating?: number;
  feedback?: string;
  deliveryProof?: string; // URL or base64 placeholder
  estimatedArrival?: string;
  specialInstructions?: string;

  // Pricing & Logic flags
  isMultiLocation?: boolean;
  
  // Returns
  returnDetails?: {
      hasReturn: boolean;
      description?: string;
      notes?: string;
      isInitiated?: boolean;
  };
}

export interface DriverBlock {
  id: string;
  driverId?: string;
  startTime: string;
  endTime: string;
  region: string; // e.g. "Summerlin", "Henderson"
  totalPay: number;
  status: 'open' | 'claimed' | 'active' | 'completed';
  orderIds: string[];
  routeEfficiency?: number; // 0-100 score
  currentStepIndex?: number; // For driver navigation state
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone?: string;
  address?: string;
  coordinates?: {
      lat: number;
      lng: number;
  };
  stats?: {
    deliveries?: number;
    rating?: number;
    earnings?: number;
  }
}
