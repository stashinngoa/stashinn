'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

export default function CalendarView({ bookings }: { bookings: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Navigation handlers
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const today = () => setCurrentDate(new Date());

  // Generate calendar grid
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 = Sunday
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Group bookings by date (using drop-off date)
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    
    bookings.forEach(b => {
      const dropOff = new Date(b.start_time);
      const dateKey = `${dropOff.getFullYear()}-${String(dropOff.getMonth() + 1).padStart(2, '0')}-${String(dropOff.getDate()).padStart(2, '0')}`;
      
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(b);
    });
    return map;
  }, [bookings]);

  const selectedBookings = selectedDate ? bookingsByDate.get(selectedDate) || [] : [];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'checked_in': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderCells = () => {
    const cells = [];
    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`empty-${i}`} className="bg-gray-50/50 min-h-[80px]"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const currentCellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
      const dateKey = `${currentCellDate.getFullYear()}-${String(currentCellDate.getMonth() + 1).padStart(2, '0')}-${String(currentCellDate.getDate()).padStart(2, '0')}`;
      
      const dayBookings = bookingsByDate.get(dateKey) || [];
      const isToday = dateKey === todayStr;
      const isSelected = dateKey === selectedDate;

      const locationSummary = new Map<string, number>();
      dayBookings.forEach(b => {
        const locName = b.partner_locations?.name || 'Unknown Location';
        locationSummary.set(locName, (locationSummary.get(locName) || 0) + b.num_bags);
      });

      cells.push(
        <div 
          key={`day-${d}`} 
          onClick={() => dayBookings.length > 0 ? setSelectedDate(isSelected ? null : dateKey) : setSelectedDate(null)}
          className={`min-h-[80px] p-2 flex flex-col transition-colors border-r border-b border-gray-100 ${
            dayBookings.length > 0 ? 'cursor-pointer hover:bg-gray-50' : 'opacity-80'
          } ${isToday ? 'bg-purple-50/30' : 'bg-white'} ${isSelected ? 'ring-2 ring-inset ring-purple-600 bg-purple-50' : ''}`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-purple-600 text-white' : 'text-gray-700'}`}>
              {d}
            </span>
          </div>
          
          <div className="flex-1 space-y-1 overflow-hidden">
            {Array.from(locationSummary.entries()).map(([locName, totalBags]) => (
              <div key={locName} className={`text-[10px] px-1.5 py-0.5 rounded truncate ${isSelected ? 'bg-purple-600 text-white font-bold shadow-sm' : 'bg-indigo-100 text-indigo-800 font-medium'}`} title={`${totalBags} bags at ${locName}`}>
                {totalBags} bags
              </div>
            ))}
          </div>
        </div>
      );
    }

    const totalCells = cells.length;
    const remainingCells = (Math.ceil(totalCells / 7) * 7) - totalCells;
    for (let i = 0; i < remainingCells; i++) {
      cells.push(<div key={`empty-end-${i}`} className="bg-gray-50/50 min-h-[80px] border-r border-b border-gray-100"></div>);
    }

    return cells;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Calendar Section */}
      <div className={`transition-all duration-300 ease-in-out ${selectedDate ? 'w-full lg:w-2/3' : 'w-full'}`}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
            <h2 className="text-xl font-bold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex space-x-2">
              <button onClick={today} className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm">
                Today
              </button>
              <div className="flex rounded-lg border border-gray-200 shadow-sm overflow-hidden bg-white">
                <button onClick={prevMonth} className="px-3 py-2 hover:bg-gray-50 text-gray-600 border-r border-gray-200 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={nextMonth} className="px-3 py-2 hover:bg-gray-50 text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </div>

          <div className="w-full">
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
              {days.map(day => (
                <div key={day} className="py-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider border-r border-gray-100 last:border-0">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 bg-white">
              {renderCells()}
            </div>
          </div>
        </div>
      </div>

      {/* Side Panel (Bookings Detail) */}
      {selectedDate && (
        <div className="w-full lg:w-1/3 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col animate-fade-in">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-900">
              {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </h3>
            <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto bg-gray-50/30">
            {selectedBookings.map(b => (
              <div key={b.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-900 truncate pr-2">{b.users?.full_name || 'Customer'}</h4>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(b.status)}`}>
                      {b.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 font-medium mb-3">
                    {b.partner_locations?.name}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 p-2 rounded border border-gray-100">
                      <div className="text-gray-400 font-bold uppercase mb-0.5 text-[9px]">Check-in</div>
                      <div className="font-semibold text-gray-900">
                        {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded border border-gray-100">
                      <div className="text-gray-400 font-bold uppercase mb-0.5 text-[9px]">Bags</div>
                      <div className="font-semibold text-gray-900">{b.num_bags} bags</div>
                    </div>
                  </div>
                </div>
                
                <Link href={`/dashboard/bookings/${b.id}`} className="block w-full py-2.5 bg-gray-50 hover:bg-purple-50 text-center text-xs font-bold text-purple-600 transition-colors border-t border-gray-100 group">
                  Proceed to Manage <span className="inline-block transform group-hover:translate-x-1 transition-transform">&rarr;</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
