"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Clock, CheckCircle2, FileText, TrendingUp, Download, Eye } from 'lucide-react';
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
          // Show only top 5 recent POs
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
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Overview</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">The ultimate tool for creating and managing your purchase orders.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1 */}
        <div className="bg-emerald-600 rounded-xl p-6 shadow-lg shadow-emerald-600/20 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-emerald-100 font-medium text-sm">New Declarations in Review</h3>
            <div className="text-5xl font-bold mt-4">{loading ? '...' : stats.thisMonth}</div>
          </div>
          <div className="absolute right-[-10%] top-[-10%] w-32 h-32 bg-emerald-500 rounded-full opacity-50 blur-2xl"></div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <h3 className="text-zinc-500 font-medium text-sm">Created Declarations</h3>
          <div className="flex items-end justify-between mt-4">
            <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-500">{loading ? '...' : stats.totalPOs}</div>
            <div className="flex items-center gap-1 text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
              <TrendingUp size={14} /> +20%
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <h3 className="text-zinc-500 font-medium text-sm">Total PO Value (USD)</h3>
          <div className="flex items-end justify-between mt-4">
            <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-500">${loading ? '...' : (stats.totalValue || 0).toLocaleString()}</div>
          </div>
        </div>

      </div>

      {/* Recent Declarations Table */}
      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Recent POs</h2>
        
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {loading ? (
             <div className="p-8 text-center text-zinc-500">Loading recent POs...</div>
          ) : recentPOs.length === 0 ? (
             <div className="p-8 text-center text-zinc-500">
               No recent POs found. <Link href="/create" className="text-emerald-600 hover:underline">Create one now</Link>.
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Internal PO</th>
                    <th className="px-6 py-4 font-medium">Buyer Name</th>
                    <th className="px-6 py-4 font-medium">Buyer PO</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                  {recentPOs.map((po, i) => (
                    <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium text-xs">
                          {po.internalPO || `MD-${i+5}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{po.buyerName || 'UNKNOWN BUYER'}</td>
                      <td className="px-6 py-4 text-zinc-500">{po.buyerPO || '123ABC'}</td>
                      <td className="px-6 py-4 text-zinc-500">{po.poDate || new Date().toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                        {po.pdfUrl && (
                          <a href={po.pdfUrl} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center gap-1 transition-colors">
                            <Download size={14} /> Download
                          </a>
                        )}
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                          {i % 2 === 0 ? 'Approved' : 'In review'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
