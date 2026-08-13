"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Download, TrendingUp, Users, ShoppingCart, DollarSign, Package, AlertCircle } from 'lucide-react';
import { getDashboardStats, getAllPOs } from '@/lib/api';
import type { DashboardStats, POListItem } from '@/lib/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentPOs, setRecentPOs] = useState<POListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [dashboardStats, poList] = await Promise.all([
          getDashboardStats(),
          getAllPOs()
        ]);

        if (dashboardStats.status === 'success' && dashboardStats.data) {
          setStats(dashboardStats.data as DashboardStats);
        }
        if (poList.status === 'success' && poList.data && poList.data.pos) {
          setRecentPOs(poList.data.pos.slice(0, 8)); // Top 8 recent POs
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-zinc-900">Dashboard Overview</h1>
          <p className="text-zinc-500 text-sm mt-1">Real-time metrics and summary of your Purchase Orders.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-12">
        
        {/* Card 1: Total POs */}
        <div className="bg-white border-t-4 border-blue-500 rounded-xl p-4 shadow-sm flex flex-col justify-center items-center min-h-[100px] hover:shadow-md transition-shadow text-center">
          <div className="flex justify-center items-center gap-2 mb-1">
            <ShoppingCart size={16} className="text-blue-500" />
            <h3 className="text-zinc-500 font-semibold text-[11px] uppercase tracking-wider">Total Purchase Orders</h3>
          </div>
          <div className="text-[28px] font-black text-zinc-800 tracking-tight">
            {loading ? '...' : stats?.totalPOs || 0}
          </div>
        </div>

        {/* Card 2: Total Quantity */}
        <div className="bg-white border-t-4 border-emerald-500 rounded-xl p-4 shadow-sm flex flex-col justify-center items-center min-h-[100px] hover:shadow-md transition-shadow text-center">
          <div className="flex justify-center items-center gap-2 mb-1">
            <Package size={16} className="text-emerald-500" />
            <h3 className="text-zinc-500 font-semibold text-[11px] uppercase tracking-wider">Total Qty Ordered</h3>
          </div>
          <div className="text-[28px] font-black text-zinc-800 tracking-tight">
            {loading ? '...' : (stats?.totalQty || 0).toLocaleString()}
          </div>
        </div>

        {/* Dynamic Cards: Total Value by Currency */}
        {Object.entries(stats?.totalValueByCurrency || { 'USD': 0 }).map(([currency, value]) => (
          <div key={`total-${currency}`} className="bg-white border-t-4 border-amber-500 rounded-xl p-4 shadow-sm flex flex-col justify-center items-center min-h-[100px] hover:shadow-md transition-shadow text-center">
            <div className="flex justify-center items-center gap-2 mb-1">
              <DollarSign size={16} className="text-amber-500" />
              <h3 className="text-zinc-500 font-semibold text-[11px] uppercase tracking-wider">Total Value ({currency})</h3>
            </div>
            <div className="text-[28px] font-black text-zinc-800 tracking-tight">
              {loading ? '...' : `${currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'INR' ? '₹' : ''}${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
          </div>
        ))}
        
        {/* Card: Buyers Count */}
        <div className="bg-white border-t-4 border-purple-500 rounded-xl p-4 shadow-sm flex flex-col justify-center items-center min-h-[100px] hover:shadow-md transition-shadow text-center">
          <div className="flex justify-center items-center gap-2 mb-1">
            <Users size={16} className="text-purple-500" />
            <h3 className="text-zinc-500 font-semibold text-[11px] uppercase tracking-wider">Active Buyers</h3>
          </div>
          <div className="text-[28px] font-black text-zinc-800 tracking-tight">
            {loading ? '...' : stats?.buyersCount || 0}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent POs Table */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-[20px] font-semibold text-zinc-900 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-600" /> Recent Purchase Orders
          </h2>
          
          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
            {loading ? (
               <div className="p-12 text-center text-zinc-500">Loading recent POs...</div>
            ) : recentPOs.length === 0 ? (
               <div className="p-12 text-center text-zinc-500">
                 No recent POs found. <Link href="/create" className="text-blue-600 font-semibold hover:underline">Create one now</Link>.
               </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px] whitespace-nowrap">
                  <thead className="bg-zinc-50/80 border-b border-zinc-200">
                    <tr>
                      <th className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-wider text-xs">Internal PO</th>
                      <th className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-wider text-xs">Buyer</th>
                      <th className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-wider text-xs">Date</th>
                      <th className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-wider text-xs text-right">Amount</th>
                      <th className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-wider text-xs text-center">PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {recentPOs.map((po, i) => (
                      <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                            {po.internalPO || 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-zinc-800">
                          {po.buyerName || '-'}
                          <div className="text-[11px] text-zinc-400 font-normal mt-0.5">{po.buyerPO}</div>
                        </td>
                        <td className="px-6 py-4 text-zinc-500 font-medium text-xs">
                          {new Date(po.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-600">
                          {po.currency === 'USD' ? '$' : po.currency === 'EUR' ? '€' : po.currency === 'INR' ? '₹' : (po.currency || '') + ' '}
                          {(po.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {po.pdfUrl ? (
                            <a href={po.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center p-2 bg-zinc-100 hover:bg-blue-100 hover:text-blue-700 text-zinc-500 rounded transition-colors" title="View PDF">
                              <Download size={16} />
                            </a>
                          ) : (
                            <span className="text-zinc-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 text-center">
               <Link href="/declarations" className="text-sm font-bold text-blue-600 hover:text-blue-800">View All Purchase Orders &rarr;</Link>
            </div>
          </div>
        </div>

        {/* Buyer Wise Summary */}
        <div className="space-y-6">
          <h2 className="text-[20px] font-semibold text-zinc-900 flex items-center gap-2">
            <Users size={20} className="text-purple-600" /> Buyer Wise Summary
          </h2>

          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
             {loading ? (
               <div className="p-12 text-center text-zinc-500">Loading summary...</div>
             ) : !stats || !stats.buyerWise || stats.buyerWise.length === 0 ? (
               <div className="p-8 text-center text-zinc-500">No buyer data available.</div>
             ) : (
                <div className="divide-y divide-zinc-100">
                  {stats.buyerWise.map((buyer, idx) => (
                    <div key={idx} className="p-5 hover:bg-zinc-50 transition-colors flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                         <div className="font-bold text-zinc-800 text-[15px]">{buyer.name}</div>
                         <div className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">{buyer.poCount} POs</div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                         <div className="flex flex-col">
                           <span className="text-[11px] text-zinc-400 font-semibold uppercase">Total Qty</span>
                           <span className="font-medium text-zinc-700">{buyer.totalQty.toLocaleString()}</span>
                         </div>
                         <div className="flex flex-col text-right">
                           <span className="text-[11px] text-zinc-400 font-semibold uppercase">Total Value</span>
                           {Object.entries(buyer.totalValueByCurrency || {}).map(([currency, value]) => (
                             <span key={currency} className="font-bold text-emerald-600 leading-tight">
                               {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'INR' ? '₹' : currency + ' '}{value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                             </span>
                           ))}
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
