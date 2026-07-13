export default function TrendChart({ data, title, dataKey, format = 'number' }: { data: any[], title: string, dataKey: string, format?: 'number' | 'currency' }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
        No data available for this period.
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => Number(d[dataKey])), 1);

  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-6">{title}</h3>
      <div className="flex items-end h-40 gap-2">
        {data.map((item, idx) => {
          const heightPercent = (Number(item[dataKey]) / maxValue) * 100;
          return (
            <div key={idx} className="flex-1 flex flex-col items-center justify-end group relative h-full">
              {/* Tooltip */}
              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap pointer-events-none z-10 shadow-xl">
                <div className="font-bold text-gray-300">{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                <div>{format === 'currency' ? `₹${item[dataKey]}` : item[dataKey]}</div>
              </div>
              
              {/* Bar */}
              <div 
                className="w-full bg-gradient-to-t from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300 rounded-t-sm transition-colors"
                style={{ height: `${Math.max(heightPercent, 2)}%` }}
              ></div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-3 text-[10px] text-gray-400 font-mono">
        <span>{new Date(data[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(data[data.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}
