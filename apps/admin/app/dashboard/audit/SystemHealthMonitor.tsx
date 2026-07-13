'use client';

import { useEffect, useState, useTransition } from 'react';
import { pingUrls, pingSupabase, getConfiguredUrls } from './healthActions';

type HealthResult = {
  url: string;
  status: string;
  statusCode: number;
  latency: number;
};

export default function SystemHealthMonitor() {
  const [isPending, startTransition] = useTransition();
  const [prodHealth, setProdHealth] = useState<HealthResult[]>([]);
  const [previewHealth, setPreviewHealth] = useState<HealthResult[]>([]);
  const [supabaseHealth, setSupabaseHealth] = useState<{ db: any, auth: any } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const checkHealth = () => {
    startTransition(async () => {
      const { prodUrls, previewUrls } = await getConfiguredUrls();
      const pHealth = await pingUrls(prodUrls);
      const prevHealth = await pingUrls(previewUrls);
      const sbHealth = await pingSupabase();
      
      setProdHealth(pHealth);
      setPreviewHealth(prevHealth);
      setSupabaseHealth(sbHealth);
      setLastUpdated(new Date());
    });
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // 30s auto refresh
    return () => clearInterval(interval);
  }, []);

  const renderStatus = (status: string, latency: number) => {
    if (status === 'up') {
      return (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          <span className="text-green-400 text-xs font-mono">{latency}ms</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse"></div>
        <span className="text-red-400 text-xs font-mono">DOWN</span>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-950">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Live Server Matrix
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {lastUpdated ? `Last heartbeat: ${lastUpdated.toLocaleTimeString()}` : 'Initializing sensors...'}
          </p>
        </div>
        <button 
          onClick={checkHealth}
          disabled={isPending}
          className="px-4 py-2 bg-gray-800 text-xs font-bold text-gray-300 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Pinging...' : 'Force Refresh'}
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Supabase Core */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800 pb-2">Supabase Core</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-gray-950 p-3 rounded border border-gray-800">
              <span className="text-sm text-gray-300">Database Engine</span>
              {supabaseHealth ? renderStatus(supabaseHealth.db.status, supabaseHealth.db.latency) : <span className="text-xs text-gray-600">Pinging...</span>}
            </div>
            <div className="flex items-center justify-between bg-gray-950 p-3 rounded border border-gray-800">
              <span className="text-sm text-gray-300">Auth GoTrue</span>
              {supabaseHealth ? renderStatus(supabaseHealth.auth.status, supabaseHealth.auth.latency) : <span className="text-xs text-gray-600">Pinging...</span>}
            </div>
          </div>
        </div>

        {/* Production Nodes */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800 pb-2">Production Nodes (3)</h3>
          <div className="space-y-3">
            {prodHealth.length === 0 ? (
              <div className="text-xs text-gray-600 p-3">Initializing map...</div>
            ) : (
              prodHealth.map(node => (
                <div key={node.url} className="flex items-center justify-between bg-gray-950 p-3 rounded border border-gray-800">
                  <span className="text-xs text-gray-400 truncate max-w-[150px]" title={node.url}>{node.url.replace('https://', '')}</span>
                  {renderStatus(node.status, node.latency)}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Preview / Staging Nodes */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800 pb-2">Preview / Dev Nodes (6)</h3>
          <div className="grid grid-cols-2 gap-3">
            {previewHealth.length === 0 ? (
              <div className="text-xs text-gray-600 p-3 col-span-2">Initializing map...</div>
            ) : (
              previewHealth.map(node => (
                <div key={node.url} className="flex flex-col bg-gray-950 p-2.5 rounded border border-gray-800">
                  <span className="text-[10px] text-gray-500 truncate mb-1" title={node.url}>{node.url.replace('https://', '')}</span>
                  {renderStatus(node.status, node.latency)}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
