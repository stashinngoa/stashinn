import Link from "next/link";

export default function AdminHome() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 font-inter relative overflow-hidden text-white">
      {/* Deep Space Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Simple pure CSS stars */}
        {Array.from({ length: 70 }).map((_, i) => (
          <div 
            key={i} 
            className="absolute bg-white rounded-full animate-pulse opacity-70" 
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 3 + 2}s`
            }}
          ></div>
        ))}
      </div>

      {/* Floating Amogus Character 1 (Imposter) */}
      <div className="absolute top-1/4 left-10 md:left-32 w-24 md:w-32 text-red-500 animate-[bounce_8s_ease-in-out_infinite] transform -rotate-45 select-none opacity-80 z-0 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]">
        <svg viewBox="0 0 200 250" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <g fill="currentColor" stroke="#1a1a1a" strokeWidth="8" strokeLinejoin="round">
            <rect x="20" y="80" width="50" height="100" rx="20" />
            <rect x="60" y="150" width="45" height="80" rx="20" />
            <rect x="125" y="150" width="45" height="80" rx="20" />
            <rect x="60" y="30" width="110" height="160" rx="50" />
          </g>
          <rect x="100" y="60" width="85" height="55" rx="25" fill="#93c5fd" stroke="#1a1a1a" strokeWidth="8" />
          <rect x="120" y="70" width="50" height="20" rx="10" fill="#eff6ff" />
        </svg>
      </div>
      
      {/* Floating Amogus Character 2 (Crewmate) */}
      <div className="absolute bottom-1/4 right-10 md:right-32 w-20 md:w-28 text-cyan-400 animate-[bounce_6s_ease-in-out_infinite_reverse] transform rotate-12 select-none opacity-60 z-0 drop-shadow-[0_0_20px_rgba(34,211,238,0.6)]">
        <svg viewBox="0 0 200 250" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'scaleX(-1)' }}>
          <g fill="currentColor" stroke="#1a1a1a" strokeWidth="8" strokeLinejoin="round">
            <rect x="20" y="80" width="50" height="100" rx="20" />
            <rect x="60" y="150" width="45" height="80" rx="20" />
            <rect x="125" y="150" width="45" height="80" rx="20" />
            <rect x="60" y="30" width="110" height="160" rx="50" />
          </g>
          <rect x="100" y="60" width="85" height="55" rx="25" fill="#93c5fd" stroke="#1a1a1a" strokeWidth="8" />
          <rect x="120" y="70" width="50" height="20" rx="10" fill="#eff6ff" />
        </svg>
      </div>

      <div className="max-w-2xl w-full text-center relative z-10 p-8 md:p-12 rounded-[2rem] bg-gray-900/40 backdrop-blur-md border border-gray-800 shadow-2xl">
        {/* Animated Warning Icon */}
        <div className="w-24 h-24 mx-auto mb-6 bg-red-900/40 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.4)] border border-red-500/50">
          <span className="text-5xl drop-shadow-md">🚨</span>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 drop-shadow-lg">
          You're looking kinda <span className="text-red-500 animate-pulse inline-block">sus...</span>
        </h1>
        
        <div className="text-lg md:text-xl text-gray-300 mb-8 space-y-4">
          <p>
            Emergency Meeting! 📢 <span className="font-bold text-red-400">Someone just vented into the Admin Portal.</span>
          </p>
          <div className="text-sm md:text-base text-gray-400 space-y-3 bg-black/40 p-4 rounded-xl border border-gray-800">
            <p>
              "I saw you faking tasks in the URL bar. Real customers stay in the main app."
            </p>
            <p className="italic text-gray-500">
              (If you don't belong here, we're voting you out into the vacuum of space. No hard feelings.)
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a 
            href={process.env.NEXT_PUBLIC_CUSTOMER_URL || "http://localhost:3000"} 
            className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2 group text-sm md:text-base"
          >
            <span className="group-hover:-translate-x-1 transition-transform">🏃‍♂️</span> 
            I was just in Electrical! (Go back)
          </a>
          
          <Link 
            href="/login" 
            className="w-full sm:w-auto px-6 py-3 bg-transparent text-gray-400 hover:text-white font-medium rounded-xl border-2 border-dashed border-gray-700 hover:border-gray-500 transition-all text-xs md:text-sm group"
          >
            Swipe Admin Card <span className="group-hover:opacity-100 opacity-0 transition-opacity">💳</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
