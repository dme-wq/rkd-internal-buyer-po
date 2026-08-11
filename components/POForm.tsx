"use client";

import React, { useState } from 'react';
import { Plus, Trash2, Save, FileText, ChevronDown, ChevronUp } from 'lucide-react';
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

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Accordion state
  const [headerOpen, setHeaderOpen] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(true);

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
        setMessage(`PO Saved Successfully! Internal PO: ${res.data.internalPO}`);
        const fullHeader = { ...header, internalPO: res.data.internalPO, uid: res.data.uid } as POHeader;
        const pdfData = await generatePOPDF({ header: fullHeader, skus: finalSkus as SKUItem[] });
        await savePDFtoDrive(res.data.uid, pdfData.filename, pdfData.base64);
        setMessage(prev => prev + ' | PDF Saved to Drive.');
      } else {
        setMessage('Error: ' + res.message);
      }
    } catch (err: unknown) {
      setMessage('Exception: ' + (err as Error).message);
    }
    setLoading(false);
  };

  return (
    <div className="w-full h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white">
      
      {/* Sticky Action Bar - ERP Style */}
      <div className="sticky top-0 z-20 bg-zinc-100 border-b border-zinc-300 px-6 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight text-zinc-800">Create Purchase Order</h1>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">DRAFT</span>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-1.5 border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 rounded text-sm font-medium transition-colors">
            Check
          </button>
          <button onClick={handleSave} disabled={loading} className="px-5 py-1.5 bg-[#00a669] hover:bg-[#009059] text-white rounded text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm">
            <Save size={16} /> {loading ? 'Saving...' : 'Save & Post'}
          </button>
        </div>
      </div>

      <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-zinc-50/50">
        
        {message && (
          <div className={`p-4 rounded border text-sm font-medium ${message.includes('Error') || message.includes('Exception') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-[#d1fae5] text-[#00a669] border-[#00a669]/20'}`}>
            {message}
          </div>
        )}

        {/* Header Data Accordion */}
        <div className="bg-white border border-zinc-200 rounded shadow-sm">
          <div className="px-4 py-3 bg-zinc-100/80 border-b border-zinc-200 flex justify-between items-center cursor-pointer hover:bg-zinc-200/50 transition-colors" onClick={() => setHeaderOpen(!headerOpen)}>
            <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide flex items-center gap-2">
              <FileText size={16} className="text-zinc-500"/> Header Data
            </h2>
            {headerOpen ? <ChevronUp size={18} className="text-zinc-500" /> : <ChevronDown size={18} className="text-zinc-500" />}
          </div>
          
          {headerOpen && (
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-4">
                <ERPInput label="Buyer Name" value={header.buyerName} onChange={(e) => updateHeader('buyerName', e.target.value)} />
                <ERPInput label="Buyer PO" value={header.buyerPO} onChange={(e) => updateHeader('buyerPO', e.target.value)} />
                <ERPInput label="File Number" value={header.fileNumber} onChange={(e) => updateHeader('fileNumber', e.target.value)} />
                <ERPInput label="PO Date" type="date" value={header.poDate} onChange={(e) => updateHeader('poDate', e.target.value)} />
                
                <ERPInput label="Ex-Factory" type="date" value={header.exFactory} onChange={(e) => updateHeader('exFactory', e.target.value)} />
                <ERPInput label="Onboard Vessel" type="date" value={header.onboardDate} onChange={(e) => updateHeader('onboardDate', e.target.value)} />
                <ERPInput label="Delivery Terms" value={header.deliveryTerms} onChange={(e) => updateHeader('deliveryTerms', e.target.value)} />
                <ERPInput label="Port Name" value={header.portName} onChange={(e) => updateHeader('portName', e.target.value)} />
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                <ERPTextArea label="Billing Address" value={header.billingAddr} onChange={(e) => updateHeader('billingAddr', e.target.value)} />
                <ERPTextArea label="Delivery Address" value={header.deliveryAddr} onChange={(e) => updateHeader('deliveryAddr', e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Payment Terms Accordion */}
        <div className="bg-white border border-zinc-200 rounded shadow-sm">
          <div className="px-4 py-3 bg-zinc-100/80 border-b border-zinc-200 flex justify-between items-center cursor-pointer hover:bg-zinc-200/50 transition-colors" onClick={() => setPaymentOpen(!paymentOpen)}>
            <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide flex items-center gap-2">
              <FileText size={16} className="text-zinc-500"/> Payment Terms
            </h2>
            {paymentOpen ? <ChevronUp size={18} className="text-zinc-500" /> : <ChevronDown size={18} className="text-zinc-500" />}
          </div>
          
          {paymentOpen && (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-500 uppercase border-b border-zinc-100 pb-2">Term 1</h3>
                <div className="grid grid-cols-2 gap-4">
                  <ERPInput label="Description" value={header.payTerm1} onChange={(e) => updateHeader('payTerm1', e.target.value)} />
                  <ERPInput label="Percentage (%)" type="number" value={header.pay1Pct} onChange={(e) => updateHeader('pay1Pct', parseFloat(e.target.value))} />
                  <ERPInput label="Days" type="number" value={header.pay1Days} onChange={(e) => updateHeader('pay1Days', parseInt(e.target.value))} />
                  <ERPInput label="Activity" value={header.pay1Activity} onChange={(e) => updateHeader('pay1Activity', e.target.value)} />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-500 uppercase border-b border-zinc-100 pb-2">Term 2</h3>
                <div className="grid grid-cols-2 gap-4">
                  <ERPInput label="Description" value={header.payTerm2} onChange={(e) => updateHeader('payTerm2', e.target.value)} />
                  <ERPInput label="Percentage (%)" type="number" value={header.pay2Pct} onChange={(e) => updateHeader('pay2Pct', parseFloat(e.target.value))} />
                  <ERPInput label="Days" type="number" value={header.pay2Days} onChange={(e) => updateHeader('pay2Days', parseInt(e.target.value))} />
                  <ERPInput label="Activity" value={header.pay2Activity} onChange={(e) => updateHeader('pay2Activity', e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Item Overview Grid (Excel/SAP Style) */}
        <div className="bg-white border border-zinc-200 rounded shadow-sm flex flex-col">
          <div className="px-4 py-3 bg-zinc-100/80 border-b border-zinc-200 flex justify-between items-center">
            <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide">Item Overview</h2>
            <button onClick={addSku} className="px-3 py-1 bg-white border border-zinc-300 text-zinc-700 text-xs font-semibold rounded hover:bg-zinc-50 flex items-center gap-1 shadow-sm">
              <Plus size={14} /> Add Row
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-300 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 font-semibold border-r border-zinc-200 w-10 text-center">#</th>
                  <th className="px-3 py-2 font-semibold border-r border-zinc-200 min-w-[120px]">SKU / Product</th>
                  <th className="px-3 py-2 font-semibold border-r border-zinc-200 min-w-[150px]">Description</th>
                  <th className="px-3 py-2 font-semibold border-r border-zinc-200 w-[100px]">Size/Color</th>
                  <th className="px-3 py-2 font-semibold border-r border-zinc-200 w-[80px]">Order Qty</th>
                  <th className="px-3 py-2 font-semibold border-r border-zinc-200 w-[80px]">Price</th>
                  <th className="px-3 py-2 font-semibold border-r border-zinc-200 w-[80px]">Packs</th>
                  <th className="px-3 py-2 font-semibold border-r border-zinc-200 w-[100px] text-right">Line Total</th>
                  <th className="px-3 py-2 font-semibold w-10 text-center">Act</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {skus.map((sku, index) => (
                  <tr key={sku.id} className="hover:bg-blue-50/30">
                    <td className="px-3 py-2 border-r border-zinc-100 text-center text-zinc-400 font-medium">
                      {(index + 1) * 10}
                    </td>
                    <td className="p-1 border-r border-zinc-100 space-y-1">
                      <GridInput value={sku.skuCode} onChange={(e) => updateSku(sku.id!, 'skuCode', e.target.value)} placeholder="SKU Code" />
                      <GridInput value={sku.product} onChange={(e) => updateSku(sku.id!, 'product', e.target.value)} placeholder="Product Name" />
                    </td>
                    <td className="p-1 border-r border-zinc-100">
                      <textarea 
                        value={sku.description || ''} 
                        onChange={(e) => updateSku(sku.id!, 'description', e.target.value)}
                        placeholder="Description..."
                        className="w-full h-[52px] bg-transparent border-none outline-none focus:ring-1 focus:ring-[#00a669] rounded px-2 py-1 text-xs resize-none"
                      />
                    </td>
                    <td className="p-1 border-r border-zinc-100 space-y-1">
                      <GridInput value={sku.size1} onChange={(e) => updateSku(sku.id!, 'size1', e.target.value)} placeholder="Size" />
                      <GridInput value={sku.color} onChange={(e) => updateSku(sku.id!, 'color', e.target.value)} placeholder="Color" />
                    </td>
                    <td className="p-1 border-r border-zinc-100 space-y-1">
                      <GridInput type="number" value={sku.orderQty} onChange={(e) => updateSku(sku.id!, 'orderQty', parseFloat(e.target.value))} placeholder="Qty" />
                      <div className="px-2 py-1 text-[10px] text-zinc-400 text-right">+ {sku.addSample || 0} SMP</div>
                    </td>
                    <td className="p-1 border-r border-zinc-100">
                      <GridInput type="number" value={sku.price} onChange={(e) => updateSku(sku.id!, 'price', parseFloat(e.target.value))} placeholder="$0.00" />
                    </td>
                    <td className="p-1 border-r border-zinc-100 space-y-1">
                       <GridInput type="number" value={sku.innerPack} onChange={(e) => updateSku(sku.id!, 'innerPack', parseInt(e.target.value))} placeholder="In: 0" />
                       <GridInput type="number" value={sku.outerPack} onChange={(e) => updateSku(sku.id!, 'outerPack', parseInt(e.target.value))} placeholder="Out: 0" />
                    </td>
                    <td className="px-3 py-2 border-r border-zinc-100 text-right font-medium text-zinc-800 bg-zinc-50/50">
                      ${((Number(sku.orderQty) || 0) * (Number(sku.price) || 0)).toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button onClick={() => removeSku(sku.id!)} className="text-zinc-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-zinc-50 border-t border-zinc-200 p-4 flex justify-end">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-zinc-500 font-medium">Net Value:</span>
              <span className="text-lg font-bold text-[#00a669] tracking-tight">
                ${skus.reduce((acc, sku) => acc + ((Number(sku.orderQty) || 0) * (Number(sku.price) || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}

// ─── Internal ERP UI Components ─────────────────────────────────────────

interface ERPInputProps {
  label: string;
  value: string | number | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}

function ERPInput({ label, value, onChange, type = "text" }: ERPInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">{label}</label>
      <input 
        type={type} 
        value={value || ''} 
        onChange={onChange} 
        className="w-full bg-white border border-zinc-300 rounded outline-none focus:border-[#00a669] focus:ring-1 focus:ring-[#00a669] px-2.5 py-1.5 text-sm text-zinc-900 transition-all"
      />
    </div>
  );
}

interface ERPTextAreaProps {
  label: string;
  value: string | undefined;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

function ERPTextArea({ label, value, onChange }: ERPTextAreaProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">{label}</label>
      <textarea 
        value={value || ''} 
        onChange={onChange} 
        rows={2}
        className="w-full bg-white border border-zinc-300 rounded outline-none focus:border-[#00a669] focus:ring-1 focus:ring-[#00a669] px-2.5 py-1.5 text-sm text-zinc-900 resize-none transition-all"
      />
    </div>
  );
}

interface GridInputProps {
  value: string | number | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
}

function GridInput({ value, onChange, placeholder, type = "text" }: GridInputProps) {
  return (
    <input 
      type={type}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full bg-transparent border border-transparent outline-none hover:border-zinc-200 focus:bg-white focus:border-[#00a669] focus:ring-1 focus:ring-[#00a669] rounded px-2 py-1 text-xs transition-all"
    />
  );
}
