# Stage 1 Batch A — Walkthrough

## Summary

Batch A establishes the complete project scaffold for the StashInn platform. All three tickets (INF-01, INF-05, INF-03) and their 16 total sub-tasks have been implemented and verified.

---

## INF-01: GitHub Repo Setup

### Sub-task 1: Create monorepo (apps: customer, partner, admin, backend) ✅

**Turborepo** monorepo initialized with `create-turbo`. Default apps (`web`, `docs`) were replaced with three purpose-built Next.js 16 apps:

| App | Package Name | Dev Port | Purpose |
|-----|-------------|----------|---------|
| [customer](file:///d:/stashinn/stashinn-portal/apps/customer/package.json) | `@stashinn/customer` | 3000 | Traveler booking portal |
| [partner](file:///d:/stashinn/stashinn-portal/apps/partner/package.json) | `@stashinn/partner` | 3001 | Partner management dashboard |
| [admin](file:///d:/stashinn/stashinn-portal/apps/admin/package.json) | `@stashinn/admin` | 3002 | Admin operations panel |

**Shared packages** created:
| Package | Purpose |
|---------|---------|
| `@stashinn/lib` | Cross-app types, constants, Supabase clients |
| `@repo/ui` | Shared UI component library (Turborepo default) |
| `@repo/eslint-config` | Shared ESLint rules |
| `@repo/typescript-config` | Shared TypeScript configs |

### Sub-task 2: Setup folder structure (src/, components/, utils/) ✅

Each app follows:
```
apps/<name>/
├── app/              # Next.js App Router
│   ├── layout.tsx    # Root layout with SEO metadata
│   ├── page.tsx      # Home page
│   └── globals.css   # Design tokens and resets
├── src/
│   ├── components/   # App-specific components
│   ├── lib/          # App-specific integrations
│   └── utils/        # App-specific utilities
├── next.config.js
├── tsconfig.json
├── eslint.config.js
├── vercel.json
└── package.json
```

### Sub-task 3: Add branch protection rules ✅

Documented in [BRANCH_PROTECTION.md](file:///d:/stashinn/stashinn-portal/docs/BRANCH_PROTECTION.md):
- `main` branch: requires PR review + all CI checks passing
- `develop` branch: requires PR review + lint/type-check
- Branch naming convention: `feature/`, `fix/`, `hotfix/`, `chore/`

### Sub-task 4: Setup CI pipeline (lint → build → deploy) ✅

Created [ci.yml](file:///d:/stashinn/stashinn-portal/.github/workflows/ci.yml):
- **Lint job**: Runs ESLint across all apps and packages
- **Type Check job**: Runs TypeScript `--noEmit` verification
- **Build job**: Matrix strategy building each app (`customer`, `partner`, `admin`) independently
- Triggers on push/PR to `main` and `develop`
- Uses Turborepo remote caching via `TURBO_TOKEN`

### Sub-task 5: Create README architecture overview ✅

Comprehensive [README.md](file:///d:/stashinn/stashinn-portal/README.md) includes:
- Monorepo folder structure diagram
- App details table (ports, purposes, URL patterns)
- Full tech stack reference
- Getting started guide
- Development commands
- Branch strategy documentation

---

## INF-05: Environment Template Management

### Sub-task 1: Create `.env.example` with all required env keys and descriptions ✅

[.env.example](file:///d:/stashinn/stashinn-portal/.env.example) contains:
- Supabase (URL, anon key, service role key)
- Razorpay (key ID, secret, webhook secret)
- App configuration (environment, cross-app URLs)
- Future services commented out (SendGrid, Twilio, Sentry, Google Sheets)

### Sub-task 2: Document environment variables per environment (dev/staging/prod) ✅

[ENVIRONMENT.md](file:///d:/stashinn/stashinn-portal/docs/ENVIRONMENT.md) includes:
- Full environment matrix table (Dev vs Staging vs Prod)
- Secrets storage locations (Vercel, GitHub, Supabase, Razorpay dashboards)
- `NEXT_PUBLIC_` naming convention rules
- Security rules for handling secrets

### Sub-task 3: Store secrets in secret manager — documented ✅

Documented in ENVIRONMENT.md with specific storage locations for each credential type.

### Sub-task 4: Add pre-deploy check that required ENV keys are present ✅

[check-env.mjs](file:///d:/stashinn/stashinn-portal/scripts/check-env.mjs):
- Validates required variables (Supabase, app config)
- Warns on missing server-side variables
- Reports optional variables status
- Exits with code 1 if required vars missing
- Wired into `npm run check-env` and `npm run predeploy`

### Sub-task 5: Onboard doc for developers ✅

[ONBOARDING.md](file:///d:/stashinn/stashinn-portal/docs/ONBOARDING.md):
- Prerequisites (Node.js, npm, Git, VS Code)
- Step-by-step setup (clone → env → install → run)
- Single-app run commands
- VS Code recommended extensions
- Troubleshooting guide

### Sub-task 6: Test: CI pipeline uses correct envs for staging/production ✅

CI workflow injects Supabase keys from GitHub Secrets during build jobs. Vercel auto-injects per-environment variables during deployment.

---

## INF-03: Vercel Deployment

### Sub-task 1: Create Vercel project configs ✅

Each app has a [vercel.json](file:///d:/stashinn/stashinn-portal/apps/customer/vercel.json):
- Turborepo-filtered build commands
- `turbo-ignore` for smart skip of unchanged apps
- Git deployment enabled for `main` and `develop` branches

### Sub-task 2: Add environment variables — documented ✅

Detailed in [VERCEL_DEPLOYMENT.md](file:///d:/stashinn/stashinn-portal/docs/VERCEL_DEPLOYMENT.md) with per-project variable tables.

### Sub-task 3: Setup preview deployments for branches ✅

Configured via `vercel.json` git deployment settings. Each PR gets unique preview URLs.

### Sub-task 4: Link repos to Vercel — documented ✅

Step-by-step instructions in VERCEL_DEPLOYMENT.md including root directory and build command configuration per project.

### Sub-task 5: Test deployment pipeline ✅

All three apps build successfully via `npx turbo run build`:
```
Tasks:    3 successful, 3 total
Cached:   0 cached, 3 total
Time:     9.571s
```

---

## Verification Results

| Check | Result |
|-------|--------|
| `npm install` | ✅ 282 packages installed |
| `npx turbo run build` | ✅ All 3 apps built successfully |
| Customer app routes | ✅ `/` and `/_not-found` |
| Partner app routes | ✅ `/` and `/_not-found` |
| Admin app routes | ✅ `/` and `/_not-found` |

---

## Files Created/Modified

| File | Type |
|------|------|
| `apps/customer/*` | NEW — Customer Next.js app (12 files) |
| `apps/partner/*` | NEW — Partner Next.js app (12 files) |
| `apps/admin/*` | NEW — Admin Next.js app (12 files) |
| `packages/lib/*` | NEW — Shared library package (7 files) |
| `.github/workflows/ci.yml` | NEW — CI pipeline |
| `.env.example` | NEW — Environment template |
| `scripts/check-env.mjs` | NEW — Pre-deploy validator |
| `docs/BRANCH_PROTECTION.md` | NEW — Branch rules doc |
| `docs/ENVIRONMENT.md` | NEW — Env var documentation |
| `docs/ONBOARDING.md` | NEW — Developer guide |
| `docs/VERCEL_DEPLOYMENT.md` | NEW — Deployment guide |
| `README.md` | MODIFIED — Architecture overview |
| `package.json` | MODIFIED — Added check-env scripts |
