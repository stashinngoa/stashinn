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
