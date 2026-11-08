'use client';

export type Receipt = {
  reference: string;
  submittedAt: string;
  status: string;
  total: number;
  bookings: { id: string; owed: number }[];
  partner: string;
};

const STATUS: Record<string, string> = { pending: 'Waiting for verification', processing: 'Waiting for verification', completed: 'Verified', failed: 'Rejected' };

/** A PDF of one settlement the partner sent: reference, bookings covered and total. */
export default function DownloadPDFButton({ receipt }: { receipt: Receipt }) {
  const download = async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    const inr = (n: number) => `INR ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    doc.setFontSize(18);
    doc.text('StashInn settlement receipt', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${receipt.partner} · generated ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 14, 30);
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 38,
      body: [
        ['Reference (UTR)', receipt.reference || '—'],
        ['Sent on', new Date(receipt.submittedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
        ['Status', STATUS[receipt.status] || receipt.status],
        ['Total paid to StashInn', inr(receipt.total)],
      ],
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [['Booking', 'Commission + GST']],
      body: receipt.bookings.map(b => [`#${b.id.slice(0, 8).toUpperCase()}`, inr(b.owed)]),
      foot: [['Total', inr(receipt.total)]],
      theme: 'grid',
      headStyles: { fillColor: [234, 88, 12] },
      footStyles: { fillColor: [243, 244, 246], textColor: 20 },
    });
    doc.save(`stashinn-settlement-${receipt.reference || receipt.submittedAt.slice(0, 10)}.pdf`);
  };

  return (
    <button type="button" onClick={download} className="text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-orange-700 dark:hover:text-orange-400 underline underline-offset-2">
      PDF
    </button>
  );
}
