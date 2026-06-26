# Database Backup & Rollback Plan

This document defines the backup strategy, restore procedures, and rollback protocols for the StashInn Supabase databases.

---

## 1. Backup Frequency & Retention Policy

### Supabase Built-in Backups

Supabase Pro plan includes automatic daily backups with configurable retention.

| Environment | Frequency | Retention | Type |
|-------------|-----------|-----------|------|
| **Production** | Daily (automatic) | 30 days | Full database snapshot |
| **Production** | Weekly (Sunday 02:00 UTC) | 90 days | Point-in-time recovery (PITR) |
| **Staging** | Daily (automatic) | 7 days | Full database snapshot |
| **Development** | On-demand only | N/A | Local via `supabase db dump` |

### Custom Export Schedule (Supplementary)

In addition to Supabase's built-in backups, we run supplementary exports:

| Schedule | What | Where Stored | Owner |
|----------|------|-------------|-------|
| Daily 03:00 UTC | Schema + data dump | Cloud storage (S3/GCS bucket) | Cron job (GitHub Action) |
| Weekly Sunday 04:00 UTC | Full `pg_dump` with schemas | Cloud storage (30-day retention) | Cron job |
| Pre-deploy | Schema-only dump | Git (tagged release) | CI pipeline |

---

## 2. Automated Export Implementation

### GitHub Action: Scheduled DB Export

```yaml
# .github/workflows/db-backup.yml
name: Scheduled DB Backup

on:
  schedule:
    - cron: '0 3 * * *'     # Daily at 03:00 UTC
  workflow_dispatch:          # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1

      - name: Export schema + data
        run: |
          supabase db dump \
            --db-url "${{ secrets.SUPABASE_DB_URL }}" \
            --data-only > data_backup_$(date +%Y%m%d).sql

          supabase db dump \
            --db-url "${{ secrets.SUPABASE_DB_URL }}" \
            > full_backup_$(date +%Y%m%d).sql

      - name: Upload to Cloud Storage
        uses: google-github-actions/upload-cloud-storage@v2
        with:
          path: '*_backup_*.sql'
          destination: 'stashinn-backups/${{ github.event.schedule && 'daily' || 'manual' }}'
          credentials: ${{ secrets.GCS_CREDENTIALS }}
```

### Local Development Backup

```bash
# Dump local database
npx supabase db dump --local > backup_local_$(date +%Y%m%d).sql

# Dump remote database (linked project)
npx supabase db dump --linked > backup_remote_$(date +%Y%m%d).sql

# Schema-only dump (no data)
npx supabase db dump --linked --schema-only > schema_$(date +%Y%m%d).sql
```

---

## 3. Restore Procedures

### Restore from Supabase Dashboard

1. Navigate to **Supabase Dashboard → Project → Database → Backups**
2. Select the backup snapshot to restore
3. Click **Restore** and confirm
4. Wait for the restoration to complete (~5-15 minutes depending on size)

> ⚠️ **This replaces ALL data in the target database.** Always test on staging first.

### Restore from Custom Dump

```bash
# Restore to local development
psql $LOCAL_DB_URL < full_backup_20250411.sql

# Restore to staging (CAUTION)
psql $STAGING_DB_URL < full_backup_20250411.sql
```

### Point-in-Time Recovery (PITR) — Production Only

1. Navigate to **Supabase Dashboard → Database → Backups → PITR**
2. Select the exact timestamp to recover to
3. Confirm the restoration

Use PITR when:
- A bad migration was applied in the last few hours
- Data was accidentally deleted
- You need to recover to a specific moment

---

## 4. Testing the Restore Procedure

### Monthly Restore Drill (Staging)

Run this procedure monthly to validate backup integrity:

1. **Export** production data: `supabase db dump --linked > prod_$(date +%Y%m%d).sql`
2. **Create** a temporary Supabase project or use a local instance
3. **Restore** the dump: `psql $TEMP_DB_URL < prod_20250411.sql`
4. **Validate**:
   - [ ] All tables exist with correct schemas
   - [ ] Row counts match production
   - [ ] RLS policies are intact
   - [ ] Storage bucket configs are present
   - [ ] Sample queries return expected results
5. **Document** the test result in the #ops channel

### Automated Validation (CI)

```bash
# After restore, run validation queries
psql $DB_URL -c "SELECT count(*) FROM public.users;"
psql $DB_URL -c "SELECT count(*) FROM public.bookings;"
psql $DB_URL -c "SELECT count(*) FROM public.partners;"
psql $DB_URL -c "\\dt public.*"  # List all tables
```

---

## 5. Rollback Decision Framework

### When to Rollback

| Scenario | Action | Authorized By |
|----------|--------|---------------|
| Bad migration breaks production queries | Rollback migration immediately | Any developer + notify admin |
| Data corruption after a code deploy | PITR to pre-deploy timestamp | Team lead or admin |
| Accidental bulk delete | PITR to pre-delete timestamp | Team lead or admin |
| Performance degradation from migration | Analyze → fix-forward or rollback | Team lead after analysis |
| Security breach / data exposure | PITR + credential rotation | Admin (mandatory) |

### Who Authorizes Rollbacks

| Environment | Authorization Required |
|-------------|----------------------|
| **Development** | Self (any developer) |
| **Staging** | Any team member |
| **Production** | Team lead or Admin (documented in #ops channel) |

### Rollback Communication Protocol

1. **Announce** in #ops Slack channel: "🔴 ROLLBACK INITIATED — [reason]"
2. **Execute** the rollback
3. **Validate** services are functional
4. **Post-mortem** within 24 hours documenting root cause and prevention

---

## 6. Alerting for Failed Backups

### GitHub Action Failure Alerts

The backup workflow uses GitHub Actions' built-in failure notifications. Additionally:

```yaml
# Add to the backup workflow
  notify-failure:
    runs-on: ubuntu-latest
    needs: backup
    if: failure()
    steps:
      - name: Send Slack Alert
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          text: "🔴 BACKUP FAILED — StashInn DB backup job failed. Check GitHub Actions."
          webhook_url: ${{ secrets.SLACK_OPS_WEBHOOK }}

      - name: Send Email Alert
        uses: dawidd6/action-send-mail@v3
        with:
          server_address: smtp.gmail.com
          to: admin@stashinn.com
          subject: "🔴 StashInn DB Backup Failed"
          body: "The scheduled database backup failed. Check GitHub Actions for details."
```

### Monitoring Checklist

- [ ] **Daily**: Verify backup workflow ran successfully (GitHub Actions)
- [ ] **Weekly**: Spot-check backup file sizes (should grow over time, not shrink)
- [ ] **Monthly**: Run full restore drill on staging
- [ ] **Quarterly**: Review retention policy and storage costs

---

## 7. Migration Versioning & Rollback Plan

### Migration Version Tracking

Supabase tracks applied migrations in the `supabase_migrations.schema_migrations` table:

```sql
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
```

### Writing Rollback-Safe Migrations

Every migration file should include a rollback comment block at the top:

```sql
-- ============================================================================
-- ROLLBACK INSTRUCTIONS:
-- To undo this migration, run:
-- DROP TABLE IF EXISTS public.new_table;
-- DROP TYPE IF EXISTS new_enum;
-- ============================================================================
```

### Rolling Back a Migration

**Option A: Fix-forward (preferred)**

Create a new migration that reverses the changes:

```bash
npx supabase migration new rollback_bad_change

# Edit the file to undo the previous migration's changes
# Push the new migration
npx supabase db push
```

**Option B: Manual rollback (emergencies only)**

```bash
# 1. Connect to the database directly
psql $DB_URL

# 2. Run the rollback SQL from the migration's rollback comment
# 3. Delete the migration record
DELETE FROM supabase_migrations.schema_migrations
WHERE version = '20250412121500';

# 4. Document the manual intervention
```

> ⚠️ **Never delete migration files from the repository.** Always fix-forward with a new migration.

### Pre-Deploy Migration Checklist

Before pushing migrations to staging/production:

- [ ] Migration tested locally with `supabase db reset`
- [ ] Rollback SQL documented in the migration file
- [ ] No breaking changes to existing RLS policies
- [ ] Schema dump taken before push (`supabase db dump --linked --schema-only`)
- [ ] Team notified in #ops channel
