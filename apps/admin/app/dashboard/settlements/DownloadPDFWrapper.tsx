'use client';

import dynamic from 'next/dynamic';

const DownloadPDFButton = dynamic(() => import('./DownloadPDFButton'), { ssr: false });

export default function DownloadPDFWrapper({ transaction }: { transaction: any }) {
  return <DownloadPDFButton transaction={transaction} />;
}
