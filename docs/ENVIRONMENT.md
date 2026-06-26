# Environment Variables Documentation

This document provides a detailed reference for all environment variables used across StashInn Portal apps.

## Environment Matrix

| Variable | Dev | Staging | Prod | Stored In |
|----------|-----|---------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Dev project URL | Staging project URL | Prod project URL | Vercel Env Vars |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dev anon key | Staging anon key | Prod anon key | Vercel Env Vars |
| `SUPABASE_SERVICE_ROLE_KEY` | Dev service key | Staging service key | Prod service key | Vercel Env Vars (Sensitive) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | `rzp_test_*` | `rzp_test_*` | `rzp_live_*` | Vercel Env Vars |
| `RAZORPAY_KEY_SECRET` | Test secret | Test secret | Live secret | Vercel Env Vars (Sensitive) |
| `RAZORPAY_WEBHOOK_SECRET` | Test webhook | Test webhook | Live webhook | Vercel Env Vars (Sensitive) |
| `NEXT_PUBLIC_APP_ENV` | `development` | `staging` | `production` | Vercel Env Vars |
| `NEXT_PUBLIC_CUSTOMER_URL` | `localhost:3000` | `staging.stashinn.com` | `stashinn.com` | Vercel Env Vars |
| `NEXT_PUBLIC_PARTNER_URL` | `localhost:3001` | `partner-staging.stashinn.com` | `partner.stashinn.com` | Vercel Env Vars |
| `NEXT_PUBLIC_ADMIN_URL` | `localhost:3002` | `admin-staging.stashinn.com` | `admin.stashinn.com` | Vercel Env Vars |

## Where Secrets Are Stored

| Store | What Goes Here | How to Access |
|-------|---------------|---------------|
| **Vercel Environment Variables** | All runtime env vars (per-environment) | Vercel Dashboard → Project → Settings → Environment Variables |
| **GitHub Secrets** | CI/CD build secrets (`TURBO_TOKEN`, Supabase keys for builds) | GitHub → Repo → Settings → Secrets and Variables → Actions |
| **Supabase Dashboard** | Database passwords, API keys | Supabase Dashboard → Project Settings → API |
| **Razorpay Dashboard** | Payment keys | Razorpay Dashboard → Settings → API Keys |

## Naming Conventions

- `NEXT_PUBLIC_*` — Safe to expose to the browser (embedded in client-side JS bundles). Use ONLY for non-sensitive values.
- All other variables — Server-side only. Never prefix with `NEXT_PUBLIC_`.

## Security Rules

1. **NEVER** commit `.env.local` or any file with real secrets.
2. **NEVER** log secret values in application code.
3. **Use `NEXT_PUBLIC_` prefix sparingly** — only for values that are safe for public exposure.
4. **Rotate secrets immediately** if a leak is detected.
5. **Use separate Supabase projects** for dev, staging, and production.
6. **Use Razorpay test mode** (`rzp_test_*`) for dev and staging; switch to live mode (`rzp_live_*`) only in production.
