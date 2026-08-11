"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, FileText, CheckCircle, CreditCard, Package, Clock } from 'lucide-react';
import { POHeader, SKUItem } from '../lib/types';
import { createPO, savePDFtoDrive } from '../lib/api';
import { generatePOPDF } from '../lib/pdf';

export default function POForm() {
  const [header, setHeader] = useState<Partial<POHeader>>({
    fileNumber: '', buyerName: '', buyerPO: '', poDate: '', exFactory: '',
    deliveryTerms: '', portName: '', payTerm1: '', payTerm2: '', buyerSource: '',
    buyerSubSrc: '', buyerSrcPct: 100, buyerSubPct: 0, billingAddr: '', deliveryAddr: '',
    onboardDate: '', totalAmount: 0, pay1Pct: 100, pay1Days: 0, pay1Activity: '',
    pay1Amount: 0, pay1DueDate: '', pay2Pct: 0, pay2Days: 0, pay2Activity: '',
    pay2Amount: 0, pay2DueDate: ''
  });

  const [skus, setSkus] = useState<Partial<SKUItem>[]>(() => [{
    id: Date.now().toString(), product: '', shape: '', designer: '', brand: '',
    description: '', size1: '', size2: '', quality: '', color: '', colorRef: '',
    orderQty: 0, unitQty: 'pieces', price: 0, unitPrice: 'piece', currency: 'USD',
    innerPack: 0, outerPack: 0, addSample: 0, addProd: 0
  }]);

  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true 
      }));
    };
    
    updateTime(); // initial call
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const addSku = () => {
    setSkus([...skus, { 
      id: Date.now().toString(), product: '', shape: '', designer: '', brand: '',
      description: '', size1: '', size2: '', quality: '', color: '', colorRef: '',
      orderQty: 0, unitQty: 'pieces', price: 0, unitPrice: 'piece', currency: 'USD',
      innerPack: 0, outerPack: 0, addSample: 0, addProd: 0 
    }]);
  };

  const removeSku = (id: string) => {
    if (skus.length > 1) {
      setSkus(skus.filter(s => s.id !== id));
    }
  };

  const updateHeader = (field: keyof POHeader, value: string | number) => {
    setHeader({ ...header, [field]: value });
  };

  const updateSku = (id: string, field: keyof SKUItem, value: string | number) => {
    setSkus(skus.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const calculateTotals = () => {
    let grandTotal = 0;
    const computedSkus = skus.map(sku => {
      const lineTotal = (Number(sku.orderQty) || 0) * (Number(sku.price) || 0);
      const totalQtyMfg = (Number(sku.orderQty) || 0) + (Number(sku.addSample) || 0) + (Number(sku.addProd) || 0);
      grandTotal += lineTotal;
      return { ...sku, lineTotal, totalQtyMfg };
    });
    
    setHeader(prev => ({ 
      ...prev, 
      totalAmount: grandTotal,
      pay1Amount: grandTotal * (prev.pay1Pct || 0) / 100,
      pay2Amount: grandTotal * (prev.pay2Pct || 0) / 100,
    }));
    return computedSkus;
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      const finalSkus = calculateTotals();
      const res = await createPO(header as Omit<POHeader, 'uid' | 'internalPO'>, finalSkus as SKUItem[]);
      if (res.status === 'success' && res.data) {
        setMessage(`Success! Internal PO: ${res.data.internalPO} saved.`);
        const fullHeader = { ...header, internalPO: res.data.internalPO, uid: res.data.uid } as POHeader;
        const pdfData = await generatePOPDF({ header: fullHeader, skus: finalSkus as SKUItem[] });
        await savePDFtoDrive(res.data.uid, pdfData.filename, pdfData.base64);
        setMessage(prev => prev + ' PDF generated and saved to Drive.');
      } else {
        setMessage('Error: ' + res.message);
      }
    } catch (err: unknown) {
      setMessage('Exception: ' + (err as Error).message);
    }
    setLoading(false);
  };

  return (
    <div className="w-full h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 bg-zinc-50 font-sans">
      
      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-8 py-5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <FileText size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-medium tracking-tight bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">Internal Export Purchase Order Entry</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 shadow-sm shadow-emerald-500/10 hover:bg-emerald-100 transition-colors mr-2">
            <Clock size={16} className="text-emerald-500" />
            <span className="text-sm font-bold tracking-wide tabular-nums">{time || 'Loading...'}</span>
          </div>
          <button onClick={handleSave} disabled={loading} className="px-6 py-2.5 bg-[#00a669] hover:bg-[#009059] text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none">
            <Save size={18} /> {loading ? 'Saving...' : 'Save & Generate'}
          </button>
        </div>
      </div>

      <div className="p-8 overflow-y-auto flex-1 space-y-6">
        
        {message && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium shadow-sm ${message.includes('Error') || message.includes('Exception') ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            <CheckCircle size={18} className={message.includes('Error') ? 'text-rose-500' : 'text-emerald-500'} />
            {message}
          </div>
        )}

        {/* Top Grid: Header Data (Left) & Payment Terms (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Header Data Section */}
          <div className="lg:col-span-2 bg-white border-t-4 border-emerald-500 border-x border-b border-zinc-200 rounded-2xl shadow-md shadow-emerald-500/5 overflow-hidden flex flex-col transition-all hover:shadow-lg hover:shadow-emerald-500/10">
            <div className="px-6 py-4 border-b border-zinc-100 bg-emerald-50/50 flex items-center gap-2">
              <FileText size={16} className="text-emerald-600" />
              <h2 className="text-[15px] font-extrabold text-emerald-900 tracking-wide">General Information</h2>
            </div>
            
            <div className="p-6 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-x-6 gap-y-5 transition-all duration-300">
              <ModernInput label="Buyer Name" value={header.buyerName} onChange={(e) => updateHeader('buyerName', e.target.value)} />
              <ModernInput label="Buyer PO" value={header.buyerPO} onChange={(e) => updateHeader('buyerPO', e.target.value)} />
              <ModernInput label="File Number" value={header.fileNumber} onChange={(e) => updateHeader('fileNumber', e.target.value)} />
              <ModernInput label="PO Date" type="date" value={header.poDate} onChange={(e) => updateHeader('poDate', e.target.value)} />
              <ModernInput label="Ex-Factory" type="date" value={header.exFactory} onChange={(e) => updateHeader('exFactory', e.target.value)} />
              <ModernInput label="Onboard Vessel" type="date" value={header.onboardDate} onChange={(e) => updateHeader('onboardDate', e.target.value)} />
              
              <div className="col-span-full grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-6 mt-2">
                <ModernTextArea label="Billing Address" value={header.billingAddr} onChange={(e) => updateHeader('billingAddr', e.target.value)} />
                <ModernTextArea label="Delivery Address" value={header.deliveryAddr} onChange={(e) => updateHeader('deliveryAddr', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Payment Terms Section - Right Side */}
          <div className="bg-white border-t-4 border-blue-500 border-x border-b border-zinc-200 rounded-2xl shadow-md shadow-blue-500/5 overflow-hidden flex flex-col h-max transition-all hover:shadow-lg hover:shadow-blue-500/10">
            <div className="px-6 py-4 border-b border-zinc-100 bg-blue-50/50 flex items-center gap-2">
              <CreditCard size={16} className="text-blue-600" />
              <h2 className="text-[15px] font-extrabold text-blue-900 tracking-wide">Payment Terms</h2>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  <h3 className="text-[12px] font-bold text-zinc-600 tracking-wide">Term 1</h3>
                </div>
                <div className="space-y-3">
                  <ModernInput label="Description" value={header.payTerm1} onChange={(e) => updateHeader('payTerm1', e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <ModernInput label="Percent (%)" type="number" value={header.pay1Pct} onChange={(e) => updateHeader('pay1Pct', parseFloat(e.target.value))} />
                    <ModernInput label="Days" type="number" value={header.pay1Days} onChange={(e) => updateHeader('pay1Days', parseInt(e.target.value))} />
                  </div>
                </div>
              </div>
              
              <div className="w-full h-px bg-zinc-100"></div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  <h3 className="text-[12px] font-bold text-zinc-600 tracking-wide">Term 2</h3>
                </div>
                <div className="space-y-3">
                  <ModernInput label="Description" value={header.payTerm2} onChange={(e) => updateHeader('payTerm2', e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <ModernInput label="Percent (%)" type="number" value={header.pay2Pct} onChange={(e) => updateHeader('pay2Pct', parseFloat(e.target.value))} />
                    <ModernInput label="Days" type="number" value={header.pay2Days} onChange={(e) => updateHeader('pay2Days', parseInt(e.target.value))} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Item Overview Grid */}
        <div className="bg-white border-t-4 border-purple-500 border-x border-b border-zinc-200 rounded-2xl shadow-md shadow-purple-500/5 flex flex-col overflow-hidden transition-all hover:shadow-lg hover:shadow-purple-500/10">
          <div className="px-6 py-4 border-b border-zinc-100 bg-purple-50/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-purple-600" />
              <h2 className="text-[15px] font-extrabold text-purple-900 tracking-wide">Item Overview</h2>
            </div>
            <button onClick={addSku} className="px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 hover:text-purple-900 text-[13px] font-extrabold rounded-lg flex items-center gap-1.5 transition-all shadow-sm">
              <Plus size={16} /> Add Line Item
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-white border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3 text-[12px] font-bold text-zinc-600 tracking-wide min-w-[48px] text-center">#</th>
                  <th className="px-4 py-3 text-[12px] font-bold text-zinc-600 tracking-wide min-w-[200px]">Product Info</th>
                  <th className="px-4 py-3 text-[12px] font-bold text-zinc-600 tracking-wide min-w-[240px]">Description</th>
                  <th className="px-4 py-3 text-[12px] font-bold text-zinc-600 tracking-wide min-w-[160px]">Attributes</th>
                  <th className="px-4 py-3 text-[12px] font-bold text-zinc-600 tracking-wide min-w-[120px]">Order Qty</th>
                  <th className="px-4 py-3 text-[12px] font-bold text-zinc-600 tracking-wide min-w-[120px]">Unit Price</th>
                  <th className="px-4 py-3 text-[12px] font-bold text-zinc-600 tracking-wide min-w-[160px]">Packing</th>
                  <th className="px-6 py-3 text-[12px] font-bold text-zinc-600 tracking-wide min-w-[120px] text-center">Line Total</th>
                  <th className="px-4 py-3 min-w-[48px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-zinc-50/20">
                {skus.map((sku, index) => (
                  <tr key={sku.id} className="group hover:bg-emerald-50/20 transition-colors">
                    <td className="px-4 py-3 text-center text-zinc-400 text-[11px] font-bold">
                      {(index + 1) * 10}
                    </td>
                    <td className="px-3 py-2 space-y-1.5 align-top">
                      <GridInput value={sku.skuCode} onChange={(e) => updateSku(sku.id!, 'skuCode', e.target.value)} placeholder="SKU Code" bold />
                      <GridInput value={sku.product} onChange={(e) => updateSku(sku.id!, 'product', e.target.value)} placeholder="Product Name" />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <textarea 
                        value={sku.description || ''} 
                        onChange={(e) => updateSku(sku.id!, 'description', e.target.value)}
                        placeholder="Detailed description..."
                        className="block w-full h-16 text-center bg-purple-50/40 border border-purple-200 hover:border-purple-300 focus:bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 rounded-lg px-3 py-2 text-[12px] font-bold text-purple-800 resize-none outline-none transition-all shadow-sm"
                      />
                    </td>
                    <td className="px-3 py-2 space-y-1.5 align-top">
                      <GridInput value={sku.size1} onChange={(e) => updateSku(sku.id!, 'size1', e.target.value)} placeholder="Dimensions" />
                      <GridInput value={sku.color} onChange={(e) => updateSku(sku.id!, 'color', e.target.value)} placeholder="Color" />
                    </td>
                    <td className="px-3 py-2 space-y-1.5 align-top">
                      <GridInput type="number" value={sku.orderQty} onChange={(e) => updateSku(sku.id!, 'orderQty', parseFloat(e.target.value))} placeholder="Quantity" />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <GridInput type="number" value={sku.price} onChange={(e) => updateSku(sku.id!, 'price', parseFloat(e.target.value))} placeholder="$ 0.00" />
                    </td>
                    <td className="px-3 py-2 space-y-1.5 align-top">
                       <GridInput type="number" value={sku.innerPack} onChange={(e) => updateSku(sku.id!, 'innerPack', parseInt(e.target.value))} placeholder="Inner (pcs)" />
                       <GridInput type="number" value={sku.outerPack} onChange={(e) => updateSku(sku.id!, 'outerPack', parseInt(e.target.value))} placeholder="Outer (pcs)" />
                    </td>
                    <td className="px-6 py-4 text-center align-top">
                      <div className="text-[13px] font-black text-rose-700 bg-rose-50 border border-rose-200 rounded-md py-1.5 px-3 shadow-sm inline-block min-w-[80px]">
                        ${((Number(sku.orderQty) || 0) * (Number(sku.price) || 0)).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center align-top">
                      <button onClick={() => removeSku(sku.id!)} className="text-zinc-400 hover:text-rose-500 bg-white hover:bg-rose-50 border border-zinc-200 hover:border-rose-200 rounded p-1.5 transition-all shadow-sm">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-white border-t border-zinc-200 px-6 py-5 flex justify-end">
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="block text-[12px] text-zinc-500 font-bold tracking-wide mb-1">Total Items</span>
                <span className="text-sm font-bold text-zinc-700">{skus.length} SKU(s)</span>
              </div>
              <div className="h-8 w-px bg-zinc-200"></div>
              <div className="text-right">
                <span className="block text-[12px] text-zinc-500 font-bold tracking-wide mb-1">Total Net Value</span>
                <span className="text-2xl font-black text-[#00a669] tracking-tight">
                  ${skus.reduce((acc, sku) => acc + ((Number(sku.orderQty) || 0) * (Number(sku.price) || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}

// ─── Modern UI Components ─────────────────────────────────────────

interface ModernInputProps {
  label: string;
  value: string | number | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}

function ModernInput({ label, value, onChange, type = "text" }: ModernInputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full items-center">
      <label className="text-[12px] font-bold text-zinc-600 tracking-wide capitalize text-center">{label}</label>
      <input 
        type={type} 
        value={value || ''} 
        onChange={onChange} 
        className="w-full text-center bg-gradient-to-r from-indigo-50/40 to-blue-50/40 border border-indigo-200 rounded-lg outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 px-3.5 py-2 text-[13px] font-bold text-indigo-900 transition-all shadow-sm"
      />
    </div>
  );
}

interface ModernTextAreaProps {
  label: string;
  value: string | undefined;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

function ModernTextArea({ label, value, onChange }: ModernTextAreaProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full items-center">
      <label className="text-[12px] font-bold text-zinc-600 tracking-wide capitalize text-center">{label}</label>
      <textarea 
        value={value || ''} 
        onChange={onChange} 
        rows={2}
        className="w-full text-center bg-gradient-to-r from-teal-50/40 to-emerald-50/40 border border-teal-200 rounded-lg outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 px-3.5 py-2 text-[13px] font-bold text-teal-900 resize-none transition-all shadow-sm"
      />
    </div>
  );
}

interface GridInputProps {
  value: string | number | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  bold?: boolean;
}

function GridInput({ value, onChange, placeholder, type = "text", bold }: GridInputProps) {
  return (
    <input 
      type={type}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      className={`block w-full text-center bg-purple-50/40 border border-purple-200 hover:border-purple-300 focus:bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 rounded-md px-2.5 py-1.5 text-[12px] ${bold ? 'font-extrabold text-purple-900' : 'font-bold text-purple-800'} outline-none transition-all shadow-sm`}
    />
  );
}
