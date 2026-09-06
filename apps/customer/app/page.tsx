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
  const [mode, setMode] = useState<'luggage' | 'garage'>('luggage');
  const [vehicleType, setVehicleType] = useState<'bike' | 'sedan' | 'suv'>('sedan');
  const [vehiclesCount, setVehiclesCount] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  // Check saved theme preference
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  };

  // Track scroll for sticky search pill
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 150);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
    params.append('mode', mode);
    
    if (mode === 'luggage') {
      params.append('bags', bags.toString());
    } else {
      params.append('vehicleType', vehicleType);
      params.append('vehicles', vehiclesCount.toString());
    }

    router.push(`/search?${params.toString()}`);
  };

  // Generate 24 hour options
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  const scrollToSearch = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col font-inter">
      {/* Header */}
      <header className="h-20 bg-white/80 dark:bg-black backdrop-blur-md dark:backdrop-blur-none border-b border-gray-100 dark:border-gray-900 flex items-center justify-between px-4 md:px-8 sticky top-0 z-50 transition-colors relative">
        <div className="flex items-center gap-2">
          <img src="/StashInn_Light_no_text.png" alt="StashInn Logo" className="h-8 md:h-10 w-auto dark:hidden" />
          <img src="/StashInn_Dark_no_text.png" alt="StashInn Logo" className="h-8 md:h-10 w-auto hidden dark:block" />
          <span className="text-xl md:text-2xl font-black tracking-tighter shrink-0">
            <span className="text-gray-900 dark:text-white">Stash</span><span className="text-orange-500">Inn</span>
          </span>
        </div>


        <nav className="flex items-center gap-2 md:gap-4 lg:gap-6">
          <button 
            onClick={toggleTheme}
            className="p-2 md:p-2.5 rounded-full text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-500 bg-gray-100 dark:bg-gray-900 hover:bg-orange-50 dark:hover:bg-gray-800 transition-all duration-300"
            aria-label="Toggle dark mode"
          >
            {isDark ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          
          <a href="#how-it-works" className="flex items-center text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-500 transition-colors p-2 md:p-0 rounded-full hover:bg-gray-100 md:hover:bg-transparent dark:hover:bg-gray-900 md:dark:hover:bg-transparent">
            <svg className="w-5 h-5 md:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden md:inline-block text-sm font-medium">How it works</span>
          </a>
          
          <a href={process.env.NEXT_PUBLIC_PARTNER_URL || "http://localhost:3001"} className="flex items-center text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-500 transition-colors p-2 md:p-0 rounded-full hover:bg-gray-100 md:hover:bg-transparent dark:hover:bg-gray-900 md:dark:hover:bg-transparent">
            <svg className="w-5 h-5 md:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" />
            </svg>
            <span className="hidden md:inline-block text-sm font-medium">Become a Partner</span>
          </a>
          
          {user ? (
            <div className="flex items-center gap-2 md:gap-4 ml-1 md:ml-2">
              <a href="/dashboard" className="hidden md:flex items-center px-5 py-2.5 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm font-bold rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors border border-transparent dark:border-gray-800">
                My Bookings
              </a>
              <a href="/dashboard/profile" className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 text-white font-bold shadow-md hover:shadow-lg transition-all shrink-0" title="Profile Settings">
                {user.user_metadata?.full_name ? user.user_metadata.full_name.charAt(0).toUpperCase() : 'U'}
              </a>
            </div>
          ) : (
            <a href="/login" className="flex items-center px-4 py-2 md:px-5 md:py-2.5 bg-gray-900 dark:bg-orange-600 text-white text-sm font-medium rounded-full hover:bg-gray-800 dark:hover:bg-orange-700 transition-colors shadow-sm ml-1 md:ml-2">
              <svg className="w-5 h-5 md:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <svg className="w-5 h-5 hidden md:block md:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span className="hidden md:inline-block">Sign In</span>
            </a>
          )}
        </nav>
      </header>

      {/* Mini Search Pill (fixed to viewport: bottom on mobile, top on desktop) */}
      <div className={`fixed bottom-6 md:bottom-auto md:top-5 left-1/2 -translate-x-1/2 transition-all duration-300 ease-out origin-center z-[60] ${isScrolled ? 'opacity-100 scale-100 pointer-events-auto translate-y-0' : 'opacity-0 scale-95 pointer-events-none translate-y-4 md:-translate-y-4'}`}>
        <button 
          onClick={scrollToSearch}
          className="flex items-center gap-3 px-5 py-3 md:px-4 md:py-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-100 dark:border-gray-700 rounded-full shadow-2xl md:shadow-md hover:shadow-lg transition-shadow group"
        >
          <span className="text-sm font-bold md:font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[120px] sm:max-w-[150px]">{city || 'Anywhere'}</span>
          <span className="w-px h-5 md:h-4 bg-gray-200 dark:bg-gray-700"></span>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{inDate === minDate ? 'Today' : 'Date'}</span>
          <span className="w-px h-5 md:h-4 bg-gray-200 dark:bg-gray-700 hidden sm:block"></span>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 hidden sm:block">{mode === 'luggage' ? `${bags} ${bags === 1 ? 'bag' : 'bags'}` : vehicleType}</span>
          <div className="bg-gradient-to-r from-orange-600 to-amber-500 text-white p-2 md:p-1.5 rounded-full ml-1 sm:ml-2 shadow-sm group-hover:scale-105 transition-transform">
            <svg className="w-4 h-4 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </button>
      </div>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 relative py-24">
        {/* Background Gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-orange-300/30 blur-[120px] rounded-full"></div>
          <div className="absolute top-1/4 -left-32 w-[600px] h-[500px] bg-amber-400/20 blur-[140px] rounded-full"></div>
          <div className="absolute bottom-0 right-0 w-[600px] h-[300px] bg-amber-300/20 blur-[100px] rounded-full"></div>
        </div>

        {/* Left Side Bags Pile (Desktop only) */}
        <div className="absolute left-[-20px] xl:left-10 bottom-10 w-[400px] xl:w-[500px] h-[500px] hidden lg:block pointer-events-none z-10">
          {Array.from({ length: 10 }).map((_, i) => {
            // 10 unique bag/storage items
            const icons = ['🧳', '🎒', '👜', '💼', '🛍️', '👝', '👛', '📦', '🧺', '🛄'];
            const styles = [
              { left: '0%', bottom: '5%', zIndex: 10, rotate: '-15deg', scale: 1.2, dur: '800ms', delay: 0 },
              { left: '25%', bottom: '20%', zIndex: 5, rotate: '25deg', scale: 0.8, dur: '1100ms', delay: 40 },
              { left: '10%', bottom: '40%', zIndex: 20, rotate: '-10deg', scale: 1.4, dur: '900ms', delay: 80 },
              { left: '45%', bottom: '0%', zIndex: 12, rotate: '35deg', scale: 0.9, dur: '1000ms', delay: 20 },
              { left: '35%', bottom: '35%', zIndex: 4, rotate: '-30deg', scale: 0.6, dur: '1200ms', delay: 60 },
              { left: '20%', bottom: '60%', zIndex: 30, rotate: '15deg', scale: 1.5, dur: '850ms', delay: 100 },
              { left: '65%', bottom: '10%', zIndex: 15, rotate: '5deg', scale: 1.0, dur: '1050ms', delay: 30 },
              { left: '55%', bottom: '45%', zIndex: 25, rotate: '-25deg', scale: 1.3, dur: '950ms', delay: 70 },
              { left: '40%', bottom: '65%', zIndex: 8, rotate: '40deg', scale: 0.7, dur: '1150ms', delay: 110 },
              { left: '80%', bottom: '25%', zIndex: 22, rotate: '-20deg', scale: 1.1, dur: '880ms', delay: 50 },
            ];
            const style = styles[i] || styles[0];
            const isActive = mode === 'luggage' && i < bags;
            
            return (
              <div
                key={i}
                className="absolute text-[160px] drop-shadow-2xl"
                style={{ 
                  left: style.left, 
                  bottom: style.bottom, 
                  zIndex: style.zIndex,
                  transform: isActive ? `scale(${style.scale}) rotate(${style.rotate}) translateX(0)` : `scale(0.3) rotate(-90deg) translateX(-600px)`,
                  opacity: isActive ? 1 : 0,
                  transitionProperty: 'all',
                  transitionDuration: style.dur,
                  transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transitionDelay: isActive ? `${style.delay}ms` : '0ms'
                }}
              >
                {icons[i]}
              </div>
            );
          })}
        </div>

        {/* Right Side Vehicles Pile (Desktop only) */}
        <div className="absolute right-[-20px] xl:right-10 bottom-10 w-[400px] xl:w-[500px] h-[500px] hidden lg:block pointer-events-none z-10">
          {Array.from({ length: 10 }).map((_, i) => {
            const getVehicle = () => {
              if (vehicleType === 'bike') return [
                { char: '🛵', hue: '0deg' }, { char: '🏍️', hue: '0deg' }, { char: '🚲', hue: '0deg' }, { char: '🛴', hue: '0deg' },
                { char: '🛵', hue: '210deg' }, // Blue scooter
                { char: '🏍️', hue: '210deg' }, // Blue motorcycle
                { char: '🛵', hue: '320deg' }, // Pink scooter
                { char: '🏍️', hue: '35deg' },  // Orange motorcycle
                { char: '🛵', hue: '60deg' },  // Yellow scooter
                { char: '🏍️', hue: '260deg' }  // Purple motorcycle
              ][i] || { char: '🛵', hue: '0deg' };
              if (vehicleType === 'sedan') return [
                { char: '🚗', hue: '0deg' }, { char: '🚕', hue: '0deg' }, { char: '🚘', hue: '0deg' }, { char: '🏎️', hue: '0deg' },
                { char: '🚗', hue: '210deg' }, // Blue car
                { char: '🚘', hue: '210deg' }, // Blue front
                { char: '🚗', hue: '260deg' }, // Purple car
                { char: '🏎️', hue: '210deg' }, // Blue racecar
                { char: '🚗', hue: '35deg' },  // Orange car
                { char: '🚘', hue: '320deg' }  // Pink front
              ][i] || { char: '🚗', hue: '0deg' };
              return [
                { char: '🚙', hue: '0deg' }, { char: '🚐', hue: '0deg' }, { char: '🛻', hue: '0deg' }, { char: '🚚', hue: '0deg' }, { char: '🚛', hue: '0deg' },
                { char: '🚙', hue: '130deg' }, // Red SUV
                { char: '🛻', hue: '130deg' }, // Red Pickup
                { char: '🚙', hue: '-50deg' }, // Purple SUV
                { char: '🚙', hue: '-170deg' },// Orange SUV
                { char: '🛻', hue: '-50deg' }  // Purple Pickup
              ][i] || { char: '🚙', hue: '0deg' };
            };
            const { char: iconChar, hue: hueVal } = getVehicle();
            
            const styles = [
              { right: '0%', bottom: '2%', zIndex: 12, rotate: '15deg', scale: 1.25, dur: '850ms', delay: 10 },
              { right: '28%', bottom: '16%', zIndex: 6, rotate: '-20deg', scale: 0.75, dur: '1150ms', delay: 50 },
              { right: '15%', bottom: '38%', zIndex: 22, rotate: '8deg', scale: 1.35, dur: '950ms', delay: 90 },
              { right: '42%', bottom: '0%', zIndex: 8, rotate: '-32deg', scale: 0.9, dur: '1050ms', delay: 30 },
              { right: '38%', bottom: '30%', zIndex: 4, rotate: '25deg', scale: 0.65, dur: '1250ms', delay: 70 },
              { right: '32%', bottom: '58%', zIndex: 32, rotate: '-15deg', scale: 1.45, dur: '800ms', delay: 110 },
              { right: '62%', bottom: '15%', zIndex: 18, rotate: '-8deg', scale: 0.95, dur: '1100ms', delay: 40 },
              { right: '58%', bottom: '42%', zIndex: 28, rotate: '20deg', scale: 1.3, dur: '900ms', delay: 80 },
              { right: '48%', bottom: '65%', zIndex: 10, rotate: '-28deg', scale: 0.8, dur: '1200ms', delay: 120 },
              { right: '78%', bottom: '25%', zIndex: 20, rotate: '16deg', scale: 1.05, dur: '920ms', delay: 60 },
            ];
            const style = styles[i] || styles[0];
            const isActive = mode === 'garage' && i < vehiclesCount;
            
            return (
              <div
                key={i}
                className="absolute text-[160px] drop-shadow-2xl"
                style={{ 
                  right: style.right, 
                  bottom: style.bottom, 
                  zIndex: style.zIndex,
                  transform: isActive ? `scale(${style.scale}) rotate(${style.rotate}) translateX(0)` : `scale(0.3) rotate(90deg) translateX(600px)`,
                  opacity: isActive ? 1 : 0,
                  filter: `hue-rotate(${hueVal})`,
                  transitionProperty: 'all',
                  transitionDuration: style.dur,
                  transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transitionDelay: isActive ? `${style.delay}ms` : '0ms'
                }}
              >
                {iconChar}
              </div>
            );
          })}
        </div>

        <div className="max-w-6xl w-full text-center relative z-20">
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
            Store your luggage.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500">Explore the city freely.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto font-medium">
            Find secure, convenient storage spots at local hotels and shops. Drop your bags and enjoy your day without the extra weight.
          </p>

          {/* Mode Toggle */}
          <div className="flex justify-center mb-6">
            <div className="bg-white/80 backdrop-blur-md p-1 rounded-full flex shadow-sm border border-gray-100 relative">
              <div className={`absolute top-1 bottom-1 left-1 w-40 bg-gradient-to-r from-orange-600 to-amber-500 rounded-full shadow-md transition-transform duration-300 ease-in-out ${mode === 'garage' ? 'translate-x-full' : 'translate-x-0'}`} />
              <button 
                onClick={() => setMode('luggage')}
                className={`relative z-10 w-40 py-2 rounded-full text-sm font-bold transition-colors duration-300 ${mode === 'luggage' ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                🧳 Store Bags
              </button>
              <button 
                onClick={() => setMode('garage')}
                className={`relative z-10 w-40 py-2 rounded-full text-sm font-bold transition-colors duration-300 ${mode === 'garage' ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                🚗 Park Vehicle
              </button>
            </div>
          </div>



          {/* Search Box */}
          <div className="bg-white p-2 rounded-2xl shadow-xl border border-gray-100 mx-auto w-full relative group z-50">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-md -z-10"></div>
            
            <form onSubmit={handleSearch} className="flex flex-col xl:flex-row items-stretch gap-2">
              {/* Location with Autocomplete */}
              <div className="flex-1 w-full relative">
                <div className="px-4 py-2 bg-gray-50 rounded-xl border border-transparent hover:border-orange-200 focus-within:border-orange-500 focus-within:bg-white transition-all duration-300">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Where?</label>
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
                    className="w-full bg-transparent text-sm text-gray-900 font-medium placeholder-gray-400 outline-none"
                  />
                </div>
                {/* Autocomplete Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden text-left">
                    {suggestions.map((loc) => (
                      <div 
                        key={loc.id} 
                        onClick={() => handleSuggestionClick(loc)}
                        className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                      >
                        <div className="font-bold text-sm text-gray-900">{loc.name}</div>
                        <div className="text-xs text-gray-500">{loc.address_line1}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="hidden xl:block w-px self-stretch bg-gray-200"></div>

              {/* Dates & Times */}
              <div className="flex-[2] w-full grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Drop Off */}
                <div className="px-4 py-2 bg-gray-50 rounded-xl border border-transparent hover:border-orange-200 focus-within:border-orange-500 focus-within:bg-white transition-all duration-300 flex items-center gap-2">
                  <div className="flex-1 border-r border-gray-200 pr-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Drop off</label>
                    <input 
                      type="date" 
                      value={inDate}
                      onChange={(e) => handleInChange('date', e.target.value)}
                      min={minDate}
                      required
                      className="w-full bg-transparent text-sm text-gray-900 font-medium outline-none cursor-pointer"
                    />
                  </div>
                  <div className="w-20">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Time</label>
                    <select 
                      value={inTime} 
                      onChange={(e) => handleInChange('time', e.target.value)}
                      className="w-full bg-transparent text-sm text-gray-900 font-medium outline-none cursor-pointer"
                    >
                      {hours.map(h => <option key={h} value={h} disabled={inDate === minDate && h < `${currentHour}:00`}>{h}</option>)}
                    </select>
                  </div>
                </div>

                {/* Pick Up */}
                <div className="px-4 py-2 bg-gray-50 rounded-xl border border-transparent hover:border-orange-200 focus-within:border-orange-500 focus-within:bg-white transition-all duration-300 flex items-center gap-2">
                  <div className="flex-1 border-r border-gray-200 pr-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pick up</label>
                    <input 
                      type="date" 
                      value={outDate}
                      onChange={(e) => setOutDate(e.target.value)}
                      min={inDate || minDate}
                      required
                      className="w-full bg-transparent text-sm text-gray-900 font-medium outline-none cursor-pointer"
                    />
                  </div>
                  <div className="w-20">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Time</label>
                    <select 
                      value={outTime} 
                      onChange={(e) => setOutTime(e.target.value)}
                      className="w-full bg-transparent text-sm text-gray-900 font-medium outline-none cursor-pointer"
                    >
                      {hours.map(h => <option key={h} value={h} disabled={outDate === inDate && h <= inTime}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="hidden xl:block w-px self-stretch bg-gray-200"></div>

              {/* Bags or Vehicle Type — animated swap */}
              <div className="w-full xl:w-52 px-4 py-2 bg-gray-50 rounded-xl border border-transparent hover:border-orange-200 focus-within:border-orange-500 focus-within:bg-white transition-all duration-300 shrink-0 overflow-hidden">
                <div className="relative">
                  <div className={`transition-all duration-300 ease-in-out ${mode === 'luggage' ? 'opacity-100 translate-y-0 h-auto' : 'opacity-0 -translate-y-2 h-0 overflow-hidden'}`}>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bags</label>
                    <select value={bags} onChange={(e) => setBags(parseInt(e.target.value))} className="w-full bg-transparent text-sm text-gray-900 font-medium outline-none cursor-pointer">
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <option key={n} value={n}>{n} {n === 1 ? 'Bag' : 'Bags'}</option>
                      ))}
                    </select>
                  </div>
                  <div className={`transition-all duration-300 ease-in-out flex gap-2 ${mode === 'garage' ? 'opacity-100 translate-y-0 h-auto' : 'opacity-0 translate-y-2 h-0 overflow-hidden'}`}>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vehicle</label>
                      <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as any)} className="w-full bg-transparent text-sm text-gray-900 font-medium outline-none cursor-pointer">
                        <option value="bike">Bike</option>
                        <option value="sedan">Sedan</option>
                        <option value="suv">SUV</option>
                      </select>
                    </div>
                    <div className="w-14 border-l border-gray-200 pl-2">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Qty</label>
                      <select value={vehiclesCount} onChange={(e) => setVehiclesCount(parseInt(e.target.value))} className="w-full bg-transparent text-sm text-gray-900 font-medium outline-none cursor-pointer">
                        {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button 
                type="submit"
                className="w-full xl:w-12 xl:h-12 xl:self-center px-6 py-3 xl:px-0 xl:py-0 bg-gradient-to-r from-orange-600 to-amber-500 text-white font-bold rounded-xl xl:rounded-full hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center shrink-0"
              >
                <svg className="w-5 h-5 xl:w-5 xl:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="ml-2 xl:hidden">Search</span>
              </button>
            </form>
          </div>
        </div>
      </section>
      
      {/* Value Props / How it works */}
      <section id="how-it-works" className="relative overflow-hidden bg-white dark:bg-gray-900 py-24 border-t border-gray-100 dark:border-gray-800">
        {/* Ambient Glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 -left-64 w-[600px] h-[600px] bg-orange-300/15 dark:bg-orange-900/10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-0 -right-64 w-[600px] h-[600px] bg-amber-300/15 dark:bg-amber-900/10 blur-[120px] rounded-full"></div>
        </div>

        <div className="max-w-6xl mx-auto px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">How StashInn works</h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">Drop your bags in three simple steps and enjoy your day hands-free.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Secure Storage</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">Every location is vetted, and your bags are secured with tamper-proof seals.</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-6 -rotate-3">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Flexible Hours</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">Find spots open 24/7 or late into the night. Book by the hour or by the day.</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Instant Booking</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">No cash needed. Book online instantly and simply show your QR code to drop off.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Airbnb-style Footer */}
      <footer className="relative overflow-hidden bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 pt-16 pb-8">
        {/* Ambient Glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-orange-300/10 dark:bg-orange-900/10 blur-[120px] rounded-full"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 md:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-12 border-b border-gray-200 dark:border-gray-800 pb-12">
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-4">Support</h4>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:underline">Help Centre</a></li>
                <li><a href="#" className="hover:underline">Safety information</a></li>
                <li><a href="#" className="hover:underline">Cancellation options</a></li>
                <li><a href="#" className="hover:underline">Report a concern</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-4">Partner with us</h4>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <li><a href={process.env.NEXT_PUBLIC_PARTNER_URL || "http://localhost:3001"} className="hover:underline">Become a StashInn Partner</a></li>
                <li><a href="#" className="hover:underline">Hosting resources</a></li>
                <li><a href="#" className="hover:underline">Community forum</a></li>
                <li><a href="#" className="hover:underline">Hosting responsibly</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-4">StashInn</h4>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:underline">Newsroom</a></li>
                <li><a href="#" className="hover:underline">New features</a></li>
                <li><a href="#" className="hover:underline">Careers</a></li>
                <li><a href="#" className="hover:underline">Investors</a></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
              <span>© {new Date().getFullYear()} StashInn, Inc.</span>
              <span className="hidden md:inline">·</span>
              <div className="flex gap-4">
                <a href="#" className="hover:underline">Privacy</a>
                <a href="#" className="hover:underline">Terms</a>
                <a href="#" className="hover:underline">Sitemap</a>
                <a href="#" className="hover:underline">Company details</a>
              </div>
            </div>
            <div className="flex items-center gap-4 font-medium text-gray-900 dark:text-gray-300">
              <button className="flex items-center gap-1 hover:underline">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                English (IN)
              </button>
              <button className="hover:underline">₹ INR</button>
              <div className="flex gap-3 ml-2">
                {/* Social placeholders */}
                <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
