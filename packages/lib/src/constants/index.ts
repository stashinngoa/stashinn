/**
 * Application-wide constants shared across all StashInn apps.
 */

/** Default app ports for local development */
export const APP_PORTS = {
  customer: 3000,
  partner: 3001,
  admin: 3002,
} as const;

/** Role-based dashboard redirect paths */
export const DASHBOARD_ROUTES: Record<string, string> = {
  customer: "/dashboard",
  partner: "/dashboard",
  admin: "/dashboard",
};

/** Auth-related routes */
export const AUTH_ROUTES = {
  login: "/auth/login",
  register: "/auth/register",
  forgotPassword: "/auth/forgot-password",
  callback: "/auth/callback",
} as const;

/** Booking configuration defaults (overridable via system_config) */
export const BOOKING_DEFAULTS = {
  minHours: 1,
  maxDays: 5,
  cancellationWindowHours: 12,
  otpExpiryMinutes: 10,
  otpLength: 6,
} as const;

/** Supported OTP delivery channels */
export const OTP_CHANNELS = ["email", "whatsapp", "sms"] as const;
