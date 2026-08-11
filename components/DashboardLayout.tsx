"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Clock } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true 
      }));
    };
    
    updateTime(); // initial call
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    // Solid Emerald Green Background for the entire viewport
    <div className="min-h-screen bg-[#00a669] font-sans text-zinc-900 flex overflow-hidden">
      
      <div className="flex w-full h-screen p-4 md:p-6 lg:p-8">
        {/* Main Floating White Container */}
        <div className="flex w-full bg-white rounded-3xl shadow-2xl overflow-hidden relative border border-white/20">
          
          {/* Sidebar Area */}
          <Sidebar />
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col h-full bg-zinc-50/30 overflow-hidden relative">
            {/* Top Header */}
            <header className="h-20 bg-white/80 backdrop-blur-md border-b border-zinc-100 flex items-center justify-between px-8 z-10 shrink-0">
              
              <div className="flex-1 flex items-center">
                <div className="w-full max-w-lg relative flex items-center">
                  <span className="absolute left-4 text-zinc-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                  </span>
                  <input 
                    type="text" 
                    placeholder="Search for declaration..." 
                    className="w-full pl-12 pr-4 py-3 rounded-full bg-zinc-50 border-none outline-none focus:ring-2 focus:ring-[#00a669]/20 text-sm transition-all"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 shadow-sm shadow-emerald-500/10 hover:bg-emerald-100 transition-colors">
                  <Clock size={16} className="text-emerald-500" />
                  <span className="text-sm font-bold tracking-wide tabular-nums">{time || 'Loading...'}</span>
                </div>
              </div>
            </header>

            {/* Page Content with independent scrolling */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto">
              <div className="p-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
