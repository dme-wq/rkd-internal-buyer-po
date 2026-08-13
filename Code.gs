const SHEET_ID = '1GFGnd4jfIhbq_lD3vDT4YUyzu1Okhc3dkrAHlnw4cHQ';
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
  
  const extractUnique = (sheetName, colIndex) => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    const unique = new Set();
    for (let i = 1; i < data.length; i++) {
      const val = data[i][colIndex];
      if (val !== undefined && val !== null && val.toString().trim() !== '') {
        unique.add(val.toString().trim());
      }
    }
    return [...unique];
  };

  const shapes = extractUnique('Drop Downs', 27); // AB
  const designers = extractUnique('Drop Downs', 16); // Q
  const brands = extractUnique('Drop Downs', 32); // AG
  const sizes = extractUnique('Drop Downs', 22); // W
  const qualities = extractUnique('Drop Downs', 33); // AH
  const colors = extractUnique('Drop Downs', 17); // R
  const ppTopSamples = extractUnique('Drop Downs', 35); // AJ
  const portNames = extractUnique('Drop Downs', 36); // AK
  const deliveryTerms = extractUnique('Drop Downs', 8); // I

  const unitsQty = extractUnique('list', 4); // E
  const unitsPrice = extractUnique('list', 3); // D
  const packs = extractUnique('list', 5); // F

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
  const cache = CacheService.getScriptCache();
  const cachedData = cache.get('pendingPOs');
  if (cachedData) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: JSON.parse(cachedData)
    })).setMimeType(ContentService.MimeType.JSON);
  }

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
    const val = dbData[i][4];
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
  
  // Cache the results for 15 minutes (900 seconds)
  cache.put('pendingPOs', JSON.stringify(uniquePendingPOs), 900);
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    data: uniquePendingPOs
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleCreatePO(data) {
    const { header, skus } = data;
    
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('DATABASE');
    const timestamp = new Date().toLocaleString();
    const uniqueId = "PO-" + Date.now();
    const internalPO = header.internalPO || ''; 
    
    // Create an array of rows to insert
    const rowsToInsert = [];
    
    for (let i = 0; i < skus.length; i++) {
      const item = skus[i];
      const row = new Array(64).fill(''); // 64 columns
      
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
      row[10] = header.payTerm1 || ''; // ColK Payment Terms 1
      row[11] = header.payTerm2 || ''; // ColL Payment Terms 2
      row[12] = header.buyerSource || ''; // ColM Buyer Source Name
      row[13] = header.buyerSubSrc || ''; // ColN Buyer Sub Source Name
      row[14] = header.buyerSrcPct || ''; // ColO Buyer Source Name %
      row[15] = header.buyerSubPct || ''; // ColP Buyer Sub Source Name %
      row[16] = header.billingAddr || ''; // ColQ Billing Address
      row[17] = header.deliveryAddr || ''; // ColR Delivery Address
      row[18] = header.onboardDate || ''; // ColS Onboard Vessel Date
      
      // Handle Base64 Image upload to Drive
      let finalImageUrl = item.designImage || '';
      if (finalImageUrl.startsWith('data:image')) {
        finalImageUrl = saveImageToDrive(finalImageUrl, `Image_${internalPO}_${Date.now()}_${i}.png`);
      }

      // Map Line Items
      row[22] = item.skuCode || ''; // ColW SKU Code
      row[23] = item.product || ''; // ColX Product
      row[24] = item.articleNum || ''; // ColY Item/Product/Article #
      row[25] = finalImageUrl; // ColZ Design Image
      row[26] = item.shape || ''; // ColAA Shape
      row[27] = item.designer || ''; // ColAB Designer Name
      row[28] = item.brand || ''; // ColAC Brand Name
      row[29] = item.description || ''; // ColAD Description
      row[30] = item.size1 || ''; // ColAE Size 1
      row[31] = item.size2 || ''; // ColAF Size 2
      row[32] = item.quality || ''; // ColAG Quality
      row[33] = item.color || ''; // ColAH Color
      row[34] = item.colorRef || ''; // ColAI Color Ref
      row[35] = item.orderQty || ''; // ColAJ Order Quantity
      row[36] = item.unitQty || ''; // ColAK Unit of Quantity
      row[37] = item.price || ''; // ColAL Price
      row[38] = item.unitPrice || ''; // ColAM Unit of Price
      row[39] = item.currency || 'USD'; // ColAN Currency
      row[40] = item.innerPack || ''; // ColAO Inner Pack
      row[41] = item.outerPack || ''; // ColAP Outer Pack
      row[42] = item.addSample || ''; // ColAQ Additional Sample
      row[43] = item.addProd || ''; // ColAR Additional Production
      row[44] = item.totalQtyMfg || ''; // ColAS Total Quantity to Manufacture
      
      row[50] = item.lineTotal || ''; // ColAY Total Amount
      
      // Payment Terms 1
      row[52] = header.pay1Pct || ''; // ColBA Payment Term 1 %
      row[53] = header.pay1Days || ''; // ColBB Payment Term 1 Days
      row[54] = header.pay1Activity || ''; // ColBC Payment Term 1 Activity
      row[55] = header.pay1Amount || ''; // ColBD Payment Term 1 Amount
      row[56] = header.pay1DueDate || ''; // ColBE Payment Term 1 Due Date
      
      // Payment Terms 2
      row[58] = header.pay2Pct || ''; // ColBG Payment Term 2 %
      row[59] = header.pay2Days || ''; // ColBH Payment Term 2 Days
      row[60] = header.pay2Activity || ''; // ColBI Payment Term 2 Activity
      row[61] = header.pay2Amount || ''; // ColBJ Payment Term 2 Amount
      row[62] = header.pay2DueDate || ''; // ColBK Payment Term 2 Due Date
      
      rowsToInsert.push(row);
    }
    
    if (rowsToInsert.length > 0) {
      // Append all rows at once to be efficient
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToInsert.length, 64).setValues(rowsToInsert);
    }

    CacheService.getScriptCache().remove('pendingPOs');
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
        
        // Find row by uid and update column 64 with PDF URL
        const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('DATABASE');
        const dataRange = sheet.getDataRange().getValues();
        for (let i = 1; i < dataRange.length; i++) {
           if (dataRange[i][1] === uid) {
               sheet.getRange(i + 1, 64).setValue(file.getUrl());
           }
        }
        
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

const GEMINI_API_KEY = "AQ.Ab8RN" + "6LipHIPWvyG48MktJ8BIt6PVTed25yEbHzjDudtJLFH9Q";

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
  const mimeType = getMimeTypeFromBlob(blob);
  
  // Upload to Gemini File API to avoid Apps Script memory crash with large base64 strings
  const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`;
  const uploadOptions = {
    method: 'post',
    payload: blob,
    headers: {
      'X-Goog-Upload-Protocol': 'raw',
      'X-Goog-Upload-Header-Content-Type': mimeType
    },
    muteHttpExceptions: true
  };
  
  const uploadResponse = UrlFetchApp.fetch(uploadUrl, uploadOptions);
  const uploadJson = JSON.parse(uploadResponse.getContentText());
  
  if (uploadJson.error) {
    throw new Error("Gemini Upload Error: " + uploadJson.error.message);
  }
  
  const fileUri = uploadJson.file.uri;

  const documentParts = [{
    fileData: {
      mimeType: mimeType,
      fileUri: fileUri
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
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
    const { uid, header, skus } = data;
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('DATABASE');
    const dataRange = sheet.getDataRange().getValues();
    
    let rowsToDelete = [];
    for (let i = dataRange.length - 1; i >= 1; i--) {
        if (dataRange[i][1] === uid) {
            rowsToDelete.push(i + 1);
        }
    }
    
    for (let i = 0; i < rowsToDelete.length; i++) {
        sheet.deleteRow(rowsToDelete[i]);
    }
    
    const timestamp = new Date().toLocaleString();
    const internalPO = header.internalPO || ''; 
    const rowsToInsert = [];
    
    for (let i = 0; i < skus.length; i++) {
      const item = skus[i];
      const row = new Array(64).fill('');
      
      let finalImageUrl = item.designImage || '';
      if (finalImageUrl.startsWith('data:image')) {
        finalImageUrl = saveImageToDrive(finalImageUrl, `Image_${internalPO}_${Date.now()}_${i}.png`);
      }

      row[0] = timestamp;
      row[1] = uid;
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
      
      row[22] = item.skuCode || '';
      row[23] = item.product || '';
      row[24] = item.articleNum || '';
      row[25] = finalImageUrl;
      row[26] = item.shape || '';
      row[27] = item.designer || '';
      row[28] = item.brand || '';
      row[29] = item.description || '';
      row[30] = item.size1 || '';
      row[31] = item.size2 || '';
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
      row[50] = item.lineTotal || '';
      
      row[52] = header.pay1Pct || '';
      row[53] = header.pay1Days || '';
      row[54] = header.pay1Activity || '';
      row[55] = header.pay1Amount || '';
      row[56] = header.pay1DueDate || '';
      
      row[58] = header.pay2Pct || '';
      row[59] = header.pay2Days || '';
      row[60] = header.pay2Activity || '';
      row[61] = header.pay2Amount || '';
      row[62] = header.pay2DueDate || '';
      
      for (let j = 1; j < dataRange.length; j++) {
        if (dataRange[j][1] === uid) {
          row[63] = dataRange[j][63] || '';
          break;
        }
      }
      
      rowsToInsert.push(row);
    }
    
    if (rowsToInsert.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToInsert.length, 64).setValues(rowsToInsert);
    }

    CacheService.getScriptCache().remove('pendingPOs');
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'success', 
      data: { uid: uid, internalPO: internalPO } 
    })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetAllPOs(params) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('DATABASE');
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'DATABASE sheet not found' })).setMimeType(ContentService.MimeType.JSON);
  
  const data = sheet.getDataRange().getValues();
  const posMap = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const uid = row[1];
    if (!uid) continue;
    
    if (!posMap[uid]) {
      posMap[uid] = {
        uid: uid,
        timestamp: row[0],
        fileNumber: row[2],
        buyerName: row[3],
        internalPO: row[4],
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
        rowIndex: i
      };
    } else {
      // Update rowIndex so it sorts by the latest added line item for this PO
      posMap[uid].rowIndex = i;
      // Also update pdfUrl if it's available in a later row
      if (row[63]) posMap[uid].pdfUrl = row[63];
      if (row[6]) posMap[uid].poDate = row[6];
      if (row[0]) posMap[uid].timestamp = row[0];
      if (row[3]) posMap[uid].buyerName = row[3];
      if (row[4]) posMap[uid].internalPO = row[4];
      if (row[5]) posMap[uid].buyerPO = row[5];
    }
    posMap[uid].totalAmount += (parseFloat(row[50]) || 0);
  }
  
  const pos = Object.values(posMap).sort((a, b) => b.rowIndex - a.rowIndex);
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    data: { pos: pos, total: pos.length, page: 1, limit: pos.length }
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetPOById(params) {
  const uid = params.uid;
  if (!uid) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'UID missing' })).setMimeType(ContentService.MimeType.JSON);
  
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('DATABASE');
  const data = sheet.getDataRange().getValues();
  
  const skus = [];
  let header = null;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[1] === uid) {
      if (!header) {
        header = {
          uid: uid,
          fileNumber: row[2],
          buyerName: row[3],
          internalPO: row[4],
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
          totalAmount: 0
        };
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
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('DATABASE');
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ status: 'error' })).setMimeType(ContentService.MimeType.JSON);
  
  const data = sheet.getDataRange().getValues();
  const uids = new Set();
  const buyersMap = {}; // store { poCount, totalQty, totalValue } per buyer
  
  let thisMonth = 0;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  let totalValue = 0;
  let totalQty = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const uid = row[1];
    
    if (!uid) continue;
    
    const buyer = row[3] || 'Unknown Buyer';
    const amount = parseFloat(row[50]) || 0;
    const qty = parseInt(row[35]) || 0;
    
    totalValue += amount;
    totalQty += qty;
    
    if (!buyersMap[buyer]) {
      buyersMap[buyer] = { name: buyer, poCount: 0, totalQty: 0, totalValue: 0, uids: new Set() };
    }
    
    buyersMap[buyer].totalQty += qty;
    buyersMap[buyer].totalValue += amount;
    
    if (!uids.has(uid)) {
      uids.add(uid);
      buyersMap[buyer].uids.add(uid);
      
      const ts = new Date(row[0]);
      if (ts.getMonth() === currentMonth && ts.getFullYear() === currentYear) {
        thisMonth++;
      }
    }
  }
  
  // Convert buyer sets to counts
  const buyersList = Object.values(buyersMap).map(b => ({
    name: b.name,
    poCount: b.uids.size,
    totalQty: b.totalQty,
    totalValue: b.totalValue
  })).sort((a, b) => b.totalValue - a.totalValue);
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    data: {
      totalPOs: uids.size,
      totalValue: totalValue, 
      totalQty: totalQty,
      thisMonth: thisMonth,
      buyersCount: Object.keys(buyersMap).length,
      buyerWise: buyersList
    }
  })).setMimeType(ContentService.MimeType.JSON);
}
