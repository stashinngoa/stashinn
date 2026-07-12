'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function DownloadPDFButton({ transaction }: { transaction: any }) {
  const handleDownload = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Settlement Receipt', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Details
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text('Transaction Details', 14, 45);
    
    autoTable(doc, {
      startY: 50,
      head: [['Field', 'Value']],
      body: [
        ['Transaction ID', transaction.id],
        ['Booking ID', transaction.bookings?.id || 'N/A'],
        ['Date', new Date(transaction.created_at).toLocaleString()],
        ['Status', transaction.transfer_status.toUpperCase()],
        ['Amount', `INR ${transaction.amount || transaction.commission || 0}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [147, 51, 234] } // Purple-600
    });

    doc.save(`settlement-${transaction.id.substring(0,8)}.pdf`);
  };

  return (
    <button
      onClick={handleDownload}
      className="text-gray-500 hover:text-gray-900 text-xs font-medium underline flex items-center gap-1"
      title="Download PDF Receipt"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
      PDF
    </button>
  );
}
