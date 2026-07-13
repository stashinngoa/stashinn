'use client';

export default function DiffViewer({ oldValues, newValues }: { oldValues: any, newValues: any }) {
  if (!oldValues && !newValues) {
    return <div className="p-4 text-xs text-gray-600 italic">No diff data available.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-800">
      <div className="p-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Old State</h4>
        <pre className="text-[11px] font-mono text-red-400/80 bg-red-950/20 p-3 rounded overflow-x-auto">
          {oldValues ? JSON.stringify(oldValues, null, 2) : 'null'}
        </pre>
      </div>
      <div className="p-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">New State</h4>
        <pre className="text-[11px] font-mono text-green-400/80 bg-green-950/20 p-3 rounded overflow-x-auto">
          {newValues ? JSON.stringify(newValues, null, 2) : 'null'}
        </pre>
      </div>
    </div>
  );
}
