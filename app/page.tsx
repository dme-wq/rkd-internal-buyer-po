"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { getDashboardStats, getAllPOs } from '@/lib/api';

interface RecentPO {
  internalPO?: string;
  buyerName?: string;
  buyerPO?: string;
  poDate?: string;
  pdfUrl?: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ totalPOs: 0, thisMonth: 0, totalValue: 0, buyers: 0 });
  const [recentPOs, setRecentPOs] = useState<RecentPO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const dashboardStats = await getDashboardStats();
        if (dashboardStats.status === 'success' && dashboardStats.data) {
          setStats(dashboardStats.data);
        }

        const poList = await getAllPOs();
        if (poList.status === 'success' && poList.data && poList.data.pos) {
          setRecentPOs(poList.data.pos.slice(0, 5));
        }
      } catch (e) {
        console.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight text-zinc-900">Overview</h1>
      </div>

      {/* Stats Cards - Matching DEclarange style (4 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        
        {/* Card 1: Solid Green */}
        <div className="bg-[#00a669] rounded p-5 shadow-sm text-white flex flex-col justify-between min-h-[120px]">
          <h3 className="text-emerald-50 font-medium text-[13px]">New Declarations In Review</h3>
          <div className="text-[32px] font-bold mt-2">{loading ? '...' : stats.thisMonth}</div>
        </div>

        {/* Card 2: Light Green */}
        <div className="bg-[#d1fae5] rounded p-5 shadow-sm flex flex-col justify-between min-h-[120px]">
          <h3 className="text-zinc-800 font-medium text-[13px]">Created Declarations</h3>
          <div className="flex items-end justify-between mt-2">
            <div className="text-[32px] font-bold text-[#00a669]">{loading ? '...' : stats.totalPOs}</div>
            <div className="flex items-center text-[10px] font-bold bg-[#86efac] text-[#00a669] px-2 py-0.5 rounded-sm">
              +20% ▲
            </div>
          </div>
        </div>

        {/* Card 3: Light Green */}
        <div className="bg-[#d1fae5] rounded p-5 shadow-sm flex flex-col justify-between min-h-[120px]">
          <h3 className="text-zinc-800 font-medium text-[13px]">Ticket Created</h3>
          <div className="text-[32px] font-bold text-[#00a669] mt-2">{loading ? '...' : stats.buyers}</div>
        </div>
        
        {/* Card 4: Light Green */}
        <div className="bg-[#d1fae5] rounded p-5 shadow-sm flex flex-col justify-between min-h-[120px]">
          <h3 className="text-zinc-800 font-medium text-[13px] leading-tight">New Declarations Lorem<br/>Ipsum</h3>
          <div className="text-[32px] font-bold text-[#00a669] mt-2">100</div>
        </div>

      </div>

      {/* Recent Declarations Table */}
      <div className="space-y-6">
        <h2 className="text-[22px] font-semibold text-zinc-900">Recent declarations</h2>
        
        <div className="w-full">
          {loading ? (
             <div className="p-8 text-center text-zinc-500">Loading recent POs...</div>
          ) : recentPOs.length === 0 ? (
             <div className="p-8 text-center text-zinc-500">
               No recent POs found. <Link href="/create" className="text-[#00a669] hover:underline">Create one now</Link>.
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] whitespace-nowrap border-separate border-spacing-y-2">
                <tbody className="">
                  {recentPOs.map((po, i) => {
                     // Alternate mock status for UI showcase
                     const status = i % 3 === 0 ? 'Approved' : i % 3 === 1 ? 'In review' : 'Declined';
                     const statusColor = status === 'Approved' ? 'border-[#00a669] text-[#00a669]' : status === 'In review' ? 'border-blue-400 text-blue-500' : 'border-rose-400 text-rose-500';
                     const badgeBg = i % 2 === 0 ? 'bg-[#d4a373] text-white' : 'bg-[#facc15] text-zinc-800';

                     return (
                      <tr key={i} className="bg-white hover:bg-zinc-50 transition-colors shadow-sm rounded">
                        <td className="px-6 py-4 rounded-l border-y border-l border-zinc-100">
                          <span className={`inline-flex items-center px-3 py-1 rounded text-[11px] font-bold ${badgeBg}`}>
                            {po.internalPO || `MD-${i+5}`}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-zinc-800 border-y border-zinc-100 uppercase text-xs tracking-wide">
                          {po.buyerName || 'PRODUCT NAME'}
                        </td>
                        <td className="px-6 py-4 text-zinc-400 border-y border-zinc-100 font-medium">
                          {po.buyerPO || '123ABC'}
                        </td>
                        <td className="px-6 py-4 border-y border-zinc-100 text-right">
                          {po.pdfUrl ? (
                            <a href={po.pdfUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-600 font-medium text-xs">
                              Download
                            </a>
                          ) : (
                            <span className="text-blue-500 hover:text-blue-600 font-medium text-xs cursor-pointer">Download</span>
                          )}
                        </td>
                        <td className="px-6 py-4 rounded-r border-y border-r border-zinc-100 text-right w-32">
                           <div className={`px-4 py-1.5 rounded text-xs font-semibold border bg-white inline-block w-24 text-center ${statusColor}`}>
                             {status}
                           </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
