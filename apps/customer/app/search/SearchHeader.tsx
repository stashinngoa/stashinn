'use client';

import { useRouter } from 'next/navigation';
import { useState, FormEvent, useEffect } from 'react';
import { getSearchSuggestions } from '../actions';

export default function SearchHeader({ initialSearch }: { initialSearch: any }) {
  const router = useRouter();
  
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const currentHour = String(today.getHours()).padStart(2, '0');
  const minDate = `${yyyy}-${mm}-${dd}`;

  const getInitial = (iso?: string, fallbackDate?: string, fallbackTime?: string) => {
    if (iso && iso.includes('T')) {
      const [d, t] = iso.split('T');
      return { d: d || fallbackDate || minDate, t: t ? t.substring(0, 5) : (fallbackTime || '10:00') };
    }
    return { d: fallbackDate || minDate, t: fallbackTime || '10:00' };
  };

  const initialIn = getInitial(initialSearch.in, minDate, `${currentHour}:00`);
  const initialOut = getInitial(initialSearch.out, minDate, `${String(today.getHours() + 2).padStart(2, '0')}:00`);

  const [city, setCity] = useState(initialSearch.q || '');
  const [lat, setLat] = useState<number | null>(initialSearch.lat ? parseFloat(initialSearch.lat) : null);
  const [lon, setLon] = useState<number | null>(initialSearch.lon ? parseFloat(initialSearch.lon) : null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [inDate, setInDate] = useState(initialIn.d);
  const [inTime, setInTime] = useState(initialIn.t);
  
  const [outDate, setOutDate] = useState(initialOut.d);
  const [outTime, setOutTime] = useState(initialOut.t);
  
  const [bags, setBags] = useState(parseInt(initialSearch.bags || '1'));

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState(initialSearch.sort || 'distance');
  const [maxPrice, setMaxPrice] = useState(initialSearch.max_price || '');
  const [minRating, setMinRating] = useState(initialSearch.min_rating || '');
  const [amenities, setAmenities] = useState<string[]>(initialSearch.amenities ? initialSearch.amenities.split(',') : []);

  const toggleAmenity = (am: string) => {
    setAmenities(prev => prev.includes(am) ? prev.filter(a => a !== am) : [...prev, am]);
  };

  useEffect(() => {
    const fetchSugg = async () => {
      if (lat !== null && lon !== null) return; 

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
    const checkInISO = `${inDate}T${inTime}`;
    const checkOutISO = `${outDate}T${outTime}`;

    if (city) params.append('q', city);
    if (lat) params.append('lat', lat.toString());
    if (lon) params.append('lon', lon.toString());
    params.append('in', checkInISO);
    params.append('out', checkOutISO);
    params.append('bags', bags.toString());
    
    // Filters & Sorting
    if (sort !== 'distance') params.append('sort', sort);
    if (maxPrice) params.append('max_price', maxPrice);
    if (minRating) params.append('min_rating', minRating);
    if (amenities.length > 0) params.append('amenities', amenities.join(','));

    // Reset pagination to page 1 on new search
    params.append('page', '1');

    router.push(`/search?${params.toString()}`);
    setShowFilters(false);
  };

  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  return (
    <form onSubmit={handleSearch} className="flex-1 max-w-4xl hidden md:flex items-center bg-gray-50 rounded-full border border-gray-200 px-2 py-1 shadow-sm hover:shadow transition-shadow relative">
      <div className="flex-1 relative border-r border-gray-300">
        <input 
          type="text" 
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setLat(null);
            setLon(null);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Where?"
          required
          className="w-full bg-transparent text-sm font-semibold text-gray-900 placeholder-gray-500 outline-none px-4 py-2"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 mt-2 w-[300px] bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden text-left">
            {suggestions.map((loc) => (
              <div 
                key={loc.id} 
                onClick={() => handleSuggestionClick(loc)}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
              >
                <div className="font-bold text-gray-900 text-sm">{loc.name}</div>
                <div className="text-xs text-gray-500 truncate">{loc.address_line1}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center border-r border-gray-300 px-2">
        <input 
          type="date" 
          value={inDate}
          onChange={(e) => handleInChange('date', e.target.value)}
          min={minDate}
          required
          className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer w-[120px]"
        />
      </div>

      <div className="flex items-center border-r border-gray-300 px-2">
        <input 
          type="date" 
          value={outDate}
          onChange={(e) => setOutDate(e.target.value)}
          min={inDate || minDate}
          required
          className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer w-[120px]"
        />
      </div>

      <div className="flex items-center px-2">
        <select value={bags} onChange={(e) => setBags(parseInt(e.target.value))} className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer">
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <option key={n} value={n}>{n} {n === 1 ? 'Bag' : 'Bags'}</option>
          ))}
        </select>
      </div>

      <button type="submit" className="w-10 h-10 ml-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-center hover:scale-105 transition-transform shrink-0">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      {/* Filter Button */}
      <button 
        type="button" 
        onClick={() => setShowFilters(!showFilters)}
        className="w-10 h-10 ml-2 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0 relative"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        {((sort !== 'distance' ? 1 : 0) + (maxPrice ? 1 : 0) + (minRating ? 1 : 0) + (amenities.length > 0 ? 1 : 0)) > 0 && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {/* Filters Dropdown */}
      {showFilters && (
        <div className="absolute top-full right-0 mt-4 w-[340px] bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden text-left cursor-default p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Filters & Sorting</h3>
          
          {/* Sorting */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-purple-500">
              <option value="distance">Distance (Closest first)</option>
              <option value="price_asc">Price (Low to High)</option>
              <option value="price_desc">Price (High to Low)</option>
              <option value="rating">Rating (Highest first)</option>
            </select>
          </div>

          {/* Price */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Max Price per Day (₹)</label>
            <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Any" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-purple-500" />
          </div>

          {/* Rating */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Minimum Rating</label>
            <select value={minRating} onChange={(e) => setMinRating(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-purple-500">
              <option value="">Any Rating</option>
              <option value="4.5">4.5+ Stars</option>
              <option value="4.0">4.0+ Stars</option>
              <option value="3.0">3.0+ Stars</option>
            </select>
          </div>

          {/* Amenities */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Amenities</label>
            <div className="space-y-2">
              {['CCTV', '24/7 Security', 'AC Storage', 'Locker Available'].map(am => (
                <label key={am} className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={amenities.includes(am)} onChange={() => toggleAmenity(am)} className="text-purple-600 focus:ring-purple-500 rounded border-gray-300" />
                  <span>{am}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Apply Button */}
          <button type="button" onClick={(e) => handleSearch(e as any)} className="w-full py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors">
            Apply Filters
          </button>
        </div>
      )}
    </form>
  );
}
