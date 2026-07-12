'use client';

import { useEffect, useState } from 'react';
import { getKycDocs } from './actions';

export default function KycDocsViewer({ partnerId }: { partnerId: string }) {
  const [docs, setDocs] = useState<{name: string, url: string}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getKycDocs(partnerId).then(data => {
      setDocs(data);
      setLoading(false);
    });
  }, [partnerId]);

  if (loading) {
    return <span className="text-xs text-gray-600">Loading docs...</span>;
  }

  if (docs.length === 0) {
    return <span className="text-xs text-gray-600 italic">No docs</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {docs.map((doc, idx) => (
        <a 
          key={idx} 
          href={doc.url} 
          target="_blank" 
          rel="noreferrer" 
          className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          {doc.name.replace(/^poc_id_|^poc_photo_|^kyc_proof_/, '').substring(0, 15)}...
        </a>
      ))}
    </div>
  );
}
