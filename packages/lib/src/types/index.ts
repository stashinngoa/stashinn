/**
 * User roles within the StashInn platform.
 */
export type UserRole = "customer" | "partner" | "admin";

/**
 * Granular admin roles.
 */
export type AdminRole = "superadmin" | "finance" | "support" | "ops";

/**
 * Base user profile stored in the `users` table alongside Supabase Auth.
 */
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  admin_role?: AdminRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Booking status lifecycle.
 */
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "disputed";

/**
 * Payment status lifecycle.
 */
export type PaymentStatus =
  | "pending"
  | "pending_validation"
  | "paid"
  | "refunded"
  | "partially_refunded"
  | "failed";

/**
 * Partner verification status.
 */
export type PartnerStatus = "pending" | "approved" | "rejected" | "suspended";

/**
 * Location type.
 */
export type LocationType = "luggage" | "garage";

/**
 * Vehicle pricing rates structure.
 */
export interface VehiclePricing {
  bike_capacity: number;
  bike_rate_hr: number;
  bike_rate_day: number;
  sedan_capacity: number;
  sedan_rate_hr: number;
  sedan_rate_day: number;
  suv_capacity: number;
  suv_rate_hr: number;
  suv_rate_day: number;
}
