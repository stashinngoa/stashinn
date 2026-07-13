'use client';

import { useRouter } from 'next/navigation';
import { useState, FormEvent, useEffect } from 'react';
import { getSearchSuggestions } from './actions';
import { createClient } from '@stashinn/lib/supabase/client';

export default function HomePage() {
  const router = useRouter();
  
  // Calculate minimum local date and hour
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const currentHour = String(today.getHours()).padStart(2, '0');
  
  const minDate = `${yyyy}-${mm}-${dd}`;
  
  const [city, setCity] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [inDate, setInDate] = useState(minDate);
  const [inTime, setInTime] = useState(`${currentHour}:00`);
  
  const [outDate, setOutDate] = useState(minDate);
  const [outTime, setOutTime] = useState(`${String(today.getHours() + 2).padStart(2, '0')}:00`);
  
  const [bags, setBags] = useState(1);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  // Fetch suggestions
  useEffect(() => {
    const fetchSugg = async () => {
      if (lat !== null && lon !== null) return; // Skip if already selected

      if (city.length > 1) {
        const res = await getSearchSuggestions(city);
        setSuggestions(res);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };
    const timeoutId = setTimeout(fetchSugg, 300);
    return () => clearTimeout(timeoutId);
  }, [city, lat, lon]);

  const handleSuggestionClick = (loc: any) => {
    setCity(loc.name); 
    setLat(loc.lat);
    setLon(loc.lon);
    setShowSuggestions(false);
  };

  const handleInChange = (type: 'date' | 'time', value: string) => {
    let newDate = inDate;
    let newTime = inTime;
    if (type === 'date') newDate = value;
    if (type === 'time') newTime = value;

    setInDate(newDate);
    setInTime(newTime);

    const dropOff = new Date(`${newDate}T${newTime}`);
    if (!isNaN(dropOff.getTime())) {
      dropOff.setHours(dropOff.getHours() + 1);
      const yyyy = dropOff.getFullYear();
      const mm = String(dropOff.getMonth() + 1).padStart(2, '0');
      const dd = String(dropOff.getDate()).padStart(2, '0');
      const hh = String(dropOff.getHours()).padStart(2, '0');
      
      setOutDate(`${yyyy}-${mm}-${dd}`);
      setOutTime(`${hh}:00`);
    }
  };

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    
    // Combine Date and Time
    const checkInISO = `${inDate}T${inTime}`;
    const checkOutISO = `${outDate}T${outTime}`;

    if (city) params.append('q', city);
    if (lat) params.append('lat', lat.toString());
    if (lon) params.append('lon', lon.toString());
    params.append('in', checkInISO);
    params.append('out', checkOutISO);
    params.append('bags', bags.toString());

    router.push(`/search?${params.toString()}`);
  };

  // Generate 24 hour options
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col font-inter">
      {/* Header */}
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-50">
        <div className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
          StashInn
        </div>
        <nav className="flex items-center space-x-6">
          <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">How it works</a>
          <a href={process.env.NEXT_PUBLIC_PARTNER_URL || "http://localhost:3001"} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Become a Partner</a>
          {user ? (
            <div className="flex items-center space-x-4">
              <a href="/dashboard" className="hidden md:block px-5 py-2.5 bg-gray-100 text-gray-900 text-sm font-bold rounded-full hover:bg-gray-200 transition-colors">
                My Bookings
              </a>
              <a href="/dashboard/profile" className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-md hover:shadow-lg transition-all shrink-0" title="Profile Settings">
                {user.user_metadata?.full_name ? user.user_metadata.full_name.charAt(0).toUpperCase() : 'U'}
              </a>
            </div>
          ) : (
            <a href="/login" className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors shadow-sm">
              Sign In
            </a>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 relative overflow-hidden py-24">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-300/30 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[300px] bg-indigo-300/20 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="max-w-6xl w-full text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
            Store your luggage.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">Explore the city freely.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto font-medium">
            Find secure, convenient storage spots at local hotels and shops. Drop your bags and enjoy your day without the extra weight.
          </p>

          {/* Search Box - WIDER max-w-6xl */}
          <div className="bg-white p-3 rounded-3xl shadow-xl border border-gray-100 mx-auto w-full relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-md -z-10"></div>
            
            <form onSubmit={handleSearch} className="flex flex-col xl:flex-row items-center gap-3">
              {/* Location with Autocomplete */}
              <div className="flex-1 w-full relative">
                <div className="px-4 py-3 bg-gray-50 rounded-2xl border border-transparent hover:border-purple-200 focus-within:border-purple-500 focus-within:bg-white transition-all duration-300">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Where?</label>
                  <input 
                    type="text" 
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      setLat(null);
                      setLon(null);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="City, neighborhood, or station"
                    required
                    className="w-full bg-transparent text-gray-900 font-medium placeholder-gray-400 outline-none"
                  />
                </div>
                {/* Autocomplete Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden text-left">
                    {suggestions.map((loc) => (
                      <div 
                        key={loc.id} 
                        onClick={() => handleSuggestionClick(loc)}
                        className="px-5 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                      >
                        <div className="font-bold text-gray-900">{loc.name}</div>
                        <div className="text-sm text-gray-500">{loc.address_line1}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="hidden xl:block w-px h-12 bg-gray-200"></div>

              {/* Dates & Times - Clean Split */}
              <div className="flex-[2] w-full grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Drop Off */}
                <div className="px-4 py-3 bg-gray-50 rounded-2xl border border-transparent hover:border-purple-200 focus-within:border-purple-500 focus-within:bg-white transition-all duration-300 flex items-center gap-2">
                  <div className="flex-1 border-r border-gray-200 pr-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Drop off Date</label>
                    <input 
                      type="date" 
                      value={inDate}
                      onChange={(e) => handleInChange('date', e.target.value)}
                      min={minDate}
                      required
                      className="w-full bg-transparent text-gray-900 font-medium outline-none cursor-pointer"
                    />
                  </div>
                  <div className="w-24 pl-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Time</label>
                    <select 
                      value={inTime} 
                      onChange={(e) => handleInChange('time', e.target.value)}
                      className="w-full bg-transparent text-gray-900 font-medium outline-none cursor-pointer"
                    >
                      {hours.map(h => <option key={h} value={h} disabled={inDate === minDate && h < `${currentHour}:00`}>{h}</option>)}
                    </select>
                  </div>
                </div>

                {/* Pick Up */}
                <div className="px-4 py-3 bg-gray-50 rounded-2xl border border-transparent hover:border-purple-200 focus-within:border-purple-500 focus-within:bg-white transition-all duration-300 flex items-center gap-2">
                  <div className="flex-1 border-r border-gray-200 pr-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Pick up Date</label>
                    <input 
                      type="date" 
                      value={outDate}
                      onChange={(e) => setOutDate(e.target.value)}
                      min={inDate || minDate}
                      required
                      className="w-full bg-transparent text-gray-900 font-medium outline-none cursor-pointer"
                    />
                  </div>
                  <div className="w-24 pl-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Time</label>
                    <select 
                      value={outTime} 
                      onChange={(e) => setOutTime(e.target.value)}
                      className="w-full bg-transparent text-gray-900 font-medium outline-none cursor-pointer"
                    >
                      {hours.map(h => <option key={h} value={h} disabled={outDate === inDate && h <= inTime}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="hidden xl:block w-px h-12 bg-gray-200"></div>

              {/* Bags */}
              <div className="w-full xl:w-32 px-4 py-3 bg-gray-50 rounded-2xl border border-transparent hover:border-purple-200 focus-within:border-purple-500 focus-within:bg-white transition-all duration-300 shrink-0">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Bags</label>
                <select value={bags} onChange={(e) => setBags(parseInt(e.target.value))} className="w-full bg-transparent text-gray-900 font-medium outline-none cursor-pointer">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'Bag' : 'Bags'}</option>
                  ))}
                </select>
              </div>

              {/* Submit */}
              <button 
                type="submit"
                className="w-full xl:w-auto h-[72px] px-8 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center whitespace-nowrap shrink-0"
              >
                <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </button>
            </form>
          </div>
        </div>
      </section>
      
      {/* Value Props */}
      <section className="bg-white py-20 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div>
            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Secure Storage</h3>
            <p className="text-gray-500 leading-relaxed">Every location is vetted, and your bags are secured with tamper-proof seals.</p>
          </div>
          <div>
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 -rotate-3">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Flexible Hours</h3>
            <p className="text-gray-500 leading-relaxed">Find spots open 24/7 or late into the night. Book by the hour or by the day.</p>
          </div>
          <div>
            <div className="w-16 h-16 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Instant Booking</h3>
            <p className="text-gray-500 leading-relaxed">No cash needed. Book online instantly and simply show your QR code to drop off.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
