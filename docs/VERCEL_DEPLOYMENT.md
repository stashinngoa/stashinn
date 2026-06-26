# Vercel Deployment Guide

This document covers how to set up and manage Vercel deployments for all three StashInn apps.

## Initial Setup (One-Time)

### Step 1: Create Vercel Projects

Create **three separate Vercel projects** — one for each app:

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `stashinn-portal` GitHub repository
3. Configure as follows:

| Setting | Customer | Partner | Admin |
|---------|----------|---------|-------|
| **Project Name** | `stashinn-customer` | `stashinn-partner` | `stashinn-admin` |
| **Root Directory** | `apps/customer` | `apps/partner` | `apps/admin` |
| **Framework** | Next.js | Next.js | Next.js |
| **Build Command** | `npx turbo run build --filter=@stashinn/customer` | `npx turbo run build --filter=@stashinn/partner` | `npx turbo run build --filter=@stashinn/admin` |
| **Output Directory** | `.next` | `.next` | `.next` |
| **Install Command** | `npm install` | `npm install` | `npm install` |

### Step 2: Add Environment Variables

For each Vercel project, go to **Settings → Environment Variables** and add:

#### All Projects (shared):
```
NEXT_PUBLIC_SUPABASE_URL         → (your Supabase project URL)
NEXT_PUBLIC_SUPABASE_ANON_KEY    → (your Supabase anon key)
SUPABASE_SERVICE_ROLE_KEY        → (your service role key) [Sensitive]
NEXT_PUBLIC_APP_ENV              → development | staging | production
NEXT_PUBLIC_CUSTOMER_URL         → https://stashinn.com (or staging URL)
NEXT_PUBLIC_PARTNER_URL          → https://partner.stashinn.com
NEXT_PUBLIC_ADMIN_URL            → https://admin.stashinn.com
```

#### Payment-related (Customer & Partner):
```
NEXT_PUBLIC_RAZORPAY_KEY_ID      → rzp_test_* or rzp_live_*
RAZORPAY_KEY_SECRET              → (secret) [Sensitive]
RAZORPAY_WEBHOOK_SECRET          → (webhook secret) [Sensitive]
```

> 💡 **Tip**: Set different values per environment (Production / Preview / Development) using Vercel's environment scoping.

### Step 3: Link Repository

Each Vercel project should be linked to the **same GitHub repository** (`stashinn-portal`). Vercel handles this via the root directory setting.

### Step 4: Enable Preview Deployments

Preview deployments are enabled by default. Every PR will get a unique preview URL:
- `stashinn-customer-xyz.vercel.app`
- `stashinn-partner-xyz.vercel.app`
- `stashinn-admin-xyz.vercel.app`

The `vercel.json` in each app uses `turbo-ignore` to skip rebuilds when only unrelated files change.

## Custom Domains (Production)

| App | Domain |
|-----|--------|
| Customer | `stashinn.com` or `www.stashinn.com` |
| Partner | `partner.stashinn.com` |
| Admin | `admin.stashinn.com` |

Configure in Vercel: **Project → Settings → Domains → Add Domain**.

## Deployment Flow

```
Developer pushes to feature branch
  → Vercel creates Preview Deployment (per app)
  → GitHub CI runs lint + type-check + build
  → PR review + merge to develop
  → Vercel deploys to Staging (develop branch)
  → Merge develop → main
  → Vercel deploys to Production (main branch)
```

## Testing Deployments

After initial setup, verify:

1. Push a commit to a feature branch → Preview deployment appears
2. Merge to `develop` → Staging deployment updates
3. Merge to `main` → Production deployment updates
4. Environment variables resolve correctly in each environment
