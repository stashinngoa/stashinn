# Branch Protection Rules

This document outlines the recommended GitHub branch protection settings for the `stashinn-portal` repository.

## Branches to Protect

### `main` (Production)

| Setting | Value |
|---------|-------|
| Require pull request reviews before merging | ✅ Yes (1 approval minimum) |
| Require status checks to pass | ✅ Yes |
| Required status checks | `Lint`, `Type Check`, `Build (customer)`, `Build (partner)`, `Build (admin)` |
| Require branches to be up to date | ✅ Yes |
| Restrict who can push | ✅ Admins only |
| Include administrators | ❌ No (admins can bypass in emergencies) |
| Allow force pushes | ❌ No |
| Allow deletions | ❌ No |

### `develop` (Staging)

| Setting | Value |
|---------|-------|
| Require pull request reviews before merging | ✅ Yes (1 approval minimum) |
| Require status checks to pass | ✅ Yes |
| Required status checks | `Lint`, `Type Check` |
| Require branches to be up to date | ✅ Yes |
| Allow force pushes | ❌ No |

## Branch Naming Convention

| Pattern | Purpose | Example |
|---------|---------|---------|
| `feature/<ticket-id>-<description>` | New features | `feature/UA-01-supabase-auth` |
| `fix/<ticket-id>-<description>` | Bug fixes | `fix/CB-03-payment-callback` |
| `hotfix/<description>` | Emergency production fixes | `hotfix/razorpay-webhook-timeout` |
| `chore/<description>` | Maintenance tasks | `chore/update-dependencies` |

## How to Apply

1. Navigate to **Settings → Branches** in the GitHub repository.
2. Click **Add rule** for each branch pattern.
3. Configure the settings as described above.
4. Ensure the CI workflow (`.github/workflows/ci.yml`) is running successfully before enabling status checks.
