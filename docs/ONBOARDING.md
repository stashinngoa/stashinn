# Developer Onboarding Guide

Welcome to the StashInn Portal codebase! Follow these steps to get your local environment set up safely.

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | >= 20 | [nodejs.org](https://nodejs.org/) |
| npm | >= 10 | Comes with Node.js |
| Git | Latest | [git-scm.com](https://git-scm.com/) |
| VS Code | Latest (recommended) | [code.visualstudio.com](https://code.visualstudio.com/) |

## Step 1: Clone the Repository

```bash
git clone https://github.com/<your-org>/stashinn-portal.git
cd stashinn-portal
```

## Step 2: Set Up Environment Variables

```bash
# Copy the template
cp .env.example .env.local

# Open and fill in your values
# Ask a team lead for the development Supabase credentials
```

> ⚠️ **IMPORTANT**: Never commit `.env.local`. It is already in `.gitignore`.

### Where to get credentials:

| Credential | Source |
|------------|--------|
| Supabase URL & Keys | Supabase Dashboard → Project Settings → API |
| Razorpay Test Keys | Razorpay Dashboard → Settings → API Keys (Test Mode) |
| Google OAuth | Google Cloud Console → Credentials |

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Run the Development Servers

```bash
# Start all three apps simultaneously
npm run dev
```

Apps will be available at:
- **Customer**: http://localhost:3000
- **Partner**: http://localhost:3001
- **Admin**: http://localhost:3002

### Run a Single App

```bash
# Customer only
npx turbo run dev --filter=@stashinn/customer

# Partner only
npx turbo run dev --filter=@stashinn/partner

# Admin only
npx turbo run dev --filter=@stashinn/admin
```

## Step 5: Verify Environment

```bash
# Validate that all required env vars are set
node scripts/check-env.mjs
```

## Step 6: Create a Feature Branch

```bash
# Always branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/<ticket-id>-<short-description>

# Example:
git checkout -b feature/UA-01-supabase-auth
```

## Common Commands

| Command | What It Does |
|---------|-------------|
| `npm run dev` | Start all apps in development mode |
| `npm run build` | Build all apps for production |
| `npm run lint` | Lint all apps and packages |
| `npm run check-types` | TypeScript type checking |
| `npm run format` | Format code with Prettier |

## VS Code Recommended Extensions

- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)
- Tailwind CSS IntelliSense (if Tailwind is added later)

## Troubleshooting

### Port already in use

If a port is occupied, kill the process:

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# macOS/Linux
lsof -i :3000
kill -9 <pid>
```

### npm install fails

```bash
# Clear cache and retry
npm cache clean --force
rm -rf node_modules
rm package-lock.json
npm install
```

## Questions?

Reach out to the team lead or check the [`docs/`](../docs/) directory for additional documentation.
