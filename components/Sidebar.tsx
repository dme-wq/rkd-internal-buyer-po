"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, PieChart, PlusSquare, FileText } from 'lucide-react';
import Link from 'next/link';

const links = [
  { href: '/', label: 'Dashboard', icon: Home, desc: 'Overview & Analytics' },
  { href: '/create', label: 'Purchase Order New Entry', icon: PlusSquare, desc: 'Create a new PO' },
  { href: '/declarations', label: 'Purchase Order Data', icon: FileText, desc: 'View all PO records' },
  { href: '/stats', label: 'Purchase Order Report', icon: PieChart, desc: 'Analytics & Reports' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-[72px] hover:w-[280px] h-full bg-white border-r border-zinc-100 flex flex-col shrink-0 transition-[width] duration-300 ease-in-out group overflow-hidden z-50">
      
      {/* Logo Area */}
      <div className="h-24 flex items-center pl-4 min-w-max">
        <img
          src="https://static.wixstatic.com/media/68b92a_d71e34133826499983234774dea1945b~mv2.png/v1/fill/w_186,h_156,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/RKD-Logo.png"
          alt="RKD Logo"
          className="w-10 h-10 object-contain shrink-0"
        />
        <div className="flex items-center ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out delay-75">
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
              prefetch={true}
              className={`flex items-center pl-5 py-3.5 transition-all duration-200 relative min-w-max w-full text-left ${
                isActive
                  ? 'bg-[#d1fae5] border-l-4 border-[#00a669] text-[#00a669]'
                  : 'text-zinc-600 hover:bg-zinc-50 border-l-4 border-transparent hover:text-zinc-900'
              }`}
            >
              <div className="w-6 flex justify-center shrink-0">
                <Icon
                  size={20}
                  className={isActive ? 'text-[#00a669]' : 'text-zinc-500'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out delay-75 flex flex-col min-w-max">
                <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {link.label}
                </span>
                <span className="text-[10px] text-zinc-400 font-normal mt-0.5">
                  {link.desc}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="pb-4 px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
        <div className="border-t border-zinc-100 pt-3">
          <p className="text-[10px] text-zinc-400 font-medium">RKD Export PO System</p>
          <p className="text-[10px] text-zinc-300">v2.0 · {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}
