"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const CrewmateSVG = ({ flip = false }: { flip?: boolean }) => (
  <svg viewBox="0 0 200 250" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
    <g fill="currentColor" stroke="#1a1a1a" strokeWidth="8" strokeLinejoin="round">
      <rect x="20" y="80" width="50" height="100" rx="20" />
      <rect x="60" y="150" width="45" height="80" rx="20" />
      <rect x="125" y="150" width="45" height="80" rx="20" />
      <rect x="60" y="30" width="110" height="160" rx="50" />
    </g>
    <rect x="100" y="60" width="85" height="55" rx="25" fill="#93c5fd" stroke="#1a1a1a" strokeWidth="8" />
    <rect x="120" y="70" width="50" height="20" rx="10" fill="#eff6ff" />
  </svg>
);

export default function AdminHome() {
  const [isFading, setIsFading] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showText, setShowText] = useState(false);
  const [stars, setStars] = useState<React.CSSProperties[]>([]);

  useEffect(() => {
    // Generate random stars on the client only to avoid SSR hydration mismatches
    setStars(
      Array.from({ length: 70 }).map(() => ({
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        width: `${Math.random() * 3 + 1}px`,
        height: `${Math.random() * 3 + 1}px`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${Math.random() * 3 + 2}s`
      }))
    );
  }, []);

  const handleEject = (e: React.MouseEvent) => {
    e.preventDefault();
    // 1. Start fading the UI immediately
    setIsFading(true);
    
    // 2. Wait 1.5s for the fade to finish, then throw the player
    setTimeout(() => {
      setShowPlayer(true);
    }, 1500);

    // 3. Player takes 5s to fly across. Wait another 2.5s until they are halfway across to reveal the text behind them.
    setTimeout(() => {
      setShowText(true);
    }, 4000);

    // 4. Redirect after the whole sequence is done (1.5s + 5s + 3s read time)
    const targetUrl = process.env.NEXT_PUBLIC_CUSTOMER_URL || "http://localhost:3000";
    setTimeout(() => {
      window.location.href = targetUrl;
    }, 9500);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 font-inter relative overflow-hidden text-white">
      {/* Deep Space Background (Always Visible) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {stars.map((style, i) => (
          <div 
            key={i} 
            className="absolute bg-white rounded-full animate-pulse opacity-70" 
            style={style}
          ></div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes tumble-right {
          0% { left: -20%; transform: rotate(0deg); }
          100% { left: 120%; transform: rotate(720deg); }
        }
        @keyframes tumble-left {
          0% { right: -20%; transform: rotate(0deg); }
          100% { right: 120%; transform: rotate(-720deg); }
        }
        @keyframes eject-fly {
          0% { left: -20%; transform: translateY(-50%) rotate(0deg) scale(1.2); }
          100% { left: 120%; transform: translateY(-50%) rotate(1080deg) scale(0.4); }
        }
        @keyframes typewriter {
          from { width: 0; }
          to { width: 100%; }
        }
        @keyframes blink-cursor {
          from, to { border-color: transparent }
          50% { border-color: white }
        }
      `}} />

      {/* Ejection Animation Layer (Text behind player) */}
      {showText && (
        <div className="absolute inset-0 z-30 flex items-center justify-center font-mono text-xl md:text-3xl text-white tracking-widest text-center px-4">
          <div className="inline-block overflow-hidden whitespace-nowrap border-r-[3px] border-white max-w-max animate-[typewriter_3s_steps(30,end)_forwards,blink-cursor_0.75s_step-end_infinite] w-0 drop-shadow-md">
            User was ejected.
          </div>
        </div>
      )}

      {/* The Ejected Player Flying Out (Z-40 so they fly IN FRONT of the text) */}
      {showPlayer && (
        <div 
          className="absolute top-1/2 w-32 md:w-48 text-red-500 z-40 drop-shadow-[0_0_25px_rgba(239,68,68,0.9)]" 
          style={{ animation: 'eject-fly 5s linear forwards' }}
        >
          <CrewmateSVG />
        </div>
      )}

      {/* Main UI and Players - Fades out on eject */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-[1500ms] ease-in-out ${isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        
        {/* Foreground Imposter */}
        <div className="absolute top-1/4 left-10 md:left-32 w-24 md:w-32 text-red-500 animate-[bounce_8s_ease-in-out_infinite] transform -rotate-45 select-none opacity-80 z-0 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]">
          <CrewmateSVG />
        </div>
        
        {/* Foreground Crewmate */}
        <div className="absolute bottom-1/4 right-10 md:right-32 w-20 md:w-28 text-cyan-400 animate-[bounce_6s_ease-in-out_infinite_reverse] transform rotate-12 select-none opacity-60 z-0 drop-shadow-[0_0_20px_rgba(34,211,238,0.6)]">
          <CrewmateSVG flip />
        </div>

        {/* Vented Players (Floating across screen) */}
        <div className="absolute top-[10%] w-12 md:w-16 text-yellow-400 select-none opacity-30 z-0 blur-[1px]" style={{ animation: 'tumble-right 45s linear infinite' }}>
          <CrewmateSVG />
        </div>
        
        <div className="absolute bottom-[20%] w-16 md:w-20 text-purple-500 select-none opacity-40 z-0 blur-[2px]" style={{ animation: 'tumble-left 35s linear infinite' }}>
          <CrewmateSVG flip />
        </div>
        
        <div className="absolute top-[40%] w-10 md:w-14 text-green-500 select-none opacity-20 z-0 blur-[3px]" style={{ animation: 'tumble-right 55s linear infinite', animationDelay: '-15s' }}>
          <CrewmateSVG />
        </div>
        
        <div className="absolute top-[70%] w-8 md:w-12 text-orange-500 select-none opacity-15 z-0 blur-[4px]" style={{ animation: 'tumble-left 60s linear infinite', animationDelay: '-30s' }}>
          <CrewmateSVG flip />
        </div>

        <div className="max-w-2xl w-full text-center relative z-10 p-8 md:p-12 rounded-[2rem] bg-gray-900/40 backdrop-blur-md border border-gray-800 shadow-2xl mx-4">
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
              href="#" 
              onClick={handleEject}
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
    </div>
  );
}
