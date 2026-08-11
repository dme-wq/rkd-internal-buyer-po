import React from 'react';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 flex">
      {/* Permanent Sidebar (Desktop) */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen relative">
        {/* Top Header - Mobile Only or Search Bar */}
        <header className="h-20 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex-1 flex items-center">
             <div className="w-full max-w-md relative">
                <input 
                  type="text" 
                  placeholder="Search for declaration or PO..." 
                  className="w-full pl-4 pr-10 py-2.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border-none outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm transition-all"
                />
                <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Add notifications or other top bar items here if needed */}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
