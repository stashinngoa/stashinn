import type { JobDefinition } from './types';
import { DAY } from './time';

export const cleanupJob: JobDefinition = {
  name: 'housekeeping.cleanup',
  title: 'Clean-up',
  area: 'Housekeeping',
  description: 'Deletes read, archived notifications and old job logs. Failed steps are kept until resolved.',
  cadence: { dailyAt: '03:30' },
  defaultEnabled: true,
  async run(ctx) {
    const s = ctx.settings;
    const before = (days: number) => new Date(ctx.now.getTime() - days * DAY).toISOString();
    if (ctx.dryRun) {
      // Count only
      const [{ count: n }, { count: r }, { count: e }] = await Promise.all([
        ctx.db.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', true).eq('is_archived', true).lt('created_at', before(s.keepReadNotificationsDays)),
        ctx.db.from('job_runs').select('id', { count: 'exact', head: true }).lt('started_at', before(s.keepJobLogsDays)),
        ctx.db.from('job_events').select('id', { count: 'exact', head: true }).neq('status', 'failed').lt('created_at', before(s.keepJobLogsDays)),
      ]);
      ctx.count('wouldDeleteNotifications', n || 0);
      ctx.count('wouldDeleteRuns', r || 0);
      ctx.count('wouldDeleteEvents', e || 0);
      return;
    }
    const del = async (q: any, key: string) => {
      const { data, error } = await q.select('id');
      if (error) throw new Error(error.message);
      ctx.count(key, data?.length || 0);
    };
    await del(ctx.db.from('notifications').delete().eq('is_read', true).eq('is_archived', true).lt('created_at', before(s.keepReadNotificationsDays)), 'deletedNotifications');
    await del(ctx.db.from('job_runs').delete().lt('started_at', before(s.keepJobLogsDays)), 'deletedRuns');
    await del(ctx.db.from('job_events').delete().neq('status', 'failed').lt('created_at', before(s.keepJobLogsDays)), 'deletedEvents');
  },
};
