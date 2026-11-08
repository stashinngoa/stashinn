import { getOpsOverview } from './queries';
import { ListPanel, ListRow, OverviewHeader, RecentBookings, StatCard, timeAgo } from './ui';

const LOCATION_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'New', cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50' },
  update_required: { label: 'Info requested', cls: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800/50' },
};

const Pill = ({ label, cls }: { label: string; cls: string }) => (
  <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${cls}`}>{label}</span>
);

/** Operations: partner onboarding and what's happening at locations right now. */
export default async function OpsOverview() {
  const d = await getOpsOverview();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <OverviewHeader subtitle="Operations · partners, locations and bookings in progress" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Partners to approve" value={String(d.pendingPartners.count)} sub="Waiting for review" icon="store" tone={d.pendingPartners.count ? 'amber' : 'emerald'} href="/dashboard/partners?status=pending" />
        <StatCard label="Locations to review" value={String(d.locationsToReview.count)} sub="New or awaiting partner info" icon="pin" tone={d.locationsToReview.count ? 'amber' : 'emerald'} href="/dashboard/partners" />
        <StatCard label="Active bookings" value={String(d.activeBookings)} sub="Confirmed or checked in now" icon="bolt" href="/dashboard/bookings?status=checked_in" />
        <StatCard label="Overdue pickups" value={String(d.overdue.count)} sub="Past pick-up time, still checked in" icon="clock" tone={d.overdue.count ? 'red' : 'emerald'} href="/dashboard/bookings?status=checked_in" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ListPanel title="Partners awaiting approval" href="/dashboard/partners?status=pending" linkLabel="All partners" empty="No partners waiting.">
          {d.pendingPartners.rows.map((p: any) => (
            <ListRow key={p.id} href={`/dashboard/partners/${p.id}`} title={p.business_name} detail={`${p.users?.email ?? ''} · applied ${timeAgo(p.created_at)}`} />
          ))}
        </ListPanel>
        <ListPanel title="Locations to review" empty="No locations waiting.">
          {d.locationsToReview.rows.map((l: any) => {
            const st = LOCATION_STATUS[l.admin_status] ?? LOCATION_STATUS.pending!;
            return (
              <ListRow key={l.id} href={`/dashboard/partners/${l.partner_id}`} title={l.name} detail={`${l.partners?.business_name ?? ''} · ${l.city}`} badge={<Pill {...st} />} />
            );
          })}
        </ListPanel>
        <ListPanel title="Overdue pickups" href="/dashboard/bookings?status=checked_in" linkLabel="Checked in" empty="Nothing overdue.">
          {d.overdue.rows.map((b: any) => (
            <ListRow key={b.id} href={`/dashboard/bookings?status=checked_in&q=${encodeURIComponent(b.users?.email ?? '')}`} title={b.users?.full_name || b.users?.email || 'Customer'} detail={`${b.partner_locations?.name ?? ''} · due ${timeAgo(b.end_time)}`} />
          ))}
        </ListPanel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RecentBookings bookings={d.recentBookings} className="lg:col-span-2" />
        <StatCard label="New partners" value={String(d.newPartners30d)} sub="Joined in the last 30 days" icon="users" href="/dashboard/partners" />
      </div>
    </div>
  );
}
