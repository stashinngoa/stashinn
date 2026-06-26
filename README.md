# StashInn Portal

> A short-term luggage storage aggregation platform connecting travelers with verified local storage partners.

## 🏗️ Architecture Overview

StashInn is built as a **Turborepo monorepo** with three independent Next.js applications and shared packages:

```
stashinn-portal/
├── apps/
│   ├── customer/          # Customer-facing booking portal (port 3000)
│   ├── partner/           # Partner management dashboard (port 3001)
│   └── admin/             # Admin operations panel (port 3002)
├── packages/
│   ├── lib/               # Shared types, constants, Supabase clients
│   ├── ui/                # Shared UI component library
│   ├── eslint-config/     # Shared ESLint configuration
│   └── typescript-config/ # Shared TypeScript configuration
├── docs/                  # Project documentation
├── .github/workflows/     # CI/CD pipeline definitions
└── turbo.json             # Turborepo task configuration
```

### App Details

| App | Port | Purpose | URL Pattern |
|-----|------|---------|-------------|
| **Customer** | 3000 | Search locations, book storage, pay | `stashinn.com` |
| **Partner** | 3001 | Manage locations, bookings, payouts | `partner.stashinn.com` |
| **Admin** | 3002 | Verify partners, manage disputes, analytics | `admin.stashinn.com` |

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5.9 |
| **Backend** | Supabase (PostgreSQL, Auth, Edge Functions, RLS) |
| **Payments** | Razorpay |
| **Hosting** | Vercel (per-app deployment) |
| **Monorepo** | Turborepo |
| **CI/CD** | GitHub Actions |

### Shared Package: `@stashinn/lib`

Contains cross-app utilities:
- **Types**: `UserProfile`, `BookingStatus`, `PaymentStatus`, `PartnerStatus`, `UserRole`
- **Constants**: App ports, dashboard routes, auth routes, booking defaults
- **Supabase clients**: Browser and server-side clients (configured in Batch B)

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20
- npm >= 10
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-org>/stashinn-portal.git
cd stashinn-portal

# Install all dependencies
npm install

# Start all apps in development mode
npm run dev
```

### Development Commands

```bash
# Run all apps simultaneously
npm run dev

# Build all apps
npm run build

# Lint all apps and packages
npm run lint

# Type check all apps and packages
npm run check-types

# Format code
npm run format
```

### Running a Single App

```bash
# Run only the customer app
npx turbo run dev --filter=@stashinn/customer

# Build only the partner app
npx turbo run build --filter=@stashinn/partner
```

## 📁 App Folder Structure

Each app follows a consistent structure:

```
apps/<app-name>/
├── app/                   # Next.js App Router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles
│   └── auth/              # Auth-related pages (Stage 1, Batch C)
├── src/
│   ├── components/        # App-specific React components
│   ├── lib/               # App-specific library integrations
│   └── utils/             # App-specific utility functions
├── public/                # Static assets
├── next.config.js         # Next.js configuration
├── tsconfig.json          # TypeScript configuration
├── eslint.config.js       # ESLint configuration
└── package.json           # App dependencies and scripts
```

## 🔐 Environment Variables

See [`.env.example`](./.env.example) for the full list of required environment variables. Refer to [`docs/ENVIRONMENT.md`](./docs/ENVIRONMENT.md) for detailed per-environment documentation.

## 🔀 Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — deployed to live |
| `develop` | Staging — integration branch |
| `feature/*` | Feature branches |
| `fix/*` | Bug fix branches |
| `hotfix/*` | Emergency production fixes |

See [`docs/BRANCH_PROTECTION.md`](./docs/BRANCH_PROTECTION.md) for protection rules.

## 📦 Project Stages

Development follows 8 sequential stages (see [Implementation Plans](./docs/) for details):

1. **Stage 1**: Auth & Infra (Foundation)
2. **Stage 2**: Core Flows (Customer + Partner)
3. **Stage 3**: Payments & Notifications
4. **Stage 4**: Admin & Damage Handling
5. **Stage 5**: Reports & Polish UI
6. **Stage 6**: QA Testing & Launch
7. **Stage 7**: Post Release Enhancements
8. **Stage 8**: Extreme Enhancements

## 📄 License

Private — All rights reserved.
