import re

with open('Code.gs', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Insert getActiveRows before handleGetAllPOs
get_active_rows = '''function getActiveRows() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let allRows = [];
  
  const sheetDatatab = ss.getSheetByName('DATATAB');
  if (sheetDatatab) {
    const data = sheetDatatab.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][64] === 'ACTIVATE') {
        allRows.push(data[i]);
      }
    }
  }
  
  const sheetDatabase = ss.getSheetByName('DATABASE');
  if (sheetDatabase) {
    const data = sheetDatabase.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      allRows.push(data[i]);
    }
  }
  
  return allRows;
}

function handleGetAllPOs'''

content = re.sub(r'function handleGetAllPOs', get_active_rows, content, count=1)

# 2. Replace handleGetAllPOs
handle_get_all_pos_old = r'function handleGetAllPOs.*?status: \'success\',.*?\}\)\)\.setMimeType\(ContentService\.MimeType\.JSON\);\s*\}'
handle_get_all_pos_new = '''function handleGetAllPOs(params) {
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
}'''
content = re.sub(handle_get_all_pos_old, handle_get_all_pos_new, content, flags=re.DOTALL)

# 3. Replace handleGetPOById
handle_get_po_by_id_old = r'function handleGetPOById.*?status: \'success\',.*?\}\)\)\.setMimeType\(ContentService\.MimeType\.JSON\);\s*\}'
handle_get_po_by_id_new = '''function handleGetPOById(params) {
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
}'''
content = re.sub(handle_get_po_by_id_old, handle_get_po_by_id_new, content, flags=re.DOTALL)

# 4. Replace handleGetStats top part
handle_get_stats_old = r'function handleGetStats\(\) \{.*?let thisMonth = 0;'
handle_get_stats_new = '''function handleGetStats() {
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
  
  let thisMonth = 0;'''
content = re.sub(handle_get_stats_old, handle_get_stats_new, content, flags=re.DOTALL)

# 5. Replace handleUpdatePO 
handle_update_po_old = r'function handleUpdatePO\(data\) \{.*?if \(rowsToInsert\.length > 0\) \{'
handle_update_po_new = '''function handleUpdatePO(data) {
    const { uid, header, skus } = data;
    const activeRows = getActiveRows();
    let existingPdfUrl = '';
    for (let i = 0; i < activeRows.length; i++) {
      if (activeRows[i][4] === uid || activeRows[i][1] === uid) {
        existingPdfUrl = activeRows[i][63] || '';
        if (existingPdfUrl) break;
      }
    }

    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    const sheetDatabase = ss.getSheetByName('DATABASE');
    if (sheetDatabase) {
      const dbData = sheetDatabase.getDataRange().getValues();
      let rowsToDelete = [];
      for (let i = dbData.length - 1; i >= 1; i--) {
          if (dbData[i][4] === uid || dbData[i][1] === uid) {
              rowsToDelete.push(i + 1);
          }
      }
      for (let i = 0; i < rowsToDelete.length; i++) {
          sheetDatabase.deleteRow(rowsToDelete[i]);
      }
    }
    
    const sheetDatatab = ss.getSheetByName('DATATAB');
    if (sheetDatatab) {
      const dtData = sheetDatatab.getDataRange().getValues();
      for (let i = dtData.length - 1; i >= 1; i--) {
          if (dtData[i][4] === uid || dtData[i][1] === uid) {
              sheetDatatab.getRange(i + 1, 65).setValue("NON ACTIVE");
          }
      }
    }
    
    const timestamp = new Date().toLocaleString();
    const internalPO = header.internalPO || uid; 
    const uniqueId = internalPO;
    const rowsToInsert = [];
    
    for (let i = 0; i < skus.length; i++) {
      const item = skus[i];
      const row = new Array(64).fill('');
      
      let finalImageUrl = item.designImage || '';
      if (finalImageUrl.startsWith('data:image')) {
        finalImageUrl = saveImageToDrive(finalImageUrl, `Image_${internalPO}_${Date.now()}_${i}.png`);
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
      
      row[63] = existingPdfUrl;
      
      rowsToInsert.push(row);
    }
    
    if (rowsToInsert.length > 0) {'''
content = re.sub(handle_update_po_old, handle_update_po_new, content, flags=re.DOTALL)

with open('Code.gs', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
