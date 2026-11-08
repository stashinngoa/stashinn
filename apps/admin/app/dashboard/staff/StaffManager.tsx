'use client';

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { addStaff, changeStaffRole, lookupAccount, removeStaff, resendInvite, type ActionResult } from './actions';
import { ACCOUNT_STATUS, ADMIN_ROLES, roleInfo, type AccountStatus, type AdminRole } from './roles';

type StaffMember = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  admin_role: AdminRole | null;
  created_at: string | null;
  status: AccountStatus;
  link_sent_at: string | null;
};

const initials = (name: string) =>
  name.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('') || '?';

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/* ---------------------------------------------------------------- shared bits */

function RoleBadge({ role }: { role: string | null }) {
  const r = roleInfo(role);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-bold ${r.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${r.dot}`} />
      {r.label}
    </span>
  );
}

const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 48 ? `${hrs}h ago` : `${Math.round(hrs / 24)}d ago`;
};

function StatusBadge({ member }: { member: StaffMember }) {
  const st = ACCOUNT_STATUS[member.status];
  return (
    <span className="inline-flex flex-col">
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold whitespace-nowrap ${st.badge}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
        {st.label}
      </span>
      {member.status !== 'active' && member.link_sent_at && (
        <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 pl-1">Link sent {ago(member.link_sent_at)}</span>
      )}
    </span>
  );
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/50 dark:bg-black/70 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="sticky top-0 bg-white dark:bg-gray-900 px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 -mr-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function RolePicker({ value, onChange, current, name }: { value: AdminRole | null; onChange: (r: AdminRole) => void; current?: AdminRole | null; name?: string }) {
  return (
    <div className="grid gap-2" role="radiogroup" aria-label="Role">
      {name && <input type="hidden" name={name} value={value ?? ''} />}
      {ADMIN_ROLES.map(r => {
        const selected = value === r.value;
        return (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(r.value)}
            className={`text-left p-3.5 rounded-xl border-2 transition-colors ${
              selected
                ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/30'
                : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                <span className={`w-2 h-2 rounded-full ${r.dot}`} />
                {r.label}
                {current === r.value && <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Current</span>}
              </span>
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selected ? 'border-orange-500' : 'border-gray-300 dark:border-gray-600'}`}>
                {selected && <span className="w-2 h-2 rounded-full bg-orange-500" />}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{r.summary}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {r.can.map(c => (
                <li key={c} className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{c}</li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
  );
}

const primaryBtn = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-500 text-white text-sm font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const secondaryBtn = 'inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors';
const Spinner = () => <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />;

function ErrorNote({ text }: { text: string }) {
  return <p className="mt-4 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-xl px-3 py-2">{text}</p>;
}

/* ---------------------------------------------------------------- dialogs */

function ChangeRoleDialog({ member, onClose, onDone }: { member: StaffMember; onClose: () => void; onDone: (msg: string) => void }) {
  const [role, setRole] = useState<AdminRole | null>(member.admin_role);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const name = member.full_name || member.email;
  const changed = role && role !== member.admin_role;

  return (
    <Modal title="Change role" subtitle={`Choose what ${name} can access.`} onClose={onClose}>
      <RolePicker value={role} onChange={setRole} current={member.admin_role} />
      {error && <ErrorNote text={error} />}
      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
        <button
          type="button"
          disabled={!changed || pending}
          onClick={() => start(async () => {
            const res = await changeStaffRole(member.id, role!);
            if (res.ok) onDone(res.message); else setError(res.error);
          })}
          className={primaryBtn}
        >
          {pending && <Spinner />}
          {changed ? `Change to ${roleInfo(role).label}` : 'Change role'}
        </button>
      </div>
    </Modal>
  );
}

function RemoveDialog({ member, onClose, onDone }: { member: StaffMember; onClose: () => void; onDone: (msg: string) => void }) {
  const notActivated = member.status !== 'active';
  const [mode, setMode] = useState<'revoke' | 'delete'>(notActivated ? 'delete' : 'revoke');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const name = member.full_name || member.email;

  const run = () => start(async () => {
    const res = await removeStaff(member.id, mode === 'delete');
    if (res.ok) onDone(res.message); else setError(res.error);
  });

  if (notActivated) {
    return (
      <Modal title="Cancel invite?" onClose={onClose}>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-bold text-gray-900 dark:text-white">{name}</span> never finished setting up their account.
          Cancelling deletes the account from Supabase, so their invite link stops working. You can invite them again later.
        </p>
        {error && <ErrorNote text={error} />}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>Keep invite</button>
          <button type="button" disabled={pending} onClick={run} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-50">
            {pending && <Spinner />}
            Cancel invite &amp; delete
          </button>
        </div>
      </Modal>
    );
  }

  const options = [
    {
      value: 'revoke' as const,
      title: 'Remove admin access',
      body: 'Recommended. They lose admin access immediately but keep their account: partners go back to the partner portal, everyone else becomes a customer. Their bookings and audit history stay on record.',
    },
    {
      value: 'delete' as const,
      title: 'Delete account permanently',
      body: 'Removes them from Supabase entirely. Only possible if they have no bookings, reviews, damage reports, partner business or admin actions in the audit log.',
    },
  ];

  return (
    <Modal title={`Remove ${name}?`} onClose={onClose}>
      <div className="grid gap-2" role="radiogroup">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={mode === o.value}
            onClick={() => setMode(o.value)}
            className={`text-left p-3.5 rounded-xl border-2 transition-colors ${
              mode === o.value
                ? o.value === 'delete' ? 'border-red-500 bg-red-50/60 dark:bg-red-950/30' : 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/30'
                : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
            }`}
          >
            <p className="text-sm font-bold text-gray-900 dark:text-white">{o.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{o.body}</p>
          </button>
        ))}
      </div>
      {error && <ErrorNote text={error} />}
      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
        <button type="button" disabled={pending} onClick={run} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-50">
          {pending && <Spinner />}
          {mode === 'delete' ? 'Delete account' : 'Remove access'}
        </button>
      </div>
    </Modal>
  );
}

type Lookup = { state: 'idle' | 'loading' } | { state: 'done'; found: false } | { state: 'done'; found: true; full_name: string | null; role: string; admin_role: string | null };

function AddStaffDialog({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const [result, formAction, pending] = useActionState<ActionResult | null, FormData>(addStaff, null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole | null>('support');
  const [lookup, setLookup] = useState<Lookup>({ state: 'idle' });
  const lookupId = useRef(0);

  useEffect(() => { if (result?.ok) onDone(result.message); }, [result, onDone]);

  // Debounced account lookup so we can say what will happen before anything changes
  useEffect(() => {
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { setLookup({ state: 'idle' }); return; }
    const id = ++lookupId.current;
    setLookup({ state: 'loading' });
    const t = setTimeout(async () => {
      const res = await lookupAccount(value);
      if (id === lookupId.current) setLookup(res.found ? { state: 'done', ...res } : { state: 'done', found: false });
    }, 400);
    return () => clearTimeout(t);
  }, [email]);

  const alreadyStaff = lookup.state === 'done' && lookup.found && lookup.role === 'admin';
  const existing = lookup.state === 'done' && lookup.found && !alreadyStaff ? lookup : null;
  const roleLabel = role ? roleInfo(role).label : 'admin';

  return (
    <Modal title="Add staff member" subtitle="Give an existing account admin access, or invite someone new." onClose={onClose}>
      <form action={formAction} className="space-y-5">
        <div>
          <label htmlFor="staff-email" className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Email address</label>
          <input
            id="staff-email"
            type="email"
            name="email"
            required
            autoFocus
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />

          {/* What will happen */}
          <div className="mt-2 min-h-[44px]" aria-live="polite">
            {lookup.state === 'loading' && <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 py-2"><Spinner /> Checking for an existing account…</p>}
            {alreadyStaff && (
              <div className="text-xs rounded-xl px-3 py-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300">
                Already on staff as <span className="font-bold">{roleInfo(lookup.admin_role).label}</span>. Use “Change role” in the list instead.
              </div>
            )}
            {existing && (
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                <span className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-white text-[11px] font-black flex items-center justify-center">{initials(existing.full_name || email)}</span>
                <div className="min-w-0 text-xs">
                  <p className="font-bold text-gray-900 dark:text-white truncate">{existing.full_name || email}</p>
                  <p className="text-gray-500 dark:text-gray-400">
                    Existing <span className="font-semibold capitalize">{existing.role}</span> account: their role will change to admin.
                    {existing.role === 'partner' && ' They’ll lose partner portal access while they’re staff.'}
                  </p>
                </div>
              </div>
            )}
            {lookup.state === 'done' && !lookup.found && (
              <p className="text-xs rounded-xl px-3 py-2.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 text-sky-800 dark:text-sky-300">
                No account with this email yet. We’ll email them an invite to set up their account.
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Role</p>
          <RolePicker value={role} onChange={setRole} name="admin_role" />
        </div>

        {result && !result.ok && <ErrorNote text={result.error} />}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={pending || !role || alreadyStaff || lookup.state === 'loading'} className={primaryBtn}>
            {pending && <Spinner />}
            {existing ? `Change role to ${roleLabel}` : lookup.state === 'done' && !lookup.found ? `Send ${roleLabel} invite` : 'Add staff member'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ResendInviteButton({ member, onResult }: { member: StaffMember; onResult: (msg: string, ok: boolean) => void }) {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);

  return (
    <button
      type="button"
      disabled={pending || sent}
      onClick={() => start(async () => {
        const res = await resendInvite(member.id);
        if (res.ok) setSent(true);
        onResult(res.ok ? res.message : res.error, res.ok);
      })}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-60 disabled:cursor-default"
    >
      {pending ? <Spinner /> : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sent ? 'M5 13l4 4L19 7' : 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'} />
        </svg>
      )}
      {sent ? 'Invite sent' : 'Resend invite'}
    </button>
  );
}

/* ---------------------------------------------------------------- main */

export default function StaffManager({ staff, currentUserId, canManage }: { staff: StaffMember[]; currentUserId: string | null; canManage: boolean }) {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<AdminRole | 'all'>('all');
  const [dialog, setDialog] = useState<{ type: 'add' } | { type: 'role' | 'remove'; member: StaffMember } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastOk, setToastOk] = useState(true);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const done = useMemo(() => (msg: string) => { setDialog(null); setToastOk(true); setToast(msg); }, []);
  const notify = useMemo(() => (msg: string, ok: boolean) => { setToastOk(ok); setToast(msg); }, []);
  const close = useMemo(() => () => setDialog(null), []);

  const filtered = staff.filter(s => {
    if (roleFilter !== 'all' && (s.admin_role ?? 'superadmin') !== roleFilter) return false;
    const q = query.trim().toLowerCase();
    return !q || `${s.full_name ?? ''} ${s.email}`.toLowerCase().includes(q);
  });

  const counts = Object.fromEntries(ADMIN_ROLES.map(r => [r.value, staff.filter(s => (s.admin_role ?? 'superadmin') === r.value).length]));

  return (
    <>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
            {[{ value: 'all' as const, label: 'All', dot: 'bg-gray-400', count: staff.length }, ...ADMIN_ROLES.map(r => ({ value: r.value, label: r.label, dot: r.dot, count: counts[r.value] }))].map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setRoleFilter(t.value)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-colors ${
                  roleFilter === t.value
                    ? 'bg-orange-50 dark:bg-orange-950/50 border-orange-300 dark:border-orange-700/60 text-orange-700 dark:text-orange-300'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
                {t.label}
                <span className="text-gray-400 dark:text-gray-500 tabular-nums">{t.count}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search name or email…"
              className="w-full lg:w-60 px-3.5 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
            {canManage && (
              <button type="button" onClick={() => setDialog({ type: 'add' })} className={`${primaryBtn} whitespace-nowrap py-2`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                Add staff
              </button>
            )}
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-gray-500 dark:text-gray-400">No staff match these filters.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map(s => {
              const isMe = s.id === currentUserId;
              const name = s.full_name || s.email;
              return (
                <li key={s.id} className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-orange-50/30 dark:hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-white text-xs font-black flex items-center justify-center">
                      {initials(name)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate flex items-center gap-2">
                        {s.full_name || '—'}
                        {isMe && <span className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">You</span>}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-2">
                        <span className="truncate">{s.email}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-6 pl-[52px] sm:pl-0">
                    <div className="sm:w-32"><RoleBadge role={s.admin_role ?? 'superadmin'} /></div>
                    <div className="sm:w-36"><StatusBadge member={s} /></div>
                    <p className="hidden md:block w-28 text-xs text-gray-500 dark:text-gray-400">Added {fmtDate(s.created_at)}</p>
                    {canManage && (
                      <div className="flex items-center gap-1 ml-auto sm:ml-0">
                        {s.status !== 'active' && <ResendInviteButton member={s} onResult={notify} />}
                        <button
                          type="button"
                          disabled={isMe}
                          title={isMe ? 'Another superadmin must change your role' : undefined}
                          onClick={() => setDialog({ type: 'role', member: s })}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 hover:text-orange-700 dark:hover:text-orange-300 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                        >
                          Change role
                        </button>
                        <button
                          type="button"
                          disabled={isMe}
                          title={isMe ? 'You can’t remove your own access' : s.status !== 'active' ? 'Cancel invite' : 'Remove from staff'}
                          aria-label={s.status !== 'active' ? `Cancel invite for ${name}` : `Remove ${name} from staff`}
                          onClick={() => setDialog({ type: 'remove', member: s })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {dialog?.type === 'add' && <AddStaffDialog onClose={close} onDone={done} />}
      {dialog?.type === 'role' && <ChangeRoleDialog member={dialog.member} onClose={close} onDone={done} />}
      {dialog?.type === 'remove' && <RemoveDialog member={dialog.member} onClose={close} onDone={done} />}

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[95] max-w-md w-[calc(100%-2rem)] flex items-start gap-3 px-4 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm shadow-2xl">
          <svg className={`w-5 h-5 shrink-0 ${toastOk ? 'text-emerald-400 dark:text-emerald-600' : 'text-red-400 dark:text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={toastOk ? 'M5 13l4 4L19 7' : 'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z'} /></svg>
          <span className="flex-1">{toast}</span>
          <button type="button" onClick={() => setToast(null)} className="opacity-60 hover:opacity-100" aria-label="Dismiss">✕</button>
        </div>
      )}
    </>
  );
}
