import { getSupportOverview } from './queries';
import { Icon, ListPanel, ListRow, OverviewHeader, RecentBookings, StatCard, timeAgo } from './ui';

const CLAIM_STATUS: Record<string, { label: string; cls: string }> = {
  submitted: { label: 'New', cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50' },
  under_review: { label: 'In review', cls: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800/50' },
  escalated: { label: 'Escalated', cls: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50' },
};

const Pill = ({ label, cls }: { label: string; cls: string }) => (
  <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${cls}`}>{label}</span>
);

/** Support: customer problems that need a person — claims, disputes, late pickups, unhappy reviews. */
export default async function SupportOverview() {
  const d = await getSupportOverview();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <OverviewHeader subtitle="Support · claims, disputes and customers who may need help" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Open claims" value={String(d.openClaims.count)} sub="Damage reports not yet resolved" icon="alert" tone={d.openClaims.count ? 'red' : 'emerald'} href="/dashboard/disputes" />
        <StatCard label="Disputed bookings" value={String(d.disputedBookings)} sub="Bookings marked as disputed" icon="alert" tone={d.disputedBookings ? 'amber' : 'emerald'} href="/dashboard/bookings?status=disputed" />
        <StatCard label="Overdue pickups" value={String(d.overdue.count)} sub="Past pick-up time, still checked in" icon="clock" tone={d.overdue.count ? 'red' : 'emerald'} href="/dashboard/bookings?status=checked_in" />
        <StatCard label="Cancellations" value={String(d.cancellations7d.count)} sub="In the last 7 days" icon="cancel" href="/dashboard/bookings?status=cancelled" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ListPanel title="Claims needing action" href="/dashboard/disputes" linkLabel="All claims" empty="No open claims.">
          {d.openClaims.rows.map((c: any) => (
            <ListRow
              key={c.id}
              href={`/dashboard/disputes?status=${c.status}`}
              title={c.description}
              detail={`Booking #${String(c.booking_id).split('-')[0]!.toUpperCase()} · reported ${timeAgo(c.created_at)}`}
              badge={<Pill {...(CLAIM_STATUS[c.status] ?? CLAIM_STATUS.submitted!)} />}
            />
          ))}
        </ListPanel>
        <ListPanel title="Overdue pickups" href="/dashboard/bookings?status=checked_in" linkLabel="Checked in" empty="Nothing overdue.">
          {d.overdue.rows.map((b: any) => (
            <ListRow key={b.id} href={`/dashboard/bookings?status=checked_in&q=${encodeURIComponent(b.users?.email ?? '')}`} title={b.users?.full_name || b.users?.email || 'Customer'} detail={`${b.partner_locations?.name ?? ''} · due ${timeAgo(b.end_time)}`} />
          ))}
        </ListPanel>
        <ListPanel title="Recent cancellations" href="/dashboard/bookings?status=cancelled" linkLabel="All cancelled" empty="No cancellations this week.">
          {d.cancellations7d.rows.map((b: any) => (
            <ListRow
              key={b.id}
              href={`/dashboard/bookings?status=cancelled&q=${encodeURIComponent(b.users?.email ?? '')}`}
              title={b.users?.full_name || b.users?.email || 'Customer'}
              detail={`${b.cancelled_by ? `By ${b.cancelled_by}` : 'Cancelled'} · ${b.partner_locations?.name ?? ''} · ${timeAgo(b.updated_at)}`}
            />
          ))}
        </ListPanel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RecentBookings bookings={d.recentBookings} className="lg:col-span-2" />
        <ListPanel title={`Low-rated reviews · 30 days${d.lowReviews30d.count ? ` (${d.lowReviews30d.count})` : ''}`} href="/dashboard/reviews" linkLabel="Reviews" empty="No 1–2 star reviews recently.">
          {d.lowReviews30d.rows.map((r: any) => (
            <ListRow
              key={r.id}
              href="/dashboard/reviews"
              title={r.comment || 'No comment'}
              detail={`${r.users?.full_name || r.users?.email || 'Customer'} · ${r.partner_locations?.name ?? ''} · ${timeAgo(r.created_at)}`}
              badge={
                <span className="shrink-0 inline-flex items-center gap-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  {r.rating}<Icon name="star" className="w-3.5 h-3.5" />
                </span>
              }
            />
          ))}
        </ListPanel>
      </div>
    </div>
  );
}
