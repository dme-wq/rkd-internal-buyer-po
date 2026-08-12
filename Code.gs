const SHEET_ID = '1GFGnd4jfIhbq_lD3vDT4YUyzu1Okhc3dkrAHlnw4cHQ';
const FOLDER_ID = '1AFkGysktaXFmX9h8w-AJadgzCJPxZ8r0';

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'getDropdowns') {
      return handleGetDropdowns();
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
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  // Helper to normalize PO strings by removing year suffix like '/26'
  const normalizePO = (po) => po.replace(/\/\d{2}$/, '').trim().toLowerCase();

  // 1. Get all Internal POs from 'PO Entry' sheet (Column N)
  const poEntrySheet = ss.getSheetByName('PO Entry');
  if (!poEntrySheet) throw new Error("PO Entry sheet not found");
  const poEntryData = poEntrySheet.getDataRange().getValues();
  const allInternalPOs = [];
  
  // Find column index for "Internal PO Number" to be robust
  let internalPOColIndex = 13; // default to N
  let dataStartRow = 1;
  for (let i = 0; i < Math.min(poEntryData.length, 20); i++) {
    for (let j = 0; j < poEntryData[i].length; j++) {
      if (poEntryData[i][j] && poEntryData[i][j].toString().trim().toLowerCase() === 'internal po number') {
        internalPOColIndex = j;
        dataStartRow = i + 1;
        break;
      }
    }
  }

  for (let i = dataStartRow; i < poEntryData.length; i++) {
    const val = poEntryData[i][internalPOColIndex];
    if (val && val.toString().trim() !== '') {
      allInternalPOs.push(val.toString().trim());
    }
  }
  
  // 2. Get all used Internal POs from 'DATABASE' sheet (Column E = index 4)
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
  
  // 3. Filter pending POs
  const pendingPOs = allInternalPOs.filter(po => {
    // If the exact PO is in the DB, or the normalized PO is in the DB, skip it.
    return !usedPOs.has(normalizePO(po));
  });
  
  // Remove duplicates
  const uniquePendingPOs = [...new Set(pendingPOs)];
  
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
      
      // Map Line Items
      row[22] = item.skuCode || ''; // ColW SKU Code
      row[23] = item.product || ''; // ColX Product
      row[24] = item.articleNum || ''; // ColY Item/Product/Article #
      row[25] = item.designImage || ''; // ColZ Design Image
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

  const file = DriveApp.getFileById(fileId);
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
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
