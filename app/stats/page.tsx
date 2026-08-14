"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, Package, Users, FileText, Download, Search,
  ChevronDown, ChevronUp, BarChart2, Calendar, Award, Layers
} from 'lucide-react';
import { getAllPOs } from '@/lib/api';
import type { POListItem } from '@/lib/types';
import { formatDate } from '@/lib/utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub?: string;
  color: string;
}) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 hover:shadow-md transition-all duration-200 flex flex-col gap-3 border-t-4 ${color}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-zinc-50`}>
          <Icon size={18} className="text-zinc-500" />
        </div>
      </div>
      <div className="text-3xl font-black text-zinc-800 tracking-tight leading-none">{value}</div>
      {sub && <div className="text-xs text-zinc-400 font-medium">{sub}</div>}
    </div>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-1.5 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StatsPage() {
  const [pos, setPOs] = useState<POListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'buyer' | 'po'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    getAllPOs({ limit: 500 }).then(res => {
      if (res.status === 'success' && res.data) {
        setPOs(res.data.pos || []);
      }
      setLoading(false);
    });
  }, []);

  // ─── Derived stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalPOs = pos.length;

    // Buyer-wise aggregation
    const buyerMap: Record<string, { name: string; count: number; lastDate: string }> = {};
    pos.forEach(po => {
      const b = po.buyerName || 'Unknown';
      if (!buyerMap[b]) buyerMap[b] = { name: b, count: 0, lastDate: po.timestamp };
      buyerMap[b].count++;
      if (po.timestamp > buyerMap[b].lastDate) buyerMap[b].lastDate = po.timestamp;
    });
    const buyerList = Object.values(buyerMap).sort((a, b) => b.count - a.count);
    const maxBuyerCount = buyerList[0]?.count || 1;

    // Month-wise distribution
    const monthMap: Record<string, number> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    pos.forEach(po => {
      const d = new Date(po.timestamp);
      if (isNaN(d.getTime())) return;
      const key = monthNames[d.getMonth()];
      monthMap[key] = (monthMap[key] || 0) + 1;
    });
    const maxMonth = Math.max(...Object.values(monthMap), 1);

    // Most recent PO
    const sorted = [...pos].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const mostRecent = sorted[0];

    return { totalPOs, buyerList, maxBuyerCount, monthMap, maxMonth, monthNames, mostRecent };
  }, [pos]);

  // ─── Filtered + sorted list ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = pos.filter(po => {
      const q = search.toLowerCase();
      return (
        po.internalPO?.toLowerCase().includes(q) ||
        po.buyerName?.toLowerCase().includes(q) ||
        po.buyerPO?.toLowerCase().includes(q)
      );
    });
    list = list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      if (sortBy === 'buyer') cmp = (a.buyerName || '').localeCompare(b.buyerName || '');
      if (sortBy === 'po') cmp = (a.internalPO || '').localeCompare(b.internalPO || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [pos, search, sortBy, sortDir]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return <ChevronDown size={12} className="text-zinc-300" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-blue-500" />
      : <ChevronDown size={12} className="text-blue-500" />;
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full min-h-full flex flex-col bg-zinc-50 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-zinc-200 px-8 py-5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-violet-100 flex items-center justify-center text-violet-600">
            <BarChart2 size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Purchase Order Report
            </h1>
            <p className="text-zinc-400 text-xs mt-0.5 font-medium">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100 text-[10px] font-bold mr-2">
                📅 {currentYear}
              </span>
              Annual analytics for all purchase orders
            </p>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8 flex-1">

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={FileText}
            label="Total POs"
            value={loading ? '—' : stats.totalPOs}
            sub={`${currentYear} Records`}
            color="border-blue-500"
          />
          <StatCard
            icon={Users}
            label="Active Buyers"
            value={loading ? '—' : stats.buyerList.length}
            sub="Unique buyer accounts"
            color="border-violet-500"
          />
          <StatCard
            icon={Award}
            label="Top Buyer"
            value={loading ? '—' : (stats.buyerList[0]?.name?.split(' ')[0] || '—')}
            sub={stats.buyerList[0] ? `${stats.buyerList[0].count} POs` : ''}
            color="border-amber-500"
          />
          <StatCard
            icon={Calendar}
            label="Latest PO"
            value={
              loading ? '—' : stats.mostRecent
                ? new Date(stats.mostRecent.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                : '—'
            }
            sub={stats.mostRecent?.internalPO || ''}
            color="border-emerald-500"
          />
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Month Distribution */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-500" />
              <h2 className="text-[14px] font-bold text-zinc-800">Monthly Distribution</h2>
              <span className="ml-auto text-[11px] text-zinc-400 font-medium">{currentYear}</span>
            </div>
            {loading ? (
              <div className="p-12 text-center text-zinc-400 text-sm">Loading chart...</div>
            ) : (
              <div className="p-6">
                <div className="flex items-end gap-2 h-36">
                  {stats.monthNames.map(month => {
                    const count = stats.monthMap[month] || 0;
                    const heightPct = stats.maxMonth > 0 ? (count / stats.maxMonth) * 100 : 0;
                    return (
                      <div key={month} className="flex flex-col items-center gap-1 flex-1 group">
                        <span className="text-[10px] font-bold text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          {count}
                        </span>
                        <div className="w-full flex items-end justify-center">
                          <div
                            className="w-full rounded-t-md bg-gradient-to-t from-blue-500 to-indigo-400 transition-all duration-700 hover:from-violet-500 hover:to-indigo-400 cursor-default"
                            style={{ height: `${Math.max(heightPct * 1.2, count > 0 ? 6 : 0)}px` }}
                            title={`${month}: ${count} POs`}
                          />
                        </div>
                        <span className="text-[9px] text-zinc-400 font-semibold">{month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Buyer Wise */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
              <Users size={16} className="text-violet-500" />
              <h2 className="text-[14px] font-bold text-zinc-800">Buyer-wise PO Count</h2>
              <span className="ml-auto text-[11px] text-zinc-400 font-medium">Top {Math.min(stats.buyerList.length, 8)}</span>
            </div>
            {loading ? (
              <div className="p-12 text-center text-zinc-400 text-sm">Loading...</div>
            ) : stats.buyerList.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 text-sm">No data available</div>
            ) : (
              <div className="p-4 space-y-3">
                {stats.buyerList.slice(0, 8).map((buyer, idx) => (
                  <div key={buyer.name} className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 ${
                      idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-zinc-400' : idx === 2 ? 'bg-orange-400' : 'bg-zinc-200 text-zinc-500'
                    }`}>{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-zinc-700 truncate">{buyer.name}</span>
                        <span className="text-xs font-black text-violet-600 shrink-0 ml-2">{buyer.count} PO{buyer.count > 1 ? 's' : ''}</span>
                      </div>
                      <ProgressBar
                        pct={(buyer.count / stats.maxBuyerCount) * 100}
                        color={idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-zinc-400' : idx === 2 ? 'bg-orange-400' : 'bg-violet-300'}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Full PO Report Table ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-emerald-500" />
              <h2 className="text-[14px] font-bold text-zinc-800">All Purchase Orders</h2>
              {!loading && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-100">
                  {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {/* Search */}
            <div className="sm:ml-auto flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 w-full sm:w-72">
              <Search size={14} className="text-zinc-400 shrink-0" />
              <input
                type="text"
                placeholder="Search PO, Buyer, Buyer PO..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-sm text-zinc-700 placeholder-zinc-400 outline-none w-full font-medium"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <div className="inline-flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
                <span className="text-zinc-500 text-sm font-medium">Loading purchase orders...</span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-zinc-400">
              <Package size={40} className="mx-auto mb-3 text-zinc-200" />
              <p className="font-semibold">No records found</p>
              {search && <p className="text-sm mt-1">Try a different search term</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px] whitespace-nowrap">
                <thead className="bg-zinc-50 border-b border-zinc-100">
                  <tr>
                    <th className="px-5 py-3.5 font-bold text-zinc-400 uppercase tracking-widest text-[10px]">#</th>
                    <th
                      className="px-5 py-3.5 font-bold text-zinc-400 uppercase tracking-widest text-[10px] cursor-pointer hover:text-zinc-600 select-none"
                      onClick={() => toggleSort('po')}
                    >
                      <span className="inline-flex items-center gap-1">Internal PO <SortIcon col="po" /></span>
                    </th>
                    <th
                      className="px-5 py-3.5 font-bold text-zinc-400 uppercase tracking-widest text-[10px] cursor-pointer hover:text-zinc-600 select-none"
                      onClick={() => toggleSort('buyer')}
                    >
                      <span className="inline-flex items-center gap-1">Buyer <SortIcon col="buyer" /></span>
                    </th>
                    <th className="px-5 py-3.5 font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Buyer PO</th>
                    <th
                      className="px-5 py-3.5 font-bold text-zinc-400 uppercase tracking-widest text-[10px] cursor-pointer hover:text-zinc-600 select-none"
                      onClick={() => toggleSort('date')}
                    >
                      <span className="inline-flex items-center gap-1">Date <SortIcon col="date" /></span>
                    </th>
                    <th className="px-5 py-3.5 font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Delivery Terms</th>
                    <th className="px-5 py-3.5 font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Port</th>
                    <th className="px-5 py-3.5 font-bold text-zinc-400 uppercase tracking-widest text-[10px] text-center">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {filtered.map((po, idx) => (
                    <tr
                      key={po.uid}
                      className="hover:bg-violet-50/40 transition-colors group"
                    >
                      <td className="px-5 py-3.5 text-zinc-300 font-semibold">{idx + 1}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-100 group-hover:bg-blue-100 transition-colors">
                          {po.internalPO || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-zinc-800">{po.buyerName || '—'}</div>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 font-medium">{po.buyerPO || '—'}</td>
                      <td className="px-5 py-3.5 text-zinc-500 font-medium">
                        {po.timestamp
                          ? new Date(po.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {po.deliveryTerms ? (
                          <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[10px] font-bold">
                            {po.deliveryTerms}
                          </span>
                        ) : <span className="text-zinc-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 font-medium">{po.portName || '—'}</td>
                      <td className="px-5 py-3.5 text-center">
                        {po.pdfUrl ? (
                          <a
                            href={po.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 hover:bg-emerald-100 text-zinc-500 hover:text-emerald-700 transition-colors"
                            title="View PDF"
                          >
                            <Download size={14} />
                          </a>
                        ) : (
                          <span className="text-zinc-200 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table footer */}
          {!loading && filtered.length > 0 && (
            <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 font-medium">
                Showing {filtered.length} of {pos.length} records · {currentYear}
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">
                {stats.buyerList.length} active buyer{stats.buyerList.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
