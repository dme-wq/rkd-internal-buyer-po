"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PieChart, PlusSquare, FileText } from 'lucide-react';


export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/create', label: 'Purchase Order New Entry', icon: PlusSquare },
    { href: '/declarations', label: 'Purchase Order Data', icon: FileText },
    { href: '/stats', label: 'Purchase Order Report', icon: PieChart },
  ];

  return (
    <div className="w-64 h-full bg-white border-r border-zinc-100 flex flex-col shrink-0">
      
      {/* Logo Area */}
      <div className="h-24 flex items-center px-6 gap-3">
        <img 
          src="https://static.wixstatic.com/media/68b92a_d71e34133826499983234774dea1945b~mv2.png/v1/fill/w_186,h_156,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/RKD-Logo.png" 
          alt="RKD Logo" 
          className="w-10 h-auto object-contain"
        />
        <div className="flex items-center">
          <h1 className="text-xl font-black tracking-tight text-emerald-900 leading-tight">
            RKD Furnishings
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 flex flex-col space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`flex items-center gap-4 px-8 py-3.5 transition-colors ${
                isActive 
                  ? 'bg-[#d1fae5] border-l-4 border-[#00a669] text-[#00a669]' 
                  : 'text-zinc-600 hover:bg-zinc-50 border-l-4 border-transparent hover:text-zinc-900'
              }`}
            >
              <Icon size={20} className={isActive ? "text-[#00a669]" : "text-zinc-500"} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
