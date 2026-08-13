"use client";

import React, { useState, useEffect } from 'react';
import { FileText, Eye, Edit, ChevronDown, ChevronUp, Package, Calendar, X } from 'lucide-react';
import { getAllPOs, getPOById } from '@/lib/api';
import { POListItem, PurchaseOrder } from '@/lib/types';
import Link from 'next/link';

export default function DeclarationsPage() {
  const [pos, setPOs] = useState<POListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [poDetails, setPoDetails] = useState<Record<string, PurchaseOrder>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPOs() {
      try {
        const res = await getAllPOs({ limit: 100 });
        if (res.status === 'success' && res.data) {
          setPOs(res.data.pos || []);
        }
      } catch (err) {
        console.error("Failed to load POs", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPOs();
  }, []);

  const toggleExpand = async (uid: string) => {
    if (expandedId === uid) {
      setExpandedId(null);
      return;
    }
    
    setExpandedId(uid);
    
    if (!poDetails[uid] && !loadingDetails[uid]) {
      setLoadingDetails(prev => ({ ...prev, [uid]: true }));
      try {
        const res = await getPOById(uid);
        if (res.status === 'success' && res.data) {
          setPoDetails(prev => ({ ...prev, [uid]: res.data as PurchaseOrder }));
        }
      } catch (err) {
        console.error("Failed to load PO details", err);
      } finally {
        setLoadingDetails(prev => ({ ...prev, [uid]: false }));
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 bg-zinc-50 font-sans relative">
      
      {/* Full Screen Image Modal */}
      {fullScreenImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-8 backdrop-blur-sm" onClick={() => setFullScreenImage(null)}>
          <button 
            onClick={() => setFullScreenImage(null)} 
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            <X size={24} />
          </button>
          <img 
            src={fullScreenImage} 
            alt="Full Screen Preview" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-8 py-5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <FileText size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-medium tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Purchase Order Data</h1>
          </div>
        </div>
      </div>

      <div className="p-8 overflow-y-auto flex-1">
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          
          <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-[15px] font-bold text-zinc-800">Internal Purchase Orders</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-500">Loading Purchase Orders...</div>
          ) : pos.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">No Purchase Orders found.</div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {pos.map(po => (
                <div key={po.uid} className={`transition-colors ${expandedId === po.uid ? 'bg-blue-50/30' : 'hover:bg-zinc-50'}`}>
                  
                  {/* Row Header */}
                  <div 
                    onClick={() => toggleExpand(po.uid)}
                    className="px-6 py-4 flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-6 flex-1">
                      <div className="flex flex-col">
                        <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-1">Internal PO</span>
                        <span className="text-sm font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded">{po.internalPO}</span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-1">Buyer Name</span>
                        <span className="text-sm font-semibold text-zinc-700">{po.buyerName || '-'}</span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-1">Buyer PO</span>
                        <span className="text-sm font-semibold text-zinc-700">{po.buyerPO || '-'}</span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-1">Total Amount</span>
                        <span className="text-sm font-bold text-emerald-600">${(po.totalAmount || 0).toFixed(2)}</span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-1">Date</span>
                        <span className="text-sm font-semibold text-zinc-600">{new Date(po.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 pl-4 border-l border-zinc-200">
                      <div className={`p-2 rounded-full transition-colors ${expandedId === po.uid ? 'bg-blue-100 text-blue-600' : 'bg-zinc-100 text-zinc-400 group-hover:bg-zinc-200 group-hover:text-zinc-600'}`}>
                        {expandedId === po.uid ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedId === po.uid && (
                    <div className="px-6 pb-6 pt-2 border-t border-zinc-100">
                      {loadingDetails[po.uid] ? (
                        <div className="py-8 text-center text-zinc-500 text-sm">Loading details...</div>
                      ) : poDetails[po.uid] ? (
                        <div className="space-y-6">
                          
                          {/* Details Header & Actions */}
                          <div className="flex justify-between items-start pt-4">
                            <div className="flex gap-8">
                              <div className="space-y-1">
                                <div className="text-xs text-zinc-400 font-semibold">Ex-Factory</div>
                                <div className="text-sm font-medium flex items-center gap-1.5"><Calendar size={14} className="text-zinc-400"/> {poDetails[po.uid].header.exFactory || '-'}</div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs text-zinc-400 font-semibold">Delivery Terms</div>
                                <div className="text-sm font-medium">{poDetails[po.uid].header.deliveryTerms || '-'}</div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs text-zinc-400 font-semibold">Port of Discharge</div>
                                <div className="text-sm font-medium">{poDetails[po.uid].header.portName || '-'}</div>
                              </div>
                            </div>
                            
                            <Link href={`/edit/${po.uid}`} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 rounded-lg text-sm font-bold transition-colors shadow-sm">
                              <Edit size={16} /> Recall / Edit PO
                            </Link>
                          </div>

                          {/* Line Items Table */}
                          <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-zinc-50 px-4 py-2.5 border-b border-zinc-200 flex items-center gap-2">
                              <Package size={16} className="text-zinc-500" />
                              <h3 className="text-sm font-bold text-zinc-700">Line Items</h3>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-zinc-50">
                                  <tr>
                                    <th className="px-4 py-2 font-semibold text-zinc-500 text-xs uppercase tracking-wide border-b">SKU</th>
                                    <th className="px-4 py-2 font-semibold text-zinc-500 text-xs uppercase tracking-wide border-b">Product</th>
                                    <th className="px-4 py-2 font-semibold text-zinc-500 text-xs uppercase tracking-wide border-b text-center">Image</th>
                                    <th className="px-4 py-2 font-semibold text-zinc-500 text-xs uppercase tracking-wide border-b">Color</th>
                                    <th className="px-4 py-2 font-semibold text-zinc-500 text-xs uppercase tracking-wide border-b text-right">Order Qty</th>
                                    <th className="px-4 py-2 font-semibold text-zinc-500 text-xs uppercase tracking-wide border-b text-right">Price</th>
                                    <th className="px-4 py-2 font-semibold text-zinc-500 text-xs uppercase tracking-wide border-b text-right">Line Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                  {poDetails[po.uid].skus.map((sku, idx) => (
                                    <tr key={idx} className="hover:bg-zinc-50/50">
                                      <td className="px-4 py-3 font-medium text-zinc-700">{sku.skuCode || '-'}</td>
                                      <td className="px-4 py-3 font-medium text-zinc-900">{sku.product}</td>
                                      <td className="px-4 py-3 text-center">
                                        {sku.designImage ? (
                                          <img 
                                            src={sku.designImage} 
                                            alt="Design" 
                                            onClick={() => setFullScreenImage(sku.designImage || null)}
                                            className="w-10 h-10 object-cover rounded mx-auto border border-zinc-200 shadow-sm cursor-pointer hover:border-blue-400 transition-colors" 
                                          />
                                        ) : <span className="text-zinc-300 text-xs">No image</span>}
                                      </td>
                                      <td className="px-4 py-3 text-zinc-600">{sku.color}</td>
                                      <td className="px-4 py-3 text-right font-medium">{sku.orderQty} <span className="text-xs text-zinc-400">{sku.unitQty}</span></td>
                                      <td className="px-4 py-3 text-right font-medium">${Number(sku.price || 0).toFixed(2)}</td>
                                      <td className="px-4 py-3 text-right font-bold text-emerald-600">${Number(sku.lineTotal || 0).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="bg-zinc-50/80">
                                  <tr>
                                    <td colSpan={6} className="px-4 py-3 text-right font-bold text-zinc-700 uppercase text-xs tracking-wider">Grand Total</td>
                                    <td className="px-4 py-3 text-right font-black text-emerald-700 text-base">${(poDetails[po.uid].header.totalAmount || 0).toFixed(2)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>

                        </div>
                      ) : (
                        <div className="py-8 text-center text-rose-500 text-sm">Failed to load details.</div>
                      )}
                    </div>
                  )}
                  
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
