/* ====== FAKTUR RENDERER & ACTIONS ====== */

function tampilkanFaktur(tx) {
  if (!tx) return;
  lastTxForStruk = tx;
  
  var tgl = new Date(tx.timestamp).toLocaleString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  
  // Setup HTML Faktur
  document.getElementById('fk-no').textContent = tx.id;
  document.getElementById('fk-tanggal').textContent = tgl;
  document.getElementById('fk-pelanggan').textContent = tx.namaHutang || 'Umum / Customer';
  document.getElementById('fk-telepon').textContent = tx.waHutang || '-';
  document.getElementById('fk-alamat').textContent = tx.alamatHutang || '-';
  
  // Populate Table Rows
  var tbody = document.getElementById('fk-table-body');
  if (tbody) {
    tbody.innerHTML = '';
    tx.items.forEach(function(item, idx) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td class="faktur-col-center">' + (idx + 1) + '</td>' +
        '<td>' + esc(item.nama) + '</td>' +
        '<td class="faktur-col-center">' + item.qty + ' ' + esc(item.satuan || 'pcs') + '</td>' +
        '<td class="faktur-col-right">' + Number(item.hargaJual).toLocaleString('id-ID') + '</td>' +
        '<td class="faktur-col-right">' + Number(item.qty * item.hargaJual).toLocaleString('id-ID') + '</td>';
      tbody.appendChild(tr);
    });
    
    // Add empty rows if items are fewer than 5 to match visual layout in Faktur Uncen Fresh.png
    var minRows = 5;
    for (var i = tx.items.length; i < minRows; i++) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td class="faktur-col-center">' + (i + 1) + '</td><td></td><td class="faktur-col-center"></td><td></td><td></td>';
      tbody.appendChild(tr);
    }
  }

  // Checkout Payment Box details - Always show Transfer block, check it dynamically
  var isTransfer = tx.metode === 'Transfer' || tx.metode === 'Hutang';
  var checkEl = document.getElementById('fk-transfer-check');
  if (checkEl) {
    checkEl.checked = isTransfer;
  }
  
  document.getElementById('fk-total').textContent = fR(tx.total);
  
  // Show the Faktur container sheet
  openSheet('sheet-faktur');
}

function printFaktur() {
  document.body.classList.add('printing-faktur');
  window.print();
  document.body.classList.remove('printing-faktur');
}

function closeFaktur() {
  closeSheet('sheet-faktur');
  switchTab('riwayat');
}

/* ====== CANVAS GRAPHICS ENGINE FOR WA SHARING ====== */

// Helper to load image asynchronously
function loadImageAsync(src) {
  return new Promise(function(resolve, reject) {
    var img = new Image();
    img.onload = function() { resolve(img); };
    img.onerror = function() { reject(new Error("Failed to load image: " + src)); };
    img.src = src;
  });
}

async function renderFakturToCanvas(tx) {
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  
  var W = 800;
  var pad = 40;
  
  // Calculate dynamic height based on table items
  var headerH = 250;
  var metaH = 130;
  var tableHeaderH = 44;
  var itemsCount = Math.max(tx.items.length, 5);
  var tableRowsH = itemsCount * 38;
  var footerH = 260;
  var H = headerH + metaH + tableHeaderH + tableRowsH + footerH + pad;
  
  canvas.width = W;
  canvas.height = H;
  
  // 1. Draw solid background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  
  // 2. Draw outer border frame (Double-line style or clean border)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, W - 20, H - 20);
  
  // 3. Load and Draw Watermark
  try {
    var watermarkImg = await loadImageAsync('logo_u2pa_round.svg');
    ctx.save();
    ctx.globalAlpha = 0.05; // 5% transparency
    ctx.drawImage(watermarkImg, W/2 - 200, H/2 - 200, 400, 400);
    ctx.restore();
  } catch(e) {
    console.log("Watermark draw skipped:", e);
  }
  
  var y = 45;
  
  // 4. Draw Header Logos and Company Name
  try {
    var logoImg = await loadImageAsync('logo_u2pa.svg');
    ctx.drawImage(logoImg, pad, y, 310, 140);
  } catch(e) {
    // Fallback if logo load fails
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    ctx.fillText("U2PA UNCEN", pad, y + 40);
  }
  
  // Company details on header
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.font = 'bold 14px "Segoe UI", sans-serif';
  ctx.fillText("Unit Usaha dan Pengelolaan Aset Uncen", pad, y + 160);
  
  ctx.font = '11px "Segoe UI", sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText("Jln. Kampwolker, Kampus Baru, Perumnas III", pad, y + 176);
  ctx.fillText("Hubungi: 0823 3339 7171", pad, y + 191);
  
  // 5. Draw Title: FAKTUR (Top-right)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#000000';
  ctx.font = 'black 28px "Segoe UI", sans-serif';
  ctx.fillText("FAKTUR", W - pad, y + 35);
  
  // Draw Yellow Badge No.
  var badgeW = 160;
  var badgeH = 30;
  var badgeX = W - pad - badgeW;
  var badgeY = y + 50;
  
  ctx.fillStyle = '#f59e0b'; // Gold yellow
  roundRectPath(ctx, badgeX, badgeY, badgeW, badgeH, 4);
  ctx.fill();
  
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 12px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("No. " + tx.id, badgeX + badgeW/2, badgeY + 19);
  
  y = 275;
  
  // 6. Draw Customer Info Box (Bordered card)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.strokeRect(pad, y, W - pad*2, 100);
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(pad + 1, y + 1, W - pad*2 - 2, 98);
  
  // Text inside customer info box
  var tglStr = new Date(tx.timestamp).toLocaleString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  
  ctx.textAlign = 'left';
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 12px "Segoe UI", sans-serif';
  
  var lineOffset = 22;
  var labelX = pad + 15;
  var valX = pad + 140;
  
  ctx.fillText("Hari/Tanggal", labelX, y + 25);
  ctx.fillText(":", labelX + 110, y + 25);
  ctx.font = '12px "Segoe UI", sans-serif';
  ctx.fillText(tglStr, valX, y + 25);
  
  ctx.font = 'bold 12px "Segoe UI", sans-serif';
  ctx.fillText("Pelanggan", labelX, y + 25 + lineOffset);
  ctx.fillText(":", labelX + 110, y + 25 + lineOffset);
  ctx.font = '12px "Segoe UI", sans-serif';
  ctx.fillText(tx.namaHutang || 'Umum / Customer', valX, y + 25 + lineOffset);
  
  ctx.font = 'bold 12px "Segoe UI", sans-serif';
  ctx.fillText("Telepon", labelX, y + 25 + lineOffset*2);
  ctx.fillText(":", labelX + 110, y + 25 + lineOffset*2);
  ctx.font = '12px "Segoe UI", sans-serif';
  ctx.fillText(tx.waHutang || '-', valX, y + 25 + lineOffset*2);
  
  ctx.font = 'bold 12px "Segoe UI", sans-serif';
  ctx.fillText("Alamat", labelX, y + 25 + lineOffset*3);
  ctx.fillText(":", labelX + 110, y + 25 + lineOffset*3);
  ctx.font = '12px "Segoe UI", sans-serif';
  ctx.fillText(tx.alamatHutang || '-', valX, y + 25 + lineOffset*3);
  
  y = 395;
  
  // 7. Draw Table Header
  var colW = [60, 360, 100, 100, 100]; // Total 720 (W - pad*2)
  var colX = [pad, pad + 60, pad + 420, pad + 520, pad + 620];
  
  ctx.fillStyle = '#f59e0b'; // Gold Yellow
  ctx.fillRect(pad, y, W - pad*2, tableHeaderH);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(pad, y, W - pad*2, tableHeaderH);
  
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  
  ctx.fillText("No", colX[0] + colW[0]/2, y + 26);
  ctx.fillText("Produk", colX[1] + colW[1]/2, y + 26);
  ctx.fillText("Qty", colX[2] + colW[2]/2, y + 26);
  ctx.fillText("Harga Satuan", colX[3] + colW[3]/2, y + 26);
  ctx.fillText("Total", colX[4] + colW[4]/2, y + 26);
  
  y += tableHeaderH;
  
  // 8. Draw Table Rows
  ctx.font = '11px "Segoe UI", sans-serif';
  for (var i = 0; i < itemsCount; i++) {
    var item = tx.items[i];
    var rowY = y + (i * 38);
    
    // Draw row box
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, rowY, W - pad*2, 38);
    
    // Draw vertical column gridlines
    for (var k = 1; k < colX.length; k++) {
      ctx.beginPath();
      ctx.moveTo(colX[k], rowY);
      ctx.lineTo(colX[k], rowY + 38);
      ctx.stroke();
    }
    
    if (item) {
      // Draw contents
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.fillText(i + 1, colX[0] + colW[0]/2, rowY + 22);
      
      ctx.textAlign = 'left';
      ctx.fillText(item.nama, colX[1] + 12, rowY + 22);
      
      ctx.textAlign = 'center';
      ctx.fillText(item.qty + " " + (item.satuan || 'pcs'), colX[2] + colW[2]/2, rowY + 22);
      
      ctx.textAlign = 'right';
      ctx.fillText(Number(item.hargaJual).toLocaleString('id-ID'), colX[3] + colW[3] - 12, rowY + 22);
      ctx.fillText(Number(item.qty * item.hargaJual).toLocaleString('id-ID'), colX[4] + colW[4] - 12, rowY + 22);
    } else {
      // Just empty row number
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText(i + 1, colX[0] + colW[0]/2, rowY + 22);
    }
  }
  
  y += (itemsCount * 38) + 15;
  
  // 9. Payment Information (Left) & Total Box (Right)
  var footerBoxW = (W - pad*2 - 20) / 2; // Split half
  
  // Draw Payment Info Box
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.strokeRect(pad, y, footerBoxW + 30, 85);
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(pad + 1, y + 1, footerBoxW + 28, 83);
  
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  
  // Title: "Metode Pembayaran:"
  ctx.font = 'bold 12px "Segoe UI", sans-serif';
  ctx.fillText("Metode Pembayaran:", pad + 12, y + 20);
  
  // Checkbox [ ] or [✓] Transfer
  var isTransfer = tx.metode === 'Transfer' || tx.metode === 'Hutang';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.strokeRect(pad + 12, y + 30, 12, 12);
  if (isTransfer) {
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillText("✓", pad + 14, y + 41);
  }
  ctx.font = 'bold 12px "Segoe UI", sans-serif';
  ctx.fillText("Transfer", pad + 32, y + 41);
  
  // Atas Nama RPL 063 BLU UNIVERSITAS CENDERAWASIH
  ctx.font = '11px "Segoe UI", sans-serif';
  ctx.fillText("Atas Nama ", pad + 32, y + 58);
  var w1 = ctx.measureText("Atas Nama ").width;
  ctx.font = 'bold 11px "Segoe UI", sans-serif';
  ctx.fillText("RPL 063 BLU UNIVERSITAS CENDERAWASIH", pad + 32 + w1, y + 58);
  
  // Bank BNI 8811000228
  ctx.font = '11px "Segoe UI", sans-serif';
  ctx.fillText("Bank BNI ", pad + 32, y + 74);
  var w2 = ctx.measureText("Bank BNI ").width;
  ctx.font = 'bold 11px "Segoe UI", sans-serif';
  ctx.fillText("8811000228", pad + 32 + w2, y + 74);

  // Draw Total Box (Right)
  var totalBoxX = pad + footerBoxW + 50;
  var totalBoxW = footerBoxW - 30;
  
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(totalBoxX, y, totalBoxW, 40);
  
  // Yellow label total
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(totalBoxX + 1, y + 1, 90, 38);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 12px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("TOTAL", totalBoxX + 45, y + 24);
  
  // White right box
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(totalBoxX + 91, y + 1, totalBoxW - 92, 38);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 15px "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(fR(tx.total), totalBoxX + totalBoxW - 12, y + 26);
  
  // 10. Social Media handles below Payment
  var socY = y + 96;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#475569';
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.fillText("Instagram: @u2pa_uncen    |    Facebook: U2PA Uncen", pad, socY);
  
  y += 115;
  
  // 11. Signatures
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 11px "Segoe UI", sans-serif';
  
  // Left: Penerima
  ctx.textAlign = 'center';
  ctx.fillText("Penerima", pad + 100, y);
  ctx.beginPath();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.moveTo(pad + 30, y + 60);
  ctx.lineTo(pad + 170, y + 60);
  ctx.stroke();
  
  // Right: Hormat Kami
  ctx.fillText("Hormat Kami", W - pad - 100, y);
  ctx.beginPath();
  ctx.moveTo(W - pad - 170, y + 60);
  ctx.lineTo(W - pad - 30, y + 60);
  ctx.stroke();
  
  return canvas;
}

// Helper to draw rounded rectangle paths in Canvas
function roundRectPath(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function downloadFakturPNG() {
  if (!lastTxForStruk) return;
  try {
    var canvas = await renderFakturToCanvas(lastTxForStruk);
    var dataUrl = canvas.toDataURL('image/png');
    var link = document.createElement('a');
    link.download = 'Faktur_' + lastTxForStruk.id + '_' + Date.now() + '.png';
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch(e) {
    alert("Gagal mengekspor faktur ke gambar: " + e.message);
  }
}

async function shareFakturWA() {
  if (!lastTxForStruk) return;
  try {
    var canvas = await renderFakturToCanvas(lastTxForStruk);
    var dataUrl = canvas.toDataURL('image/png');
    var filename = 'Faktur_' + lastTxForStruk.id + '.png';
    
    // APK WebView bridge
    if (typeof AndroidStorage !== 'undefined' && AndroidStorage.shareImage) {
      AndroidStorage.shareImage(dataUrl, filename);
    } else {
      // Browser fallback: download PNG and then trigger WA Web with text reminder
      canvas.toBlob(function(blob) {
        var file = new File([blob], filename, {type: 'image/png'});
        var text = 'Faktur Pembelian ' + lastTxForStruk.id + '\nTotal: ' + fR(lastTxForStruk.total) + '\n\n(Gambar Faktur sudah terunduh otomatis, silakan lampirkan)';
        
        if (navigator.share && navigator.canShare && navigator.canShare({files: [file]})) {
          navigator.share({
            title: 'Faktur Uncen Fresh',
            text: text,
            files: [file]
          }).catch(function(err) { fallbackShareFakturWA(text) });
        } else {
          fallbackShareFakturWA(text);
        }
      }, 'image/png');
    }
  } catch(e) {
    alert("Gagal membagikan faktur: " + e.message);
  }
}

function fallbackShareFakturWA(text) {
  downloadFakturPNG();
  var url = 'https://wa.me/?text=' + encodeURIComponent(text);
  window.open(url, '_blank');
}

/* ====== REPORT PRINT & EXPORT ENGINE ====== */

function printReport(sheetId) {
  var sheet = document.getElementById(sheetId);
  if (!sheet) return;
  var card = sheet.querySelector('.card');
  if (!card) return;
  
  var title = 'LAPORAN KEUANGAN';
  if (sheetId.indexOf('labarugi') !== -1) title = 'LAPORAN LABA RUGI OPERASIONAL';
  if (sheetId.indexOf('neraca') !== -1) title = 'LAPORAN NERACA POSISI KEUANGAN';
  if (sheetId.indexOf('aruskas') !== -1) title = 'LAPORAN ARUS KAS (CASH FLOW)';
  
  var printSection = document.getElementById('print-section');
  if (!printSection) {
    printSection = document.createElement('div');
    printSection.id = 'print-section';
    document.body.appendChild(printSection);
  }
  
  // Format HTML
  var reportHtml = 
    '<div style="padding: 40px; font-family: \'Segoe UI\', Arial, sans-serif; background: #fff; color: #000; line-height: 1.5; text-align: left;">' +
    '  <!-- Header -->' +
    '  <div style="display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 15px;">' +
    '    <img src="logo_u2pa.svg" style="width: 240px; height: 105px; object-fit: contain; margin-bottom: 10px;">' +
    '    <div style="font-size: 15px; font-weight: 800; text-transform: uppercase;">Unit Usaha dan Pengelolaan Aset Universitas Cenderawasih</div>' +
    '    <div style="font-size: 11px; color: #334155; margin-top: 2px;">Jln. Kampwolker, Kampus Baru, Perumnas III | Hubungi: 0823 3339 7171</div>' +
    '  </div>' +
    '  <hr style="border: none; border-top: 3px double #000000; margin-bottom: 20px;">' +
    
    '  <!-- Report Title -->' +
    '  <div style="text-align: center; margin-bottom: 25px;">' +
    '    <h2 style="margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">' + title + '</h2>' +
    '    <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Uncen Fresh — Periode: ' + new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) + '</div>' +
    '  </div>' +
    
    '  <!-- Report Body -->' +
    '  <div style="font-size: 13px;">' +
         card.innerHTML +
    '  </div>' +
    
    '  <!-- Signatures -->' +
    '  <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 40px; text-align: center; font-size: 12px;">' +
    '    <div style="width: 150px;">' +
    '      <div style="font-weight: 700; margin-bottom: 60px;">Mengetahui,</div>' +
    '      <div style="border-bottom: 1.5px solid #000; margin-bottom: 4px; height: 1px;"></div>' +
    '      <div style="color: #64748b; font-size: 10px;">Manajer U2PA Uncen</div>' +
    '    </div>' +
    '    <div style="width: 150px;">' +
    '      <div style="font-weight: 700; margin-bottom: 60px;">Kasir/Admin,</div>' +
    '      <div style="border-bottom: 1.5px solid #000; margin-bottom: 4px; height: 1px;"></div>' +
    '      <div style="color: #64748b; font-size: 10px;">Uncen Fresh</div>' +
    '    </div>' +
    '  </div>' +
    '</div>';
    
  printSection.innerHTML = reportHtml;
  
  // Hide internal titles inside card to prevent duplication
  var internalTitle = printSection.querySelector('h4');
  if (internalTitle) internalTitle.style.display = 'none';
  var internalSub = printSection.querySelector('div[style*="font-size: 11px"]');
  if (internalSub) internalSub.style.display = 'none';
  
  document.body.classList.add('printing-report');
  window.print();
  document.body.classList.remove('printing-report');
  printSection.innerHTML = '';
}

async function renderReportToCanvas(reportType) {
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  
  var W = 800;
  var H = 720;
  canvas.width = W;
  canvas.height = H;
  
  // Draw Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  
  // Outer Border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, W - 20, H - 20);
  
  // Load Watermark logo_u2pa_round
  try {
    var watermarkImg = await loadImageAsync('logo_u2pa_round.svg');
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.drawImage(watermarkImg, W/2 - 180, H/2 - 180, 360, 360);
    ctx.restore();
  } catch(e) {}
  
  var y = 60;
  
  // Header Logo
  try {
    var logoImg = await loadImageAsync('logo_u2pa.svg');
    ctx.drawImage(logoImg, W/2 - 120, y, 240, 105);
    y += 125;
  } catch(e) {
    y += 40;
  }
  
  // Report Title
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  
  var title = '';
  var rows = [];
  
  if (reportType === 'labarugi') {
    title = 'LAPORAN LABA RUGI';
    rows = [
      { text: 'PENDAPATAN USAHA', isHeader: true },
      { text: '  Pendapatan Penjualan Air', val: document.getElementById('lap-pendapatan').textContent },
      { text: '  Harga Pokok Penjualan (HPP)', val: document.getElementById('lap-hpp').textContent },
      { text: 'LABA KOTOR USAHA', val: document.getElementById('lap-laba-kotor').textContent, isBold: true },
      { text: '', isSpacer: true },
      { text: 'BIAYA / BEBAN OPERASIONAL', isHeader: true },
      { text: '  Beban Operasional Umum', val: document.getElementById('lap-beban').textContent },
      { text: '  Total Beban Biaya', val: document.getElementById('lap-total-beban').textContent },
      { text: '', isSpacer: true },
      { text: 'LABA BERSIH BERJALAN', val: document.getElementById('lap-laba-bersih').textContent, isBold: true, isDoubleLine: true }
    ];
  } else if (reportType === 'neraca') {
    title = 'NERACA KEUANGAN';
    rows = [
      { text: '1. AKTIVA (ASET USAHA)', isHeader: true },
      { text: '  Kas Usaha (Uang Tunai)', val: document.getElementById('lap-kas').textContent },
      { text: '  Piutang Dagang (Kasbon)', val: document.getElementById('lap-piutang').textContent },
      { text: '  Persediaan Barang (Stok HPP)', val: document.getElementById('lap-persediaan').textContent },
      { text: 'TOTAL AKTIVA ASET', val: document.getElementById('lap-total-aktiva').textContent, isBold: true },
      { text: '', isSpacer: true },
      { text: '2. PASIVA (KEWAJIBAN & EKUITAS)', isHeader: true },
      { text: '  Hutang Usaha Supplier', val: document.getElementById('lap-hutang-usaha').textContent },
      { text: '  Modal Awal Pemilik', val: document.getElementById('lap-modal-awal').textContent },
      { text: '  Laba Usaha Berjalan', val: document.getElementById('lap-laba-berjalan').textContent },
      { text: 'TOTAL PASIVA EKUITAS', val: document.getElementById('lap-total-pasiva').textContent, isBold: true, isDoubleLine: true }
    ];
  } else if (reportType === 'aruskas') {
    title = 'LAPORAN ARUS KAS (CASH FLOW)';
    rows = [
      { text: '1. AKTIVITAS OPERASIONAL', isHeader: true },
      { text: '  Penerimaan Kas Pelanggan', val: document.getElementById('lap-kas-masuk').textContent },
      { text: '  Pembayaran Biaya & Beban', val: document.getElementById('lap-kas-beban').textContent },
      { text: 'Kas Bersih Operasional', val: document.getElementById('lap-kas-operasi').textContent, isBold: true },
      { text: '', isSpacer: true },
      { text: '2. AKTIVITAS INVESTASI', isHeader: true },
      { text: '  Pembelian Stok Persediaan', val: document.getElementById('lap-kas-restock').textContent },
      { text: 'Kas Bersih Investasi', val: document.getElementById('lap-kas-investasi').textContent, isBold: true },
      { text: '', isSpacer: true },
      { text: '3. AKTIVITAS PENDANAAN', isHeader: true },
      { text: '  Setoran Modal Awal', val: document.getElementById('lap-kas-modal').textContent },
      { text: 'Kas Bersih Pendanaan', val: document.getElementById('lap-kas-pendanaan').textContent, isBold: true },
      { text: '', isSpacer: true },
      { text: 'Kenaikan (Penurunan) Kas', val: document.getElementById('lap-kas-delta').textContent, isBold: true },
      { text: 'Saldo Kas Awal Periode', val: document.getElementById('lap-kas-awal').textContent },
      { text: 'Saldo Kas Akhir Periode', val: document.getElementById('lap-kas-akhir').textContent, isBold: true, isDoubleLine: true }
    ];
  }
  
  ctx.font = 'bold 20px "Segoe UI", sans-serif';
  ctx.fillText(title, W/2, y);
  
  ctx.font = '12px "Segoe UI", sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText("Uncen Fresh — U2PA Universitas Cenderawasih", W/2, y + 20);
  ctx.fillText("Periode: " + new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }), W/2, y + 36);
  
  y += 70;
  
  // Draw Rows
  var rowPad = 50;
  ctx.textAlign = 'left';
  
  rows.forEach(function(row) {
    if (row.isSpacer) {
      y += 12;
      return;
    }
    
    if (row.isHeader) {
      y += 24;
      ctx.fillStyle = '#0284c7'; // Cyan-Blue theme color
      ctx.font = 'bold 13px "Segoe UI", sans-serif';
      ctx.fillText(row.text, rowPad, y);
      
      // Draw thin line under header
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rowPad, y + 4);
      ctx.lineTo(W - rowPad, y + 4);
      ctx.stroke();
      y += 8;
    } else {
      y += 22;
      ctx.fillStyle = '#000000';
      ctx.font = row.isBold ? 'bold 12px "Segoe UI", sans-serif' : '12px "Segoe UI", sans-serif';
      ctx.fillText(row.text, rowPad + (row.isBold ? 0 : 12), y);
      
      if (row.val) {
        ctx.textAlign = 'right';
        ctx.fillText(row.val, W - rowPad, y);
        ctx.textAlign = 'left';
      }
      
      if (row.isBold) {
        // Draw underline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rowPad, y - 16);
        ctx.lineTo(W - rowPad, y - 16);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(rowPad, y + 4);
        ctx.lineTo(W - rowPad, y + 4);
        ctx.stroke();
        
        if (row.isDoubleLine) {
          ctx.beginPath();
          ctx.moveTo(rowPad, y + 7);
          ctx.lineTo(W - rowPad, y + 7);
          ctx.stroke();
          y += 3;
        }
        y += 6;
      }
    }
  });
  
  // Signatures or footer at the bottom
  y = H - 55;
  ctx.fillStyle = '#64748b';
  ctx.font = 'italic 10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("Laporan ini digenerasi secara resmi oleh sistem pembukuan digital Uncen Fresh.", W/2, y);
  ctx.fillText("©2026 U2PA Universitas Cenderawasih, Jayapura, Papua", W/2, y + 16);
  
  return canvas;
}

async function downloadReportImage(reportType) {
  try {
    var canvas = await renderReportToCanvas(reportType);
    var dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    var link = document.createElement('a');
    link.download = 'Laporan_' + reportType.toUpperCase() + '_' + Date.now() + '.jpg';
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch(e) {
    alert("Gagal mengunduh laporan sebagai gambar: " + e.message);
  }
}
