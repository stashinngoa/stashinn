import type { JSX } from 'react';
import { parseLegal, type LegalBlock, type LegalInline } from '@stashinn/lib/services/legal';

/**
 * Shows a legal document written in the Legal documents page's text format (see
 * @stashinn/lib/services/legal). Fill placeholders with fillLegal first; values that
 * are still missing are highlighted.
 *
 * `variant="print"` uses smaller serif type for the printable partner registration form.
 */
export function LegalDocument({ text, variant = 'screen', hideTitle = false }: { text: string; variant?: 'screen' | 'print'; hideTitle?: boolean }): JSX.Element {
  const blocks = parseLegal(text).filter(b => !(hideTitle && b.type === 'h1'));
  const print = variant === 'print';
  return (
    <div className={print ? 'font-serif text-[10.5px] leading-relaxed text-gray-900 space-y-2' : 'text-sm leading-relaxed text-gray-700 dark:text-gray-300 space-y-4'}>
      {blocks.map((b, i) => <Block key={i} block={b} print={print} />)}
    </div>
  );
}

function Inline({ runs, print = false }: { runs: LegalInline[]; print?: boolean }) {
  return (
    <>
      {runs.map((r, i) =>
        r.missing ? (
          <mark key={i} title="Not filled in yet: set it in Admin → Configuration → Legal documents" className={`rounded px-1 font-semibold not-italic ${print ? 'bg-amber-100 text-amber-900' : 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200'}`}>
            {r.text}
          </mark>
        ) : r.bold ? (
          <strong key={i} className={print ? 'font-bold' : 'font-semibold text-gray-900 dark:text-white'}>{r.text}</strong>
        ) : (
          <span key={i}>{r.text}</span>
        ),
      )}
    </>
  );
}

const hasText = (cells: LegalInline[][]) => cells.some(c => c.some(r => r.text.trim()));

function Block({ block: b, print }: { block: LegalBlock; print: boolean }) {
  switch (b.type) {
    case 'h1':
      return <h1 className={print ? 'text-base font-bold' : 'text-2xl font-black tracking-tight text-gray-900 dark:text-white'}><Inline runs={b.content} print={print} /></h1>;
    case 'h2':
      return (
        <h2 id={b.id} className={print ? 'text-[12px] font-bold pt-2' : 'scroll-mt-24 text-lg font-bold text-gray-900 dark:text-white pt-4 border-t border-gray-100 dark:border-gray-800 first:border-0 first:pt-0'}>
          <Inline runs={b.content} print={print} />
        </h2>
      );
    case 'h3':
      return <h3 className={print ? 'font-bold' : 'font-bold text-gray-900 dark:text-white'}><Inline runs={b.content} print={print} /></h3>;
    case 'p':
      return <p className="whitespace-pre-line"><Inline runs={b.content} print={print} /></p>;
    case 'note':
      return (
        <div className={print ? 'border-l-2 border-gray-400 pl-2 italic' : 'rounded-xl border border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10 px-4 py-3 text-orange-900 dark:text-orange-100'}>
          <Inline runs={b.content} print={print} />
        </div>
      );
    case 'ul':
    case 'ol': {
      const List = b.type;
      return (
        <List className={`${b.type === 'ul' ? 'list-disc' : 'list-decimal'} pl-5 ${print ? 'space-y-0.5' : 'space-y-1.5 marker:text-orange-500'}`}>
          {b.items.map((item, i) => <li key={i} className="pl-1"><Inline runs={item} print={print} /></li>)}
        </List>
      );
    }
    case 'table':
      return (
        <div className={print ? '' : 'overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800'}>
          <table className={`w-full text-left ${print ? 'border-collapse border border-gray-400 text-[10px]' : 'text-[13px]'}`}>
            {hasText(b.head) && (
              <thead className={print ? '' : 'bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide'}>
                <tr>{b.head.map((c, i) => <th key={i} className={print ? 'border border-gray-400 px-1.5 py-0.5' : 'px-3 py-2 font-semibold'}><Inline runs={c} print={print} /></th>)}</tr>
              </thead>
            )}
            <tbody className={print ? '' : 'divide-y divide-gray-100 dark:divide-gray-800'}>
              {(hasText(b.head) ? b.rows : [b.head, ...b.rows].filter(hasText)).map((row, r) => (
                <tr key={r}>{row.map((c, i) => <td key={i} className={print ? 'border border-gray-400 px-1.5 py-0.5 align-top' : 'px-3 py-2 align-top'}><Inline runs={c} print={print} /></td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}
