"use client";

import React, { useState } from 'react';
import { Plus, Trash2, Save, FileText, Download, DollarSign, Package } from 'lucide-react';
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
      // createPO
      const res = await createPO(header as Omit<POHeader, 'uid' | 'internalPO'>, finalSkus as SKUItem[]);
      if (res.status === 'success' && res.data) {
        setMessage(`PO Saved Successfully! Internal PO: ${res.data.internalPO}`);
        
        // Generate PDF
        const fullHeader = { ...header, internalPO: res.data.internalPO, uid: res.data.uid } as POHeader;
        const pdfData = await generatePOPDF({ header: fullHeader, skus: finalSkus as SKUItem[] });
        
        // Upload PDF
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

  const handleDownloadPDF = async () => {
    const finalSkus = calculateTotals();
    const fullHeader = { ...header, internalPO: 'DRAFT' } as POHeader;
    const pdfData = await generatePOPDF({ header: fullHeader, skus: finalSkus as SKUItem[] });
    
    const url = URL.createObjectURL(pdfData.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = pdfData.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-8 bg-zinc-50 dark:bg-zinc-950 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
      
      <div className="flex justify-between items-center pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Create Purchase Order</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Enter PO details to generate PDF and save to database.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 transition-all font-medium text-sm">
            <Download size={16} /> Preview PDF
          </button>
          <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all font-medium text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50">
            <Save size={16} /> {loading ? 'Saving...' : 'Save PO'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium ${message.includes('Error') || message.includes('Exception') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
          {message}
        </div>
      )}

      {/* Header Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-zinc-200/50 dark:border-zinc-800/50">
        <h2 className="text-lg font-semibold mb-4 text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
          <FileText size={18} className="text-blue-500"/> General Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Input label="File Number" value={header.fileNumber} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateHeader('fileNumber', e.target.value)} />
          <Input label="Buyer PO Number" value={header.buyerPO} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateHeader('buyerPO', e.target.value)} />
          <Input label="Buyer Name" value={header.buyerName} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateHeader('buyerName', e.target.value)} />
          
          <Input label="PO Date" type="date" value={header.poDate} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateHeader('poDate', e.target.value)} />
          <Input label="Ex-Factory Date" type="date" value={header.exFactory} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateHeader('exFactory', e.target.value)} />
          <Input label="Onboard Vessel Date" type="date" value={header.onboardDate} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateHeader('onboardDate', e.target.value)} />
          
          <Input label="Delivery Terms" value={header.deliveryTerms} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateHeader('deliveryTerms', e.target.value)} />
          <Input label="Port Name" value={header.portName} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateHeader('portName', e.target.value)} />
          <Input label="Currency" value="USD" disabled />
          
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-5">
            <TextArea label="Billing Address" value={header.billingAddr} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateHeader('billingAddr', e.target.value)} />
            <TextArea label="Delivery Address" value={header.deliveryAddr} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateHeader('deliveryAddr', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Payment Terms Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-zinc-200/50 dark:border-zinc-800/50">
        <h2 className="text-lg font-semibold mb-4 text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
          <DollarSign size={18} className="text-emerald-500"/> Payment Terms
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Term 1</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Description" value={header.payTerm1} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateHeader('payTerm1', e.target.value)} placeholder="e.g. BL 75 Days" />
              <Input label="Percentage (%)" type="number" value={header.pay1Pct} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateHeader('pay1Pct', parseFloat(e.target.value))} />
              <Input label="Days" type="number" value={header.pay1Days} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateHeader('pay1Days', parseInt(e.target.value))} />
              <Input label="Activity" value={header.pay1Activity} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateHeader('pay1Activity', e.target.value)} placeholder="e.g. From date of shipment" />
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Term 2</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Description" value={header.payTerm2} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateHeader('payTerm2', e.target.value)} />
              <Input label="Percentage (%)" type="number" value={header.pay2Pct} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateHeader('pay2Pct', parseFloat(e.target.value))} />
              <Input label="Days" type="number" value={header.pay2Days} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateHeader('pay2Days', parseInt(e.target.value))} />
              <Input label="Activity" value={header.pay2Activity} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateHeader('pay2Activity', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* SKUs Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
            <Package size={18} className="text-purple-500"/> Line Items (SKUs)
          </h2>
          <button onClick={addSku} className="flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-sm font-medium transition-colors">
            <Plus size={14} /> Add Item
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">SKU / Product</th>
                <th className="px-4 py-3 font-medium">Description & Size</th>
                <th className="px-4 py-3 font-medium">Qty / Price</th>
                <th className="px-4 py-3 font-medium">Packaging</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {skus.map((sku) => (
                <tr key={sku.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 align-top space-y-2 min-w-[200px]">
                    <Input label="SKU Code" value={sku.skuCode} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateSku(sku.id!, 'skuCode', e.target.value)} compact />
                    <Input label="Product" value={sku.product} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateSku(sku.id!, 'product', e.target.value)} compact />
                    <Input label="Brand" value={sku.brand} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateSku(sku.id!, 'brand', e.target.value)} compact />
                  </td>
                  <td className="px-4 py-3 align-top space-y-2 min-w-[200px]">
                    <Input label="Description" value={sku.description} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateSku(sku.id!, 'description', e.target.value)} compact />
                    <div className="grid grid-cols-2 gap-2">
                      <Input label="Size 1" value={sku.size1} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateSku(sku.id!, 'size1', e.target.value)} compact />
                      <Input label="Size 2" value={sku.size2} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateSku(sku.id!, 'size2', e.target.value)} compact />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input label="Color" value={sku.color} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateSku(sku.id!, 'color', e.target.value)} compact />
                      <Input label="Quality" value={sku.quality} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateSku(sku.id!, 'quality', e.target.value)} compact />
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top space-y-2 min-w-[150px]">
                    <Input label="Order Qty" type="number" value={sku.orderQty} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateSku(sku.id!, 'orderQty', parseFloat(e.target.value))} compact />
                    <Input label="Price" type="number" value={sku.price} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateSku(sku.id!, 'price', parseFloat(e.target.value))} compact />
                    <Input label="Add. Sample" type="number" value={sku.addSample} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateSku(sku.id!, 'addSample', parseFloat(e.target.value))} compact />
                  </td>
                  <td className="px-4 py-3 align-top space-y-2 min-w-[120px]">
                    <Input label="Inner Pack" type="number" value={sku.innerPack} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateSku(sku.id!, 'innerPack', parseInt(e.target.value))} compact />
                    <Input label="Outer Pack" type="number" value={sku.outerPack} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateSku(sku.id!, 'outerPack', parseInt(e.target.value))} compact />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="text-zinc-500">Line Total:</span>
                      <span className="font-semibold text-lg">${((Number(sku.orderQty) || 0) * (Number(sku.price) || 0)).toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-center">
                    <button onClick={() => removeSku(sku.id!)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface InputProps {
  label: string;
  value: string | number | undefined;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  compact?: boolean;
  disabled?: boolean;
}

// Simple internal UI Components
function Input({ label, value, onChange, type = "text", placeholder, compact, disabled }: InputProps) {
  return (
    <div className={`flex flex-col ${compact ? 'gap-1' : 'gap-1.5'}`}>
      <label className={`font-medium text-zinc-600 dark:text-zinc-400 ${compact ? 'text-xs' : 'text-sm'}`}>{label}</label>
      <input 
        type={type} 
        value={value || ''} 
        onChange={onChange} 
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all ${compact ? 'px-2 py-1 text-sm' : 'px-3 py-2 text-base'} text-zinc-900 dark:text-zinc-100 disabled:opacity-50`}
      />
    </div>
  );
}

interface TextAreaProps {
  label: string;
  value: string | undefined;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}

function TextArea({ label, value, onChange, placeholder }: TextAreaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</label>
      <textarea 
        value={value || ''} 
        onChange={onChange} 
        placeholder={placeholder}
        rows={3}
        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all px-3 py-2 text-base text-zinc-900 dark:text-zinc-100 resize-none"
      />
    </div>
  );
}
