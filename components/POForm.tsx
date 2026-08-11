"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, FileText, CheckCircle, CreditCard, Package, Clock } from 'lucide-react';
import { POHeader, SKUItem, DropdownData } from '../lib/types';
import { createPO, savePDFtoDrive, getPendingInternalPOs, getDropdowns } from '../lib/api';
import { generatePOPDF } from '../lib/pdf';
import { DragDropImage } from './DragDropImage';
import { MultiSelectDropdown } from './MultiSelectDropdown';

export default function POForm() {
  const [header, setHeader] = useState<Partial<POHeader>>({
    internalPO: '', fileNumber: '', buyerName: '', buyerPO: '', poDate: '', exFactory: '',
    deliveryTerms: '', portName: '', payTerm1: '', payTerm2: '', buyerSource: '',
    buyerSubSrc: '', buyerSrcPct: 100, buyerSubPct: 0, billingAddr: '', deliveryAddr: '',
    pay1Pct: '-', pay1Days: '-', pay1Activity: '-',
    pay1Amount: 0, pay1DueDate: '', pay2Pct: '-', pay2Days: '-', pay2Activity: '-',
    pay2Amount: 0, pay2DueDate: ''
  });

  const [skus, setSkus] = useState<Partial<SKUItem>[]>(() => [{
    id: Date.now().toString(), product: '', shape: '', designer: '', brand: '',
    description: '', sizes: [], size1: '', size2: '', quality: '', color: '', colorRef: '',
    orderQty: 0, unitQty: 'pieces', price: 0, unitPrice: 'piece', currency: 'USD',
    innerPack: '', outerPack: '', addSample: '', addProd: '', skuCode: '', designImage: '',
    totalQtyMfg: 0, lineTotal: 0
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
    
    // Fetch pending Internal POs
    getPendingInternalPOs().then(setPendingPOs);
    getDropdowns().then(res => {
      if (res.status === 'success' && res.data) {
        setDropdowns(res.data);
      }
    });
    
    return () => clearInterval(interval);
  }, []);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pendingPOs, setPendingPOs] = useState<string[]>([]);
  const [dropdowns, setDropdowns] = useState<DropdownData | null>(null);

  const addSku = () => {
    setSkus([...skus, { 
      id: Date.now().toString(), product: '', shape: '', designer: '', brand: '',
      description: '', sizes: [], size1: '', size2: '', quality: '', color: '', colorRef: '',
      orderQty: 0, unitQty: 'pieces', price: 0, unitPrice: 'piece', currency: 'USD',
      innerPack: '', outerPack: '', addSample: '', addProd: '', skuCode: '', designImage: '',
      totalQtyMfg: 0, lineTotal: 0
    }]);
  };

  const removeSku = (id: string) => {
    if (skus.length > 1) {
      setSkus(skus.filter(s => s.id !== id));
    }
  };

  const portTransitDays: Record<string, number> = {
    'Genoa': 30, 'Charleston': 30, 'Baltimore': 30, 'Umm Qasr': 7, 'Savannah': 30, 'New Jersy': 30
  };

  const calculateDueDate = (pctStr: string | number | undefined, activity: string, daysStr: string | number | undefined, poDate: string, exFactory: string, onboardDate: string, portName: string) => {
    if (!pctStr || pctStr === '-') return '';
    if (!activity || activity === '-') return '';
    const days = daysStr === '-' ? 0 : parseInt(String(daysStr || '0').replace(' Days', ''));
    if (isNaN(days)) return '';
    const transitDays = portTransitDays[portName] || 0;

    let baseDateStr = '';
    let offsetDays = 0;

    if (activity === 'Advance') {
      baseDateStr = poDate;
      offsetDays = 7;
    } else if (activity === 'Before Dispatch (after inspection)') {
      baseDateStr = exFactory;
      offsetDays = -1;
    } else if (activity === 'After the estimated vessel date of arrival') {
      baseDateStr = onboardDate;
      offsetDays = transitDays + days;
    } else if (activity === 'Before the estimated vessel date of arrival') {
      baseDateStr = onboardDate;
      offsetDays = transitDays - days;
    } else if (activity === 'From the Date of BL') {
      baseDateStr = exFactory;
      offsetDays = 15 + days;
    } else if (activity === 'CAD') {
      baseDateStr = exFactory;
      offsetDays = 15;
    }

    if (!baseDateStr) return '';
    const d = new Date(baseDateStr);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  const percentOptions = ['-', ...Array.from({length: 100}, (_, i) => `${i + 1}%`)];
  const daysOptions = ['-', ...Array.from({length: 180}, (_, i) => `${i + 1} Days`)];
  const activityOptions = [
    '-', 'Advance', 'From the Date of BL', 'Before Dispatch (after inspection)',
    'After the estimated vessel date of arrival', 'Before the estimated vessel date of arrival', 'CAD'
  ];

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
      const addProdPct = parseFloat(String(sku.addProd || '0').replace('%', '')) / 100;
      const ppTopNum = parseInt(String(sku.addSample || '0').replace(/[^0-9]/g, '')) || 0;
      const totalQtyMfg = Math.ceil((Number(sku.orderQty) || 0) + ((Number(sku.orderQty) || 0) * addProdPct) + ppTopNum);
      grandTotal += lineTotal;
      return { ...sku, lineTotal, totalQtyMfg };
    });
    const p1Pct = header.pay1Pct === '-' ? 0 : parseFloat(String(header.pay1Pct || '0'));
    const p2Pct = header.pay2Pct === '-' ? 0 : parseFloat(String(header.pay2Pct || '0'));

    setHeader(prev => ({ 
      ...prev, 
      totalAmount: grandTotal,
      pay1Amount: grandTotal * p1Pct / 100,
      pay2Amount: grandTotal * p2Pct / 100,
      pay1DueDate: calculateDueDate(prev.pay1Pct, prev.pay1Activity || '', prev.pay1Days, prev.poDate || '', prev.exFactory || '', prev.onboardDate || '', prev.portName || ''),
      pay2DueDate: calculateDueDate(prev.pay2Pct, prev.pay2Activity || '', prev.pay2Days, prev.poDate || '', prev.exFactory || '', prev.onboardDate || '', prev.portName || '')
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
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          
          {/* Header Data Section */}
          <div className="xl:col-span-3 bg-white border-t-4 border-emerald-500 border-x border-b border-zinc-200 rounded-2xl shadow-md shadow-emerald-500/5 overflow-hidden flex flex-col transition-all hover:shadow-lg hover:shadow-emerald-500/10">
            <div className="px-6 py-4 border-b border-zinc-100 bg-emerald-50/50 flex items-center gap-2">
              <FileText size={16} className="text-emerald-600" />
              <h2 className="text-[15px] font-extrabold text-emerald-900 tracking-wide">General Information</h2>
            </div>
            
            <div className="p-6 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-x-6 gap-y-5 transition-all duration-300">
              <ModernSelect label="Internal PO Number" value={header.internalPO || ''} onChange={(e) => updateHeader('internalPO', e.target.value)} options={pendingPOs} />
              <ModernInput label="Buyer Name" value={header.buyerName} onChange={(e) => updateHeader('buyerName', e.target.value)} />
              <ModernInput label="Buyer PO" value={header.buyerPO} onChange={(e) => updateHeader('buyerPO', e.target.value)} />
              <ModernInput label="File Number" value={header.fileNumber} onChange={(e) => updateHeader('fileNumber', e.target.value)} />
              <ModernInput label="PO Date" type="date" value={header.poDate} onChange={(e) => updateHeader('poDate', e.target.value)} />
              <ModernInput label="Ex-Factory" type="date" value={header.exFactory} onChange={(e) => updateHeader('exFactory', e.target.value)} />
              <ModernInput label="Onboard Vessel" type="date" value={header.onboardDate} onChange={(e) => updateHeader('onboardDate', e.target.value)} />
              <ModernInput label="Delivery Terms" value={header.deliveryTerms} onChange={(e) => updateHeader('deliveryTerms', e.target.value)} />
              <ModernSelect 
                label="Port of Discharge" 
                value={header.portName || ''} 
                onChange={(e) => updateHeader('portName', e.target.value)} 
                options={["N/A", "Genoa", "Charleston", "Baltimore", "Umm Qasr", "Savannah", "New Jersy"]} 
              />
              
              <div className="col-span-full grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-6 mt-2">
                <ModernTextArea label="Billing Address" value={header.billingAddr} onChange={(e) => updateHeader('billingAddr', e.target.value)} />
                <ModernTextArea label="Delivery Address" value={header.deliveryAddr} onChange={(e) => updateHeader('deliveryAddr', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Payment Terms Section - Right Sidebar */}
          <div className="xl:col-span-2 bg-white border-t-4 border-blue-500 border-x border-b border-zinc-200 rounded-2xl shadow-md shadow-blue-500/5 overflow-hidden flex flex-col h-max transition-all hover:shadow-lg hover:shadow-blue-500/10">
            <div className="px-4 py-3 border-b border-zinc-100 bg-blue-50/50 flex items-center gap-2">
              <CreditCard size={14} className="text-blue-600" />
              <h2 className="text-[14px] font-extrabold text-blue-900 tracking-wide">Payment Terms</h2>
            </div>
            
            <div className="p-4 flex flex-col gap-4">
              
              {/* Payment Term 1 */}
              <div className="w-full border border-blue-200 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-blue-100 text-blue-900 text-center font-bold py-1.5 text-[11px] tracking-wide">Payment Term 1</div>
                <div className="grid grid-cols-5 bg-blue-50/30 divide-x divide-blue-200">
                  <div className="p-1.5 flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-blue-800 text-center">%</label>
                    <select value={header.pay1Pct || '-'} onChange={(e) => updateHeader('pay1Pct', e.target.value)} className="w-full text-center bg-yellow-50 border border-yellow-200 rounded px-1 py-1 text-[10px] font-bold text-zinc-900 outline-none focus:border-yellow-500 shadow-sm cursor-pointer appearance-none">
                      {percentOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="p-1.5 flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-blue-800 text-center">Days</label>
                    <select value={header.pay1Days || '-'} onChange={(e) => updateHeader('pay1Days', e.target.value)} className="w-full text-center bg-yellow-50 border border-yellow-200 rounded px-1 py-1 text-[10px] font-bold text-zinc-900 outline-none focus:border-yellow-500 shadow-sm cursor-pointer appearance-none">
                      {daysOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="p-1.5 flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-blue-800 text-center">Activity</label>
                    <select value={header.pay1Activity || '-'} onChange={(e) => updateHeader('pay1Activity', e.target.value)} className="w-full text-center bg-yellow-50 border border-yellow-200 rounded px-1 py-1 text-[10px] font-bold text-zinc-900 outline-none focus:border-yellow-500 shadow-sm cursor-pointer appearance-none" style={{textOverflow: 'ellipsis'}}>
                      {activityOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="p-1.5 flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-blue-800 text-center">Amount</label>
                    <input type="text" readOnly value={`$${((header.totalAmount || 0) * (header.pay1Pct === '-' ? 0 : parseFloat(String(header.pay1Pct || '0'))) / 100).toFixed(2)}`} className="w-full text-center bg-zinc-100 border border-zinc-200 rounded px-1 py-1 text-[10px] font-bold text-zinc-600 outline-none shadow-sm cursor-default" />
                  </div>
                  <div className="p-1.5 flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-blue-800 text-center">Due Date</label>
                    <input type="text" readOnly placeholder="Auto Calculated" value={calculateDueDate(header.pay1Pct, header.pay1Activity || '', header.pay1Days, header.poDate || '', header.exFactory || '', header.onboardDate || '', header.portName || '')} className="w-full text-center bg-zinc-100 border border-zinc-200 rounded px-1 py-1 text-[10px] font-bold text-zinc-600 outline-none shadow-sm cursor-default" />
                  </div>
                </div>
              </div>

              {/* Payment Term 2 */}
              <div className="w-full border border-blue-200 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-blue-100 text-blue-900 text-center font-bold py-1.5 text-[11px] tracking-wide">Payment Term 2</div>
                <div className="grid grid-cols-5 bg-blue-50/30 divide-x divide-blue-200">
                  <div className="p-1.5 flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-blue-800 text-center">%</label>
                    <select value={header.pay2Pct || '-'} onChange={(e) => updateHeader('pay2Pct', e.target.value)} className="w-full text-center bg-yellow-50 border border-yellow-200 rounded px-1 py-1 text-[10px] font-bold text-zinc-900 outline-none focus:border-yellow-500 shadow-sm cursor-pointer appearance-none">
                      {percentOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="p-1.5 flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-blue-800 text-center">Days</label>
                    <select value={header.pay2Days || '-'} onChange={(e) => updateHeader('pay2Days', e.target.value)} className="w-full text-center bg-yellow-50 border border-yellow-200 rounded px-1 py-1 text-[10px] font-bold text-zinc-900 outline-none focus:border-yellow-500 shadow-sm cursor-pointer appearance-none">
                      {daysOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="p-1.5 flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-blue-800 text-center">Activity</label>
                    <select value={header.pay2Activity || '-'} onChange={(e) => updateHeader('pay2Activity', e.target.value)} className="w-full text-center bg-yellow-50 border border-yellow-200 rounded px-1 py-1 text-[10px] font-bold text-zinc-900 outline-none focus:border-yellow-500 shadow-sm cursor-pointer appearance-none" style={{textOverflow: 'ellipsis'}}>
                      {activityOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="p-1.5 flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-blue-800 text-center">Amount</label>
                    <input type="text" readOnly value={`$${((header.totalAmount || 0) * (header.pay2Pct === '-' ? 0 : parseFloat(String(header.pay2Pct || '0'))) / 100).toFixed(2)}`} className="w-full text-center bg-zinc-100 border border-zinc-200 rounded px-1 py-1 text-[10px] font-bold text-zinc-600 outline-none shadow-sm cursor-default" />
                  </div>
                  <div className="p-1.5 flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-blue-800 text-center">Due Date</label>
                    <input type="text" readOnly placeholder="Auto Calculated" value={calculateDueDate(header.pay2Pct, header.pay2Activity || '', header.pay2Days, header.poDate || '', header.exFactory || '', header.onboardDate || '', header.portName || '')} className="w-full text-center bg-zinc-100 border border-zinc-200 rounded px-1 py-1 text-[10px] font-bold text-zinc-600 outline-none shadow-sm cursor-default" />
                  </div>
                </div>
              </div>

              {/* Total Block */}
              <div className="flex justify-end pt-2">
                <div className="flex border border-zinc-300 rounded overflow-hidden shadow-sm">
                  <div className="bg-zinc-600 text-white font-bold text-[10px] px-3 py-1.5 text-center uppercase tracking-wide flex items-center">Total</div>
                  <div className="bg-white text-zinc-900 font-black text-[11px] px-3 py-1.5 text-center border-l border-zinc-300 min-w-[80px]">
                    ${(header.totalAmount || 0).toFixed(2)}
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
          
          <div className="p-4 space-y-4 bg-zinc-50/50">
            {skus.map((sku, index) => {
              const handleSizesChange = (selected: string[]) => {
                setSkus(skus.map(s => s.id === sku.id ? { ...s, sizes: selected, size1: selected[0] || '', size2: selected[1] || '' } : s));
              };
              return (
                <div key={sku.id} className="relative bg-white border border-zinc-200 rounded-xl p-5 shadow-sm transition-all hover:shadow-md hover:border-emerald-200 group">
                  
                  {/* Header: S.No & Delete */}
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                        {index + 1}
                      </div>
                      <h3 className="text-sm font-extrabold text-zinc-700">Line Item Details</h3>
                    </div>
                    <button onClick={() => removeSku(sku.id!)} className="text-zinc-400 hover:text-rose-600 bg-zinc-50 hover:bg-rose-50 rounded-md p-1.5 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Main Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-6 gap-y-4">
                    
                    {/* Left Col: Picture */}
                    <div className="lg:col-span-1 flex justify-center lg:justify-start">
                      <div className="space-y-1 w-full max-w-[80px]">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block text-center lg:text-left">Picture</span>
                        <DragDropImage value={sku.designImage || ''} onChange={(val) => updateSku(sku.id!, 'designImage', val)} />
                      </div>
                    </div>

                    {/* Middle Col 1: Product Info */}
                    <div className="lg:col-span-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="SKU Code">
                          <GridInput value={sku.skuCode} onChange={(e) => updateSku(sku.id!, 'skuCode', e.target.value)} placeholder="SKU" bold />
                        </Field>
                        <Field label="Product Name">
                          <GridInput value={sku.product} onChange={(e) => updateSku(sku.id!, 'product', e.target.value)} placeholder="Name" />
                        </Field>
                      </div>
                      <Field label="Description">
                        <textarea 
                          value={sku.description || ''} onChange={(e) => updateSku(sku.id!, 'description', e.target.value)} placeholder="Detailed description..."
                          className="block w-full h-[34px] leading-[22px] bg-yellow-50 border border-yellow-200 focus:bg-white focus:border-yellow-400 rounded-md px-3 text-[12px] font-bold text-zinc-800 resize-none outline-none transition-all shadow-sm"
                        />
                      </Field>
                    </div>

                    {/* Middle Col 2: Design Info */}
                    <div className="lg:col-span-3 space-y-3">
                      <Field label="Shape & Designer">
                        <div className="grid grid-cols-2 gap-2">
                          <GridSelect value={sku.shape} onChange={(e: any) => updateSku(sku.id!, 'shape', e.target.value)} options={dropdowns?.shapes} placeholder="Shape" />
                          <GridSelect value={sku.designer} onChange={(e: any) => updateSku(sku.id!, 'designer', e.target.value)} options={dropdowns?.designers} placeholder="Designer" />
                        </div>
                      </Field>
                      <Field label="Brand & Quality">
                         <div className="grid grid-cols-2 gap-2">
                          <GridSelect value={sku.brand} onChange={(e: any) => updateSku(sku.id!, 'brand', e.target.value)} options={dropdowns?.brands} placeholder="Brand" />
                          <GridSelect value={sku.quality} onChange={(e: any) => updateSku(sku.id!, 'quality', e.target.value)} options={dropdowns?.qualities} placeholder="Quality" />
                         </div>
                      </Field>
                    </div>

                    {/* Middle Col 3: Specs & Pricing */}
                    <div className="lg:col-span-5 space-y-3">
                       <div className="grid grid-cols-3 gap-2">
                         <Field label="Sizes">
                           <MultiSelectDropdown options={dropdowns?.sizes || []} selected={sku.sizes || []} onChange={handleSizesChange} maxSelect={2} />
                         </Field>
                         <Field label="Color">
                           <GridSelect value={sku.color} onChange={(e: any) => updateSku(sku.id!, 'color', e.target.value)} options={dropdowns?.colors} placeholder="Color" />
                         </Field>
                         <Field label="Order Qty & Unit">
                           <div className="flex bg-yellow-50 border border-yellow-200 rounded-md focus-within:border-yellow-400 focus-within:bg-white overflow-hidden shadow-sm">
                             <input type="number" value={sku.orderQty || ''} onChange={(e) => updateSku(sku.id!, 'orderQty', e.target.value)} placeholder="Qty" className="w-full bg-transparent px-2 text-[11px] font-bold text-zinc-800 text-center outline-none border-r border-yellow-200" />
                             <select value={sku.unitQty || ''} onChange={(e: any) => updateSku(sku.id!, 'unitQty', e.target.value)} className="w-[60px] bg-transparent px-1 text-[10px] font-bold text-zinc-800 text-center outline-none appearance-none cursor-pointer">
                               {dropdowns?.unitsQty?.map(o => <option key={o} value={o}>{o}</option>)}
                             </select>
                           </div>
                         </Field>
                       </div>
                       
                       <div className="grid grid-cols-4 gap-2">
                         <Field label="Price">
                           <GridInput type="number" value={sku.price} onChange={(e) => updateSku(sku.id!, 'price', e.target.value)} placeholder="0.00" />
                         </Field>
                         <Field label="Unit Price">
                           <GridSelect value={sku.unitPrice} onChange={(e: any) => updateSku(sku.id!, 'unitPrice', e.target.value)} options={dropdowns?.unitsPrice} placeholder="Unit" />
                         </Field>
                         <Field label="Currency">
                           <GridSelect value={sku.currency} onChange={(e: any) => updateSku(sku.id!, 'currency', e.target.value)} options={['USD', 'INR', 'EUR', 'CAD', 'AUD', 'CNY']} />
                         </Field>
                         <Field label="Inner / Outer Pack">
                           <div className="grid grid-cols-2 gap-1">
                             <GridSelect value={sku.innerPack} onChange={(e: any) => updateSku(sku.id!, 'innerPack', e.target.value)} options={dropdowns?.packs} placeholder="In" />
                             <GridSelect value={sku.outerPack} onChange={(e: any) => updateSku(sku.id!, 'outerPack', e.target.value)} options={dropdowns?.packs} placeholder="Out" />
                           </div>
                         </Field>
                       </div>
                    </div>
                  </div>

                  {/* Bottom Strip: Addl Prod & Totals */}
                  <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap lg:flex-nowrap items-center justify-between gap-4 bg-zinc-50/50 -mx-5 -mb-5 px-5 py-4 rounded-b-xl">
                    <div className="flex flex-wrap sm:flex-nowrap gap-4">
                      <div className="w-[140px]">
                        <Field label="PP/TOP Samples">
                          <GridSelect value={sku.addSample} onChange={(e: any) => updateSku(sku.id!, 'addSample', e.target.value)} options={dropdowns?.ppTopSamples} placeholder="Select" />
                        </Field>
                      </div>
                      <div className="w-[100px]">
                        <Field label="Addl Prod Pcs">
                          <GridSelect value={sku.addProd} onChange={(e: any) => updateSku(sku.id!, 'addProd', e.target.value)} options={['0%', '1%', '2%', '3%', '4%', '5%', '6%', '7%', '8%', '9%', '10%']} placeholder="%" />
                        </Field>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 bg-white border border-rose-100 px-6 py-2 rounded-lg shadow-sm">
                       <div className="text-right">
                         <span className="block text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-0.5">Total Qty Mfg</span>
                         <span className="text-lg font-black text-rose-700">{sku.totalQtyMfg || 0}</span>
                       </div>
                       <div className="w-px h-8 bg-rose-100"></div>
                       <div className="text-right">
                         <span className="block text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-0.5">Line Total</span>
                         <span className="text-xl font-black text-rose-700">${(sku.lineTotal || 0).toFixed(2)}</span>
                       </div>
                    </div>
                  </div>

                </div>
              );
            })}
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
        className="w-full text-center bg-yellow-50 border border-yellow-200 rounded-lg outline-none focus:bg-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 px-3.5 py-2 text-[13px] font-bold text-zinc-900 transition-all shadow-sm"
      />
    </div>
  );
}

interface ModernSelectProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
}

function ModernSelect({ label, value, onChange, options }: ModernSelectProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full items-center relative">
      <label className="text-[12px] font-bold text-zinc-600 tracking-wide capitalize text-center">{label}</label>
      <select 
        value={value || ''} 
        onChange={onChange} 
        className="w-full text-center bg-yellow-50 border border-yellow-200 rounded-lg outline-none focus:bg-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 px-3.5 py-2 text-[13px] font-bold text-zinc-900 transition-all shadow-sm appearance-none cursor-pointer"
      >
        <option value="" disabled>Select {label}</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <div className="absolute right-3 top-[30px] pointer-events-none text-zinc-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
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
        className="w-full text-center bg-yellow-50 border border-yellow-200 rounded-lg outline-none focus:bg-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 px-3.5 py-2 text-[13px] font-bold text-zinc-900 resize-none transition-all shadow-sm"
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

function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">{label}</span>
      {children}
    </div>
  );
}

function GridInput({ value, onChange, placeholder, type = "text", bold }: GridInputProps) {
  return (
    <input 
      type={type}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      className={`block w-full text-center bg-yellow-50 border border-yellow-200 hover:border-yellow-300 focus:bg-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/30 rounded-md px-2 py-1.5 text-[11px] ${bold ? 'font-extrabold text-zinc-900' : 'font-bold text-zinc-800'} outline-none transition-all shadow-sm`}
    />
  );
}

function GridSelect({ value, onChange, options = [], placeholder }: { value: any, onChange: any, options?: string[], placeholder?: string }) {
  return (
    <div className="relative">
      <select value={value || ''} onChange={onChange} className="w-full h-[34px] text-center bg-yellow-50 border border-yellow-200 hover:border-yellow-300 focus:bg-white focus:border-yellow-400 rounded-md px-2 text-[11px] font-bold text-zinc-800 outline-none transition-all shadow-sm appearance-none cursor-pointer">
        {placeholder && <option value="" disabled hidden>{placeholder}</option>}
        {!placeholder && <option value="">-</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <div className="absolute right-1 top-2.5 pointer-events-none text-zinc-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
    </div>
  );
}
