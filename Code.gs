const SHEET_ID = '1GFGnd4jfIhbq_lD3vDT4YUyzu1Okhc3dkrAHlnw4cHQ';
const FOLDER_ID = '1AFkGysktaXFmX9h8w-AJadgzCJPxZ8r0';

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
