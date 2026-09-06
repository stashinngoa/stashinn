'use client';

import { useRouter } from 'next/navigation';
import { useState, FormEvent, useEffect, useRef, useTransition as reactUseTransition } from 'react';
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
  const [mode, setMode] = useState<'luggage' | 'garage'>(initialSearch.mode || 'luggage');
  const [vehicleType, setVehicleType] = useState<'bike' | 'sedan' | 'suv'>(initialSearch.vehicleType || 'sedan');
  const [vehiclesCount, setVehiclesCount] = useState(parseInt(initialSearch.vehiclesCount || '1'));

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    }
    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

  const [sort, setSort] = useState(initialSearch.sort || 'distance');
  const [maxPrice, setMaxPrice] = useState(initialSearch.max_price || '');
  const [minRating, setMinRating] = useState(initialSearch.min_rating || '');
  const [maxDistance, setMaxDistance] = useState(initialSearch.max_distance || '50');
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

  const [isPending, startTransition] = reactUseTransition();

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
    params.append('mode', mode);

    if (mode === 'luggage') {
      params.append('bags', bags.toString());
    } else {
      params.append('vehicleType', vehicleType);
      params.append('vehiclesCount', vehiclesCount.toString());
    }
    
    // Filters & Sorting
    if (sort !== 'distance') params.append('sort', sort);
    if (maxPrice) params.append('max_price', maxPrice);
    if (minRating) params.append('min_rating', minRating);
    if (maxDistance && maxDistance !== '50') params.append('max_distance', maxDistance);
    if (amenities.length > 0) params.append('amenities', amenities.join(','));

    // Reset pagination to page 1 on new search
    params.append('page', '1');

    startTransition(() => {
      router.push(`/search?${params.toString()}`);
    });
    setShowFilters(false);
  };

  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  return (
    <form onSubmit={handleSearch} className="flex-1 max-w-4xl hidden md:flex items-center bg-gray-50 dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-800 px-2 py-1 shadow-sm hover:shadow transition-shadow relative">
      <div className="flex-1 relative border-r border-gray-300 dark:border-gray-700">
        <input 
          type="text" 
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setLat(null);
            setLon(null);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Where are you going?"
          className="w-full bg-transparent border-none text-sm font-medium text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0 px-4 py-2"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 w-[300px] mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden z-50">
            {suggestions.map((loc, i) => (
              <div 
                key={i} 
                className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex items-center"
                onClick={() => handleSuggestionClick(loc)}
              >
                <svg className="w-5 h-5 text-gray-400 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{loc.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{loc.display_name}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center border-r border-gray-300 dark:border-gray-700 px-2">
        <input 
          type="date" 
          value={inDate}
          onChange={(e) => handleInChange('date', e.target.value)}
          min={minDate}
          required
          className="bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none cursor-pointer w-[120px] [color-scheme:light] dark:[color-scheme:dark]"
        />
      </div>

      <div className="flex items-center border-r border-gray-300 dark:border-gray-700 px-2">
        <input 
          type="date" 
          value={outDate}
          onChange={(e) => setOutDate(e.target.value)}
          min={inDate || minDate}
          required
          className="bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none cursor-pointer w-[120px] [color-scheme:light] dark:[color-scheme:dark]"
        />
      </div>

      <div className="flex items-center px-2">
        {mode === 'luggage' ? (
          <select 
            value={bags} 
            onChange={(e) => setBags(parseInt(e.target.value))} 
            className="bg-transparent text-sm font-semibold text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
          >
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <option key={n} value={n} className="dark:bg-gray-900">{n} {n === 1 ? 'Bag' : 'Bags'}</option>
            ))}
          </select>
        ) : (
          <div className="flex items-center space-x-1">
            <select 
              value={vehicleType} 
              onChange={(e) => setVehicleType(e.target.value as any)} 
              className="bg-transparent text-sm font-semibold text-gray-700 dark:text-gray-300 outline-none cursor-pointer w-[65px]"
            >
              <option value="bike" className="dark:bg-gray-900">Bike</option>
              <option value="sedan" className="dark:bg-gray-900">Sedan</option>
              <option value="suv" className="dark:bg-gray-900">SUV</option>
            </select>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-700"></div>
            <select 
              value={vehiclesCount} 
              onChange={(e) => setVehiclesCount(parseInt(e.target.value))} 
              className="bg-transparent text-sm font-semibold text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
            >
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <option key={n} value={n} className="dark:bg-gray-900">{n}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <button type="submit" disabled={isPending} className={`w-10 h-10 ml-2 rounded-full text-white flex items-center justify-center transition-transform shrink-0 ${isPending ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-orange-600 to-amber-500 hover:scale-105'}`}>
        {isPending ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )}
      </button>

      <div ref={filterRef} className="relative shrink-0">
        {/* Filter Button */}
        <button 
          type="button" 
          onClick={() => setShowFilters(!showFilters)}
          className="w-10 h-10 ml-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors relative"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          {((sort !== 'distance' ? 1 : 0) + (maxPrice ? 1 : 0) + (minRating ? 1 : 0) + (maxDistance !== '50' ? 1 : 0) + (amenities.length > 0 ? 1 : 0)) > 0 && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
          )}
        </button>

        {/* Filters Dropdown (Smooth transition) */}
        <div 
          className={`absolute top-full right-[-10px] md:right-0 mt-4 w-[calc(100vw-20px)] sm:w-[340px] md:w-[340px] max-w-sm bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-left cursor-default p-5 md:p-6 transition-all duration-300 ease-out origin-top-right ${showFilters ? 'opacity-100 scale-100 pointer-events-auto translate-y-0' : 'opacity-0 scale-95 pointer-events-none -translate-y-2'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4 border-b dark:border-gray-800 pb-2">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Filters & Sorting</h3>
            <button type="button" onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 md:hidden p-1 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          {/* Sorting */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Sort By</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-orange-500 transition-shadow">
              <option value="distance" className="dark:bg-gray-900">Distance (Closest first)</option>
              <option value="price_asc" className="dark:bg-gray-900">Price (Low to High)</option>
              <option value="price_desc" className="dark:bg-gray-900">Price (High to Low)</option>
              <option value="rating" className="dark:bg-gray-900">Rating (Highest first)</option>
            </select>
          </div>

          {/* Distance Filter */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Max Distance</label>
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded">{maxDistance} km</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="50" 
              value={maxDistance} 
              onChange={(e) => setMaxDistance(e.target.value)} 
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1km</span>
              <span>50km</span>
            </div>
          </div>

          {/* Price */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Max Price per Day (₹)</label>
            <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Any" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-1 focus:ring-orange-500 transition-shadow" />
          </div>

          {/* Rating */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Minimum Rating</label>
            <select value={minRating} onChange={(e) => setMinRating(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-orange-500 transition-shadow">
              <option value="" className="dark:bg-gray-900">Any Rating</option>
              <option value="4.5" className="dark:bg-gray-900">4.5+ Stars</option>
              <option value="4.0" className="dark:bg-gray-900">4.0+ Stars</option>
              <option value="3.0" className="dark:bg-gray-900">3.0+ Stars</option>
            </select>
          </div>

          {/* Amenities */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Amenities</label>
            <div className="space-y-2">
              {(mode === 'luggage' 
                ? ['CCTV', '24/7 Security', 'AC Storage', 'Locker Available'] 
                : ['has_cctv', 'has_security_guard', 'has_ev_charging', 'has_lockable_gate']
              ).map(am => (
                <label key={am} className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input type="checkbox" checked={amenities.includes(am)} onChange={() => toggleAmenity(am)} className="text-orange-600 focus:ring-orange-500 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800 transition-colors" />
                  <span>{am.replace('has_', '').replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Apply Button */}
          <button type="button" onClick={(e) => handleSearch(e as any)} className="w-full py-2.5 bg-gray-900 dark:bg-orange-600 text-white font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-orange-700 transition-colors shadow-sm active:scale-95">
            Apply Filters
          </button>
        </div>
      </div>
      </div>
    </form>
  );
}
