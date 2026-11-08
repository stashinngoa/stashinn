import Link from 'next/link';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { fillLegal, legalOutline, loadLegal, parseLegal, type LegalDocKey } from '@stashinn/lib/services/legal';
import { LegalDocument } from '@repo/ui/legalDocument';
import ThemeToggle from './ThemeToggle';

const OTHER: Partial<Record<LegalDocKey, { href: string; label: string }>> = {
  customer_terms_and_conditions: { href: '/privacy', label: 'Privacy Policy' },
  customer_privacy_policy: { href: '/terms', label: 'Terms & Conditions' },
};

/**
 * A customer legal document as edited in Admin → Configuration → Legal documents, with its
 * business details filled in and a contents list.
 */
export default async function LegalPage({ docKey, title }: { docKey: LegalDocKey; title: string }) {
  // system_config is only readable when signed in, so read it with the service client
  const { docs, details, live } = await loadLegal(createServiceClient());
  const doc = docs[docKey];
  const text = fillLegal(doc.text, { details, live }, doc.updatedAt);
  const outline = legalOutline(parseLegal(text));
  const other = OTHER[docKey];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-inter">
      <header className="h-16 sticky top-0 z-50 flex items-center gap-3 px-4 md:px-6 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="StashInn home">
          <img src="/StashInn_Light_no_text.png" alt="" className="h-8 w-auto dark:hidden" />
          <img src="/StashInn_Dark_no_text.png" alt="" className="h-8 w-auto hidden dark:block" />
          <span className="text-xl font-black tracking-tighter">
            <span className="text-gray-900 dark:text-white">Stash</span><span className="text-orange-500">Inn</span>
          </span>
        </Link>
        <span className="hidden sm:inline text-sm font-semibold text-gray-400 dark:text-gray-500">/ {title}</span>
        <div className="ml-auto"><ThemeToggle /></div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)] gap-8 items-start">
        {outline.length > 2 && (
          <nav aria-label="Contents" className="hidden lg:block sticky top-24">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Contents</p>
            <ol className="space-y-1.5 text-sm">
              {outline.map(o => (
                <li key={o.id}>
                  <a href={`#${o.id}`} className="block text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 leading-snug">{o.title}</a>
                </li>
              ))}
            </ol>
            {other && (
              <Link href={other.href} className="mt-6 inline-block text-sm font-semibold text-orange-700 dark:text-orange-400 hover:underline">Read our {other.label} →</Link>
            )}
          </nav>
        )}

        <article className="min-w-0 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-7 sm:px-10 sm:py-10">
          <LegalDocument text={text} />
          {other && (
            <p className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400">
              See also our <Link href={other.href} className="font-semibold text-orange-700 dark:text-orange-400 hover:underline">{other.label}</Link>.
            </p>
          )}
        </article>
      </main>
    </div>
  );
}
