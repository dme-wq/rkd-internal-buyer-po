"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Save, FileText, CheckCircle, CreditCard, Package, Clock, Copy } from 'lucide-react';
import { POHeader, SKUItem, DropdownData, PendingPO, PurchaseOrder } from '../lib/types';
import { createPO, updatePO, savePDFtoDrive, getPendingInternalPOs, getDropdowns, addDropdownOption, extractPOData, sendWhatsAppNotification } from '../lib/api';
import { generatePOPDF } from '../lib/pdf';
import Select from 'react-select';
import { DragDropImage } from './DragDropImage';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const formatDisplayDate = (dateString?: string) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString; 
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const MySwal = withReactContent(Swal);

export default function POForm({ initialDropdowns, initialData }: { initialDropdowns?: Partial<DropdownData>, initialData?: PurchaseOrder }) {
  const { data: session } = useSession();
  const router = useRouter();
  const userEmail = session?.user?.email || undefined;

  const [header, setHeader] = useState<Partial<POHeader>>(() => {
    if (initialData?.header) return initialData.header;
    return {
      internalPO: '', fileNumber: '', buyerName: '', buyerPO: '', poDate: '', exFactory: '',
      deliveryTerms: '', portName: '', payTerm1: '', payTerm2: '', buyerSource: '',
      buyerSubSrc: '', buyerSrcPct: 100, buyerSubPct: 0, billingAddr: '', deliveryAddr: '',
      pay1Pct: '-', pay1Days: '-', pay1Activity: '-',
      pay1Amount: 0, pay1DueDate: '', pay2Pct: '-', pay2Days: '-', pay2Activity: '-',
      pay2Amount: 0, pay2DueDate: '', currency: 'USD'
    };
  });

  const [skus, setSkus] = useState<Partial<SKUItem>[]>(() => {
    if (initialData?.skus && initialData.skus.length > 0) return initialData.skus.map((s: Partial<SKUItem>) => ({ ...s, id: s.id || Date.now().toString() + Math.random().toString(36).substr(2, 5) }));
    return [{
      id: Date.now().toString(), product: '', shape: '', designer: '', brand: '',
      description: '', sizes: [], size1: '', size2: '', quality: '', color: '', colorRef: '',
      orderQty: 0, unitQty: 'pieces', price: 0, unitPrice: 'piece',
      innerPack: '', outerPack: '', addSample: '', addProd: '', skuCode: '', designImage: '',
      totalQtyMfg: 0, lineTotal: 0
    }];
  });

  const [time, setTime] = useState<string>('');

  const handleAddNewDropdown = async (field: keyof DropdownData) => {
    const { value: newValue } = await MySwal.fire({
      title: 'Add New Option',
      input: 'text',
      inputLabel: `Enter new value`,
      inputPlaceholder: 'Type here...',
      showCancelButton: true,
      confirmButtonText: 'Add',
      confirmButtonColor: '#00a669',
      inputValidator: (value) => {
        if (!value) return 'You need to write something!'
      }
    });

    if (newValue) {
      MySwal.fire({
        title: 'Saving...',
        allowOutsideClick: false,
        didOpen: () => {
          MySwal.showLoading();
        }
      });
      
      const res = await addDropdownOption(field as string, newValue);
      
      if (res.status === 'success') {
        setDropdowns(prev => ({
          ...prev,
          [field]: [...(prev[field] as string[] || []), newValue]
        }));
        MySwal.fire({
          icon: 'success',
          title: 'Added!',
          text: `${newValue} has been added.`,
          timer: 1500,
          showConfirmButton: false
        });
        return newValue;
      } else {
        MySwal.fire({
          icon: 'error',
          title: 'Oops...',
          text: res.message || 'Something went wrong!',
        });
        return null;
      }
    }
    return null;
  };

  const handleInternalPOChange = async (e: React.ChangeEvent<HTMLSelectElement> | { target: { value: string } }) => {
    const selectedPO = e.target.value;
    const poData = pendingPOs.find(p => p.internalPO === selectedPO);

    if (poData) {
      setHeader(prev => ({
        ...prev,
        internalPO: selectedPO,
        buyerName: poData.buyerName || prev.buyerName,
        buyerPO: poData.buyerPO || prev.buyerPO,
        fileNumber: poData.fileNumber || prev.fileNumber,
        poDate: poData.poDate || prev.poDate,
        exFactory: poData.exFactory || prev.exFactory,
        deliveryAddr: poData.deliveryAddr || prev.deliveryAddr,
        billingAddr: poData.billingAddr || prev.billingAddr,
        onboardDate: poData.onboardDate || prev.onboardDate
      }));
    } else {
      updateHeader('internalPO', selectedPO);
    }

    if (selectedPO) {
      const result = await MySwal.fire({
        html: `
          <div style="font-family: var(--font-base)">
            <div style="font-size:48px; margin-bottom:16px; animation: bounce 2s infinite;">🧠✨</div>
            <h2 style="font-size:20px; font-weight:800; color:#4c1d95; margin-bottom:12px; letter-spacing:-0.5px;">Auto-Extract with RKD Engine?</h2>
            <p style="font-size:14px; color:#4b5563; line-height:1.6; margin-bottom:16px;">
              Let the powerful <b>RKD Engine</b> automatically read the document and fill the PO details for you.
            </p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: '🚀 Yes, Extract Data',
        confirmButtonColor: '#8b5cf6',
        cancelButtonText: 'Manual Entry',
        cancelButtonColor: '#f3f4f6',
        customClass: {
          popup: 'rounded-3xl border-t-4 border-purple-500 shadow-2xl overflow-hidden',
          cancelButton: '!text-zinc-700 hover:!bg-zinc-200 transition-colors font-bold',
          confirmButton: 'hover:bg-purple-600 transition-colors font-bold shadow-md shadow-purple-500/20'
        }
      });

      if (result.isConfirmed) {
        MySwal.fire({
          html: `
            <div style="font-family: var(--font-base)">
              <div style="font-size:42px; margin-bottom:16px; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;">⚙️🔍</div>
              <h2 style="font-size:18px; font-weight:800; color:#4c1d95; margin-bottom:8px;">RKD Engine is working...</h2>
              <p style="font-size:13px; color:#6b7280;">
                Analyzing the document and extracting data.<br/>
                <span style="font-size:11px; color:#9ca3af; margin-top:8px; display:inline-block; font-weight:600;">THIS MAY TAKE 15-20 SECONDS</span>
              </p>
            </div>
          `,
          allowOutsideClick: false,
          showConfirmButton: false,
          customClass: {
            popup: 'rounded-3xl border-t-4 border-purple-500 shadow-2xl'
          },
          didOpen: () => {
            MySwal.showLoading();
          }
        });

        try {
          const res = await extractPOData(selectedPO, dropdowns);
          if (res.status === 'success' && res.data) {
            const data = res.data;
            
            setHeader(prev => ({
              ...prev,
              deliveryTerms: data.deliveryTerms || prev.deliveryTerms,
              portName: data.portName || prev.portName
            }));

            if (data.items && data.items.length > 0) {
              const newSkus = data.items.map((item: any, index: number) => ({
                id: Date.now().toString() + index,
                product: item.product || '',
                shape: item.shape || '',
                designer: item.designer || '',
                brand: item.brand || '',
                description: item.description || '',
                sizes: Array.isArray(item.sizes) ? item.sizes.slice(0, 2) : [],
                quality: item.quality || '',
                color: item.color || '',
                orderQty: item.orderQty || 0,
                unitQty: item.unitQty || 'pieces',
                price: item.price || 0,
                unitPrice: item.unitPrice || 'piece',
                currency: item.currency || 'USD',
                innerPack: item.innerPack || '',
                outerPack: item.outerPack || '',
                addSample: item.addSample || '',
                addProd: item.addProd || '',
                skuCode: '',
                designImage: '',
                totalQtyMfg: item.orderQty || 0,
                lineTotal: (item.orderQty || 0) * (item.price || 0)
              }));
              setSkus(newSkus);
            }

            MySwal.fire({
              icon: 'success',
              title: 'Extraction Complete!',
              text: `Successfully extracted ${data.items ? data.items.length : 0} line items.`,
              timer: 2000,
              showConfirmButton: false
            });
          } else {
            throw new Error(res.message || "Failed to extract data");
          }
        } catch (error: any) {
          MySwal.fire({
            icon: 'error',
            title: 'Extraction Failed',
            text: error.message || 'Something went wrong during extraction.',
          });
        }
      }
    }
  };

  const [dropdowns, setDropdowns] = useState<Partial<DropdownData>>(initialDropdowns || {});

  useEffect(() => {
    if (initialDropdowns && Object.keys(initialDropdowns).length > 0) {
      setDropdowns(initialDropdowns);
    }
  }, [initialDropdowns]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const messageDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss message banner after 5 seconds
  const showMessage = (msg: string) => {
    setMessage(msg);
    if (messageDismissRef.current) clearTimeout(messageDismissRef.current);
    if (!msg.includes('Error') && !msg.includes('Exception')) {
      messageDismissRef.current = setTimeout(() => setMessage(''), 5000);
    }
  };
  const [pendingPOs, setPendingPOs] = useState<PendingPO[]>([]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollSpeedRef = useRef<number>(0);
  const scrollAnimationFrameRef = useRef<number | null>(null);
  const isHoveringRef = useRef<boolean>(false);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!isHoveringRef.current || !scrollContainerRef.current) return;
      
      const target = e.target as HTMLElement;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (isInput) return; // Allow normal cursor movement in inputs

      const scrollAmount = 60; // Pixels to scroll per key press
      if (e.key === 'ArrowRight') {
        scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        scrollContainerRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const performScroll = useCallback(() => {
    if (scrollContainerRef.current && scrollSpeedRef.current !== 0) {
      scrollContainerRef.current.scrollLeft += scrollSpeedRef.current;
      scrollAnimationFrameRef.current = requestAnimationFrame(performScroll);
    } else {
      scrollAnimationFrameRef.current = null;
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const { left, right } = container.getBoundingClientRect();
    const edgeThreshold = 150; // pixels from edge to trigger scroll
    const maxSpeed = 25; // max scroll speed

    const mouseX = e.clientX;
    const distLeft = mouseX - left;
    const distRight = right - mouseX;

    let speed = 0;

    if (distLeft > 0 && distLeft < edgeThreshold) {
      const intensity = Math.max(0, 1 - (distLeft / edgeThreshold));
      speed = -maxSpeed * (intensity * intensity);
    } else if (distRight > 0 && distRight < edgeThreshold) {
      const intensity = Math.max(0, 1 - (distRight / edgeThreshold));
      speed = maxSpeed * (intensity * intensity);
    }

    scrollSpeedRef.current = speed;

    if (speed !== 0 && !scrollAnimationFrameRef.current) {
      scrollAnimationFrameRef.current = requestAnimationFrame(performScroll);
    } else if (speed === 0 && scrollAnimationFrameRef.current) {
      cancelAnimationFrame(scrollAnimationFrameRef.current);
      scrollAnimationFrameRef.current = null;
    }
  }, [performScroll]);

  const handleMouseLeave = useCallback(() => {
    isHoveringRef.current = false;
    scrollSpeedRef.current = 0;
    if (scrollAnimationFrameRef.current) {
      cancelAnimationFrame(scrollAnimationFrameRef.current);
      scrollAnimationFrameRef.current = null;
    }
  }, []);

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
    
    // Fetch pending Internal POs (Stale-while-revalidate pattern for instant load)
    const cachedPending = localStorage.getItem('pendingPOs_cache');
    if (cachedPending) {
      try { setPendingPOs(JSON.parse(cachedPending)); } catch(e) {}
    }
    
    getPendingInternalPOs().then(res => {
      if (res.status === 'success' && res.data) {
        setPendingPOs(res.data);
        localStorage.setItem('pendingPOs_cache', JSON.stringify(res.data));
      }
    });
    
    return () => clearInterval(interval);
  }, []);

  // Use a ref to access current skus without making skus a dependency
  // (avoids an infinite loop: setSkus -> skus changes -> effect fires -> setSkus ...)
  const skusRef = useRef(skus);
  skusRef.current = skus;

  useEffect(() => {
    const currentSkus = skusRef.current;
    let needsUpdate = false;
    const newSkus = currentSkus.map((s, idx) => {
      const expectedSkuCode = header.internalPO ? `${header.internalPO}-${idx + 1}` : '';
      if (s.skuCode !== expectedSkuCode) {
        needsUpdate = true;
        return { ...s, skuCode: expectedSkuCode };
      }
      return s;
    });

    if (needsUpdate) {
      setSkus(newSkus);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [header.internalPO]);

  const addSku = () => {
    setSkus([...skus, { 
      id: Date.now().toString(), product: '', shape: '', designer: '', brand: '',
      description: '', sizes: [], size1: '', size2: '', quality: '', color: '', colorRef: '',
      orderQty: 0, unitQty: 'pieces', price: 0, unitPrice: 'piece',
      innerPack: '', outerPack: '', addSample: '', addProd: '', skuCode: '', designImage: '',
      totalQtyMfg: 0, lineTotal: 0
    }]);
  };

  const duplicateSku = (index: number) => {
    const skuToCopy = skus[index];
    const newSku = { ...skuToCopy, id: Date.now().toString() + Math.random().toString(36).substr(2, 5) };
    const newSkus = [...skus];
    newSkus.splice(index + 1, 0, newSku);
    setSkus(newSkus);
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

    try {
      if (!baseDateStr) return '';
      const d = new Date(baseDateStr);
      if (isNaN(d.getTime())) return '';
      d.setDate(d.getDate() + offsetDays);
      return formatDisplayDate(d.toISOString().split('T')[0]);
    } catch (e) {
      return '';
    }
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

  // Pure function — no setState side effects so handleSave always gets fresh computed values
  const calculateTotals = () => {
    let grandTotal = 0;
    const computedSkus = skus.map((sku, idx) => {
      const orderQty = Number(sku.orderQty) || 0;
      const price = Number(sku.price) || 0;
      const addProdStr = sku.addProd || '0%';
      const addProdPct = parseFloat(addProdStr.replace('%', '')) || 0;
      const addSample = Number(sku.addSample) || 0;
      
      const totalQtyMfg = Math.ceil(orderQty + (orderQty * (addProdPct / 100)) + addSample);
      const lineTotal = orderQty * price;
      
      grandTotal += lineTotal;
      
      const generatedSkuCode = header.internalPO ? `${header.internalPO}-${idx + 1}` : '';
      
      return { ...sku, lineTotal, totalQtyMfg, skuCode: generatedSkuCode };
    });
    const p1Pct = header.pay1Pct === '-' ? 0 : parseFloat(String(header.pay1Pct || '0'));
    const p2Pct = header.pay2Pct === '-' ? 0 : parseFloat(String(header.pay2Pct || '0'));

    const updatedHeader = {
      ...header,
      totalAmount: grandTotal,
      pay1Amount: grandTotal * p1Pct / 100,
      pay2Amount: grandTotal * p2Pct / 100,
      pay1DueDate: calculateDueDate(header.pay1Pct, header.pay1Activity || '', header.pay1Days, header.poDate || '', header.exFactory || '', header.onboardDate || '', header.portName || ''),
      pay2DueDate: calculateDueDate(header.pay2Pct, header.pay2Activity || '', header.pay2Days, header.poDate || '', header.exFactory || '', header.onboardDate || '', header.portName || '')
    };

    // Also update the displayed header state for the UI
    setHeader(updatedHeader);

    return { computedSkus, updatedHeader };
  };

  const handleSave = async () => {
    const missingFields: string[] = [];

    // Check General Information
    const requiredHeaderMap: Record<string, string> = {
      internalPO: 'Internal PO Number',
      buyerName: 'Buyer Name',
      buyerPO: 'Buyer PO',
      fileNumber: 'File Number',
      poDate: 'PO Date',
      exFactory: 'Ex-Factory Date',
      onboardDate: 'Onboard Vessel Date',
      deliveryTerms: 'Delivery Terms',
      portName: 'Port Name',
      billingAddr: 'Billing Address',
      deliveryAddr: 'Delivery Address'
    };

    for (const [key, label] of Object.entries(requiredHeaderMap)) {
      if (!header[key as keyof POHeader] || header[key as keyof POHeader] === '-') {
        missingFields.push(`<b>General Info:</b> ${label}`);
      }
    }

    const p1 = header.pay1Pct === '-' ? 0 : parseFloat(String(header.pay1Pct || '0'));
    const p2 = header.pay2Pct === '-' ? 0 : parseFloat(String(header.pay2Pct || '0'));

    if (Math.round(p1 + p2) !== 100) {
      missingFields.push(`<b>Payment Terms:</b> Total % must equal 100% (currently ${p1 + p2}%)`);
    } else {
      if (p1 > 0 && (!header.pay1Days || header.pay1Days === '-' || !header.pay1Activity || header.pay1Activity === '-')) {
         missingFields.push(`<b>Payment Term 1:</b> Days and Activity`);
      }
      if (p2 > 0 && (!header.pay2Days || header.pay2Days === '-' || !header.pay2Activity || header.pay2Activity === '-')) {
         missingFields.push(`<b>Payment Term 2:</b> Days and Activity`);
      }
    }

    if (skus.length === 0) {
      missingFields.push(`<b>Items:</b> At least one Line Item is required`);
    } else {
      for (let i = 0; i < skus.length; i++) {
        const s = skus[i];
        const missingLineFields: string[] = [];
        if (!s.product) missingLineFields.push('Product Name');
        if (!s.shape) missingLineFields.push('Shape');
        if (!s.designer) missingLineFields.push('Designer Name');
        if (!s.brand) missingLineFields.push('Brand Name');
        if (!s.quality) missingLineFields.push('Quality');
        if (!s.color) missingLineFields.push('Color');
        if (!s.sizes || s.sizes.length === 0) missingLineFields.push('Sizes');
        if (!(Number(s.orderQty) > 0)) missingLineFields.push('Buyer PO Qty');
        if (!s.unitQty) missingLineFields.push('Unit of Qty');
        if (!(Number(s.price) > 0)) missingLineFields.push('Price');
        if (!s.unitPrice) missingLineFields.push('Unit of Price');
        if (!s.innerPack) missingLineFields.push('Inner Pack');
        if (!s.outerPack) missingLineFields.push('Outer Pack');
        if (!s.addSample) missingLineFields.push('PP/TOP Samples');
        if (!s.addProd) missingLineFields.push('Addl Prod Pcs');

        if (missingLineFields.length > 0) {
          missingFields.push(`<b>Item #${i + 1}:</b> ${missingLineFields.join(', ')}`);
        }
      }
    }

    if (missingFields.length > 0) {
      MySwal.fire({
        icon: 'warning',
        title: 'Missing Required Fields',
        html: `<div style="text-align: left; font-size: 14px; max-height: 300px; overflow-y: auto;">
                 <p style="margin-bottom: 10px;">Please complete the following fields before saving:</p>
                 <ul style="list-style-type: disc; padding-left: 20px; line-height: 1.6; color: #dc2626;">
                   ${missingFields.map(f => `<li>${f}</li>`).join('')}
                 </ul>
               </div>`,
        confirmButtonColor: '#00a669',
        confirmButtonText: 'I will fix it'
      });
      return;
    }

    setLoading(true);
    if (messageDismissRef.current) clearTimeout(messageDismissRef.current);
    setMessage('');

    // Show simple loading dialog for database save
    MySwal.fire({
      title: 'Saving Database...',
      text: 'Please wait while we save the purchase order.',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => MySwal.showLoading(),
    });

    try {
      // calculateTotals is now pure — returns both computedSkus AND the fully-computed header
      // so the API always receives fresh totalAmount / pay amounts (no stale setState race)
      const { computedSkus: finalSkus, updatedHeader: finalHeader } = calculateTotals();
      
      let res;
      if (initialData?.header?.uid) {
        res = await updatePO(initialData.header.uid, finalHeader as Omit<POHeader, 'uid' | 'internalPO'>, finalSkus as SKUItem[], userEmail);
      } else {
        res = await createPO(finalHeader as Omit<POHeader, 'uid' | 'internalPO'>, finalSkus as SKUItem[], userEmail);
      }
      
      if (res.status === 'success' && res.data) {
        MySwal.close();
        MySwal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Saved! Processing PDF in background...', showConfirmButton: false, timer: 3000 });
        
        const internalPO = res.data.internalPO;
        const fullHeader = { ...header, internalPO: internalPO, uid: res.data.uid || initialData?.header?.uid } as POHeader;
        
        // Start background tasks without awaiting them
        (async () => {
          try {
            const pdfData = await generatePOPDF({ header: fullHeader, skus: finalSkus as SKUItem[], userEmail });
            const pdfRes = await savePDFtoDrive(fullHeader.uid!, pdfData.filename, pdfData.base64);
            
            let pdfUrl = '';
            if (pdfRes.status === 'success' && pdfRes.data?.fileUrl) {
              pdfUrl = pdfRes.data.fileUrl;
            }
            
            try {
              await sendWhatsAppNotification(internalPO, pdfUrl, fullHeader.buyerName || '', fullHeader.buyerPO || '');
            } catch (waErr) {
              console.warn('WhatsApp exception:', waErr);
            }
          } catch (e) {
            console.error("Background PDF/WhatsApp failed", e);
          }
        })();

        // Instantly redirect the user
        router.push('/declarations');

      } else {
        MySwal.close();
        showMessage('❌ Error: ' + res.message);
        MySwal.fire('Error', res.message, 'error');
      }
    } catch (err: unknown) {
      MySwal.close();
      const msg = (err as Error).message;
      showMessage('❌ Exception: ' + msg);
      MySwal.fire('Error', msg, 'error');
    }
    setLoading(false);
  };

  const CURRENCIES: Record<string, string> = { USD: '$', EUR: '€', INR: '₹', CAD: 'CA$', AUD: 'A$', CNY: '¥' };
  const currencySymbol = CURRENCIES[header.currency || 'USD'] || (header.currency || 'USD');

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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 shadow-sm shadow-emerald-500/10 hover:bg-emerald-100 transition-colors">
            <Clock size={16} className="text-emerald-500" />
            <span className="text-sm font-bold tracking-wide tabular-nums">{time || 'Loading...'}</span>
          </div>
          {/* Currency Selector — top-right, always visible */}
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white border border-zinc-200 rounded-xl shadow-sm hover:border-emerald-400 transition-all">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Currency</span>
            <select
              value={header.currency || 'USD'}
              onChange={e => updateHeader('currency', e.target.value)}
              className="bg-transparent text-sm font-black text-emerald-700 outline-none cursor-pointer pr-1 appearance-none"
            >
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
              <option value="INR">₹ INR</option>
              <option value="CAD">CA$ CAD</option>
              <option value="AUD">A$ AUD</option>
              <option value="CNY">¥ CNY</option>
            </select>
          </div>
          <button onClick={handleSave} disabled={loading} className="px-6 py-2.5 bg-[#00a669] hover:bg-[#009059] text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none">
            <Save size={18} /> {loading ? 'Saving...' : (initialData?.header?.uid ? 'Update PO' : 'Save & Generate')}
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
          <div className="xl:col-span-3 bg-white border-t-4 border-blue-500 border-x border-b border-zinc-200 rounded-2xl shadow-md shadow-blue-500/5 overflow-hidden flex flex-col transition-all hover:shadow-lg hover:shadow-blue-500/10">
            <div className="px-4 py-3 border-b border-zinc-100 bg-blue-50/50 flex items-center gap-2">
              <FileText size={14} className="text-blue-600" />
              <h2 className="text-[14px] font-extrabold text-blue-900 tracking-wide">General Information</h2>
            </div>
            
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5 transition-all duration-300">
              <div className="flex gap-2 items-end">
                <ModernSelect label="Internal PO Number" value={header.internalPO || ''} onChange={handleInternalPOChange as any} options={pendingPOs.map(p => p.internalPO)} required={true} />
                {header.internalPO && (
                  <button onClick={() => handleInternalPOChange({ target: { value: header.internalPO || '' } })} className="mb-1 p-2 bg-purple-100 text-purple-600 hover:bg-purple-200 rounded-lg shrink-0" title="Extract AI Data Again">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg>
                  </button>
                )}
              </div>
              <ModernInput label="Buyer Name" value={header.buyerName} readOnly={true} required={true} />
              <ModernInput label="Buyer PO Number" value={header.buyerPO} readOnly={true} required={true} />
              <ModernInput label="File Number" value={header.fileNumber} readOnly={true} required={true} />
              
              <ModernInput label="PO Date" type="text" value={formatDisplayDate(header.poDate)} readOnly={true} required={true} />
              <ModernInput label="Ex-Factory" type="text" value={formatDisplayDate(header.exFactory)} readOnly={true} required={true} />
              <ModernInput label="Onboard Vessel Date" type="text" value={formatDisplayDate(header.onboardDate)} readOnly={true} required={true} />
              <ModernSelect label="Delivery Terms" value={header.deliveryTerms || ''} onChange={(e) => updateHeader('deliveryTerms', e.target.value)} options={dropdowns?.deliveryTerms || []} onAddNew={() => handleAddNewDropdown('deliveryTerms')} required={true} />
              <ModernSelect label="Port of Discharge" value={header.portName || ''} onChange={(e) => updateHeader('portName', e.target.value)} options={dropdowns?.portNames || []} onAddNew={() => handleAddNewDropdown('portNames')} required={true} />

              <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                <ModernTextArea label="Billing Address" value={header.billingAddr} readOnly={true} required={true} />
                <ModernTextArea label="Delivery Address" value={header.deliveryAddr} readOnly={true} required={true} />
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
                    <label className="text-[9px] font-bold text-blue-800 text-center">%<span className="text-rose-500 ml-0.5">*</span></label>
                    <select value={header.pay1Pct || '-'} onChange={(e) => updateHeader('pay1Pct', e.target.value)} className="w-full text-center bg-yellow-50 border border-yellow-200 rounded px-1 py-1 text-[10px] font-bold text-zinc-900 outline-none focus:border-yellow-500 shadow-sm cursor-pointer appearance-none">
                      {percentOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="p-1.5 flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-blue-800 text-center">Days<span className="text-rose-500 ml-0.5">*</span></label>
                    <select value={header.pay1Days || '-'} onChange={(e) => updateHeader('pay1Days', e.target.value)} className="w-full text-center bg-yellow-50 border border-yellow-200 rounded px-1 py-1 text-[10px] font-bold text-zinc-900 outline-none focus:border-yellow-500 shadow-sm cursor-pointer appearance-none">
                      {daysOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="p-1.5 flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-blue-800 text-center">Activity<span className="text-rose-500 ml-0.5">*</span></label>
                    <select value={header.pay1Activity || '-'} onChange={(e) => updateHeader('pay1Activity', e.target.value)} className="w-full text-center bg-yellow-50 border border-yellow-200 rounded px-1 py-1 text-[10px] font-bold text-zinc-900 outline-none focus:border-yellow-500 shadow-sm cursor-pointer appearance-none" style={{textOverflow: 'ellipsis'}}>
                      {activityOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="p-1.5 flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-blue-800 text-center">Amount</label>
                    <input type="text" readOnly value={(() => { const gt = skus.reduce((s, k) => s + (Number(k.orderQty||0) * Number(k.price||0)), 0); const p = header.pay1Pct === '-' ? 0 : parseFloat(String(header.pay1Pct||'0')); return `${currencySymbol}${(gt * p / 100).toFixed(2)}`; })()} className="w-full text-center bg-emerald-50 border border-emerald-200 rounded px-1 py-1 text-[10px] font-bold text-emerald-700 outline-none shadow-sm cursor-default" />
                  </div>
                  <div className="p-1.5 flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-blue-800 text-center">Due Date</label>
                    <input type="text" readOnly placeholder="" value={calculateDueDate(header.pay1Pct, header.pay1Activity || '', header.pay1Days, header.poDate || '', header.exFactory || '', header.onboardDate || '', header.portName || '')} className="w-full text-center bg-zinc-100 border border-zinc-200 rounded px-1 py-1 text-[10px] font-bold text-zinc-600 outline-none shadow-sm cursor-default" />
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
                    <input type="text" readOnly value={(() => { const gt = skus.reduce((s, k) => s + (Number(k.orderQty||0) * Number(k.price||0)), 0); const p = header.pay2Pct === '-' ? 0 : parseFloat(String(header.pay2Pct||'0')); return `${currencySymbol}${(gt * p / 100).toFixed(2)}`; })()} className="w-full text-center bg-emerald-50 border border-emerald-200 rounded px-1 py-1 text-[10px] font-bold text-emerald-700 outline-none shadow-sm cursor-default" />
                  </div>
                  <div className="p-1.5 flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-blue-800 text-center">Due Date</label>
                    <input type="text" readOnly placeholder="" value={calculateDueDate(header.pay2Pct, header.pay2Activity || '', header.pay2Days, header.poDate || '', header.exFactory || '', header.onboardDate || '', header.portName || '')} className="w-full text-center bg-zinc-100 border border-zinc-200 rounded px-1 py-1 text-[10px] font-bold text-zinc-600 outline-none shadow-sm cursor-default" />
                  </div>
                </div>
              </div>

              {/* Total Block */}
              {(() => {
                const _gt  = skus.reduce((s, k) => s + (Number(k.orderQty||0) * Number(k.price||0)), 0);
                const _p1  = header.pay1Pct === '-' ? 0 : parseFloat(String(header.pay1Pct || '0'));
                const _p2  = header.pay2Pct === '-' ? 0 : parseFloat(String(header.pay2Pct || '0'));
                const _sum = _p1 + _p2;
                const _valid = Math.round(_sum) === 100;
                return (
                  <div className="flex flex-col items-end gap-1.5 pt-2">
                    {!_valid && (_p1 > 0 || _p2 > 0) && (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 text-[11px] font-bold animate-pulse">
                        <span>⚠️</span>
                        <span>Term 1 ({_p1}%) + Term 2 ({_p2}%) = <b>{_sum}%</b> — must total 100%</span>
                      </div>
                    )}
                    <div className={`flex border rounded overflow-hidden shadow-sm transition-all ${
                      !_valid && (_p1 > 0 || _p2 > 0)
                        ? 'border-rose-400 ring-2 ring-rose-300'
                        : 'border-zinc-300'
                    }`}>
                      <div className={`font-bold text-[10px] px-3 py-1.5 text-center uppercase tracking-wide flex items-center text-white transition-colors duration-300 ${
                        !_valid && (_p1 > 0 || _p2 > 0) ? 'bg-rose-500' : _valid ? 'bg-emerald-600' : 'bg-zinc-600'
                      }`}>Total %</div>
                      <div className={`font-black text-[11px] px-3 py-1.5 text-center border-l min-w-[60px] transition-colors duration-300 ${
                        !_valid && (_p1 > 0 || _p2 > 0)
                          ? 'bg-rose-50 text-rose-700 border-rose-300'
                          : _valid
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-white text-zinc-900 border-zinc-300'
                      }`}>{_sum}%</div>
                      <div className={`font-bold text-[10px] px-3 py-1.5 text-center uppercase tracking-wide flex items-center border-l text-white transition-colors duration-300 ${
                        !_valid && (_p1 > 0 || _p2 > 0) ? 'bg-rose-500 border-rose-400' : _valid ? 'bg-emerald-600 border-emerald-500' : 'bg-zinc-600 border-zinc-500'
                      }`}>Total</div>
                      <div className={`font-black text-[11px] px-3 py-1.5 text-center border-l min-w-[80px] transition-colors duration-300 ${
                         !_valid && (_p1 > 0 || _p2 > 0) ? 'bg-rose-50 text-rose-800 border-rose-200' : _valid ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-zinc-50 text-zinc-800 border-zinc-200'
                      }`}>
                        {currencySymbol}{_gt.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })()}

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
          
          <div 
            className="overflow-x-auto pb-6"
            ref={scrollContainerRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => { isHoveringRef.current = true; }}
            onMouseLeave={handleMouseLeave}
          >
            <table className="w-full text-left whitespace-nowrap min-w-max border-separate border-spacing-0">
              <thead className="bg-white sticky top-0 z-20 shadow-sm">
                <tr>
                  <th className="px-3 py-3 text-[11px] font-bold text-zinc-600 text-center sticky left-0 top-0 bg-white z-30 border-b border-r border-zinc-200">#</th>
                  <th className="px-3 py-3 text-[11px] font-bold text-zinc-600 min-w-[120px] sticky left-[41px] top-0 bg-white z-30 border-b border-r border-zinc-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">SKU Code</th>
                  <th className="px-3 py-3 text-[11px] font-bold text-zinc-600 min-w-[180px] bg-white border-b border-zinc-200">Product Name<span className="text-rose-500 ml-0.5">*</span></th>
                  <th className="px-3 py-3 text-[11px] font-bold text-zinc-600 min-w-[120px] text-center bg-white border-b border-zinc-200">Designer Picture</th>
                  <th className="px-3 py-3 text-[11px] font-bold text-zinc-600 min-w-[130px] bg-white border-b border-zinc-200">Shape<span className="text-rose-500 ml-0.5">*</span></th>
                  <th className="px-3 py-3 text-[11px] font-bold text-zinc-600 min-w-[140px] bg-white border-b border-zinc-200">Designer Name<span className="text-rose-500 ml-0.5">*</span></th>
                  <th className="px-3 py-3 text-[11px] font-bold text-zinc-600 min-w-[140px] bg-white border-b border-zinc-200">Brand Name<span className="text-rose-500 ml-0.5">*</span></th>
                  <th className="px-3 py-3 text-[11px] font-bold text-zinc-600 min-w-[220px] bg-white border-b border-zinc-200">Description</th>
                  <th className="px-3 py-3 text-[11px] font-bold text-zinc-600 min-w-[160px] bg-white border-b border-zinc-200">Sizes<span className="text-rose-500 ml-0.5">*</span></th>
                  <th className="px-3 py-3 text-[11px] font-bold text-zinc-600 min-w-[120px] bg-white border-b border-zinc-200">Quality<span className="text-rose-500 ml-0.5">*</span></th>
                  <th className="px-3 py-3 text-[11px] font-bold text-zinc-600 min-w-[120px] bg-white border-b border-zinc-200">Color<span className="text-rose-500 ml-0.5">*</span></th>
                  <th className="px-3 py-3 text-[11px] font-bold text-zinc-600 min-w-[100px] bg-white border-b border-zinc-200">Buyer PO Qty<span className="text-rose-500 ml-0.5">*</span></th>
                  <th className="px-3 py-3 text-[11px] font-bold text-zinc-600 min-w-[110px] bg-white border-b border-zinc-200">Unit of Qty<span className="text-rose-500 ml-0.5">*</span></th>
                  <th className="px-3 py-3 text-[11px] font-bold text-zinc-600 min-w-[90px] bg-white border-b border-zinc-200">Price<span className="text-rose-500 ml-0.5">*</span></th>
                  <th className="px-3 py-3 text-[11px] font-bold text-zinc-600 min-w-[90px] bg-white border-b border-zinc-200">Unit of Price<span className="text-rose-500 ml-0.5">*</span></th>
                  <th className="px-3 py-3 text-[11px] font-bold text-zinc-600 min-w-[100px] bg-white border-b border-zinc-200">Total Amt ({header.currency || 'USD'})</th>
                  <th className="px-3 py-3 text-[11px] font-bold text-zinc-600 min-w-[110px] bg-white border-b border-zinc-200">Inner Pack<span className="text-rose-500 ml-0.5">*</span></th>
                  <th className="px-3 py-3 text-[11px] font-bold text-zinc-600 min-w-[110px] bg-white border-b border-zinc-200">Outer Pack<span className="text-rose-500 ml-0.5">*</span></th>
                  <th className="px-3 py-3 text-[11px] font-bold text-zinc-600 min-w-[130px] bg-white border-b border-zinc-200">PP/TOP Samples<span className="text-rose-500 ml-0.5">*</span></th>
                  <th className="px-3 py-3 text-[11px] font-bold text-zinc-600 min-w-[110px] bg-white border-b border-zinc-200">Addl Prod Pcs<span className="text-rose-500 ml-0.5">*</span></th>
                  <th className="px-3 py-3 text-[11px] font-bold text-rose-700 min-w-[100px] text-center bg-rose-50/30 border-b border-zinc-200">Total Qty Mfg</th>
                  <th className="px-3 py-3 text-[11px] font-bold text-rose-700 min-w-[120px] text-center bg-rose-50/30 border-b border-zinc-200">Total Amount</th>
                  <th className="px-3 py-3 min-w-[48px] bg-white border-b border-zinc-200"></th>
                </tr>
              </thead>
              <tbody className="bg-zinc-50/20">
                {skus.map((sku, index) => {
                  const handleSizesChange = (selected: string[]) => {
                    setSkus(skus.map(s => s.id === sku.id ? { ...s, sizes: selected, size1: selected[0] || '', size2: selected[1] || '' } : s));
                  };
                  return (
                  <tr key={sku.id} className="group hover:bg-emerald-50/20 transition-colors">
                    <td className="px-3 py-3 text-center text-zinc-400 text-[11px] font-bold sticky left-0 bg-white group-hover:bg-emerald-50/90 border-b border-r border-zinc-100 z-10">{index + 1}</td>
                    <td className="px-3 py-3 align-top sticky left-[41px] bg-white group-hover:bg-emerald-50/90 border-b border-r border-zinc-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-10"><GridInput value={sku.skuCode || (header.internalPO ? `${header.internalPO}-${index + 1}` : '')} readOnly={true} placeholder="Auto SKU" /></td>
                    <td className="px-3 py-3 align-top border-b border-zinc-100"><GridInput value={sku.product} onChange={(e) => updateSku(sku.id!, 'product', e.target.value)} placeholder="Product Name" bold /></td>
                    <td className="px-3 py-3 align-top border-b border-zinc-100"><DragDropImage value={sku.designImage || ''} onChange={(val) => updateSku(sku.id!, 'designImage', val)} /></td>
                    <td className="px-3 py-3 align-top border-b border-zinc-100"><GridSelect value={sku.shape} onChange={(e: any) => updateSku(sku.id!, 'shape', e.target.value)} options={dropdowns?.shapes} onAddNew={() => handleAddNewDropdown('shapes')} /></td>
                    <td className="px-3 py-3 align-top border-b border-zinc-100"><GridSelect value={sku.designer} onChange={(e: any) => updateSku(sku.id!, 'designer', e.target.value)} options={dropdowns?.designers} onAddNew={() => handleAddNewDropdown('designers')} /></td>
                    <td className="px-3 py-3 align-top border-b border-zinc-100"><GridSelect value={sku.brand} onChange={(e: any) => updateSku(sku.id!, 'brand', e.target.value)} options={dropdowns?.brands} onAddNew={() => handleAddNewDropdown('brands')} /></td>
                    <td className="px-3 py-3 align-top border-b border-zinc-100">
                      <textarea 
                        value={sku.description || ''} onChange={(e) => updateSku(sku.id!, 'description', e.target.value)} placeholder="Desc..."
                        className="block w-full h-[34px] leading-[22px] text-center bg-yellow-50 border border-yellow-200 focus:bg-white focus:border-yellow-400 rounded-md px-2 text-[13px] font-semibold text-zinc-800 resize-none outline-none transition-all shadow-sm"
                      />
                    </td>
                    <td className="px-3 py-3 align-top border-b border-zinc-100"><MultiSelectDropdown options={dropdowns?.sizes || []} selected={sku.sizes || []} onChange={handleSizesChange} maxSelect={2} onAddNew={() => handleAddNewDropdown('sizes')} /></td>
                    <td className="px-3 py-3 align-top border-b border-zinc-100"><GridSelect value={sku.quality} onChange={(e: any) => updateSku(sku.id!, 'quality', e.target.value)} options={dropdowns?.qualities} onAddNew={() => handleAddNewDropdown('qualities')} /></td>
                    <td className="px-3 py-3 align-top border-b border-zinc-100"><GridSelect value={sku.color} onChange={(e: any) => updateSku(sku.id!, 'color', e.target.value)} options={dropdowns?.colors} onAddNew={() => handleAddNewDropdown('colors')} /></td>
                    <td className="px-3 py-3 align-top border-b border-zinc-100"><GridInput type="number" value={sku.orderQty} onChange={(e) => updateSku(sku.id!, 'orderQty', e.target.value)} placeholder="0" /></td>
                    <td className="px-3 py-3 align-top border-b border-zinc-100"><GridSelect value={sku.unitQty} onChange={(e: any) => updateSku(sku.id!, 'unitQty', e.target.value)} options={dropdowns?.unitsQty} onAddNew={() => handleAddNewDropdown('unitsQty')} /></td>
                    <td className="px-3 py-3 align-top border-b border-zinc-100"><GridInput type="number" value={sku.price} onChange={(e) => updateSku(sku.id!, 'price', e.target.value)} placeholder="0.00" /></td>
                    <td className="px-3 py-3 align-top border-b border-zinc-100"><GridSelect value={sku.unitPrice} onChange={(e: any) => updateSku(sku.id!, 'unitPrice', e.target.value)} options={dropdowns?.unitsPrice} onAddNew={() => handleAddNewDropdown('unitsPrice')} /></td>
                    <td className="px-3 py-3 align-top border-b border-zinc-100">
                      <div className="font-semibold text-zinc-800 bg-zinc-50 px-2 py-1 rounded border border-zinc-200">
                        {currencySymbol} {(Number(sku.orderQty) * Number(sku.price) || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top border-b border-zinc-100"><GridSelect value={sku.innerPack} onChange={(e: any) => updateSku(sku.id!, 'innerPack', e.target.value)} options={dropdowns?.packs} onAddNew={() => handleAddNewDropdown('packs')} /></td>
                    <td className="px-3 py-3 align-top border-b border-zinc-100"><GridSelect value={sku.outerPack} onChange={(e: any) => updateSku(sku.id!, 'outerPack', e.target.value)} options={dropdowns?.packs} onAddNew={() => handleAddNewDropdown('packs')} /></td>
                    <td className="px-3 py-3 align-top border-b border-zinc-100"><GridSelect value={sku.addSample} onChange={(e: any) => updateSku(sku.id!, 'addSample', e.target.value)} options={dropdowns?.ppTopSamples} onAddNew={() => handleAddNewDropdown('ppTopSamples')} /></td>
                    <td className="px-3 py-3 align-top border-b border-zinc-100"><GridSelect value={sku.addProd} onChange={(e: any) => updateSku(sku.id!, 'addProd', e.target.value)} options={['0%', '1%', '2%', '3%', '4%', '5%', '6%', '7%', '8%', '9%', '10%']} /></td>
                    
                    <td className="px-3 py-3 align-middle text-center bg-rose-50/20 border-b border-zinc-100"><div className="text-[12px] font-black text-rose-700 bg-white border border-rose-200 rounded py-1 px-2 shadow-sm inline-block">{sku.totalQtyMfg || 0}</div></td>
                    <td className="px-3 py-3 align-middle text-center bg-rose-50/20 border-b border-zinc-100"><div className="text-[12px] font-black text-rose-700 bg-white border border-rose-200 rounded py-1 px-2 shadow-sm inline-block">{currencySymbol}{(sku.lineTotal || 0).toFixed(2)}</div></td>
                    
                    <td className="px-3 py-3 align-middle text-center border-b border-zinc-100 space-x-1 min-w-[70px]">
                      <button onClick={() => duplicateSku(index)} className="text-zinc-400 hover:text-blue-500 bg-white hover:bg-blue-50 border border-zinc-200 hover:border-blue-200 rounded p-1.5 transition-all shadow-sm" title="Duplicate Row"><Copy size={14} /></button>
                      <button onClick={() => removeSku(sku.id!)} className="text-zinc-400 hover:text-rose-500 bg-white hover:bg-rose-50 border border-zinc-200 hover:border-rose-200 rounded p-1.5 transition-all shadow-sm" title="Delete Row"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                )})}
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
                  {currencySymbol} {skus.reduce((acc, sku) => acc + ((Number(sku.orderQty) || 0) * (Number(sku.price) || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  readOnly?: boolean;
  className?: string;
  required?: boolean;
}

function ModernInput({ label, value, onChange, type = "text", readOnly, className, required }: ModernInputProps) {
  const defaultClass = readOnly
    ? 'w-full text-center bg-zinc-100 border border-zinc-200 rounded-lg outline-none px-3 py-2 text-[13px] font-semibold text-zinc-500 cursor-default shadow-sm'
    : 'w-full text-center bg-yellow-50 border border-yellow-200 rounded-lg outline-none focus:bg-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 px-3 py-2 text-[13px] font-semibold text-zinc-900 transition-all shadow-sm';
  return (
    <div className="flex flex-col gap-1 w-full items-center">
      <label className="text-[12px] font-bold text-zinc-500 tracking-wide capitalize text-center">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <input 
        type={type}
        value={value || ''} 
        onChange={onChange} 
        readOnly={readOnly}
        className={className ?? defaultClass}
      />
    </div>
  );
}

interface ModernSelectProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
  onAddNew?: () => Promise<string | null>;
  required?: boolean;
}

function ModernSelect({ label, value, onChange, options, onAddNew, required }: ModernSelectProps) {
  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '__add_new__') {
      if (onAddNew) {
        const newValue = await onAddNew();
        if (newValue) {
          onChange({ target: { value: newValue } } as any);
        } else {
          onChange({ target: { value: value || '' } } as any);
        }
      }
    } else {
      onChange(e);
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full items-center relative">
      <label className="text-[12px] font-bold text-zinc-500 tracking-wide capitalize text-center">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <select 
        value={value || ''} 
        onChange={handleChange} 
        className="w-full text-center bg-yellow-50 border border-yellow-200 rounded-lg outline-none focus:bg-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 px-3 py-2 text-[13px] font-semibold text-zinc-900 transition-all shadow-sm appearance-none cursor-pointer"
      >
        <option value="" disabled>Select {label}</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        {onAddNew && <option value="__add_new__" className="font-bold text-blue-600 bg-blue-50">+ Add New...</option>}
      </select>
      <div className="absolute right-3 top-[28px] pointer-events-none text-zinc-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
    </div>
  );
}

interface ModernTextAreaProps {
  label: string;
  value: string | undefined;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  readOnly?: boolean;
  required?: boolean;
}

function ModernTextArea({ label, value, onChange, readOnly, required }: ModernTextAreaProps) {
  const textareaClass = readOnly
    ? 'w-full text-center bg-zinc-100 border border-zinc-200 rounded-lg outline-none px-3 py-2 text-[13px] font-semibold text-zinc-500 cursor-default resize-none shadow-sm'
    : 'w-full text-center bg-yellow-50 border border-yellow-200 rounded-lg outline-none focus:bg-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 px-3 py-2 text-[13px] font-semibold text-zinc-900 resize-none transition-all shadow-sm';
  return (
    <div className="flex flex-col gap-1 w-full items-center">
      <label className="text-[12px] font-bold text-zinc-500 tracking-wide capitalize text-center">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <textarea 
        value={value || ''} 
        onChange={onChange} 
        rows={2}
        readOnly={readOnly}
        className={textareaClass}
      />
    </div>
  );
}

interface GridInputProps {
  value: string | number | undefined;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  bold?: boolean;
  readOnly?: boolean;
}

function GridInput({ value, onChange, placeholder, type = "text", bold, readOnly }: GridInputProps) {
  return (
    <input 
      type={type}
      value={value || ''}
      onChange={onChange}
      readOnly={readOnly}
      placeholder={placeholder}
      className={`block w-full text-center bg-yellow-50 border border-yellow-200 hover:border-yellow-300 focus:bg-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/30 rounded-md px-2 py-1.5 text-[13px] ${bold ? 'font-bold text-zinc-900' : 'font-semibold text-zinc-800'} outline-none transition-all shadow-sm ${readOnly ? 'bg-zinc-100 border-zinc-200 text-zinc-500 cursor-default hover:border-zinc-200 focus:border-zinc-200 focus:ring-0' : ''}`}
    />
  );
}

const customSelectStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    minHeight: '34px',
    height: '34px',
    backgroundColor: state.isFocused ? '#ffffff' : '#fefce8',
    borderColor: state.isFocused ? '#facc15' : '#fef08a',
    boxShadow: state.isFocused ? '0 0 0 1px rgba(250, 204, 21, 0.3)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    borderRadius: '0.375rem',
    fontSize: '13px',
    fontFamily: "'Calibri', 'Trebuchet MS', Arial, sans-serif",
    fontWeight: '600',
    color: '#27272a',
    cursor: 'pointer',
    textAlign: 'center' as const,
    '&:hover': {
      borderColor: '#fde047'
    }
  }),
  valueContainer: (provided: any) => ({
    ...provided,
    padding: '0 8px',
    justifyContent: 'center',
    fontSize: '13px',
    fontFamily: "'Calibri', 'Trebuchet MS', Arial, sans-serif",
  }),
  input: (provided: any) => ({
    ...provided,
    margin: '0px',
    padding: '0px',
    textAlign: 'center' as const,
    fontSize: '13px',
    fontFamily: "'Calibri', 'Trebuchet MS', Arial, sans-serif",
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  indicatorsContainer: (provided: any) => ({
    ...provided,
    height: '34px',
  }),
  dropdownIndicator: (provided: any) => ({
    ...provided,
    padding: '4px',
    color: '#a1a1aa',
    '&:hover': { color: '#71717a' }
  }),
  menu: (provided: any) => ({
    ...provided,
    fontSize: '13px',
    fontFamily: "'Calibri', 'Trebuchet MS', Arial, sans-serif",
    fontWeight: '600',
    borderRadius: '0.5rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    zIndex: 9999,
  }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#ecfdf5' : state.isFocused ? '#f0fdf4' : 'white',
    color: state.isSelected ? '#047857' : '#3f3f46',
    fontWeight: state.isSelected ? '700' : '600',
    fontSize: '13px',
    fontFamily: "'Calibri', 'Trebuchet MS', Arial, sans-serif",
    cursor: 'pointer',
    textAlign: 'left' as const,
  })
};

function GridSelect({ value, onChange, options = [], onAddNew }: { value: any, onChange: any, options?: string[], onAddNew?: () => Promise<string | null> }) {
  const formattedOptions = [
    ...options.map(o => ({ value: o, label: o })),
    ...(onAddNew ? [{ value: '__add_new__', label: '+ Add New...', isAddNew: true }] : [])
  ];
  const selectedOption = formattedOptions.find(o => o.value === value) || null;
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => { setIsMounted(true); }, []);

  return (
    <Select
      value={selectedOption}
      onChange={async (selected: any) => {
        if (selected?.value === '__add_new__') {
          if (onAddNew) {
            const newValue = await onAddNew();
            if (newValue) {
              onChange({ target: { value: newValue } });
            }
          }
        } else {
          onChange({ target: { value: selected?.value || '' } });
        }
      }}
      options={formattedOptions}
      styles={customSelectStyles}
      menuPortalTarget={isMounted ? document.body : null}
      menuPosition="fixed"
      isClearable
      placeholder="-"
      className="w-[140px]"
    />
  );
}
