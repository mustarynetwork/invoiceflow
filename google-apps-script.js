/**
 * InvoiceFlow — Google Apps Script Backend (v2 — with Email)
 * ===========================================================
 * IMPORTANT: Replace your existing Apps Script with this full file.
 * After pasting, click Deploy → Manage deployments → Edit → Deploy again.
 * The URL stays the same — no need to update Settings in the app.
 */

const SHEET_NAME = 'Invoices';
const PURCHASE_SHEET_NAME = 'Purchases';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'email') {
      sendInvoiceEmail(data);
    } else {
      saveInvoice(data);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    if (e.parameter.action === 'getInvoices') {
      return getInvoices();
    }
    if (e.parameter.action === 'getPurchases') {
      return getPurchases();
    }
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'InvoiceFlow backend running ✓' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Save invoice or purchase row to sheet ─────────────────────────────────────────────
function saveInvoice(d) {
  const SHEET_ID = '1ChCPBgP-cSwTuTnFMkKsbV9LGtFTyeTcJPuXIAMulcE'; // ← paste your sheet ID
  
  if (SHEET_ID === 'YOUR_SHEET_ID_HERE') {
    throw new Error('Sheet ID not configured. Replace YOUR_SHEET_ID_HERE with your actual Google Sheet ID.');
  }
  
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheetName = d.docType === 'purchase' ? PURCHASE_SHEET_NAME : SHEET_NAME;
  let   sheet = ss.getSheetByName(sheetName);

  const headers = [
    'Timestamp','Document #','Date','Due Date','Status','Currency',
    'From Name','From Email','From Address','To Name','To Email','To Address',
    'Items (JSON)','Subtotal','Tax Rate (%)','Tax Amount','Discount','Grand Total',
    'Notes','Terms'
  ];

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1,1,1,headers.length)
         .setBackground('#4361ee').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  const row = [
    new Date(), 
    d.number||'', 
    d.date||'', 
    d.dueDate||'', 
    d.status||'', 
    d.currency||'',
    d.fromName||'', 
    d.fromEmail||'', 
    d.fromAddress||'', 
    d.toName||'', 
    d.toEmail||'', 
    d.toAddress||'',
    (typeof d.items === 'string' ? d.items : JSON.stringify(d.items||[])),
    d.subtotal||0, 
    d.taxRate||0, 
    d.taxAmount||0, 
    d.discount||0, 
    d.grandTotal||0,
    d.notes||'', 
    d.terms||''
  ];
  
  sheet.appendRow(row);
}

// ── Retrieve all invoices/purchases from sheet ────────────────────────────────────────
function getInvoices() {
  try {
    const SHEET_ID = '1ChCPBgP-cSwTuTnFMkKsbV9LGtFTyeTcJPuXIAMulcE'; // ← paste your sheet ID
    
    if (SHEET_ID === 'YOUR_SHEET_ID_HERE') {
      throw new Error('Sheet ID not configured. Replace YOUR_SHEET_ID_HERE with your actual Google Sheet ID.');
    }
    
    const ss    = SpreadsheetApp.openById(SHEET_ID);
    let   sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', invoices: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', invoices: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = data[0];
    const invoices = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const invoice = {};
      headers.forEach((header, idx) => {
        invoice[header] = row[idx];
      });
      invoices.push(invoice);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', invoices: invoices }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Retrieve purchases from sheet ──────────────────────────────────────
function getPurchases() {
  try {
    const SHEET_ID = '1ChCPBgP-cSwTuTnFMkKsbV9LGtFTyeTcJPuXIAMulcE'; // ← paste your sheet ID
    
    if (SHEET_ID === 'YOUR_SHEET_ID_HERE') {
      throw new Error('Sheet ID not configured. Replace YOUR_SHEET_ID_HERE with your actual Google Sheet ID.');
    }
    
    const ss    = SpreadsheetApp.openById(SHEET_ID);
    let   sheet = ss.getSheetByName(PURCHASE_SHEET_NAME);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', purchases: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', purchases: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = data[0];
    const purchases = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const purchase = {};
      headers.forEach((header, idx) => {
        purchase[header] = row[idx];
      });
      purchases.push(purchase);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', purchases: purchases }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Send email with invoice link ──────────────────────────────────────────
function sendInvoiceEmail(data) {
  const to      = data.to;
  const subject = data.subject;
  const body    = data.body;
  const link    = data.invoiceLink;
  const d       = data.invoiceData || {};

  // Build a clean HTML email
  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e">
      <div style="background:#4361ee;padding:20px 28px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;font-size:22px;margin:0">InvoiceFlow</h1>
      </div>
      <div style="background:#ffffff;padding:28px;border:1px solid #e0e0ef;border-top:none">
        <p style="white-space:pre-line;font-size:15px;line-height:1.6;color:#1a1a2e">${body}</p>
        <div style="margin:24px 0;background:#f5f6fa;border-radius:8px;padding:20px">
          <table style="width:100%;font-size:14px;color:#4a4a6a">
            <tr><td style="padding:4px 0"><strong>Invoice #</strong></td><td style="text-align:right">${d.number||''}</td></tr>
            <tr><td style="padding:4px 0"><strong>Date</strong></td><td style="text-align:right">${d.date||''}</td></tr>
            <tr><td style="padding:4px 0"><strong>Due Date</strong></td><td style="text-align:right">${d.dueDate||''}</td></tr>
            <tr style="border-top:2px solid #4361ee">
              <td style="padding:10px 0 0;font-size:16px;font-weight:700;color:#1a1a2e"><strong>Amount Due</strong></td>
              <td style="padding:10px 0 0;font-size:16px;font-weight:700;color:#4361ee;text-align:right">${d.grandTotal ? d.grandTotal.toFixed(2) : '0.00'} ${d.currency||''}</td>
            </tr>
          </table>
        </div>
        <div style="text-align:center;margin:24px 0">
          <a href="${link}" style="background:#4361ee;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
            View Invoice Online →
          </a>
        </div>
        <p style="font-size:12px;color:#4a4a6a;margin-top:24px;border-top:1px solid #e0e0ef;padding-top:16px">
          Or copy this link: <a href="${link}" style="color:#4361ee">${link}</a>
        </p>
      </div>
      <div style="background:#f5f6fa;padding:14px 28px;border-radius:0 0 8px 8px;font-size:12px;color:#4a4a6a;text-align:center">
        Sent via InvoiceFlow
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to:       to,
    subject:  subject,
    body:     body + '\n\nView invoice: ' + link,  // plain text fallback
    htmlBody: htmlBody,
  });
}
