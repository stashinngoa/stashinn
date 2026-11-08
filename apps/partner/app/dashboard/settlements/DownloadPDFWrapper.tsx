'use client';

import dynamic from 'next/dynamic';
import type { Receipt } from './DownloadPDFButton';

const DownloadPDFButton = dynamic(() => import('./DownloadPDFButton'), { ssr: false });

export default function DownloadPDFWrapper({ receipt }: { receipt: Receipt }) {
  return <DownloadPDFButton receipt={receipt} />;
}
