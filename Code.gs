const SHEET_ID = '1hpIkMb5txPAedR-S7TVrWtLK6vEbUrZqeFJ5lYVQCkA';
const FOLDER_ID = '1AFkGysktaXFmX9h8w-AJadgzCJPxZ8r0';

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'getDropdowns') {
      return handleGetDropdowns();
    } else if (action === 'getAllPOs') {
      return handleGetAllPOs(e.parameter);
    } else if (action === 'getPOById') {
      return handleGetPOById(e.parameter);
    } else if (action === 'getStats') {
      return handleGetStats();
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' }))
        .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleGetDropdowns() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  const extractUnique = (sheetName, headerName, fallbackColIndex) => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    const data = sheet.getDataRange().getDisplayValues();
    if (data.length === 0) return [];

    let colIndex = -1;
    // Try to find the header in the first two rows
    for (let r = 0; r < Math.min(2, data.length); r++) {
      for (let c = 0; c < data[r].length; c++) {
        const cell = data[r][c];
        if (cell && cell.toString().trim().toLowerCase() === headerName.toLowerCase()) {
          colIndex = c;
          break;
        }
      }
      if (colIndex !== -1) break;
    }
    
    // Fallback to hardcoded index if header not found
    if (colIndex === -1) {
      colIndex = fallbackColIndex;
    }

    const unique = new Set();
    for (let i = 1; i < data.length; i++) {
      const val = data[i][colIndex];
      // Check that value is not empty and not the header name itself
      if (val !== undefined && val !== null && val.toString().trim() !== '' && val.toString().trim().toLowerCase() !== headerName.toLowerCase()) {
        unique.add(val.toString().trim());
      }
    }
    return [...unique];
  };

  const shapes = extractUnique('Drop Downs', 'Shape', 27);
  const designers = extractUnique('Drop Downs', 'Designer Name', 16);
  const brands = extractUnique('Drop Downs', 'Buyer Brand Name', 32);
  const sizes = extractUnique('Drop Downs', 'Size', 22); // Col W is 22
  const qualities = extractUnique('Drop Downs', 'Quality', 33); // Col AH is 33
  const colors = extractUnique('Drop Downs', 'Color', 34); // Col AI is 34
  const ppTopSamples = extractUnique('Drop Downs', 'PP/Top Samples', 35);
  const portNames = extractUnique('Drop Downs', 'Port Name', 36);
  const deliveryTerms = extractUnique('Drop Downs', 'Delivery Terms', 8);

  // 'list' sheet has missing/messy headers, so we rely on fallback indices mostly
  const unitsQty = extractUnique('list', 'Unit Qty', 4);
  const unitsPrice = extractUnique('list', 'Unit Price', 3);
  const packs = extractUnique('list', 'Packs', 5);

  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    data: { shapes, designers, brands, sizes, qualities, colors, unitsQty, unitsPrice, packs, ppTopSamples, portNames, deliveryTerms }
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    // Enable CORS
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ error: "No data received" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const payload = JSON.parse(e.postData.contents);
    const { action, data } = payload;
    
    // Simple Router
    if (action === 'createPO') {
      return handleCreatePO(data);
    } else if (action === 'updatePO') {
      return handleUpdatePO(data);
    } else if (action === 'savePDF') {
      return handleSavePDF(data);
    } else if (action === 'getPendingInternalPOs') {
      return handleGetPendingInternalPOs();
    } else if (action === 'getDropdowns') {
      return handleGetDropdowns();
    } else if (action === 'addDropdown') {
      return handleAddDropdown(data);
    } else if (action === 'extractPOData') {
      return handleExtractPOData(data);
    } else if (action === 'sendWhatsApp') {
      return handleSendWhatsApp(data);
    } else {
       return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleGetPendingInternalPOs() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  const normalizePO = (po) => po.replace(/\/\d{2}$/, '').trim().toLowerCase();

  const poEntrySheet = ss.getSheetByName('PO Entry');
  if (!poEntrySheet) throw new Error("PO Entry sheet not found");
  
  const lastRow = poEntrySheet.getLastRow();
  const poEntryData = lastRow > 0 ? poEntrySheet.getRange(1, 1, lastRow, 25).getValues() : [];
  const allInternalPOs = [];
  
  let colMap = {
    internalPO: 13,
    fileNumber: 3,
    buyerName: 4,
    buyerPO: 12,
    poDate: 6,
    exFactory: 16,
    onboardDate: 17,
    deliveryAddr: 18
  };
  let dataStartRow = 1;
  for (let i = 0; i < Math.min(poEntryData.length, 20); i++) {
    for (let j = 0; j < poEntryData[i].length; j++) {
      const headerText = (poEntryData[i][j] || '').toString().trim().toLowerCase();
      if (headerText === 'internal po number') colMap.internalPO = j;
      else if (headerText === 'file number') colMap.fileNumber = j;
      else if (headerText === 'buyer name') colMap.buyerName = j;
      else if (headerText === 'buyer po number') colMap.buyerPO = j;
      else if (headerText === 'po date') colMap.poDate = j;
      else if (headerText === 'ex-factory date') colMap.exFactory = j;
      else if (headerText === 'onboard vessel date') colMap.onboardDate = j;
      else if (headerText === 'delivery address') colMap.deliveryAddr = j;
    }
    if (poEntryData[i].some(v => (v || '').toString().trim().toLowerCase() === 'internal po number')) {
      dataStartRow = i + 1;
      break;
    }
  }

  const formatDate = (dateObj) => {
    if (!dateObj) return '';
    if (dateObj instanceof Date) {
      return dateObj.toISOString().split('T')[0];
    }
    return dateObj.toString().trim();
  };

  const buyerNameSheet = ss.getSheetByName('Buyer Name');
  const billingAddrMap = {};
  if (buyerNameSheet) {
    const buyerData = buyerNameSheet.getDataRange().getValues();
    for (let i = 1; i < buyerData.length; i++) {
      const bName = (buyerData[i][6] || '').toString().trim();
      const bAddr = (buyerData[i][8] || '').toString().trim();
      if (bName) {
        billingAddrMap[bName.toLowerCase()] = bAddr;
      }
    }
  }

  for (let i = dataStartRow; i < poEntryData.length; i++) {
    const val = poEntryData[i][colMap.internalPO];
    if (val && val.toString().trim() !== '') {
      const buyerNameRaw = (poEntryData[i][colMap.buyerName] || '').toString().trim();
      allInternalPOs.push({
        internalPO: val.toString().trim(),
        fileNumber: (poEntryData[i][colMap.fileNumber] || '').toString().trim(),
        buyerName: buyerNameRaw,
        buyerPO: (poEntryData[i][colMap.buyerPO] || '').toString().trim(),
        poDate: formatDate(poEntryData[i][colMap.poDate]),
        exFactory: formatDate(poEntryData[i][colMap.exFactory]),
        onboardDate: formatDate(poEntryData[i][colMap.onboardDate]),
        deliveryAddr: (poEntryData[i][colMap.deliveryAddr] || '').toString().trim(),
        billingAddr: billingAddrMap[buyerNameRaw.toLowerCase()] || ''
      });
    }
  }
  
  const dbSheet = ss.getSheetByName('DATABASE');
  if (!dbSheet) throw new Error("DATABASE sheet not found");
  const dbData = dbSheet.getDataRange().getValues();
  const usedPOs = new Set();
  for (let i = 1; i < dbData.length; i++) {
    const val = dbData[i][4]; // Internal PO number is in col E (index 4)
    if (val && val.toString().trim() !== '') {
      usedPOs.add(normalizePO(val.toString()));
    }
  }
  
  const pendingPOs = allInternalPOs.filter(po => {
    return !usedPOs.has(normalizePO(po.internalPO));
  });
  
  const uniquePendingPOs = [];
  const seen = new Set();
  for (const po of pendingPOs) {
    if (!seen.has(po.internalPO)) {
      seen.add(po.internalPO);
      uniquePendingPOs.push(po);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    data: uniquePendingPOs
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleCreatePO(data) {
    const { header, skus, userEmail } = data;
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('DATABASE');
    const buyerSheet = ss.getSheetByName('Buyer Name');
    const timestamp = new Date().toLocaleString();
    const internalPO = header.internalPO || ''; 
    const uniqueId = internalPO;
    
    let fetchedPayTerm1 = header.payTerm1 || '';
    let fetchedPayTerm2 = header.payTerm2 || '';
    let fetchedBuyerSource = header.buyerSource || '';
    let fetchedBuyerSubSrc = header.buyerSubSrc || '';

    if (buyerSheet && header.buyerName) {
      const buyerData = buyerSheet.getDataRange().getValues();
      // Look up buyer by Buyer Name in Col G (index 6)
      for (let i = 1; i < Math.min(buyerData.length, 500); i++) {
        if (buyerData[i][6] && buyerData[i][6].toString().trim() === header.buyerName.toString().trim()) {
           fetchedBuyerSource = buyerData[i][2] || fetchedBuyerSource; // Col C
           fetchedBuyerSubSrc = buyerData[i][4] || fetchedBuyerSubSrc; // Col E
           fetchedPayTerm1 = buyerData[i][9] || fetchedPayTerm1; // Col J
           fetchedPayTerm2 = buyerData[i][10] || fetchedPayTerm2; // Col K
           break;
        }
      }
    }
    
    // Create an array of rows to insert
    const rowsToInsert = [];
    
    for (let i = 0; i < skus.length; i++) {
      const item = skus[i];
      const row = new Array(65).fill(''); // 65 columns
      
      // Map Metadata
      row[0] = timestamp; // ColA Timestamp
      row[1] = uniqueId; // ColB Unique ID
      row[2] = header.fileNumber || ''; // ColC File Number
      row[3] = header.buyerName || ''; // ColD Buyer Name
      row[4] = internalPO; // ColE Internal PO Number
      row[5] = header.buyerPO || ''; // ColF Buyer PO Number
      row[6] = header.poDate || ''; // ColG PO Date
      row[7] = header.exFactory || ''; // ColH Ex-Factory Date
      row[8] = header.deliveryTerms || ''; // ColI Delivery Terms
      row[9] = header.portName || ''; // ColJ Port Name
      row[10] = fetchedPayTerm1; // ColK Payment Terms 1
      row[11] = fetchedPayTerm2; // ColL Payment Terms 2
      row[12] = fetchedBuyerSource; // ColM Buyer Source Name
      row[13] = fetchedBuyerSubSrc; // ColN Buyer Sub Source Name
      row[14] = header.buyerSrcPct || ''; // ColO Buyer Source Name %
      row[15] = header.buyerSubPct || ''; // ColP Buyer Sub Source Name %
      row[16] = header.billingAddr || ''; // ColQ Billing Address
      row[17] = header.deliveryAddr || ''; // ColR Delivery Address
      row[18] = header.onboardDate || ''; // ColS Onboard Vessel Date
      row[19] = ''; // ColT Blank
      
      // Handle Base64 Image upload to Drive
      let finalImageUrl = item.designImage || '';
      if (finalImageUrl.startsWith('data:image')) {
        finalImageUrl = saveImageToDrive(finalImageUrl, `Image_${internalPO}_${Date.now()}_${i}.png`);
      }

      // Format image URL for IMAGE() formula if available
      let imageFormula = finalImageUrl;
      if (finalImageUrl.includes('drive.google.com')) {
         const fileIdMatch = finalImageUrl.match(/[-\w]{25,}/);
         if (fileIdMatch) {
            imageFormula = `=HYPERLINK("https://drive.google.com/file/d/${fileIdMatch[0]}/view", IMAGE("https://drive.google.com/uc?export=view&id=${fileIdMatch[0]}"))`;
         }
      }

      // Map Line Items
      row[20] = ''; // ColU Blank
      row[21] = ''; // ColV Blank
      row[22] = item.skuCode || ''; // ColW SKU Code
      row[23] = item.product || ''; // ColX Product
      row[24] = item.articleNum || ''; // ColY Item/Product/Article #
      row[25] = imageFormula; // ColZ Design Image (Formula)
      row[26] = item.shape || ''; // ColAA Shape
      row[27] = item.designer || ''; // ColAB Designer Name
      row[28] = item.brand || ''; // ColAC Brand Name
      row[29] = item.description || ''; // ColAD Description
      row[30] = item.sizes && item.sizes.length > 0 ? item.sizes[0] : ''; // ColAE Size 1
      row[31] = item.sizes && item.sizes.length > 1 ? item.sizes[1] : ''; // ColAF Size 2
      row[32] = item.quality || ''; // ColAG Quality
      row[33] = item.color || ''; // ColAH Color
      row[34] = item.colorRef || ''; // ColAI Color Ref
      row[35] = item.orderQty || ''; // ColAJ Order Quantity
      row[36] = item.unitQty || ''; // ColAK Unit of Quantity
      row[37] = item.price || ''; // ColAL Price
      row[38] = item.unitPrice || ''; // ColAM Unit of Price
      row[39] = header.currency || 'USD'; // ColAN Currency
      row[40] = item.innerPack || ''; // ColAO Inner Pack
      row[41] = item.outerPack || ''; // ColAP Outer Pack
      row[42] = item.addSample || ''; // ColAQ Additional Sample
      row[43] = item.addProd || ''; // ColAR Additional Production
      row[44] = item.totalQtyMfg || ''; // ColAS Total Quantity to Manufacture
      
      row[45] = ''; // ColAT Blank
      row[46] = ''; // ColAU Blank
      row[47] = ''; // ColAV Blank
      row[48] = ''; // ColAW Blank
      row[49] = ''; // ColAX Blank
      
      row[50] = item.lineTotal || ''; // ColAY Total Amount
      
      // Payment Terms 1
      row[51] = ''; // ColAZ Blank
      row[52] = header.pay1Pct || ''; // ColBA Payment Term 1 %
      row[53] = header.pay1Days || ''; // ColBB Payment Term 1 Days
      row[54] = header.pay1Activity || ''; // ColBC Payment Term 1 Activity
      row[55] = header.pay1Amount || ''; // ColBD Payment Term 1 Amount
      row[56] = header.pay1DueDate || ''; // ColBE Payment Term 1 Due Date
      
      // Payment Terms 2
      row[57] = header.pay2Pct || ''; // ColBF Payment Term 2 %
      row[58] = header.pay2Days || ''; // ColBG Payment Term 2 Days
      row[59] = header.pay2Activity || ''; // ColBH Payment Term 2 Activity
      row[60] = header.pay2Amount || ''; // ColBI Payment Term 2 Amount
      row[61] = header.pay2DueDate || ''; // ColBJ Payment Term 2 Due Date
      
      row[62] = ''; // ColBK PDF (Set asynchronously)
      row[63] = ''; // ColBL Blank
      row[64] = userEmail || ''; // ColBM User Email
      
      rowsToInsert.push(row);
    }
    
    if (rowsToInsert.length > 0) {
      // Append all rows at once to be efficient
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToInsert.length, 65).setValues(rowsToInsert);
    }

    // Invalidate caches
    const scriptCache = CacheService.getScriptCache();
    scriptCache.remove('pendingPOs');
    scriptCache.remove('activeRows_v2');
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'success', 
      data: { uid: uniqueId, internalPO: internalPO } 
    })).setMimeType(ContentService.MimeType.JSON);
}

function handleSavePDF(data) {
   const { uid, fileName, fileContent } = data;
   try {
        const folder = DriveApp.getFolderById(FOLDER_ID);
        const base64Data = fileContent.split('base64,')[1] || fileContent;
        const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'application/pdf', fileName || `${uid}.pdf`);
        const file = folder.createFile(blob);
        
        // Find row by internalPO or uid and update column BK (63) with PDF URL
        const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('DATABASE');
        const dataRange = sheet.getDataRange().getValues();
        for (let i = 1; i < dataRange.length; i++) {
           if (dataRange[i][4] === uid || dataRange[i][1] === uid) {
               sheet.getRange(i + 1, 63).setValue(file.getUrl());
           }
        }
        
        // Invalidate caches
        const scriptCache = CacheService.getScriptCache();
        scriptCache.remove('pendingPOs');
        scriptCache.remove('activeRows_v2');
        
        return ContentService.createTextOutput(JSON.stringify({
            status: 'success',
            data: { fileUrl: file.getUrl(), fileId: file.getId() }
        })).setMimeType(ContentService.MimeType.JSON);
        
      } catch (pdfErr) {
        return ContentService.createTextOutput(JSON.stringify({
            status: 'error',
            message: pdfErr.toString()
        })).setMimeType(ContentService.MimeType.JSON);
      }
}

function doOptions(e) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders(headers);
}

function handleAddDropdown(data) {
  const { field, value } = data;
  if (!field || !value) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Missing field or value' })).setMimeType(ContentService.MimeType.JSON);
  }

  const mapping = {
    shapes: { sheet: 'Drop Downs', col: 28 }, // AB -> 28
    designers: { sheet: 'Drop Downs', col: 17 }, // Q -> 17
    brands: { sheet: 'Drop Downs', col: 33 }, // AG -> 33
    sizes: { sheet: 'Drop Downs', col: 23 }, // W -> 23
    qualities: { sheet: 'Drop Downs', col: 34 }, // AH -> 34
    colors: { sheet: 'Drop Downs', col: 18 }, // R -> 18
    ppTopSamples: { sheet: 'Drop Downs', col: 36 }, // AJ -> 36
    portNames: { sheet: 'Drop Downs', col: 37 }, // AK -> 37
    deliveryTerms: { sheet: 'Drop Downs', col: 9 }, // I -> 9
    
    unitsQty: { sheet: 'list', col: 5 }, // E -> 5
    unitsPrice: { sheet: 'list', col: 4 }, // D -> 4
    packs: { sheet: 'list', col: 6 } // F -> 6
  };

  const map = mapping[field];
  if (!map) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown field: ' + field })).setMimeType(ContentService.MimeType.JSON);
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(map.sheet);
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Sheet not found' })).setMimeType(ContentService.MimeType.JSON);
  }

  const dataRange = sheet.getRange(1, map.col, sheet.getMaxRows(), 1).getValues();
  let firstEmptyRow = dataRange.length + 1;
  for (let i = 0; i < dataRange.length; i++) {
    if (!dataRange[i][0] || dataRange[i][0].toString().trim() === '') {
      firstEmptyRow = i + 1;
      break;
    }
  }

  sheet.getRange(firstEmptyRow, map.col).setValue(value);

  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    message: 'Added successfully'
  })).setMimeType(ContentService.MimeType.JSON);
}

const GEMINI_API_KEY = "AQ.Ab8RN" + "6K2IedvQRu3dvemWVnZ_aQLrzkStsmm7X8leI8pYpyMsA";

function extractFileId(url) {
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

function getMimeTypeFromBlob(blob) {
  const type = blob.getContentType();
  if (type === 'application/pdf') return 'application/pdf';
  if (type.startsWith('image/')) return type;
  return 'application/pdf'; // fallback
}

function handleExtractPOData(data) {
  const { internalPO, dropdowns } = data;
  if (!internalPO) throw new Error("Internal PO Number is required for extraction.");

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const poEntrySheet = ss.getSheetByName('PO Entry');
  if (!poEntrySheet) throw new Error("PO Entry sheet not found.");

  const poEntryData = poEntrySheet.getDataRange().getValues();
  
  // Find Internal PO (Col N, index 13) and File Link (Col T, index 19)
  let fileUrl = null;
  let internalPOColIndex = 13;
  let fileLinkColIndex = 19; 
  
  for (let i = 0; i < Math.min(poEntryData.length, 20); i++) {
    for (let j = 0; j < poEntryData[i].length; j++) {
      const val = poEntryData[i][j] ? poEntryData[i][j].toString().trim().toLowerCase() : '';
      if (val === 'internal po number') internalPOColIndex = j;
      if (val === 'uploaded file link') fileLinkColIndex = j;
    }
  }

  for (let i = 1; i < poEntryData.length; i++) {
    const val = poEntryData[i][internalPOColIndex];
    if (val && val.toString().trim() === internalPO.trim()) {
      fileUrl = poEntryData[i][fileLinkColIndex];
      break;
    }
  }

  if (!fileUrl) {
    throw new Error("No uploaded file link found for this Internal PO.");
  }

  const fileId = extractFileId(fileUrl.toString());
  if (!fileId) throw new Error("Invalid Google Drive file URL.");

  let file;
  try {
    file = DriveApp.getFileById(fileId);
  } catch (e) {
    throw new Error("Could not access the file. Make sure the file exists and is accessible: " + e.message);
  }
  const size = file.getSize();
  if (size > 7 * 1024 * 1024) { // 7MB limit to avoid Google Apps Script Out of Memory HTML crash
    throw new Error("File is too large (" + Math.round(size/1024/1024) + "MB). Please use a file smaller than 7MB for AI extraction.");
  }

  const blob = file.getBlob();
  const base64Data = Utilities.base64Encode(blob.getBytes());
  const mimeType = getMimeTypeFromBlob(blob);

  const documentParts = [{
    inlineData: {
      mimeType: mimeType,
      data: base64Data
    }
  }];

  // Construct Gemini Schema
  const expectedJsonStructure = {
    "buyerName": "string",
    "buyerPO": "string",
    "fileNumber": "string",
    "poDate": "string (Short Date: dd-MMM-yyyy)",
    "exFactory": "string (Short Date: dd-MMM-yyyy)",
    "deliveryTerms": "string",
    "portName": "string",
    "billingAddr": "string",
    "deliveryAddr": "string",
    "items": [
      {
        "product": "string (Exact full description)",
        "shape": "string",
        "designer": "string",
        "brand": "string",
        "description": "string (Any extra description)",
        "sizes": ["string", "string"],
        "quality": "string",
        "color": "string",
        "orderQty": "number",
        "unitQty": "string",
        "price": "number",
        "unitPrice": "string",
        "currency": "string",
        "innerPack": "string",
        "outerPack": "string",
        "addSample": "string",
        "addProd": "string"
      }
    ]
  };

  const promptText = `You are an AI data extractor. Extract data from this Purchase Order document.
CRITICAL INSTRUCTION: Map the extracted values to the EXACT predefined options provided below whenever possible.

Predefined Valid Options:
- Valid Delivery Terms: ${JSON.stringify(dropdowns.deliveryTerms || [])}
- Valid Ports of Discharge: ${JSON.stringify(dropdowns.portNames || [])}
- Valid Brands: ${JSON.stringify(dropdowns.brands || [])}
- Valid Shapes: ${JSON.stringify(dropdowns.shapes || [])}
- Valid Designers: ${JSON.stringify(dropdowns.designers || [])}
- Valid Colors: ${JSON.stringify(dropdowns.colors || [])}
- Valid Sizes: ${JSON.stringify(dropdowns.sizes || [])}
- Valid Qualities: ${JSON.stringify(dropdowns.qualities || [])}
- Valid Unit Qty: ${JSON.stringify(dropdowns.unitsQty || [])}
- Valid Unit Price: ${JSON.stringify(dropdowns.unitsPrice || [])}
- Valid Pack Options: ${JSON.stringify(dropdowns.packs || [])}
- Valid Currencies: ["USD", "INR", "EUR", "CAD", "AUD", "CNY"]

If you find a color like 'Blue' but the valid options has 'Navy Blue', map it to 'Navy Blue' if confident.
If a field is missing, return an empty string "" or 0 for numbers.
Extract EVERY single line item and put it in the "items" array. Keep the original item sequence.

Return ONLY valid JSON matching this exact structure:
${JSON.stringify(expectedJsonStructure, null, 2)}`;

  const payload = {
    contents: [ { parts: [ { text: promptText }, ...documentParts ] } ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const response = UrlFetchApp.fetch(url, options);
  const jsonResponse = JSON.parse(response.getContentText());
  
  if (jsonResponse.error) {
    throw new Error("Gemini API Error: " + jsonResponse.error.message);
  }

  let contentText = jsonResponse.candidates[0].content.parts[0].text;
  if (contentText.startsWith('```json')) {
    contentText = contentText.replace(/^```json\n/, '').replace(/\n```$/, '');
  }

  const extractedData = JSON.parse(contentText);
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    data: extractedData
  })).setMimeType(ContentService.MimeType.JSON);
}

function saveImageToDrive(base64Str, filename) {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const contentType = base64Str.substring(5, base64Str.indexOf(';'));
    const base64Data = base64Str.split('base64,')[1] || base64Str;
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType || 'image/png', filename);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl(); 
  } catch(e) {
    return "";
  }
}

function handleUpdatePO(data) {
    const { uid, header, skus, userEmail } = data;
    const activeRows = getActiveRows();
    let existingPdfUrl = '';
    for (let i = 0; i < activeRows.length; i++) {
      if (activeRows[i][4] === uid || activeRows[i][1] === uid) {
        existingPdfUrl = activeRows[i][62] || ''; // BK
        if (existingPdfUrl) break;
      }
    }

    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    // DATABASE: delete all existing rows for this UID and re-insert fresh rows
    const sheetDatabase = ss.getSheetByName('DATABASE');
    if (sheetDatabase) {
      const dbData = sheetDatabase.getDataRange().getValues();
      const rowsToDelete = [];
      for (let i = dbData.length - 1; i >= 1; i--) {
          if (dbData[i][4] === uid || dbData[i][1] === uid) {
              rowsToDelete.push(i + 1);
          }
      }
      for (let i = 0; i < rowsToDelete.length; i++) {
          sheetDatabase.deleteRow(rowsToDelete[i]);
      }
    }
    
    const timestamp = new Date().toLocaleString();
    const internalPO = header.internalPO || uid; 
    const uniqueId = internalPO;
    const rowsToInsert = [];
    
    for (let i = 0; i < skus.length; i++) {
      const item = skus[i];
      const row = new Array(65).fill('');
      
      let finalImageUrl = item.designImage || '';
      if (finalImageUrl.startsWith('data:image')) {
        finalImageUrl = saveImageToDrive(finalImageUrl, `Image_${internalPO}_${Date.now()}_${i}.png`);
      }
      
      let imageFormula = finalImageUrl;
      if (finalImageUrl.includes('drive.google.com')) {
         const fileIdMatch = finalImageUrl.match(/[-\w]{25,}/);
         if (fileIdMatch) {
            imageFormula = `=HYPERLINK("https://drive.google.com/file/d/${fileIdMatch[0]}/view", IMAGE("https://drive.google.com/uc?export=view&id=${fileIdMatch[0]}"))`;
         }
      }

      row[0] = timestamp;
      row[1] = uniqueId;
      row[2] = header.fileNumber || '';
      row[3] = header.buyerName || '';
      row[4] = internalPO;
      row[5] = header.buyerPO || '';
      row[6] = header.poDate || '';
      row[7] = header.exFactory || '';
      row[8] = header.deliveryTerms || '';
      row[9] = header.portName || '';
      row[10] = header.payTerm1 || '';
      row[11] = header.payTerm2 || '';
      row[12] = header.buyerSource || '';
      row[13] = header.buyerSubSrc || '';
      row[14] = header.buyerSrcPct || '';
      row[15] = header.buyerSubPct || '';
      row[16] = header.billingAddr || '';
      row[17] = header.deliveryAddr || '';
      row[18] = header.onboardDate || '';
      row[19] = '';
      row[20] = '';
      row[21] = '';
      row[22] = item.skuCode || '';
      row[23] = item.product || '';
      row[24] = item.articleNum || '';
      row[25] = imageFormula;
      row[26] = item.shape || '';
      row[27] = item.designer || '';
      row[28] = item.brand || '';
      row[29] = item.description || '';
      row[30] = item.sizes && item.sizes.length > 0 ? item.sizes[0] : (item.size1 || '');
      row[31] = item.sizes && item.sizes.length > 1 ? item.sizes[1] : (item.size2 || '');
      row[32] = item.quality || '';
      row[33] = item.color || '';
      row[34] = item.colorRef || '';
      row[35] = item.orderQty || '';
      row[36] = item.unitQty || '';
      row[37] = item.price || '';
      row[38] = item.unitPrice || '';
      row[39] = item.currency || 'USD';
      row[40] = item.innerPack || '';
      row[41] = item.outerPack || '';
      row[42] = item.addSample || '';
      row[43] = item.addProd || '';
      row[44] = item.totalQtyMfg || '';
      row[45] = '';
      row[46] = '';
      row[47] = '';
      row[48] = '';
      row[49] = '';
      row[50] = item.lineTotal || '';
      
      row[51] = '';
      row[52] = header.pay1Pct || '';
      row[53] = header.pay1Days || '';
      row[54] = header.pay1Activity || '';
      row[55] = header.pay1Amount || '';
      row[56] = header.pay1DueDate || '';
      
      row[57] = header.pay2Pct || '';
      row[58] = header.pay2Days || '';
      row[59] = header.pay2Activity || '';
      row[60] = header.pay2Amount || '';
      row[61] = header.pay2DueDate || '';
      
      row[62] = existingPdfUrl || '';
      row[63] = '';
      row[64] = userEmail || '';
      
      rowsToInsert.push(row);
    }
    
    if (rowsToInsert.length > 0 && sheetDatabase) {
      sheetDatabase.getRange(sheetDatabase.getLastRow() + 1, 1, rowsToInsert.length, 65).setValues(rowsToInsert);
    }

    // Invalidate caches after successful update
    const scriptCache = CacheService.getScriptCache();
    scriptCache.remove('pendingPOs');
    scriptCache.remove('activeRows_v2');
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'success', 
      data: { uid: uid, internalPO: internalPO } 
    })).setMimeType(ContentService.MimeType.JSON);
}

function getActiveRows() {
  // ── Cache: serve from cache if available (5 min) ──
  const cache = CacheService.getScriptCache();
  const cached = cache.get('activeRows_v2');
  if (cached) {
    try { return JSON.parse(cached); } catch(e) { /* cache miss */ }
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const currentYear = new Date().getFullYear();

  // ── 1. Build PDF map from PO PDF Links sheet ──
  const sheetPdf = ss.getSheetByName('PO PDF Links');
  const pdfMap = {};
  if (sheetPdf) {
    const pdfData = sheetPdf.getDataRange().getValues();
    for (let i = 1; i < pdfData.length; i++) {
      const internalPO = (pdfData[i][0] || '').toString().trim();
      const link = (pdfData[i][1] || '').toString().trim();
      if (internalPO && link) pdfMap[internalPO] = link;
    }
  }

  // ── 2. Read DATABASE sheet ──
  const sheetDatabase = ss.getSheetByName('DATABASE');
  if (!sheetDatabase) return [];
  const dbDataRange = sheetDatabase.getDataRange();
  const data = dbDataRange.getValues();
  const formulas = dbDataRange.getFormulas();

  // ── Helper: parse any timestamp string robustly ──
  function parseTs(raw) {
    if (!raw) return null;
    if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
    // toLocaleString format: "8/14/2026, 9:20:00 AM" or "14/8/2026, 09:20:00"
    const s = raw.toString().trim();
    // Try native Date parse first
    let d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    // Fallback: replace '/' with '-' for ISO-like formats
    d = new Date(s.replace(/\//g, '-'));
    if (!isNaN(d.getTime())) return d;
    return null;
  }

  // ── 3. SINGLE PASS: find latest timestamp per Internal PO ──
  //    Also track the contiguous block of rows for that PO.
  //    In handleCreatePO, all SKU rows for one PO are appended consecutively
  //    with the exact same timestamp string, so exact string match is safe.
  const latestEntryByPO = {}; // internalPO -> { tsStr, tsTime, startIdx, endIdx }

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const internalPO = (row[4] || '').toString().trim();
    if (!internalPO) continue;

    const ts = parseTs(row[0]);
    if (!ts) continue;
    if (ts.getFullYear() !== currentYear) continue;

    const tsTime = ts.getTime();
    const tsStr  = row[0].toString().trim(); // keep original string for exact match below

    if (!latestEntryByPO[internalPO] || tsTime > latestEntryByPO[internalPO].tsTime) {
      latestEntryByPO[internalPO] = { tsStr, tsTime };
    }
  }

  // ── 4. SECOND PASS: collect rows matching latest timestamp string per PO ──
  const allRows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const internalPO = (row[4] || '').toString().trim();
    if (!internalPO) continue;

    const entry = latestEntryByPO[internalPO];
    if (!entry) continue;

    // Match by exact timestamp string (all rows from same createPO/updatePO call share it)
    const rowTsStr = (row[0] || '').toString().trim();
    if (rowTsStr !== entry.tsStr) continue;

    const rowCopy = row.slice();
    
    // Extract Design Image URL (Col Z, index 25) from formulas since getValues() returns empty for them
    if (!rowCopy[25] && formulas && formulas[i] && formulas[i][25]) {
       const f = formulas[i][25];
       const match = f.match(/HYPERLINK\("([^"]+)"/i) || f.match(/IMAGE\("([^"]+)"/i);
       if (match) {
          rowCopy[25] = match[1];
       } else if (typeof f === 'string' && f.startsWith('http')) {
          rowCopy[25] = f;
       }
    }

    // Attach PDF from pdfMap if col BL (index 63) is empty
    if (!rowCopy[63] && pdfMap[internalPO]) {
      rowCopy[63] = pdfMap[internalPO];
    }
    rowCopy[65] = false;
    allRows.push(rowCopy);
  }

  // ── Cache result for 5 minutes (300 seconds) ──
  // CacheService has a 100KB limit per key — store only if small enough
  try {
    const serialized = JSON.stringify(allRows);
    if (serialized.length < 90000) {
      cache.put('activeRows_v2', serialized, 300);
    }
  } catch(e) { /* skip caching if too large */ }

  return allRows;
}

function handleGetAllPOs(params) {
  const activeRows = getActiveRows();
  const posMap = {};
  
  for (let i = activeRows.length - 1; i >= 0; i--) {
    const row = activeRows[i];
    const internalPO = row[4];
    if (!internalPO) continue;
    
    if (!posMap[internalPO]) {
      posMap[internalPO] = {
        uid: internalPO,
        originalUid: row[1],
        timestamp: row[0],
        fileNumber: row[2],
        buyerName: row[3],
        internalPO: internalPO,
        buyerPO: row[5],
        poDate: row[6],
        exFactory: row[7],
        deliveryTerms: row[8],
        portName: row[9],
        totalAmount: 0,
        currency: row[39] || 'USD',
        payTerm1: row[10],
        payTerm2: row[11],
        pdfUrl: row[63] || '',
        isOld: row[65] || false,
        rowIndex: i
      };
    }
    
    posMap[internalPO].totalAmount += (parseFloat(row[50]) || 0);
  }
  
  const pos = Object.values(posMap).sort((a, b) => b.rowIndex - a.rowIndex);
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    data: { pos: pos, total: pos.length, page: 1, limit: pos.length }
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetPOById(params) {
  const targetUid = params.uid;
  if (!targetUid) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'UID missing' })).setMimeType(ContentService.MimeType.JSON);
  
  const activeRows = getActiveRows();
  let targetInternalPO = targetUid;
  
  for (let i = activeRows.length - 1; i >= 0; i--) {
    if (activeRows[i][4] === targetInternalPO || activeRows[i][1] === targetInternalPO) {
      targetInternalPO = activeRows[i][4] || targetUid;
      break;
    }
  }
  
  const skus = [];
  let header = null;
  
  for (let i = 0; i < activeRows.length; i++) {
    const row = activeRows[i];
    if (row[4] === targetInternalPO || row[1] === targetUid) {
      if (!header) {
          header = {
            uid: targetInternalPO, // use internalPO as uid
            fileNumber: row[2],
            buyerName: row[3],
            internalPO: row[4] || targetInternalPO,
            buyerPO: row[5],
            poDate: row[6],
            exFactory: row[7],
            deliveryTerms: row[8],
            portName: row[9],
            payTerm1: row[10],
            payTerm2: row[11],
            buyerSource: row[12],
            buyerSubSrc: row[13],
            buyerSrcPct: row[14],
            buyerSubPct: row[15],
            billingAddr: row[16],
            deliveryAddr: row[17],
            onboardDate: row[18],
            pay1Pct: row[52],
            pay1Days: row[53],
            pay1Activity: row[54],
            pay1Amount: row[55],
            pay1DueDate: row[56],
            pay2Pct: row[58],
            pay2Days: row[59],
            pay2Activity: row[60],
            pay2Amount: row[61],
            pay2DueDate: row[62],
            isOld: row[65] || false,
            totalAmount: 0
          };
      } else {
          header.poDate = row[6] || header.poDate;
          header.exFactory = row[7] || header.exFactory;
          header.onboardDate = row[18] || header.onboardDate;
      }
      
      const itemAmount = parseFloat(row[50]) || 0;
      header.totalAmount += itemAmount;
      
      skus.push({
        id: "SKU-" + i,
        skuCode: row[22],
        product: row[23],
        articleNum: row[24],
        designImage: row[25],
        shape: row[26],
        designer: row[27],
        brand: row[28],
        description: row[29],
        size1: row[30],
        size2: row[31],
        sizes: [row[30], row[31]].filter(s => s),
        quality: row[32],
        color: row[33],
        colorRef: row[34],
        orderQty: row[35],
        unitQty: row[36],
        price: row[37],
        unitPrice: row[38],
        currency: row[39],
        innerPack: row[40],
        outerPack: row[41],
        addSample: row[42],
        addProd: row[43],
        totalQtyMfg: row[44],
        lineTotal: itemAmount
      });
    }
  }
  
  if (!header) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'PO not found' })).setMimeType(ContentService.MimeType.JSON);
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    data: { header, skus }
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetStats() {
  const activeRows = getActiveRows();
  const posMap = {};
  
  for (let i = activeRows.length - 1; i >= 0; i--) {
    const row = activeRows[i];
    const internalPO = row[4];
    if (!internalPO) continue;
    
    if (!posMap[internalPO]) {
      posMap[internalPO] = { 
        buyer: row[3] || 'Unknown Buyer', 
        totalQty: 0, 
        totalAmount: 0, 
        currency: row[39] || 'USD',
        date: row[0] 
      };
    }
    
    posMap[internalPO].totalQty += (parseInt(row[35]) || 0);
    posMap[internalPO].totalAmount += (parseFloat(row[50]) || 0);
    if (row[39]) posMap[internalPO].currency = row[39];
  }
  
  let thisMonth = 0;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  let totalQty = 0;
  const buyersMap = {};
  const totalValueByCurrency = {};
  
  Object.values(posMap).forEach(po => {
    totalQty += po.totalQty;
    const curr = (po.currency || 'USD').toString().trim().toUpperCase();
    
    totalValueByCurrency[curr] = (totalValueByCurrency[curr] || 0) + po.totalAmount;
    
    if (!buyersMap[po.buyer]) {
      buyersMap[po.buyer] = { name: po.buyer, poCount: 0, totalQty: 0, totalValueByCurrency: {} };
    }
    buyersMap[po.buyer].poCount++;
    buyersMap[po.buyer].totalQty += po.totalQty;
    buyersMap[po.buyer].totalValueByCurrency[curr] = (buyersMap[po.buyer].totalValueByCurrency[curr] || 0) + po.totalAmount;
    
    const ts = new Date(po.date);
    if (ts.getMonth() === currentMonth && ts.getFullYear() === currentYear) {
      thisMonth++;
    }
  });
  
  const buyersList = Object.values(buyersMap).sort((a, b) => b.totalQty - a.totalQty);
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    data: {
      totalPOs: Object.keys(posMap).length,
      totalValueByCurrency: totalValueByCurrency, 
      totalQty: totalQty,
      thisMonth: thisMonth,
      buyersCount: buyersList.length,
      buyerWise: buyersList
    }
  })).setMimeType(ContentService.MimeType.JSON);
}

// ── WhatsApp Automation via Maytapi ────────────────────────────────────────
const MAYTAPI_PRODUCT_ID = '0d0df307-0553-4dfd-8597-e3c2fd5300eb';
const MAYTAPI_TOKEN      = '54f10e32-bdf4-49cd-a464-33dc87c7c001';
const MAYTAPI_PHONE_ID   = '34244';

function getTimeGreeting() {
  // IST = UTC+5:30
  const now = new Date();
  const istHour = (now.getUTCHours() + 5) % 24 + (now.getUTCMinutes() >= 30 ? 0 : 0);
  // More accurate IST
  const istMs = now.getTime() + (5.5 * 60 * 60 * 1000);
  const istDate = new Date(istMs);
  const hour = istDate.getUTCHours();

  if (hour >= 5 && hour < 12) {
    return { greeting: 'Good Morning', emoji: '🌅' };
  } else if (hour >= 12 && hour < 17) {
    return { greeting: 'Good Afternoon', emoji: '☀️' };
  } else {
    return { greeting: 'Good Evening', emoji: '🌙' };
  }
}

function handleSendWhatsApp(data) {
  const { internalPO, pdfUrl, buyerName, buyerPO } = data;
  if (!internalPO) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'internalPO is required' })).setMimeType(ContentService.MimeType.JSON);
  }

  // Read recipients from whatsApp sheet (col A = Name, col B = Mobile Number)
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const waSheet = ss.getSheetByName('whatsApp');
  if (!waSheet) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'whatsApp sheet not found' })).setMimeType(ContentService.MimeType.JSON);
  }

  const waData = waSheet.getDataRange().getValues();
  const recipients = [];
  for (let i = 1; i < waData.length; i++) {
    const name   = (waData[i][0] || '').toString().trim();
    const mobile = (waData[i][1] || '').toString().trim().replace(/\D/g, ''); // digits only
    if (name && mobile) {
      recipients.push({ name, mobile });
    }
  }

  if (recipients.length === 0) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'No recipients found in whatsApp sheet' })).setMimeType(ContentService.MimeType.JSON);
  }

  const { greeting, emoji } = getTimeGreeting();
  const results = [];

  const maytapiUrl = `https://api.maytapi.com/api/${MAYTAPI_PRODUCT_ID}/${MAYTAPI_PHONE_ID}/sendMessage`;
  const headers = {
    'Content-Type': 'application/json',
    'x-maytapi-key': MAYTAPI_TOKEN
  };
  
  // Convert Drive Viewer URL to Base64 to preserve PDF format on Mobile
  let mediaMessageUrl = pdfUrl;
  const safeFilename = internalPO.replace(/[\/\\]/g, '-');

  if (pdfUrl && pdfUrl.includes('drive.google.com/file/d/')) {
    const fileIdMatch = pdfUrl.match(/[-\w]{25,}/);
    if (fileIdMatch) {
      try {
        const fileId = fileIdMatch[0];
        const file = DriveApp.getFileById(fileId);
        const blob = file.getBlob();
        const b64 = Utilities.base64Encode(blob.getBytes());
        mediaMessageUrl = "data:application/pdf;base64," + b64;
      } catch (e) {
        // Fallback to URL
        mediaMessageUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[0]}`;
      }
    }
  }

  for (const recipient of recipients) {
    // Format Indian mobile: ensure country code 91
    let phoneNumber = recipient.mobile;
    if (phoneNumber.length === 10) {
      phoneNumber = '91' + phoneNumber;
    } else if (phoneNumber.startsWith('0')) {
      phoneNumber = '91' + phoneNumber.substring(1);
    }
    // Maytapi expects number@c.us format
    const to = phoneNumber + '@c.us';

    // Compose the WhatsApp message
    const messageText =
      `${emoji} ${greeting}, ${recipient.name} Ji! 🙏\n\n` +
      `📋 *Purchase Order Generated*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *Buyer:* ${buyerName || 'N/A'}\n` +
      `🔖 *Buyer PO:* ${buyerPO || 'N/A'}\n` +
      `🏷️ *Internal PO:* ${internalPO}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Your Purchase Order has been successfully generated and saved. ✅`;

    // Send text message
    try {
      const textPayload = {
        to_number: to,
        type: 'text',
        message: messageText
      };

      const textResponse = UrlFetchApp.fetch(maytapiUrl, {
        method: 'post',
        headers: headers,
        payload: JSON.stringify(textPayload),
        muteHttpExceptions: true
      });

      const textResult = JSON.parse(textResponse.getContentText());
      results.push({
        name: recipient.name,
        phone: phoneNumber,
        textStatus: textResult.success ? 'sent' : 'failed',
        textResponse: textResult
      });

      // If PDF URL is available, also send as media
      if (mediaMessageUrl) {
        Utilities.sleep(1000); // small delay between messages
        const mediaPayload = {
          to_number: to,
          type: 'media',
          message: mediaMessageUrl,
          text: `📄 ${safeFilename}.pdf`,
          filename: `${safeFilename}.pdf`
        };

        const mediaResponse = UrlFetchApp.fetch(maytapiUrl, {
          method: 'post',
          headers: headers,
          payload: JSON.stringify(mediaPayload),
          muteHttpExceptions: true
        });

        const mediaResult = JSON.parse(mediaResponse.getContentText());
        results[results.length - 1].mediaStatus = mediaResult.success ? 'sent' : 'failed';
        results[results.length - 1].mediaResponse = mediaResult;
      }

    } catch (err) {
      results.push({ name: recipient.name, phone: phoneNumber, textStatus: 'error', error: err.toString() });
    }

    Utilities.sleep(300); // delay between recipients
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    data: { message: `WhatsApp notifications sent to ${results.length} recipient(s)`, results: results }
  })).setMimeType(ContentService.MimeType.JSON);
}
