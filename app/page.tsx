"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, Users, ShoppingCart, Package, PlusCircle, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { getDashboardStats, getPendingInternalPOs } from '@/lib/api';
import type { DashboardStats, PendingPO } from '@/lib/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingPOs, setPendingPOs] = useState<PendingPO[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);

  useEffect(() => {
    getDashboardStats().then(res => {
      if (res.status === 'success' && res.data) {
        setStats(res.data as DashboardStats);
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    getPendingInternalPOs().then(res => {
      if (res.status === 'success' && res.data) {
        setPendingPOs(res.data as PendingPO[]);
      }
      setLoadingPending(false);
    }).catch(() => setLoadingPending(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 px-8 pt-8">

      {/* Header */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-zinc-900">Dashboard Overview</h1>
          <p className="text-zinc-500 text-sm mt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-100">
              📅 {new Date().getFullYear()}
            </span>
            Real-time metrics and summary of your Purchase Orders.
          </p>
        </div>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#00a669] hover:bg-[#009059] text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-emerald-500/20 hover:shadow-lg"
        >
          <PlusCircle size={18} />
          New Purchase Order
        </Link>
      </div>

      {/* Stats Cards — single API call data */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        <div className="bg-white border-t-4 border-blue-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <ShoppingCart size={22} className="text-blue-500" />
          </div>
          <div>
            <p className="text-zinc-400 font-semibold text-[11px] uppercase tracking-widest">Total POs</p>
            <p className="text-3xl font-black text-zinc-800 tracking-tight leading-none mt-1">
              {loading ? <span className="text-zinc-300 animate-pulse">—</span> : (stats?.totalPOs || 0)}
            </p>
          </div>
        </div>

        <div className="bg-white border-t-4 border-emerald-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Package size={22} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-zinc-400 font-semibold text-[11px] uppercase tracking-widest">Total Qty Ordered</p>
            <p className="text-3xl font-black text-zinc-800 tracking-tight leading-none mt-1">
              {loading ? <span className="text-zinc-300 animate-pulse">—</span> : (stats?.totalQty || 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white border-t-4 border-purple-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
            <Users size={22} className="text-purple-500" />
          </div>
          <div>
            <p className="text-zinc-400 font-semibold text-[11px] uppercase tracking-widest">Active Buyers</p>
            <p className="text-3xl font-black text-zinc-800 tracking-tight leading-none mt-1">
              {loading ? <span className="text-zinc-300 animate-pulse">—</span> : (stats?.buyersCount || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Buyer Wise Summary — from getDashboardStats (no extra call) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-600" />
            Buyer Activity
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block w-8 h-8 border-4 border-zinc-200 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-zinc-400 text-sm mt-3 font-medium">Loading data...</p>
              </div>
            ) : !stats?.buyerWise?.length ? (
              <div className="p-12 text-center text-zinc-400">
                <Package size={36} className="mx-auto mb-3 text-zinc-200" />
                <p className="font-semibold">No data yet</p>
                <Link href="/create" className="text-blue-600 font-semibold text-sm hover:underline mt-2 inline-block">
                  Create your first PO →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {stats.buyerWise.map((buyer, idx) => {
                  const maxQty = stats.buyerWise[0]?.totalQty || 1;
                  const pct = Math.round((buyer.totalQty / maxQty) * 100);
                  return (
                    <div key={idx} className="px-6 py-4 hover:bg-zinc-50/60 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white ${
                            idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-zinc-400' : idx === 2 ? 'bg-orange-400' : 'bg-zinc-200 text-zinc-500'
                          }`}>{idx + 1}</span>
                          <span className="font-bold text-zinc-800 text-[14px]">{buyer.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-zinc-400 font-medium">{buyer.totalQty.toLocaleString()} pcs</span>
                          <span className="bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold">{buyer.poCount} PO{buyer.poCount > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-700 ${idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-zinc-400' : idx === 2 ? 'bg-orange-400' : 'bg-purple-300'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="p-4 bg-zinc-50 border-t border-zinc-100 text-center">
              <Link href="/stats" className="text-sm font-bold text-blue-600 hover:text-blue-800">
                View Full Report →
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
            <Users size={20} className="text-purple-600" />
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Link href="/create" className="block bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 hover:shadow-md hover:border-emerald-200 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                  <PlusCircle size={20} className="text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-zinc-800 text-sm">New Purchase Order</p>
                  <p className="text-zinc-400 text-xs mt-0.5">Create a new PO entry</p>
                </div>
              </div>
            </Link>
            <Link href="/declarations" className="block bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 hover:shadow-md hover:border-blue-200 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                  <ShoppingCart size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-zinc-800 text-sm">Purchase Order Data</p>
                  <p className="text-zinc-400 text-xs mt-0.5">View & manage all POs</p>
                </div>
              </div>
            </Link>
            <Link href="/stats" className="block bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 hover:shadow-md hover:border-violet-200 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-violet-50 group-hover:bg-violet-100 flex items-center justify-center transition-colors">
                  <TrendingUp size={20} className="text-violet-600" />
                </div>
                <div>
                  <p className="font-bold text-zinc-800 text-sm">PO Report</p>
                  <p className="text-zinc-400 text-xs mt-0.5">Analytics & full report</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Pending Actions */}
          <h2 className="text-[18px] font-bold text-zinc-900 flex items-center gap-2 mt-8">
            <AlertCircle size={20} className="text-orange-600" />
            Action Required
          </h2>
          <div className="bg-white rounded-2xl p-2 shadow-sm border border-zinc-100 max-h-[400px] overflow-y-auto custom-scrollbar">
            {loadingPending ? (
              <div className="p-8 text-center text-zinc-400">
                <div className="inline-block w-6 h-6 border-2 border-zinc-200 border-t-orange-500 rounded-full animate-spin" />
                <p className="text-xs mt-2 font-medium">Checking pending POs...</p>
              </div>
            ) : pendingPOs.length === 0 ? (
              <div className="p-8 text-center text-zinc-400">
                <CheckCircle size={32} className="mx-auto mb-2 text-emerald-400" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs mt-1">No pending POs found.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {pendingPOs.map((po) => (
                  <Link 
                    key={po.internalPO} 
                    href={`/create?internalPO=${encodeURIComponent(po.internalPO)}`}
                    className="block p-3 rounded-xl hover:bg-orange-50 border border-transparent hover:border-orange-100 transition-colors group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-zinc-800 text-sm group-hover:text-orange-700 transition-colors">{po.internalPO}</p>
                        <p className="text-zinc-500 text-xs mt-0.5 line-clamp-1">{po.buyerName}</p>
                      </div>
                      <div className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shrink-0">
                        <Clock size={10} /> Pending
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
