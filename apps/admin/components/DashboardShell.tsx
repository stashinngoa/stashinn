"use client";

import { useState } from "react";

interface DashboardShellProps {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
}

export default function DashboardShell({ sidebar, header, children }: DashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 flex font-inter">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div 
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        onClick={(e) => {
          // Close sidebar on mobile when a link is clicked
          if ((e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('button')) {
            setIsSidebarOpen(false);
          }
        }}
      >
        {sidebar}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center px-4 md:px-8 shrink-0">
          <button 
            className="md:hidden mr-4 p-2 -ml-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500 shrink-0"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="flex-1 flex items-center justify-between min-w-0">
            {header}
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-950 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
