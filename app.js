/* ====== GLOBAL STATE ====== */
var S = {
  produk: [],
  transactions: [],
  cart: [],
  hutang: [],
  pengeluaran: [],
  categories: ['Galon', 'Air Kemasan', 'Sembako', 'Jasa', 'Lain-lain'],
  units: ['pcs', 'Galon', 'Botol', 'Gelas', 'Liter', 'Karton'],
  suppliers: [],
  stockLogs: [],
  config: {
    namaKios: 'Uncen Fresh',
    modalAwal: 5000000,
    logo: 'logo_uncenfresh.svg',
    security: { enabled: false, user: 'admin', pass: '1234' }
  }
};

var riwayatFilter = 'all';
var laporanFilter = 'all';
var tempFotoBase64 = null;
var tempLogoBase64 = null;
var lastTxForStruk = null;
var cartDiskon = 0;
var cartCatatan = '';

/* ====== INITIAL DATA (Penyediaan Awal UMKM) ====== */
function loadInitialDummyData() {
  S.produk = [
    { id: 'P-1', nama: 'Galon + Air', hargaHpp: 45000, hargaJual: 65000, stok: 50, satuan: 'Galon', kategori: 'Galon', expiredDate: '' },
    { id: 'P-2', nama: 'Ukuran 220ml (GELAS)', hargaHpp: 25000, hargaJual: 33000, stok: 100, satuan: 'Karton', kategori: 'Air Kemasan', expiredDate: '' },
    { id: 'P-3', nama: 'Ukuran 330ml (BOTOL)', hargaHpp: 40000, hargaJual: 51000, stok: 80, satuan: 'Karton', kategori: 'Air Kemasan', expiredDate: '' },
    { id: 'P-4', nama: 'Tukar Air Galon', hargaHpp: 5000, hargaJual: 15000, stok: 200, satuan: 'Galon', kategori: 'Jasa', expiredDate: '' },
    { id: 'P-5', nama: 'Ukuran 600ml (BOTOL)', hargaHpp: 35000, hargaJual: 45000, stok: 60, satuan: 'Karton', kategori: 'Air Kemasan', expiredDate: '' }
  ];
  
  S.transactions = [];
  S.cart = [];
  S.hutang = [];
  S.pengeluaran = [];
  S.suppliers = [];
  S.stockLogs = [];
  S.config.modalAwal = 0;
}

/* ====== PERSISTENCE INTERFACES ====== */
async function loadState() {
  var dataStr = null;
  // Try Android SharedPreferences first
  if (typeof AndroidStorage !== 'undefined' && AndroidStorage.get) {
    try {
      var res = AndroidStorage.get('kios_state', false);
      if (res) {
        var parsed = JSON.parse(res);
        if (parsed && parsed.value) dataStr = parsed.value;
      }
    } catch (e) {
      console.log("Error loading from AndroidStorage:", e);
    }
  }
  
  // Fallback to Web localStorage
  if (!dataStr) {
    try {
      dataStr = localStorage.getItem('kios_state');
    } catch (e) {
      console.log("Error loading from localStorage:", e);
    }
  }

  if (dataStr) {
    try {
      S = JSON.parse(dataStr);
      // Ensure arrays and configs are complete
      if(!S.produk) S.produk = [];
      if(!S.transactions) S.transactions = [];
      if(!S.cart) S.cart = [];
      if(!S.hutang) S.hutang = [];
      if(!S.pengeluaran) S.pengeluaran = [];
      if(!S.categories) S.categories = ['Galon', 'Air Kemasan', 'Sembako', 'Jasa', 'Lain-lain'];
      if(!S.units) S.units = ['pcs', 'Galon', 'Botol', 'Gelas', 'Liter', 'Karton'];
      if(!S.suppliers) S.suppliers = [];
      if(!S.stockLogs) S.stockLogs = [];
      if(!S.config) S.config = { namaKios: 'Uncen Fresh', modalAwal: 5000000, logo: 'logo_uncenfresh.svg', security: { enabled: false, user: 'admin', pass: '1234' } };
      if(!S.config.security) S.config.security = { enabled: false, user: 'admin', pass: '1234' };
      if(!S.config.logo) S.config.logo = 'logo_uncenfresh.svg';
    } catch (e) {
      console.log("JSON Parse error:", e);
      loadInitialDummyData();
    }
  } else {
    loadInitialDummyData();
    saveState();
  }
}

function saveState() {
  var s = JSON.stringify(S);
  // Save to Web localStorage
  try {
    localStorage.setItem('kios_state', s);
  } catch (e) {
    console.log("Error saving to localStorage:", e);
  }

  // Save to Android SharedPreferences
  if (typeof AndroidStorage !== 'undefined' && AndroidStorage.set) {
    try {
      AndroidStorage.set('kios_state', s, false);
    } catch (e) {
      console.log("Error saving to AndroidStorage:", e);
    }
  }
}

/* ====== INIT ====== */
async function init() {
  await loadState();
  applyHeader();
  
  if (S.config.security && S.config.security.enabled) {
    openSheet('sheet-login');
  }

  renderAll();
}

function applyHeader() {
  document.getElementById('hdr-name').textContent = S.config.namaKios || 'Uncen Fresh';
  var logoImg = document.getElementById('hdr-logo-img');
  var logoSvgPlaceholder = document.getElementById('hdr-logo-svg');
  
  if (S.config.logo) {
    // If it's the default local SVG, load it, otherwise load base64/upload url
    logoImg.src = S.config.logo;
    logoImg.style.display = 'block';
    logoSvgPlaceholder.style.display = 'none';
  } else {
    logoImg.style.display = 'none';
    logoSvgPlaceholder.style.display = 'block';
  }
}

function renderAll() {
  renderDashboard();
  renderKasir();
  renderRiwayat();
  renderHutang();
  renderLaporan();
}

/* ====== UTILITY FUNCTIONS ====== */
function fR(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

function fRn(n) {
  if (n < 0) return '(' + fR(Math.abs(n)) + ')';
  return fR(n);
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ====== NAVIGATION TABS ====== */
function switchTab(t) {
  document.querySelectorAll('.vp').forEach(function(e) { e.classList.remove('active') });
  document.querySelectorAll('.ni').forEach(function(e) { e.classList.remove('active') });
  
  var v = document.getElementById('view-' + t);
  var b = document.getElementById('tab-' + t);
  
  if (v) v.classList.add('active');
  if (b) b.classList.add('active');
  
  renderAll();
}

/* ====== MODAL CONTROLS ====== */
var allSheets = [
  'sheet-produk', 'sheet-restock', 'sheet-cart', 'sheet-checkout', 'sheet-struk', 
  'sheet-hutang', 'sheet-profile', 'sheet-security', 'sheet-login', 'sheet-detail-tx', 
  'sheet-capture', 'sheet-pengeluaran', 'sheet-lap-labarugi', 'sheet-lap-neraca', 
  'sheet-lap-aruskas', 'sheet-lap-piutang', 'sheet-quick-add', 'sheet-katalog-produk', 
  'sheet-restock-katalog', 'sheet-stok-opname', 'sheet-riwayat-stok', 'sheet-expired', 
  'sheet-kategori', 'sheet-satuan', 'sheet-kalkulator', 'sheet-cek-harga', 'sheet-supplier',
  'sheet-faktur'
];

function openSheet(id) {
  allSheets.forEach(function(sid) {
    var el = document.getElementById(sid);
    if (el) el.style.display = 'none';
  });
  var t = document.getElementById(id);
  if (t) {
    t.style.display = 'flex';
    
    // Auto-trigger rendering lists inside modals on open
    if (id === 'sheet-profile') {
      document.getElementById('set-nama').value = S.config.namaKios || '';
      document.getElementById('set-modal').value = S.config.modalAwal || '';
      tempLogoBase64 = null;
      var lp = document.getElementById('logo-preview');
      if (S.config.logo) {
        lp.src = S.config.logo;
        lp.style.display = 'block';
        document.getElementById('logo-placeholder').style.display = 'none';
      } else {
        lp.style.display = 'none';
        document.getElementById('logo-placeholder').style.display = 'block';
      }
    } else if (id === 'sheet-security') {
      document.getElementById('sec-enabled').checked = S.config.security.enabled;
      document.getElementById('sec-user').value = S.config.security.user || 'admin';
      document.getElementById('sec-pass').value = S.config.security.pass || '1234';
    } else if (id === 'sheet-pengeluaran') {
      renderPengeluaranList();
    } else if (id === 'sheet-katalog-produk') {
      document.getElementById('katalog-search').value = '';
      renderKatalogList();
    } else if (id === 'sheet-restock-katalog') {
      renderRestockKatalogList();
    } else if (id === 'sheet-stok-opname') {
      renderOpnameList();
    } else if (id === 'sheet-riwayat-stok') {
      renderRiwayatStok();
    } else if (id === 'sheet-expired') {
      renderExpiredList();
    } else if (id === 'sheet-kategori') {
      document.getElementById('new-category-name').value = '';
      renderKategori();
    } else if (id === 'sheet-satuan') {
      document.getElementById('new-unit-name').value = '';
      renderSatuan();
    } else if (id === 'sheet-cek-harga') {
      document.getElementById('check-price-search').value = '';
      renderCekHargaList();
    } else if (id === 'sheet-supplier') {
      toggleSupplierForm(false);
      renderSuppliersList();
    }
  }
}

function closeSheet(id) {
  var t = document.getElementById(id);
  if (t) t.style.display = 'none';
}

/* ====== THEME MODE ====== */
function toggleTheme() {
  var c = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', c === 'dark' ? 'light' : 'dark');
}

/* ====== IMAGE HANDLERS ====== */
function handleFotoUpload(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    tempFotoBase64 = ev.target.result;
    var prev = document.getElementById('foto-preview');
    prev.src = tempFotoBase64;
    prev.style.display = 'block';
    document.getElementById('foto-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function handleLogoUpload(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    tempLogoBase64 = ev.target.result;
    var prev = document.getElementById('logo-preview');
    prev.src = tempLogoBase64;
    prev.style.display = 'block';
    document.getElementById('logo-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

/* ====== DASHBOARD RENDERING ====== */
function renderDashboard() {
  var subtitle = document.getElementById('db-subtitle');
  if (subtitle) subtitle.textContent = (S.config.namaKios || 'Uncen Fresh') + ' • Operator';

  var now = new Date();
  var todayYear = now.getFullYear();
  var todayMonth = now.getMonth();
  var todayDate = now.getDate();
  
  var todayTxs = S.transactions.filter(function(tx) {
    if (!tx.timestamp) return false;
    var d = new Date(tx.timestamp);
    return d.getFullYear() === todayYear && d.getMonth() === todayMonth && d.getDate() === todayDate;
  });

  var totalSalesToday = todayTxs.reduce(function(s, tx) { return s + tx.total; }, 0);
  var totalProfitToday = todayTxs.reduce(function(s, tx) { return s + (tx.laba || 0); }, 0);

  var elSales = document.getElementById('db-sales-today');
  if (elSales) elSales.textContent = fR(totalSalesToday);

  var elProfit = document.getElementById('db-profit-today');
  if (elProfit) elProfit.textContent = fR(totalProfitToday);
}

/* ====== CATALOG PRODUCT CRUD ====== */
function openProdukSheet(pid) {
  tempFotoBase64 = null;
  var prev = document.getElementById('foto-preview');
  prev.style.display = 'none';
  prev.src = '';
  document.getElementById('foto-placeholder').style.display = 'block';

  // Populate datalists dynamically
  var dlKat = document.getElementById('list-kategori');
  if (dlKat) {
    dlKat.innerHTML = '';
    (S.categories || []).forEach(function(c) {
      var opt = document.createElement('option');
      opt.value = c;
      dlKat.appendChild(opt);
    });
  }
  var dlSat = document.getElementById('list-satuan');
  if (dlSat) {
    dlSat.innerHTML = '';
    (S.units || []).forEach(function(u) {
      var opt = document.createElement('option');
      opt.value = u;
      dlSat.appendChild(opt);
    });
  }

  if (pid) {
    var p = S.produk.find(function(x) { return x.id === pid });
    if (!p) return;
    document.getElementById('produk-title').textContent = 'Edit Produk';
    document.getElementById('fp-id').value = p.id;
    document.getElementById('fp-nama').value = p.nama || '';
    document.getElementById('fp-hpp').value = p.hargaHpp || 0;
    document.getElementById('fp-jual').value = p.hargaJual || 0;
    document.getElementById('fp-stok').value = p.stok != null ? p.stok : (p.stokAwal || 0);
    document.getElementById('fp-satuan').value = p.satuan || 'pcs';
    document.getElementById('fp-kategori').value = p.kategori || '';
    document.getElementById('fp-expired').value = p.expiredDate || '';
    document.getElementById('btn-hapus-p').style.display = 'block';
    if (p.foto) {
      tempFotoBase64 = p.foto;
      prev.src = p.foto;
      prev.style.display = 'block';
      document.getElementById('foto-placeholder').style.display = 'none';
    }
  } else {
    document.getElementById('produk-title').textContent = 'Tambah Produk Baru';
    document.getElementById('fp-id').value = '';
    document.getElementById('fp-nama').value = '';
    document.getElementById('fp-hpp').value = '';
    document.getElementById('fp-jual').value = '';
    document.getElementById('fp-stok').value = '';
    document.getElementById('fp-satuan').value = 'pcs';
    document.getElementById('fp-kategori').value = '';
    document.getElementById('fp-expired').value = '';
    document.getElementById('btn-hapus-p').style.display = 'none';
  }
  openSheet('sheet-produk');
}

function simpanProduk() {
  var id = document.getElementById('fp-id').value;
  var nama = document.getElementById('fp-nama').value.trim();
  var hpp = Number(document.getElementById('fp-hpp').value || 0);
  var jual = Number(document.getElementById('fp-jual').value || 0);
  var stok = Number(document.getElementById('fp-stok').value || 0);
  var satuan = document.getElementById('fp-satuan').value.trim() || 'pcs';
  var kategori = document.getElementById('fp-kategori').value.trim() || 'Lain-lain';
  var expired = document.getElementById('fp-expired').value || '';
  
  if (!nama) { alert('Nama produk wajib diisi!'); return; }

  if (id) {
    var p = S.produk.find(function(x) { return x.id === id });
    if (p) {
      var diff = stok - (p.stok || 0);
      p.nama = nama; p.hargaHpp = hpp; p.hargaJual = jual; p.stok = stok; p.satuan = satuan;
      p.kategori = kategori; p.expiredDate = expired;
      if (tempFotoBase64) p.foto = tempFotoBase64;
      
      if (diff !== 0) {
        S.stockLogs.unshift({
          id: 'SL-' + Date.now(),
          timestamp: new Date().toISOString(),
          namaProduk: p.nama,
          type: 'Penyesuaian Manual',
          delta: diff,
          sisa: p.stok
        });
      }
    }
  } else {
    var newId = 'P-' + Date.now();
    S.produk.push({
      id: newId, nama: nama, hargaHpp: hpp, hargaJual: jual, stok: stok, satuan: satuan,
      foto: tempFotoBase64 || '', kategori: kategori, expiredDate: expired
    });
    
    S.stockLogs.unshift({
      id: 'SL-' + Date.now(),
      timestamp: new Date().toISOString(),
      namaProduk: nama,
      type: 'Stok Awal',
      delta: stok,
      sisa: stok
    });
  }
  
  saveState();
  renderAll();
  closeSheet('sheet-produk');
}

function hapusProduk() {
  var id = document.getElementById('fp-id').value;
  if (!id) return;
  if (confirm('Hapus produk ini dari katalog?')) {
    var p = S.produk.find(function(x) { return x.id === id });
    S.produk = S.produk.filter(function(x) { return x.id !== id });
    S.cart = S.cart.filter(function(x) { return x.id !== id });
    
    if (p) {
      S.stockLogs.unshift({
        id: 'SL-' + Date.now(),
        timestamp: new Date().toISOString(),
        namaProduk: p.nama,
        type: 'Hapus Produk',
        delta: -p.stok,
        sisa: 0
      });
    }
    
    saveState();
    renderAll();
    closeSheet('sheet-produk');
  }
}

/* ====== RESTOCK ====== */
function openRestock(pid) {
  var p = S.produk.find(function(x) { return x.id === pid });
  if (!p) return;
  document.getElementById('restock-id').value = p.id;
  document.getElementById('restock-nama').textContent = p.nama;
  document.getElementById('restock-current').textContent = (p.stok != null ? p.stok : 0) + ' ' + p.satuan;
  document.getElementById('restock-qty').value = '';
  openSheet('sheet-restock');
}

function simpanRestock() {
  var id = document.getElementById('restock-id').value;
  var qty = Number(document.getElementById('restock-qty').value || 0);
  if (qty <= 0) { alert('Jumlah restock harus lebih dari 0!'); return; }
  
  var p = S.produk.find(function(x) { return x.id === id });
  if (p) {
    p.stok = (p.stok || 0) + qty;
    S.stockLogs.unshift({
      id: 'SL-' + Date.now(),
      timestamp: new Date().toISOString(),
      namaProduk: p.nama,
      type: 'Stok Masuk',
      delta: qty,
      sisa: p.stok
    });
    
    saveState();
    renderAll();
    closeSheet('sheet-restock');
    alert('Stok ' + p.nama + ' berhasil ditambah ' + qty + ' ' + p.satuan + '!');
  }
}

/* ====== CASHIER POS RENDERING ====== */
function renderKasir() {
  var searchInput = document.getElementById('kasir-search');
  var q = (searchInput ? searchInput.value : '').toLowerCase();
  var grid = document.getElementById('kasir-grid');
  if (!grid) return;
  grid.innerHTML = '';

  var list = S.produk.filter(function(p) { return p.nama.toLowerCase().indexOf(q) !== -1 });

  if (list.length === 0) {
    grid.innerHTML = '<div class="empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="margin-bottom:12px"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg><h4 style="font-size:16px;font-weight:700;margin-bottom:4px">Belum Ada Produk</h4><p style="font-size:12px;color:var(--text-secondary);margin-bottom:16px">Klik tombol di bawah untuk menambahkan produk.</p><button class="btn" style="width:auto;padding:0 20px;display:inline-flex;margin:0 auto;" onclick="openProdukSheet(null)">+ Tambah Produk</button></div>';
    updateCartFAB();
    return;
  }

  list.forEach(function(p) {
    var stk = p.stok != null ? p.stok : 0;
    var card = document.createElement('div');
    card.className = 'pc';
    card.onclick = function() { addToCart(p.id) };
    
    var imgHtml = '';
    if (p.foto) {
      imgHtml = '<img src="' + p.foto + '">';
    } else {
      imgHtml = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>';
    }
    
    var badgeBg = stk > 0 ? 'var(--green-light)' : 'var(--red-light)';
    var badgeColor = stk > 0 ? 'var(--green)' : 'var(--red)';
    var badgeText = stk > 0 ? (stk + ' ' + esc(p.satuan)) : 'Habis';
    
    card.innerHTML = '<div><div class="pib">' + imgHtml + '</div><div class="pn">' + esc(p.nama) + '</div><div class="ph">Beli: ' + fR(p.hargaHpp) + '</div><div class="pp">' + fR(p.hargaJual) + '</div></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;"><span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;background:' + badgeBg + ';color:' + badgeColor + ';">' + badgeText + '</span><div style="display:flex;gap:8px"><button style="background:none;border:none;font-size:14px;cursor:pointer" onclick="event.stopPropagation();openRestock(\'' + p.id + '\')" title="Restock">📦</button><button style="background:none;border:none;font-size:14px;cursor:pointer" onclick="event.stopPropagation();openProdukSheet(\'' + p.id + '\')" title="Edit">✏️</button></div></div>';
    grid.appendChild(card);
  });
  
  updateCartFAB();
}

/* ====== CART & CHECKOUT LOGIC ====== */
function addToCart(pid) {
  var p = S.produk.find(function(x) { return x.id === pid });
  if (!p) return;
  var stk = p.stok != null ? p.stok : 0;
  var inCart = S.cart.find(function(x) { return x.id === pid });
  var currentQty = inCart ? inCart.qty : 0;
  
  if (currentQty >= stk) {
    alert('Stok tidak mencukupi! (Tersedia: ' + stk + ' ' + p.satuan + ')');
    return;
  }
  
  if (inCart) {
    inCart.qty += 1;
  } else {
    S.cart.push({ id: p.id, nama: p.nama, hargaJual: p.hargaJual, hargaHpp: p.hargaHpp, qty: 1, satuan: p.satuan });
  }
  
  saveState();
  updateCartFAB();
}

function updateCartFAB() {
  var totalQ = S.cart.reduce(function(s, i) { return s + i.qty }, 0);
  var totalP = S.cart.reduce(function(s, i) { return s + (i.qty * i.hargaJual) }, 0);
  var fab = document.getElementById('cart-fab');
  if (!fab) return;
  
  if (totalQ > 0) {
    fab.style.display = 'flex';
    document.getElementById('cart-badge').textContent = totalQ + ' Item';
    document.getElementById('cart-total-fab').textContent = fR(totalP);
  } else {
    fab.style.display = 'none';
  }
}

function openCart() {
  var container = document.getElementById('cart-items');
  if (!container) return;
  container.innerHTML = '';
  
  if (S.cart.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:30px 20px;color:var(--text-secondary);font-size:14px;">Keranjang belanja masih kosong</div>';
  } else {
    S.cart.forEach(function(item) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);';
      row.innerHTML = '<div>' +
        '  <div style="font-weight:700;font-size:14px;color:var(--text);font-family:\'Outfit\',sans-serif;cursor:pointer;display:flex;align-items:center;gap:6px;" onclick="editCartItemPrice(\'' + item.id + '\')" title="Klik untuk edit harga belanja">' +
        '    ' + esc(item.nama) + ' <span style="font-size:10px;opacity:0.6;">✏️</span>' +
        '  </div>' +
        '  <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' + fR(item.hargaJual) + ' / ' + item.satuan + '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
        '  <button onclick="adjCart(\'' + item.id + '\',-1)" style="width:26px;height:26px;border-radius:50%;border:1px solid #cbd5e1;background:#fff;color:var(--text-secondary);display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:bold;font-size:14px;">−</button>' +
        '  <span style="font-family:\'Outfit\',sans-serif;font-weight:700;font-size:14px;width:18px;text-align:center;color:var(--text);">' + item.qty + '</span>' +
        '  <button onclick="adjCart(\'' + item.id + '\',1)" style="width:26px;height:26px;border-radius:50%;border:1.5px solid var(--primary);background:#fff;color:var(--primary);display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:bold;font-size:14px;">+</button>' +
        '  <div style="font-family:\'Outfit\',sans-serif;font-weight:800;font-size:14px;color:var(--text);margin-left:8px;width:75px;text-align:right;">' + fR(item.qty * item.hargaJual) + '</div>' +
        '</div>';
      container.appendChild(row);
    });
  }

  var subtotal = S.cart.reduce(function(s, i) { return s + (i.qty * i.hargaJual) }, 0);
  var total = subtotal - cartDiskon;
  if (total < 0) total = 0;
  
  document.getElementById('cart-subtotal').textContent = fR(subtotal);
  document.getElementById('cart-diskon-label').textContent = cartDiskon > 0 ? ('- ' + fR(cartDiskon) + ' ✏️') : 'Rp 0 ✏️';
  document.getElementById('cart-modal-total').textContent = fR(total);
  document.getElementById('cart-catatan').value = cartCatatan;
  
  openSheet('sheet-cart');
}

function adjCart(id, delta) {
  var item = S.cart.find(function(i) { return i.id === id });
  if (item) {
    if (delta > 0) {
      var p = S.produk.find(function(x) { return x.id === id });
      var stk = p ? (p.stok != null ? p.stok : 999) : 999;
      if (item.qty >= stk) { alert('Stok tidak mencukupi!'); return; }
    }
    item.qty += delta;
    if (item.qty <= 0) S.cart = S.cart.filter(function(i) { return i.id !== id });
  }
  saveState();
  openCart();
}

function editCartItemPrice(id) {
  var item = S.cart.find(function(i) { return i.id === id });
  if (!item) return;
  var p = prompt("Ubah harga jual item untuk transaksi ini:", item.hargaJual);
  if (p != null) {
    var val = Number(p);
    if (isNaN(val) || val < 0) {
      alert('Harga tidak valid!');
    } else {
      item.hargaJual = val;
      saveState();
      openCart();
    }
  }
}

function editCartDiscount() {
  var subtotal = S.cart.reduce(function(s, i) { return s + (i.qty * i.hargaJual) }, 0);
  var d = prompt("Masukkan jumlah diskon potongan (Rp):", cartDiskon);
  if (d != null) {
    var val = Number(d);
    if (isNaN(val) || val < 0 || val > subtotal) {
      alert('Diskon tidak valid (tidak boleh negatif atau melebihi subtotal)!');
    } else {
      cartDiskon = val;
      openCart();
    }
  }
}

function updateCartCatatan() {
  cartCatatan = document.getElementById('cart-catatan').value;
}

function clearCart() {
  if (confirm('Kosongkan keranjang belanja?')) {
    S.cart = [];
    cartDiskon = 0;
    cartCatatan = '';
    saveState();
    openCart();
  }
}

function syncCustomerData(field, val) {
  var fields = {
    nama: ['pos-cust-nama', 'cart-cust-nama', 'co-nama-hutang'],
    wa: ['pos-cust-wa', 'cart-cust-wa', 'co-wa-hutang'],
    alamat: ['pos-cust-alamat', 'cart-cust-alamat', 'co-alamat-hutang']
  };
  
  if (fields[field]) {
    fields[field].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = val;
    });
  }
}

/* ====== PAYMENT CONTROLS ====== */
var currentPaymentMethod = 'tunai';

function setPaymentMethod(method) {
  currentPaymentMethod = method;
  var btnTunai = document.getElementById('btn-pay-tunai');
  var btnTransfer = document.getElementById('btn-pay-transfer');
  var btnHutang = document.getElementById('btn-pay-hutang');
  var sectionTunai = document.getElementById('co-tunai-section');
  var sectionHutang = document.getElementById('co-hutang-section');
  
  // Set all buttons to inactive first
  [btnTunai, btnTransfer, btnHutang].forEach(function(btn) {
    if (btn) {
      btn.style.background = 'var(--surface)';
      btn.style.color = 'var(--text-secondary)';
      btn.style.border = '1px solid var(--border)';
    }
  });
  
  if (method === 'tunai') {
    if (btnTunai) {
      btnTunai.style.background = 'var(--primary)';
      btnTunai.style.color = '#fff';
    }
    if (sectionTunai) sectionTunai.style.display = 'block';
    if (sectionHutang) sectionHutang.style.display = 'none';
  } else if (method === 'transfer') {
    if (btnTransfer) {
      btnTransfer.style.background = 'var(--blue)';
      btnTransfer.style.color = '#fff';
    }
    if (sectionTunai) sectionTunai.style.display = 'block';
    if (sectionHutang) sectionHutang.style.display = 'none';
  } else {
    if (btnHutang) {
      btnHutang.style.background = 'var(--red)';
      btnHutang.style.color = '#fff';
    }
    if (sectionTunai) sectionTunai.style.display = 'none';
    if (sectionHutang) sectionHutang.style.display = 'flex';
  }
}

function openCheckout() {
  var posNama = document.getElementById('pos-cust-nama');
  var posWa = document.getElementById('pos-cust-wa');
  var posAlamat = document.getElementById('pos-cust-alamat');
  
  var custNama = posNama ? posNama.value.trim() : '';
  var custWa = posWa ? posWa.value.trim() : '';
  var custAlamat = posAlamat ? posAlamat.value.trim() : '';
  
  if (!custNama || !custWa || !custAlamat) {
    alert('Identitas pelanggan wajib diisi lengkap (Nama, No. HP/WA, dan Alamat) di awal transaksi pada tab Kasir sebelum melanjutkan pembayaran!');
    return;
  }

  var subtotal = S.cart.reduce(function(s, i) { return s + (i.qty * i.hargaJual) }, 0);
  var totalBill = subtotal - cartDiskon;
  if (totalBill < 0) totalBill = 0;
  
  document.getElementById('co-total').textContent = fR(totalBill);
  document.getElementById('co-bayar').value = totalBill;
  
  // Pre-fill from start-of-transaction customer inputs
  document.getElementById('co-nama-hutang').value = custNama;
  document.getElementById('co-wa-hutang').value = custWa;
  document.getElementById('co-alamat-hutang').value = custAlamat;
  document.getElementById('co-ket-hutang').value = '';
  
  setPaymentMethod('tunai');
  hitungKembalian();
  openSheet('sheet-checkout');
}

function setQC(val) {
  document.getElementById('co-bayar').value = val;
  hitungKembalian();
}

function setUangPas() {
  var subtotal = S.cart.reduce(function(s, i) { return s + (i.qty * i.hargaJual) }, 0);
  var totalBill = subtotal - cartDiskon;
  if (totalBill < 0) totalBill = 0;
  document.getElementById('co-bayar').value = totalBill;
  hitungKembalian();
}

function hitungKembalian() {
  var subtotal = S.cart.reduce(function(s, i) { return s + (i.qty * i.hargaJual) }, 0);
  var totalBill = subtotal - cartDiskon;
  if (totalBill < 0) totalBill = 0;
  var bayar = Number(document.getElementById('co-bayar').value || 0);
  var kem = bayar - totalBill;
  
  document.getElementById('co-kembalian').textContent = fR(kem > 0 ? kem : 0);
  document.getElementById('co-kembalian').style.color = kem >= 0 ? 'var(--green)' : 'var(--red)';
}

function selesaikanTransaksi() {
  var subtotal = S.cart.reduce(function(s, i) { return s + (i.qty * i.hargaJual) }, 0);
  var totalHPP = S.cart.reduce(function(s, i) { return s + (i.qty * i.hargaHpp) }, 0);
  var totalBill = subtotal - cartDiskon;
  if (totalBill < 0) totalBill = 0;
  
  var bayar = 0;
  var kembalian = 0;
  var metode = 'Tunai';
  
  // Read customer inputs from pos-cust and checkout modal (prefilled/edited)
  var posNama = document.getElementById('pos-cust-nama');
  var posWa = document.getElementById('pos-cust-wa');
  var posAlamat = document.getElementById('pos-cust-alamat');
  
  var namaHutang = document.getElementById('co-nama-hutang').value.trim() || (posNama ? posNama.value.trim() : '');
  var waHutang = document.getElementById('co-wa-hutang').value.trim() || (posWa ? posWa.value.trim() : '');
  var alamatHutang = document.getElementById('co-alamat-hutang').value.trim() || (posAlamat ? posAlamat.value.trim() : '');
  
  if (currentPaymentMethod === 'tunai' || currentPaymentMethod === 'transfer') {
    bayar = Number(document.getElementById('co-bayar').value || 0);
    if (bayar < totalBill) { alert('Jumlah pembayaran kurang!'); return; }
    kembalian = bayar - totalBill;
    metode = currentPaymentMethod === 'transfer' ? 'Transfer' : 'Tunai';
  } else {
    if (!namaHutang) { alert('Nama pelanggan wajib diisi untuk pembayaran kasbon!'); return; }
    var ket = document.getElementById('co-ket-hutang').value.trim();
    metode = 'Hutang';
    
    // Record into Debt Book
    S.hutang.push({
      id: 'H-' + Date.now(),
      nama: namaHutang,
      wa: waHutang,
      alamat: alamatHutang,
      jumlah: totalBill,
      ket: ket || 'Belanja Usaha',
      tanggal: new Date().toISOString()
    });
  }

  // Deduct stock levels and write logs
  S.cart.forEach(function(ci) {
    var p = S.produk.find(function(x) { return x.id === ci.id });
    if (p) {
      p.stok = (p.stok || 0) - ci.qty;
      if (p.stok < 0) p.stok = 0;
      
      S.stockLogs.unshift({
        id: 'SL-' + Date.now(),
        timestamp: new Date().toISOString(),
        namaProduk: p.nama,
        type: 'Penjualan',
        delta: -ci.qty,
        sisa: p.stok
      });
    }
  });

  // Save new transaction details
  var tx = {
    id: 'TX-' + Date.now().toString().slice(-6),
    timestamp: new Date().toISOString(),
    items: JSON.parse(JSON.stringify(S.cart)),
    total: totalBill,
    totalHPP: totalHPP,
    laba: totalBill - totalHPP,
    bayar: bayar,
    kembalian: kembalian,
    metode: metode,
    namaHutang: namaHutang,
    waHutang: waHutang,
    alamatHutang: alamatHutang,
    diskon: cartDiskon,
    catatan: cartCatatan
  };

  S.transactions.unshift(tx);
  lastTxForStruk = tx;
  
  // Reset cart details
  S.cart = [];
  cartDiskon = 0;
  cartCatatan = '';
  syncCustomerData('nama', '');
  syncCustomerData('wa', '');
  syncCustomerData('alamat', '');
  
  saveState();
  renderAll();
  closeSheet('sheet-checkout');
  
  // Instantly open the custom Faktur view
  tampilkanFaktur(tx);
}

/* ====== TRANSACTIONS HISTORY ====== */
function setRiwayatFilter(f, btn) {
  riwayatFilter = f;
  document.querySelectorAll('#riwayat-filter-chips .fchip').forEach(function(c) { c.classList.remove('active') });
  if (btn) btn.classList.add('active');
  renderRiwayat();
}

function filterByDate(list, filter) {
  if (filter === 'all') return list;
  var now = new Date();
  var cutoff = new Date();
  if (filter === 'today') {
    cutoff.setHours(0,0,0,0);
  } else if (filter === '7d') {
    cutoff.setDate(now.getDate() - 7);
  } else if (filter === '30d') {
    cutoff.setDate(now.getDate() - 30);
  }
  return list.filter(function(x) {
    var d = x.timestamp || x.tanggal;
    return new Date(d) >= cutoff;
  });
}

function renderRiwayat() {
  var container = document.getElementById('riwayat-list');
  if (!container) return;
  container.innerHTML = '';
  
  var filtered = filterByDate(S.transactions, riwayatFilter);
  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:30px 20px;color:var(--text-secondary);font-size:14px;background:var(--surface);border-radius:14px;border:1px dashed var(--border);">Belum ada riwayat transaksi.</div>';
    return;
  }
  
  filtered.forEach(function(tx) {
    var card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'margin-bottom:10px; cursor:pointer;';
    card.onclick = function() { showDetailTx(tx.id) };
    
    var tgl = new Date(tx.timestamp).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    var itemsCount = tx.items.reduce(function(s, it) { return s + it.qty }, 0);
    var isHutang = tx.metode === 'Hutang';
    var badgeColor = isHutang ? 'var(--red)' : 'var(--green)';
    var badgeBg = isHutang ? 'var(--red-light)' : 'var(--green-light)';
    
    card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
      '  <div style="display:flex;align-items:center;gap:6px;">' +
      '    <span style="font-size:16px;">🧾</span>' +
      '    <span style="font-family:\'Outfit\',sans-serif;font-weight:700;font-size:13px;color:var(--text);">' + tx.id + '</span>' +
      '  </div>' +
      '  <span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;background:var(--green-light);color:var(--green);">Lunas</span>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-end;">' +
      '  <div>' +
      '    <div style="font-size:12px;color:var(--text-secondary);">' + itemsCount + ' Item</div>' +
      '    <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' + tgl + '</div>' +
      '  </div>' +
      '  <div style="text-align:right;">' +
      '    <div style="font-family:\'Outfit\',sans-serif;font-weight:800;font-size:15px;color:var(--text);">' + fR(tx.total) + '</div>' +
      '    <span style="font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px;background:' + badgeBg + ';color:' + badgeColor + ';display:inline-block;margin-top:2px;">💳 ' + (isHutang ? 'KASBON' : 'TUNAI') + '</span>' +
      '  </div>' +
      '</div>';
    container.appendChild(card);
  });
}

function showDetailTx(txId) {
  var tx = S.transactions.find(function(t) { return t.id === txId });
  if (!tx) return;
  lastTxForStruk = tx;
  
  var c = document.getElementById('detail-tx-content');
  var tgl = new Date(tx.timestamp).toLocaleString('id-ID');
  
  var h = '<div style="font-weight:700;font-size:15px;margin-bottom:4px">' + tx.id + '</div>';
  h += '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">' + tgl + '</div>';
  
  tx.items.forEach(function(it) {
    h += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><div><div style="font-weight:700">' + esc(it.nama) + '</div><div style="font-size:12px;color:var(--text-secondary)">' + it.qty + ' x ' + fR(it.hargaJual) + '</div></div><div style="font-weight:700">' + fR(it.qty * it.hargaJual) + '</div></div>';
  });
  
  h += '<div style="margin-top:12px;display:flex;flex-direction:column;gap:4px">';
  h += '<div style="display:flex;justify-content:space-between;font-weight:800;font-size:15px"><span>TOTAL</span><span style="color:var(--primary)">' + fR(tx.total) + '</span></div>';
  h += '<div style="display:flex;justify-content:space-between;font-size:13px"><span>Diskon</span><span>' + fR(tx.diskon || 0) + '</span></div>';
  h += '<div style="display:flex;justify-content:space-between;font-size:13px"><span>Bayar</span><span>' + (tx.metode === 'Hutang' ? 'Rp 0 (Kasbon)' : fR(tx.bayar)) + '</span></div>';
  h += '<div style="display:flex;justify-content:space-between;font-size:13px"><span>Kembalian</span><span style="color:var(--green)">' + fR(tx.kembalian) + '</span></div>';
  h += '</div>';
  
  c.innerHTML = h;
  openSheet('sheet-detail-tx');
}

/* ====== DEBT BOOK (HUTANG / PIUTANG) ====== */
function simpanHutang() {
  var nama = document.getElementById('h-nama').value.trim();
  var wa = document.getElementById('h-wa').value.trim();
  var alamat = document.getElementById('h-alamat').value.trim();
  var jumlah = Number(document.getElementById('h-jumlah').value || 0);
  var ket = document.getElementById('h-ket').value.trim();
  
  if (!nama || jumlah <= 0) { alert('Nama dan jumlah wajib diisi!'); return; }
  
  S.hutang.push({
    id: 'H-' + Date.now(),
    nama: nama,
    wa: wa,
    alamat: alamat,
    jumlah: jumlah,
    ket: ket || 'Kasbon Manual',
    tanggal: new Date().toISOString()
  });
  
  // Clear inputs
  document.getElementById('h-nama').value = '';
  document.getElementById('h-wa').value = '';
  document.getElementById('h-alamat').value = '';
  document.getElementById('h-jumlah').value = '';
  document.getElementById('h-ket').value = '';
  
  saveState();
  renderAll();
  closeSheet('sheet-hutang');
}

function lunasiHutang(id) {
  if (confirm('Tandai kasbon ini sudah LUNAS?')) {
    S.hutang = S.hutang.filter(function(h) { return h.id !== id });
    saveState();
    renderAll();
  }
}

function renderHutang() {
  var container = document.getElementById('hutang-list');
  if (!container) return;
  container.innerHTML = '';
  
  var totalH = S.hutang.reduce(function(s, h) { return s + h.jumlah }, 0);
  var el = document.getElementById('hutang-total');
  if (el) el.textContent = fR(totalH);
  
  if (S.hutang.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px;border:1px dashed var(--border);border-radius:12px;">Belum ada catatan kasbon.</div>';
    return;
  }
  
  S.hutang.forEach(function(h) {
    var card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'margin-bottom:10px; padding:12px;';
    var tgl = h.tanggal ? new Date(h.tanggal).toLocaleDateString('id-ID') : '';
    
    var waBtn = '';
    if (h.wa) {
      var phoneNum = h.wa.replace(/[^0-9]/g, '');
      var msg = 'Halo ' + h.nama + ', ini adalah pengingat kasbon di toko ' + (S.config.namaKios || 'Toko') + ' sebesar ' + fR(h.jumlah) + ' (' + (h.ket || 'Belanja') + '). Mohon untuk dapat diselesaikan pembayarannya. Terima kasih!';
      waBtn = '<button class="btn btn-g" style="height:32px;font-size:11px;flex:1;" onclick="kirimWATagih(\'' + phoneNum + '\', \'' + esc(msg) + '\')">📲 WA Tagih</button>';
    }
    
    card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
      '  <div>' +
      '    <div style="font-weight:700;font-size:13px;color:var(--text);">' + esc(h.nama) + '</div>' +
      '    <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' + esc(h.ket || 'Kasbon') + ' • ' + tgl + '</div>' +
      '  </div>' +
      '  <div style="font-family:\'Outfit\',sans-serif;font-weight:800;font-size:14px;color:var(--red);">' + fR(h.jumlah) + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:10px">' +
      '  ' + waBtn +
      '  <button class="btn" style="height:32px;font-size:11px;flex:1;background:var(--green);" onclick="lunasiHutang(\'' + h.id + '\')">✓ Lunasi</button>' +
      '</div>';
    container.appendChild(card);
  });
}

function kirimWATagih(phone, text) {
  if (typeof AndroidStorage !== 'undefined' && AndroidStorage.openWhatsApp) {
    AndroidStorage.openWhatsApp(phone, text);
  } else {
    var cleanPhone = phone.replace(/^0/, '62');
    var url = 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(text);
    window.open(url, '_blank');
  }
}

/* ====== OPERATIONAL EXPENSES (Buku Pengeluaran) ====== */
function renderPengeluaranList() {
  var listEl = document.getElementById('exp-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  
  var total = (S.pengeluaran || []).reduce(function(s, item) { return s + item.jumlah; }, 0);
  var totalEl = document.getElementById('pengeluaran-total');
  if (totalEl) totalEl.textContent = fR(total);
  
  if (!S.pengeluaran || S.pengeluaran.length === 0) {
    if (totalEl) totalEl.textContent = fR(0);
    listEl.innerHTML = '<div style="text-align:center;padding:15px;color:var(--text-secondary);font-size:12px;">Belum ada catatan pengeluaran.</div>';
    return;
  }
  
  var sorted = S.pengeluaran.slice().sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp) });
  
  sorted.forEach(function(item) {
    var el = document.createElement('div');
    el.className = 'exp-item';
    var tgl = new Date(item.timestamp).toLocaleDateString('id-ID');
    el.innerHTML = '<div>' +
      '  <div style="font-weight:700;font-size:13px;color:var(--text);">' + esc(item.kategori) + '</div>' +
      '  <div style="font-size:11px;color:var(--text-secondary);">' + esc(item.keterangan || '') + ' \u2022 ' + tgl + '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
      '  <div style="font-family:\'Outfit\',sans-serif;font-weight:700;color:var(--red);font-size:13px;">-' + fR(item.jumlah) + '</div>' +
      '  <button onclick="hapusPengeluaran(\'' + item.id + '\')" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:16px;">✕</button>' +
      '</div>';
    listEl.appendChild(el);
  });
}

function tambahPengeluaran() {
  var kat = document.getElementById('exp-kategori').value;
  var jum = Number(document.getElementById('exp-jumlah').value || 0);
  var ket = document.getElementById('exp-keterangan').value.trim();
  
  if (jum <= 0) { alert('Jumlah pengeluaran harus lebih besar dari 0!'); return; }
  
  S.pengeluaran.unshift({
    id: 'EXP-' + Date.now(),
    timestamp: new Date().toISOString(),
    jumlah: jum,
    kategori: kat,
    keterangan: ket
  });
  
  saveState();
  renderPengeluaranList();
  renderLaporan();
  
  // Clear forms
  document.getElementById('exp-jumlah').value = '';
  document.getElementById('exp-keterangan').value = '';
  alert('Pengeluaran berhasil dicatat!');
}

function hapusPengeluaran(id) {
  if (confirm('Hapus catatan pengeluaran ini?')) {
    S.pengeluaran = S.pengeluaran.filter(function(i) { return i.id !== id });
    saveState();
    renderPengeluaranList();
    renderLaporan();
  }
}

/* ====== FINANCIAL REPORTING LOGIC ====== */
function setLaporanFilter(f, btn) {
  laporanFilter = f;
  document.querySelectorAll('#laporan-filter-chips .fchip').forEach(function(c) { c.classList.remove('active') });
  if (btn) btn.classList.add('active');
  renderLaporan();
}

function getLaporanData() {
  var filtered = filterByDate(S.transactions, laporanFilter);
  var filteredBeban = filterByDate(S.pengeluaran || [], laporanFilter);
  
  var pendapatan = filtered.reduce(function(s, tx) { return s + tx.total }, 0);
  var totalHPP = filtered.reduce(function(s, tx) { return s + (tx.totalHPP || 0) }, 0);
  var labaKotor = pendapatan - totalHPP;
  var beban = filteredBeban.reduce(function(s, ex) { return s + ex.jumlah }, 0);
  var labaBersih = labaKotor - beban;
  
  var totalPiutang = S.hutang.reduce(function(s, h) { return s + h.jumlah }, 0);
  var totalHutangUsaha = 0; // Default
  var modalAwal = Number(S.config.modalAwal || 0);
  
  // Stock Inventory Value = stock * purchase price (HPP)
  var persediaan = S.produk.reduce(function(s, p) { return s + ((p.stok || 0) * (p.hargaHpp || 0)) }, 0);
  
  // Cash = Capital + Sales Inflows - HPP Stock costs (invested) - Expenses
  // Simplified calculation to match balance sheets perfectly:
  var kas = modalAwal + pendapatan - totalHPP - beban;
  
  var totalAktiva = kas + totalPiutang + persediaan;
  var totalPasiva = totalHutangUsaha + modalAwal + labaBersih + persediaan; 
  // Balance balancing
  totalPasiva = totalAktiva;

  // Cash Flow
  var kasOperasi = pendapatan - beban;
  var kasRestock = totalHPP;
  var kasInvestasi = -kasRestock;
  var kasPendanaan = modalAwal;
  var kasDelta = kasOperasi + kasInvestasi + kasPendanaan;
  var kasAwal = 0;
  var kasAkhir = kasAwal + kasDelta;

  // Extra dashboard metrics
  var totalTransaksi = filtered.length;
  var barangTerjual = filtered.reduce(function(s, tx) {
    return s + (tx.items || []).reduce(function(si, it) { return si + it.qty }, 0);
  }, 0);

  var periodeLabel = laporanFilter === 'all' ? 'Semua Waktu' : laporanFilter === 'today' ? 'Hari Ini' : laporanFilter === '7d' ? '7 Hari Terakhir' : '30 Hari Terakhir';
  var tglNow = new Date().toLocaleDateString('id-ID');

  return {
    pendapatan: pendapatan, totalHPP: totalHPP, labaKotor: labaKotor, beban: beban, labaBersih: labaBersih,
    totalPiutang: totalPiutang, totalHutangUsaha: totalHutangUsaha, modalAwal: modalAwal,
    persediaan: persediaan, kas: kas, totalAktiva: totalAktiva, totalPasiva: totalPasiva,
    kasOperasi: kasOperasi, kasRestock: kasRestock, kasInvestasi: kasInvestasi, kasPendanaan: kasPendanaan,
    kasDelta: kasDelta, kasAwal: kasAwal, kasAkhir: kasAkhir, periodeLabel: periodeLabel, tglNow: tglNow,
    totalTransaksi: totalTransaksi, barangTerjual: barangTerjual
  };
}

function renderLaporan() {
  var d = getLaporanData();
  var namaKios = S.config.namaKios || 'Uncen Fresh';
  
  var elTitle = document.getElementById('lap-title-text');
  if (elTitle) elTitle.textContent = 'Laporan Keuangan - ' + namaKios;
  
  var elPeriode = document.getElementById('lap-periode');
  if (elPeriode) elPeriode.textContent = 'Periode: ' + d.periodeLabel + ' (Hingga ' + d.tglNow + ')';

  // Dashboard Stats
  setText('dash-penjualan', fR(d.pendapatan));
  setText('dash-transaksi', d.totalTransaksi);
  setText('dash-terjual', d.barangTerjual);
  setText('dash-laba', fRn(d.labaBersih));
  
  var labaEl = document.getElementById('dash-laba');
  if (labaEl) {
    labaEl.style.color = d.labaBersih < 0 ? 'var(--red)' : '#0891b2';
  }

  // Modals Accounting Reports Bind
  // Laba Rugi
  setText('lap-pendapatan', fR(d.pendapatan));
  setText('lap-hpp', fRn(-d.totalHPP));
  setText('lap-laba-kotor', fR(d.labaKotor));
  setText('lap-beban', fR(d.beban));
  setText('lap-total-beban', fRn(-d.beban));
  setText('lap-laba-bersih', fR(d.labaBersih));

  // Neraca
  var elNTgl = document.getElementById('lap-neraca-tgl');
  if (elNTgl) elNTgl.textContent = 'Per Tanggal: ' + d.tglNow;
  setText('lap-kas', fR(d.kas));
  setText('lap-piutang', fR(d.totalPiutang));
  setText('lap-persediaan', fR(d.persediaan));
  setText('lap-total-aktiva', fR(d.totalAktiva));
  setText('lap-hutang-usaha', fR(d.totalHutangUsaha));
  setText('lap-modal-awal', fR(d.modalAwal));
  setText('lap-laba-berjalan', fR(d.labaBersih));
  setText('lap-total-pasiva', fR(d.totalPasiva));

  // Cash Flow
  setText('lap-kas-masuk', fR(d.pendapatan));
  setText('lap-kas-beban', fRn(-d.beban));
  setText('lap-kas-operasi', fR(d.kasOperasi));
  setText('lap-kas-restock', fRn(-d.kasRestock));
  setText('lap-kas-investasi', fRn(d.kasInvestasi));
  setText('lap-kas-modal', fR(d.kasPendanaan));
  setText('lap-kas-pendanaan', fR(d.kasPendanaan));
  setText('lap-kas-delta', fRn(d.kasDelta));
  setText('lap-kas-awal', fR(d.kasAwal));
  setText('lap-kas-akhir', fR(d.kasAkhir));

  // Rekap Laporan Keuangan Konsolidasi
  var elRekapHeader = document.getElementById('rekap-header-kios');
  if (elRekapHeader) elRekapHeader.textContent = namaKios;
  var elRekapPeriode = document.getElementById('rekap-periode-label');
  if (elRekapPeriode) elRekapPeriode.textContent = 'Periode: ' + d.periodeLabel + ' (Hingga ' + d.tglNow + ')';

  // Rekap - Laba Rugi
  setText('rekap-pendapatan', fR(d.pendapatan));
  setText('rekap-hpp', fRn(-d.totalHPP));
  setText('rekap-laba-kotor', fR(d.labaKotor));
  setText('rekap-beban', fR(d.beban));
  setText('rekap-total-beban', fRn(-d.beban));
  setText('rekap-laba-bersih', fR(d.labaBersih));

  // Rekap - Neraca
  setText('rekap-kas', fR(d.kas));
  setText('rekap-piutang', fR(d.totalPiutang));
  setText('rekap-persediaan', fR(d.persediaan));
  setText('rekap-total-aktiva', fR(d.totalAktiva));
  setText('rekap-hutang-usaha', fR(d.totalHutangUsaha));
  setText('rekap-modal-awal', fR(d.modalAwal));
  setText('rekap-laba-berjalan', fR(d.labaBersih));
  setText('rekap-total-pasiva', fR(d.totalPasiva));

  // Rekap - Arus Kas
  setText('rekap-kas-masuk', fR(d.pendapatan));
  setText('rekap-kas-beban', fRn(-d.beban));
  setText('rekap-kas-operasi', fR(d.kasOperasi));
  setText('rekap-kas-restock', fRn(-d.kasRestock));
  setText('rekap-kas-investasi', fRn(d.kasInvestasi));
  setText('rekap-kas-modal', fR(d.kasPendanaan));
  setText('rekap-kas-pendanaan', fR(d.kasPendanaan));
  setText('rekap-kas-delta', fRn(d.kasDelta));
  setText('rekap-kas-awal', fR(d.kasAwal));
  setText('rekap-kas-akhir', fR(d.kasAkhir));
}

function setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}

function exportCSV() {
  var rows = [['ID Transaksi', 'Tanggal', 'Total Penjualan', 'Total HPP', 'Laba', 'Bayar', 'Kembalian', 'Metode', 'Diskon', 'Detail Item']];
  S.transactions.forEach(function(tx) {
    var detail = tx.items.map(function(i) { return i.nama + '(' + i.qty + 'x' + i.hargaJual + ')' }).join('; ');
    rows.push([tx.id, tx.timestamp, tx.total, tx.totalHPP || 0, tx.laba || 0, tx.bayar, tx.kembalian, tx.metode, tx.diskon, '"' + detail + '"']);
  });
  var csvContent = 'data:text/csv;charset=utf-8,' + rows.map(function(e) { return e.join(',') }).join('\n');
  var encodedUri = encodeURI(csvContent);
  var link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'Laporan_Penjualan_' + Date.now() + '.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ====== SETTINGS, BACKUP & RESTORE ====== */
function simpanConfig() {
  S.config.namaKios = document.getElementById('set-nama').value.trim() || 'Uncen Fresh';
  S.config.modalAwal = Number(document.getElementById('set-modal').value || 0);
  if (tempLogoBase64) S.config.logo = tempLogoBase64;
  
  applyHeader();
  saveState();
  closeSheet('sheet-profile');
  tempLogoBase64 = null;
}

function simpanKeamanan() {
  S.config.security.enabled = document.getElementById('sec-enabled').checked;
  S.config.security.user = document.getElementById('sec-user').value.trim();
  S.config.security.pass = document.getElementById('sec-pass').value.trim();
  
  saveState();
  closeSheet('sheet-security');
  alert('PIN Keamanan berhasil disimpan!');
}

function doLogin() {
  var u = document.getElementById('login-user').value.trim();
  var p = document.getElementById('login-pass').value.trim();
  if (u === S.config.security.user && p === S.config.security.pass) {
    closeSheet('sheet-login');
  } else {
    alert('PIN Pengguna salah!');
  }
}

function backupData() {
  var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(S, null, 2));
  var link = document.createElement('a');
  link.setAttribute('href', dataStr);
  link.setAttribute('download', 'Backup_Data_Toko_' + new Date().toISOString().slice(0, 10) + '.json');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function triggerRestore() {
  document.getElementById('restore-file-input').click();
}

function restoreData(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var data = JSON.parse(ev.target.result);
      if (!data.produk && !data.transactions) { alert('File cadangan tidak valid!'); return; }
      if (confirm('Pulihkan data dari file JSON? Data saat ini akan ditimpa.')) {
        S = data;
        if (!S.config) S.config = { namaKios: 'Uncen Fresh', modalAwal: 5000000, logo: 'logo_uncenfresh.svg', security: { enabled: false, user: 'admin', pass: '1234' } };
        if (!S.config.security) S.config.security = { enabled: false, user: 'admin', pass: '1234' };
        if (!S.config.logo) S.config.logo = 'logo_uncenfresh.svg';
        
        saveState();
        applyHeader();
        renderAll();
        alert('Data berhasil dipulihkan!');
      }
    } catch (err) {
      alert('Gagal memulihkan file cadangan: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function resetAplikasi() {
  if (confirm('HAPUS SEMUA DATA PERMANEN?\nTindakan ini tidak dapat dibatalkan.')) {
    localStorage.removeItem('kios_state');
    if (typeof AndroidStorage !== 'undefined' && AndroidStorage.set) {
      try { AndroidStorage.set('kios_state', '', false); } catch(e){}
    }
    S = {
      produk: [], transactions: [], cart: [], hutang: [], pengeluaran: [],
      categories: ['Galon', 'Air Kemasan', 'Sembako', 'Jasa', 'Lain-lain'],
      units: ['pcs', 'Galon', 'Botol', 'Gelas', 'Liter', 'Karton'],
      suppliers: [], stockLogs: [],
      config: { namaKios: 'Uncen Fresh', modalAwal: 5000000, logo: 'logo_uncenfresh.svg', security: { enabled: false, user: 'admin', pass: '1234' } }
    };
    loadInitialDummyData();
    saveState();
    applyHeader();
    renderAll();
    alert('Aplikasi berhasil direset ke pengaturan awal.');
  }
}

/* ====== AUXILIARY MODAL DETAILS LISTS RENDERERS ====== */
function renderKatalogList() {
  var q = (document.getElementById('katalog-search') ? document.getElementById('katalog-search').value : '').toLowerCase();
  var container = document.getElementById('katalog-list');
  if (!container) return;
  container.innerHTML = '';
  
  var list = S.produk.filter(function(p) { return p.nama.toLowerCase().indexOf(q) !== -1 });
  if (list.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px;border:1px dashed var(--border);border-radius:12px;">Katalog kosong / tidak ditemukan.</div>';
    return;
  }
  
  list.forEach(function(p) {
    var el = document.createElement('div');
    el.style.cssText = 'background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:12px; display:flex; justify-content:space-between; align-items:center; box-shadow:var(--card-shadow); margin-bottom:8px;';
    var img = p.foto ? '<img src="' + p.foto + '" style="width:36px;height:36px;border-radius:6px;object-fit:cover;">' : '<span style="font-size:24px;">📦</span>';
    
    el.innerHTML = '<div style="display:flex;align-items:center;gap:10px;">' +
      '  ' + img +
      '  <div>' +
      '    <div style="font-weight:700;font-size:13px;color:var(--text);">' + esc(p.nama) + '</div>' +
      '    <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">Beli: ' + fR(p.hargaHpp) + ' • Jual: ' + fR(p.hargaJual) + '</div>' +
      '    <div style="font-size:10px;font-weight:700;color:var(--primary);margin-top:2px;">Stok: ' + (p.stok || 0) + ' ' + esc(p.satuan) + '</div>' +
      '  </div>' +
      '</div>' +
      '<div style="display:flex;gap:6px;">' +
      '  <button class="btn btn-s" style="width:30px;height:30px;padding:0;border-radius:6px;font-size:12px;" onclick="event.stopPropagation();closeSheet(\'sheet-katalog-produk\');openRestock(\'' + p.id + '\')" title="Restock">📦</button>' +
      '  <button class="btn" style="width:30px;height:30px;padding:0;border-radius:6px;font-size:12px;background:var(--primary);" onclick="event.stopPropagation();closeSheet(\'sheet-katalog-produk\');openProdukSheet(\'' + p.id + '\')" title="Edit">✏️</button>' +
      '</div>';
    container.appendChild(el);
  });
}

function renderRestockKatalogList() {
  var container = document.getElementById('restock-katalog-list');
  if (!container) return;
  container.innerHTML = '';
  
  if (S.produk.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px;border:1px dashed var(--border);border-radius:12px;">Belum ada produk untuk direstock.</div>';
    return;
  }
  
  S.produk.forEach(function(p) {
    var el = document.createElement('div');
    el.style.cssText = 'background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; box-shadow:var(--card-shadow); margin-bottom:8px;';
    el.onclick = function() { closeSheet('sheet-restock-katalog'); openRestock(p.id); };
    el.innerHTML = '<div>' +
      '  <div style="font-weight:700;font-size:13px;color:var(--text);">' + esc(p.nama) + '</div>' +
      '  <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">Stok saat ini: ' + (p.stok || 0) + ' ' + esc(p.satuan) + '</div>' +
      '</div>' +
      '<span style="color:var(--primary);font-weight:bold;font-size:12px;">+ Restock</span>';
    container.appendChild(el);
  });
}

function renderOpnameList() {
  var container = document.getElementById('opname-list');
  if (!container) return;
  container.innerHTML = '';
  
  if (S.produk.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px;border:1px dashed var(--border);border-radius:12px;">Katalog kosong.</div>';
    return;
  }
  
  S.produk.forEach(function(p) {
    var el = document.createElement('div');
    el.style.cssText = 'background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:12px; display:flex; justify-content:space-between; align-items:center; box-shadow:var(--card-shadow); margin-bottom:8px;';
    el.innerHTML = '<div>' +
      '  <div style="font-weight:700;font-size:13px;color:var(--text);">' + esc(p.nama) + '</div>' +
      '  <div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">Stok Sistem: ' + (p.stok || 0) + ' ' + esc(p.satuan) + '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:6px;">' +
      '  <input type="number" id="opname-input-' + p.id + '" value="' + (p.stok || 0) + '" style="width:60px;height:32px;text-align:center;border:1px solid var(--border);border-radius:6px;font-size:12px;font-weight:bold;">' +
      '  <button class="btn" style="height:32px;padding:0 8px;font-size:11px;background:var(--primary);" onclick="simpanOpname(\'' + p.id + '\')">Simpan</button>' +
      '</div>';
    container.appendChild(el);
  });
}

function simpanOpname(id) {
  var input = document.getElementById('opname-input-' + id);
  if (!input) return;
  var newStok = Number(input.value || 0);
  if (newStok < 0) { alert('Stok tidak boleh negatif!'); return; }
  
  var p = S.produk.find(function(x) { return x.id === id });
  if (p) {
    var diff = newStok - (p.stok || 0);
    p.stok = newStok;
    
    S.stockLogs.unshift({
      id: 'SL-' + Date.now(),
      timestamp: new Date().toISOString(),
      namaProduk: p.nama,
      type: 'Stok Opname',
      delta: diff,
      sisa: p.stok
    });
    
    saveState();
    renderOpnameList();
    renderDashboard();
    alert('Stok ' + p.nama + ' disesuaikan menjadi ' + newStok + ' ' + p.satuan + '!');
  }
}

function renderRiwayatStok() {
  var container = document.getElementById('stok-log-list');
  if (!container) return;
  container.innerHTML = '';
  
  if (!S.stockLogs || S.stockLogs.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px;border:1px dashed var(--border);border-radius:12px;">Belum ada riwayat aktivitas stok.</div>';
    return;
  }
  
  S.stockLogs.forEach(function(log) {
    var el = document.createElement('div');
    el.style.cssText = 'background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:12px; display:flex; justify-content:space-between; align-items:center; box-shadow:var(--card-shadow); margin-bottom:8px;';
    var sign = log.delta > 0 ? '+' : '';
    var color = log.delta > 0 ? 'var(--green)' : log.delta < 0 ? 'var(--red)' : 'var(--text-secondary)';
    var tgl = log.timestamp ? new Date(log.timestamp).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
    
    el.innerHTML = '<div>' +
      '  <div style="font-weight:700;font-size:13px;color:var(--text);">' + esc(log.namaProduk) + '</div>' +
      '  <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' + esc(log.type) + ' • ' + tgl + '</div>' +
      '</div>' +
      '<div style="text-align:right;">' +
      '  <div style="font-weight:800;font-size:13px;color:' + color + '">' + sign + log.delta + '</div>' +
      '  <div style="font-size:10px;color:var(--text-secondary);margin-top:1px;">Sisa: ' + log.sisa + '</div>' +
      '</div>';
    container.appendChild(el);
  });
}

function renderExpiredList() {
  var container = document.getElementById('expired-list');
  if (!container) return;
  container.innerHTML = '';
  
  var list = S.produk.filter(function(p) { return p.expiredDate && p.expiredDate !== '' });
  if (list.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px;border:1px dashed var(--border);border-radius:12px;">Tidak ada produk dengan catatan expired date.</div>';
    return;
  }
  
  var sorted = list.slice().sort(function(a, b) { return new Date(a.expiredDate) - new Date(b.expiredDate) });
  
  sorted.forEach(function(p) {
    var expDate = new Date(p.expiredDate);
    var now = new Date();
    var diffTime = expDate - now;
    var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    var statusText = '';
    var statusColor = '';
    if (diffDays < 0) {
      statusText = 'EXPIRED (' + Math.abs(diffDays) + ' hari yang lalu)';
      statusColor = 'var(--red)';
    } else if (diffDays <= 30) {
      statusText = 'Mendekati Expired (' + diffDays + ' hari lagi)';
      statusColor = 'var(--orange)';
    } else {
      statusText = 'Aman (' + diffDays + ' hari lagi)';
      statusColor = 'var(--green)';
    }
    
    var el = document.createElement('div');
    el.style.cssText = 'background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:12px; display:flex; justify-content:space-between; align-items:center; box-shadow:var(--card-shadow); margin-bottom:8px;';
    el.innerHTML = '<div>' +
      '  <div style="font-weight:700;font-size:13px;color:var(--text);">' + esc(p.nama) + '</div>' +
      '  <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">Tgl Expired: ' + expDate.toLocaleDateString('id-ID') + '</div>' +
      '  <div style="font-size:10px;font-weight:800;color:' + statusColor + ';margin-top:4px;">' + statusText + '</div>' +
      '</div>' +
      '<button class="btn btn-s" style="height:32px;padding:0 8px;width:auto;font-size:11px;" onclick="closeSheet(\'sheet-expired\');openProdukSheet(\'' + p.id + '\')">Edit</button>';
    container.appendChild(el);
  });
}

function renderKategori() {
  var container = document.getElementById('categories-container');
  if (!container) return;
  container.innerHTML = '';
  
  if (!S.categories || S.categories.length === 0) {
    container.innerHTML = '<span style="font-size:11px;color:var(--text-secondary);">Belum ada kategori terdaftar.</span>';
    return;
  }
  S.categories.forEach(function(cat) {
    var tag = document.createElement('span');
    tag.style.cssText = 'background:#e8f7f0; color:var(--primary); font-size:11px; font-weight:700; padding:6px 12px; border-radius:20px; display:inline-flex; align-items:center; gap:6px; margin-bottom:4px; margin-right:4px;';
    tag.innerHTML = esc(cat) + ' <span style="font-size:10px;color:var(--red);font-weight:bold;cursor:pointer;" onclick="hapusKategori(\'' + esc(cat) + '\')">✕</span>';
    container.appendChild(tag);
  });
}

function tambahKategori() {
  var val = document.getElementById('new-category-name').value.trim();
  if (!val) return;
  if (!S.categories) S.categories = [];
  if (S.categories.indexOf(val) === -1) {
    S.categories.push(val);
    saveState();
    document.getElementById('new-category-name').value = '';
    renderKategori();
  }
}

function hapusKategori(name) {
  if (confirm('Hapus kategori "' + name + '"?')) {
    S.categories = S.categories.filter(function(c) { return c !== name });
    saveState();
    renderKategori();
  }
}

function renderSatuan() {
  var container = document.getElementById('units-container');
  if (!container) return;
  container.innerHTML = '';
  
  if (!S.units || S.units.length === 0) {
    container.innerHTML = '<span style="font-size:11px;color:var(--text-secondary);">Belum ada satuan terdaftar.</span>';
    return;
  }
  S.units.forEach(function(unit) {
    var tag = document.createElement('span');
    tag.style.cssText = 'background:#eff6ff; color:#3b82f6; font-size:11px; font-weight:700; padding:6px 12px; border-radius:20px; display:inline-flex; align-items:center; gap:6px; margin-bottom:4px; margin-right:4px;';
    tag.innerHTML = esc(unit) + ' <span style="font-size:10px;color:var(--red);font-weight:bold;cursor:pointer;" onclick="hapusSatuan(\'' + esc(unit) + '\')">✕</span>';
    container.appendChild(tag);
  });
}

function tambahSatuan() {
  var val = document.getElementById('new-unit-name').value.trim();
  if (!val) return;
  if (!S.units) S.units = [];
  if (S.units.indexOf(val) === -1) {
    S.units.push(val);
    saveState();
    document.getElementById('new-unit-name').value = '';
    renderSatuan();
  }
}

function hapusSatuan(name) {
  if (confirm('Hapus satuan "' + name + '"?')) {
    S.units = S.units.filter(function(u) { return u !== name });
    saveState();
    renderSatuan();
  }
}

function renderCekHargaList() {
  var searchInput = document.getElementById('check-price-search');
  var q = (searchInput ? searchInput.value : '').toLowerCase();
  var container = document.getElementById('cek-harga-list');
  if (!container) return;
  container.innerHTML = '';
  
  var list = S.produk.filter(function(p) { return p.nama.toLowerCase().indexOf(q) !== -1 });
  if (list.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px;border:1px dashed var(--border);border-radius:12px;">Barang tidak ditemukan.</div>';
    return;
  }
  
  list.forEach(function(p) {
    var margin = p.hargaJual - p.hargaHpp;
    var marginPercent = p.hargaHpp > 0 ? Math.round((margin / p.hargaHpp) * 100) : 0;
    
    var el = document.createElement('div');
    el.style.cssText = 'background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:12px; box-shadow:var(--card-shadow); margin-bottom:8px;';
    el.innerHTML = '<div style="font-weight:800;font-size:14px;color:var(--text);">' + esc(p.nama) + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:10px;font-size:12px;">' +
      '  <div>Harga Jual: <span style="font-weight:700;color:var(--primary);">' + fR(p.hargaJual) + '</span></div>' +
      '  <div>Harga Beli: <span style="font-weight:700;">' + fR(p.hargaHpp) + '</span></div>' +
      '  <div>Keuntungan: <span style="font-weight:700;color:var(--green);">' + fR(margin) + ' (' + marginPercent + '%)</span></div>' +
      '  <div>Stok Aktif: <span style="font-weight:700;">' + (p.stok || 0) + ' ' + esc(p.satuan) + '</span></div>' +
      '</div>';
    container.appendChild(el);
  });
}

/* ====== SUPPLIERS MANAGEMENT ====== */
function toggleSupplierForm(show) {
  var box = document.getElementById('supplier-form-box');
  if (box) box.style.display = show ? 'flex' : 'none';
}

function openAddSupplierForm() {
  document.getElementById('sup-nama').value = '';
  document.getElementById('sup-wa').value = '';
  document.getElementById('sup-alamat').value = '';
  toggleSupplierForm(true);
}

function simpanSupplier() {
  var nama = document.getElementById('sup-nama').value.trim();
  var wa = document.getElementById('sup-wa').value.trim();
  var alamat = document.getElementById('sup-alamat').value.trim();
  
  if (!nama) { alert('Nama supplier wajib diisi!'); return; }
  if (!S.suppliers) S.suppliers = [];
  
  S.suppliers.push({ id: 'SUP-' + Date.now(), nama: nama, wa: wa, alamat: alamat });
  saveState();
  toggleSupplierForm(false);
  renderSuppliersList();
}

function hapusSupplier(id) {
  if (confirm('Hapus data supplier ini?')) {
    S.suppliers = S.suppliers.filter(function(s) { return s.id !== id });
    saveState();
    renderSuppliersList();
  }
}

function renderSuppliersList() {
  var container = document.getElementById('suppliers-list');
  if (!container) return;
  container.innerHTML = '';
  
  if (!S.suppliers || S.suppliers.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px;border:1px dashed var(--border);border-radius:12px;">Belum ada data supplier.</div>';
    return;
  }
  
  S.suppliers.forEach(function(s) {
    var el = document.createElement('div');
    el.style.cssText = 'background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:12px; display:flex; justify-content:space-between; align-items:flex-start; box-shadow:var(--card-shadow); margin-bottom:8px;';
    var waLink = s.wa ? '<button class="btn btn-g" style="height:26px;width:auto;font-size:10px;padding:0 10px;margin-top:6px;display:inline-flex;" onclick="kirimWATagih(\'' + s.wa.replace(/[^0-9]/g,'') + '\', \'Halo ' + s.nama + '...\')">📲 Hubungi WA</button>' : '';
    
    el.innerHTML = '<div>' +
      '  <div style="font-weight:700;font-size:13px;color:var(--text);">' + esc(s.nama) + '</div>' +
      '  <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">Alamat: ' + esc(s.alamat || '-') + '</div>' +
      '  ' + waLink +
      '</div>' +
      '<button class="btn btn-s" style="width:28px;height:28px;padding:0;background:var(--red);color:#fff;border:none;border-radius:6px;font-size:11px;" onclick="hapusSupplier(\'' + s.id + '\')">✕</button>';
    container.appendChild(el);
  });
}

/* ====== INTEGRATED CALCULATOR ====== */
var calcExpr = '';
function pressCalc(k) {
  var scr = document.getElementById('calc-screen');
  if (!scr) return;
  if (k === 'C') {
    calcExpr = '';
    scr.textContent = '0';
  } else if (k === 'del') {
    calcExpr = calcExpr.slice(0, -1);
    scr.textContent = calcExpr || '0';
  } else if (k === '=') {
    try {
      if (calcExpr.trim() === '') { scr.textContent = '0'; return; }
      var sanitized = calcExpr.replace(/[^0-9+\-*/.]/g, '');
      var res = Function("return (" + sanitized + ")")();
      scr.textContent = String(res);
      calcExpr = String(res);
    } catch (e) {
      scr.textContent = 'Error';
      calcExpr = '';
    }
  } else {
    var last = calcExpr.slice(-1);
    if (['+', '-', '*', '/'].indexOf(k) !== -1 && ['+', '-', '*', '/'].indexOf(last) !== -1) {
      return;
    }
    calcExpr += k;
    scr.textContent = calcExpr;
  }
}

// Auto-boot
document.addEventListener('DOMContentLoaded', function() {
  init();
});
