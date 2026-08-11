"use client";

import React from 'react';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {

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
            {/* Page Content with independent scrolling */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto">
              <div className="p-0">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
