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

function handleCreatePO(data) {
    const { header, skus } = data;
    
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('DATABASE');
    const timestamp = new Date().toLocaleString();
    const uniqueId = "PO-" + Date.now();
    const internalPO = `RKD/2026/${Math.floor(Math.random() * 1000)}`; // Basic generation
    
    // Create an array of rows to insert
    const rowsToInsert = [];
    
    for (let i = 0; i < skus.length; i++) {
      const item = skus[i];
      const row = new Array(64).fill(''); // 64 columns
      
      // Map Metadata
      row[0] = timestamp; // Col1 Timestamp
      row[1] = uniqueId; // Col2 Unique ID
      row[2] = header.fileNumber || ''; // Col3 File Number
      row[3] = header.buyerName || ''; // Col4 Buyer Name
      row[4] = internalPO; // Col5 Internal PO Number
      row[5] = header.buyerPO || ''; // Col6 Buyer PO Number
      row[6] = header.poDate || ''; // Col7 PO Date
      row[7] = header.exFactory || ''; // Col8 Ex-Factory Date
      row[8] = header.deliveryTerms || ''; // Col9 Delivery Terms
      row[9] = header.portName || ''; // Col10 Port Name
      row[10] = header.payTerm1 || ''; // Col11 Payment Terms 1
      row[11] = header.payTerm2 || ''; // Col12 Payment Terms 2
      row[12] = header.buyerSource || ''; // Col13 Buyer Source Name
      row[13] = header.buyerSubSrc || ''; // Col14 Buyer Sub Source Name
      row[14] = header.buyerSrcPct || ''; // Col15
      row[15] = header.buyerSubPct || ''; // Col16
      row[16] = header.billingAddr || ''; // Col17 Billing Address
      row[17] = header.deliveryAddr || ''; // Col18 Delivery Address
      row[18] = header.onboardDate || ''; // Col19 Onboard Vessel Date
      
      // Map Line Items
      row[22] = item.skuCode || ''; // Col23 SKU Code
      row[23] = item.product || ''; // Col24 Product
      row[24] = item.articleNum || ''; // Col25 Item/Product/Article #
      row[25] = item.designImage || ''; // Col26 Design Image
      row[26] = item.shape || ''; // Col27 Shape
      row[27] = item.designer || ''; // Col28 Designer Name
      row[28] = item.brand || ''; // Col29 Brand Name
      row[29] = item.description || ''; // Col30 Description
      row[30] = item.size1 || ''; // Col31 Size 1
      row[31] = item.size2 || ''; // Col32 Size 2
      row[32] = item.quality || ''; // Col33 Quality
      row[33] = item.color || ''; // Col34 Color
      row[34] = item.colorRef || ''; // Col35 Color Ref
      row[35] = item.orderQty || ''; // Col36 Order Quantity
      row[36] = item.unitQty || ''; // Col37 Unit of Quantity
      row[37] = item.price || ''; // Col38 Price
      row[38] = item.unitPrice || ''; // Col39 Unit of Price
      row[39] = item.currency || 'USD'; // Col40 Currency
      row[40] = item.innerPack || ''; // Col41 Inner Pack
      row[41] = item.outerPack || ''; // Col42 Outer Pack
      row[42] = item.addSample || ''; // Col43 Additional Sample
      row[43] = item.addProd || ''; // Col44 Additional Production
      row[44] = item.totalQtyMfg || ''; // Col45 Total Quantity to Manufacture
      
      row[50] = item.lineTotal || ''; // Col51 Total Amount
      
      // Payment Terms 1
      row[52] = header.pay1Pct || ''; // Col53
      row[53] = header.pay1Days || ''; // Col54
      row[54] = header.pay1Activity || ''; // Col55
      row[55] = header.pay1Amount || ''; // Col56
      row[56] = header.pay1DueDate || ''; // Col57
      
      // Payment Terms 2
      row[58] = header.pay2Pct || ''; // Col59
      row[59] = header.pay2Days || ''; // Col60
      row[60] = header.pay2Activity || ''; // Col61
      row[61] = header.pay2Amount || ''; // Col62
      row[62] = header.pay2DueDate || ''; // Col63
      
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
