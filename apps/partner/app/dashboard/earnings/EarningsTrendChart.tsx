export default function EarningsTrendChart({ data }: { data: { date: string; amount: number }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-700 rounded-2xl">
        No data available for this period.
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.amount), 1);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6">Net Earnings Trend (Daily)</h3>
      <div className="flex items-end h-40 gap-3">
        {data.map((item, idx) => {
          const heightPercent = (item.amount / maxValue) * 100;
          return (
            <div key={idx} className="flex-1 flex flex-col items-center justify-end group relative h-full">
              {/* Tooltip */}
              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] py-1.5 px-2.5 rounded-lg whitespace-nowrap pointer-events-none z-10 shadow-xl border border-gray-800">
                <div className="font-bold text-gray-400">{new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</div>
                <div>₹{item.amount.toFixed(2)}</div>
              </div>
              
              {/* Bar */}
              <div 
                className="w-full bg-gradient-to-t from-blue-600/40 to-blue-600 hover:from-blue-700 hover:to-blue-500 rounded-t-md transition-all duration-300"
                style={{ height: `${Math.max(heightPercent, 3)}%` }}
              ></div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-4 text-[10px] text-gray-400 font-mono">
        <span>{new Date(data[0]!.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(data[data.length - 1]!.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}
