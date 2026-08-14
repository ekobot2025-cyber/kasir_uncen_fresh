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
    { id: 'P-1', nama: 'Galon + Air', hargaHpp: 55000, hargaJual: 65000, stok: 50, satuan: 'Galon', kategori: 'Galon', expiredDate: '' },
    { id: 'P-2', nama: 'Ukuran 220ml (GELAS)', hargaHpp: 29000, hargaJual: 33000, stok: 100, satuan: 'Karton', kategori: 'Air Kemasan', expiredDate: '' },
    { id: 'P-3', nama: 'Ukuran 330ml (BOTOL)', hargaHpp: 37500, hargaJual: 51000, stok: 80, satuan: 'Karton', kategori: 'Air Kemasan', expiredDate: '' },
    { id: 'P-4', nama: 'Tukar Air Galon', hargaHpp: 8000, hargaJual: 15000, stok: 200, satuan: 'Galon', kategori: 'Jasa', expiredDate: '' },
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

  // Pemicu Sinkronisasi Cloud Supabase (Background)
  if (typeof syncLocalToCloud === 'function') {
    syncLocalToCloud('products', S.produk);
    syncLocalToCloud('transactions', S.transactions);
    syncLocalToCloud('hutang', S.hutang);
    syncLocalToCloud('pengeluaran', S.pengeluaran);
    syncLocalToCloud('suppliers', S.suppliers);
    syncLocalToCloud('stock_logs', S.stockLogs);
    syncLocalToCloud('config', S.config);
  }
}

/* ====== INIT ====== */
async function init() {
  await loadState();
  applyHeader();
  
  if (typeof checkSupabaseSession === 'function') {
    checkSupabaseSession();
  } else {
    renderAll();
  }

  if (S.config.security && S.config.security.enabled) {
    openSheet('sheet-login');
  }
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
  
  // Render views pendukung Stok & Produk
  renderProdukPage();
  renderInventoriPage();
  updateSidebarUserFooter();
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

function formatRibuan(el) {
  var pos = el.selectionStart;
  var oldLen = el.value.length;
  var raw = el.value.replace(/[^0-9]/g, '');
  if (raw === '') { el.value = ''; return; }
  el.value = Number(raw).toLocaleString('id-ID');
  var newLen = el.value.length;
  var newPos = pos + (newLen - oldLen);
  if (newPos < 0) newPos = 0;
  el.setSelectionRange(newPos, newPos);
}

function parseRibuan(id) {
  var el = document.getElementById(id);
  if (!el) return 0;
  var raw = el.value.replace(/[^0-9]/g, '');
  return Number(raw) || 0;
}

function setRibuan(id, val) {
  var el = document.getElementById(id);
  if (!el) return;
  var n = Number(val) || 0;
  el.value = n > 0 ? n.toLocaleString('id-ID') : '';
}

/* ====== NAVIGATION TABS ====== */
function switchTab(t) {
  // Tutup sidebar di mobile jika sedang terbuka
  var sbContainer = document.querySelector('.sidebar');
  if (sbContainer) {
    sbContainer.classList.remove('open');
  }

  document.querySelectorAll('.vp').forEach(function(e) { e.classList.remove('active') });
  document.querySelectorAll('.ni').forEach(function(e) { e.classList.remove('active') });
  document.querySelectorAll('.sbi').forEach(function(e) { e.classList.remove('active') });
  
  var v = document.getElementById('view-' + t);
  var b = document.getElementById('tab-' + t);
  var sb = document.getElementById('sb-' + t);

  if (v) v.classList.add('active');
  if (b) b.classList.add('active');
  if (sb) sb.classList.add('active');
  
  // Tampilkan tombol tindakan cepat (+ Jual, + Beli, Biaya) hanya di Beranda (dashboard)
  var hdrShortcuts = document.querySelector('.hdr-shortcuts');
  if (hdrShortcuts) {
    if (t === 'dashboard') {
      hdrShortcuts.style.setProperty('display', 'flex', 'important');
    } else {
      hdrShortcuts.style.setProperty('display', 'none', 'important');
    }
  }
  
  renderAll();
}

function switchStokTab(tab) {
  document.querySelectorAll('.stok-tab').forEach(function(btn) {
    btn.classList.remove('active');
    btn.style.background = 'none';
    btn.style.color = 'var(--text-secondary)';
    btn.style.fontWeight = '600';
    btn.style.boxShadow = 'none';
  });
  
  var activeBtn = document.getElementById('stok-tab-' + tab);
  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.style.background = 'var(--surface)';
    activeBtn.style.color = 'var(--primary)';
    activeBtn.style.fontWeight = '700';
    activeBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
  }
  
  var paneKatalog = document.getElementById('stok-pane-katalog');
  var paneInventori = document.getElementById('stok-pane-inventori');
  if (paneKatalog && paneInventori) {
    paneKatalog.style.display = (tab === 'katalog') ? 'block' : 'none';
    paneInventori.style.display = (tab === 'inventori') ? 'block' : 'none';
  }
}

/* ====== MODAL CONTROLS ====== */
var allSheets = [
  'sheet-produk', 'sheet-restock', 'sheet-cart', 'sheet-checkout', 'sheet-struk', 
  'sheet-hutang', 'sheet-profile', 'sheet-security', 'sheet-login', 'sheet-detail-tx', 
  'sheet-capture', 'sheet-pengeluaran', 'sheet-lap-labarugi', 'sheet-lap-neraca', 
  'sheet-lap-aruskas', 'sheet-lap-piutang', 'sheet-quick-add', 'sheet-katalog-produk', 
  'sheet-restock-katalog', 'sheet-stok-opname', 'sheet-riwayat-stok', 'sheet-expired', 
  'sheet-kategori', 'sheet-satuan', 'sheet-kalkulator', 'sheet-cek-harga', 'sheet-supplier',
  'sheet-faktur', 'sheet-lap-rekap', 'sheet-calk'
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
      setRibuan('set-modal', S.config.modalAwal || 0);
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
    setRibuan('fp-hpp', p.hargaHpp || 0);
    setRibuan('fp-jual', p.hargaJual || 0);
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
  var hpp = parseRibuan('fp-hpp');
  var jual = parseRibuan('fp-jual');
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
  
  var today = new Date().toISOString().split('T')[0];
  var elTgl = document.getElementById('restock-tanggal');
  if (elTgl) elTgl.value = today;
  var elDriver = document.getElementById('restock-driver');
  if (elDriver) elDriver.value = '';
  
  openSheet('sheet-restock');
}

function simpanRestock() {
  var id = document.getElementById('restock-id').value;
  var qty = Number(document.getElementById('restock-qty').value || 0);
  if (qty <= 0) { alert('Jumlah restock harus lebih dari 0!'); return; }
  
  var elTgl = document.getElementById('restock-tanggal');
  var tglStr = elTgl && elTgl.value ? elTgl.value : new Date().toISOString().split('T')[0];
  var localTime = new Date();
  var parts = tglStr.split('-');
  var timestamp = new Date(parts[0], parts[1] - 1, parts[2], localTime.getHours(), localTime.getMinutes(), localTime.getSeconds()).toISOString();
  
  var elDriver = document.getElementById('restock-driver');
  var driver = elDriver && elDriver.value ? elDriver.value.trim() : '';

  var p = S.produk.find(function(x) { return x.id === id });
  if (p) {
    p.stok = (p.stok || 0) + qty;
    S.stockLogs.unshift({
      id: 'SL-' + Date.now(),
      timestamp: timestamp,
      namaProduk: p.nama,
      type: 'Stok Masuk',
      delta: qty,
      sisa: p.stok,
      driver: driver
    });
    
    saveState();
    renderAll();
    closeSheet('sheet-restock');
    var successMsg = 'Stok ' + p.nama + ' berhasil ditambah ' + qty + ' ' + p.satuan + '!';
    if (driver) successMsg += ' (Pengantar: ' + driver + ')';
    alert(successMsg);
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

  // Jika di layar lebar desktop, render otomatis daftar item belanja secara inline
  if (window.innerWidth >= 768) {
    renderCartOnly();
  }
}

function renderCartOnly() {
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
}

function openCart() {
  renderCartOnly();
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
  setRibuan('co-bayar', totalBill);
  
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
  setRibuan('co-bayar', val);
  hitungKembalian();
}

function setUangPas() {
  var subtotal = S.cart.reduce(function(s, i) { return s + (i.qty * i.hargaJual) }, 0);
  var totalBill = subtotal - cartDiskon;
  if (totalBill < 0) totalBill = 0;
  setRibuan('co-bayar', totalBill);
  hitungKembalian();
}

function hitungKembalian() {
  var subtotal = S.cart.reduce(function(s, i) { return s + (i.qty * i.hargaJual) }, 0);
  var totalBill = subtotal - cartDiskon;
  if (totalBill < 0) totalBill = 0;
  var bayar = parseRibuan('co-bayar');
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
    bayar = parseRibuan('co-bayar');
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

  // Generate robust sequential TX-UF-XXXX ID
  var prefix = 'TX-UF-';
  var maxNum = 0;
  if (S.transactions && S.transactions.length > 0) {
    S.transactions.forEach(function(x) {
      if (x.id && x.id.indexOf(prefix) === 0) {
        var numPart = Number(x.id.substring(prefix.length));
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });
  }
  var nextNum = maxNum + 1;
  var txId = prefix + nextNum.toString().padStart(4, '0');

  // Save new transaction details
  var tx = {
    id: txId,
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
  
  // Fitur pencarian nota riwayat
  var searchVal = document.getElementById('riwayat-search') ? document.getElementById('riwayat-search').value.trim().toLowerCase() : '';
  if (searchVal) {
    filtered = filtered.filter(function(tx) {
      if (tx.id.toLowerCase().indexOf(searchVal) !== -1) return true;
      if (tx.pelanggan && tx.pelanggan.toLowerCase().indexOf(searchVal) !== -1) return true;
      var hasProduct = tx.items && tx.items.some(function(it) {
        return it.nama.toLowerCase().indexOf(searchVal) !== -1;
      });
      if (hasProduct) return true;
      return false;
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:30px 20px;color:var(--text-secondary);font-size:14px;background:var(--surface);border-radius:14px;border:1px dashed var(--border);">Belum ada riwayat transaksi.</div>';
    return;
  }
  
  filtered.forEach(function(tx) {
    var card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-id', tx.id);
    card.style.cssText = 'margin-bottom:10px; cursor:pointer; transition: var(--transition);';
    card.onclick = function() { showDetailTx(tx.id) };
    
    var tgl = new Date(tx.timestamp).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    var itemsCount = tx.items.reduce(function(s, it) { return s + it.qty }, 0);
    var isHutang = tx.metode === 'Hutang';
    var badgeColor = isHutang ? 'var(--red)' : 'var(--green)';
    var badgeBg = isHutang ? 'var(--red-light)' : 'var(--green-light)';
    var labelStatus = isHutang ? 'Belum Lunas' : 'Lunas';
    var labelColor = isHutang ? '#b45309' : 'var(--green)';
    var labelBg = isHutang ? '#fef3c7' : 'var(--green-light)';
    
    card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
      '  <div style="display:flex;align-items:center;gap:6px;">' +
      '    <span style="font-size:16px;">🧾</span>' +
      '    <span style="font-family:\'Outfit\',sans-serif;font-weight:700;font-size:13px;color:var(--text);">' + tx.id + '</span>' +
      '  </div>' +
      '  <span style="font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px;background:' + labelBg + ';color:' + labelColor + ';">' + labelStatus + '</span>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-end;">' +
      '  <div>' +
      '    <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:2px;">' + esc(tx.pelanggan || 'Pelanggan Umum') + '</div>' +
      '    <div style="font-size:11px;color:var(--text-secondary);">' + itemsCount + ' Item • ' + tgl + '</div>' +
      '  </div>' +
      '  <div style="text-align:right;">' +
      '    <div style="font-family:\'Outfit\',sans-serif;font-weight:800;font-size:15px;color:var(--text);">' + fR(tx.total) + '</div>' +
      '    <span style="font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px;background:' + badgeBg + ';color:' + badgeColor + ';display:inline-block;margin-top:2px;">' + (isHutang ? '💳 KASBON' : '💵 TUNAI') + '</span>' +
      '  </div>' +
      '</div>';
    container.appendChild(card);
  });
}

function showDetailTx(txId) {
  var tx = S.transactions.find(function(t) { return t.id === txId });
  if (!tx) return;
  lastTxForStruk = tx;
  
  // Tandai kartu aktif di panel kiri
  document.querySelectorAll('#riwayat-list .card').forEach(function(c) {
    c.style.borderColor = 'var(--border)';
    c.style.background = 'var(--surface)';
  });
  var activeCard = document.querySelector('#riwayat-list .card[data-id="' + tx.id + '"]');
  if (activeCard) {
    activeCard.style.borderColor = 'var(--primary)';
    activeCard.style.background = 'var(--primary-light)';
  }

  var tgl = new Date(tx.timestamp).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  var isHutang = tx.metode === 'Hutang';
  var statusBadge = isHutang ? '<span style="font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;background:var(--red-light);color:var(--red);">BELUM LUNAS</span>' : '<span style="font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;background:var(--green-light);color:var(--green);">LUNAS</span>';
  
  var detailHtml = '<div class="card" style="padding:24px; display:flex; flex-direction:column; gap:16px; border-color:var(--primary-light);">' +
    '  <!-- Bagian Atas: Metadata Struk -->' +
    '  <div style="display:grid; grid-template-columns:1.2fr 1fr; border-bottom:1.5px solid var(--border); padding-bottom:16px; gap:12px;">' +
    '    <div>' +
    '      <div style="font-size:11px; color:var(--text-secondary); font-weight:700; letter-spacing:0.5px;">NOMOR ORDER</div>' +
    '      <div style="font-family:\'Outfit\'; font-weight:800; font-size:16px; color:var(--text);">' + tx.id + '</div>' +
    '    </div>' +
    '    <div style="text-align:right;">' +
    '      <div style="font-size:11px; color:var(--text-secondary); font-weight:700; letter-spacing:0.5px;">STATUS</div>' +
    '      <div style="margin-top:2px;">' + statusBadge + '</div>' +
    '    </div>' +
    '    <div style="margin-top:4px;">' +
    '      <div style="font-size:11px; color:var(--text-secondary); font-weight:700; letter-spacing:0.5px;">TANGGAL TRANSAKSI</div>' +
    '      <div style="font-size:13px; font-weight:600; color:var(--text);">' + tgl + '</div>' +
    '    </div>' +
    '    <div style="text-align:right; margin-top:4px;">' +
    '      <div style="font-size:11px; color:var(--text-secondary); font-weight:700; letter-spacing:0.5px;">KASIR</div>' +
    '      <div style="font-size:13px; font-weight:600; color:var(--text);">' + (S.currentUser ? S.currentUser.nama : 'Kasir Toko') + '</div>' +
    '    </div>' +
    '  </div>' +
    '' +
    '  <!-- Bagian Tengah: Detail Informasi Pelanggan -->' +
    '  <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; background:var(--bg); padding:12px; border-radius:8px; border:1px solid var(--border); font-size:12px;">' +
    '    <div>' +
    '      <div style="color:var(--text-secondary); font-weight:700; margin-bottom:2px;">NAMA PELANGGAN</div>' +
    '      <div style="font-weight:700; color:var(--text);">' + esc(tx.pelanggan || 'Umum / Non-Member') + '</div>' +
    '    </div>' +
    '    <div>' +
    '      <div style="color:var(--text-secondary); font-weight:700; margin-bottom:2px;">METODE PEMBAYARAN</div>' +
    '      <div style="font-weight:700; color:var(--text);">' + tx.metode + '</div>' +
    '    </div>' +
    '    <div style="grid-column: 1 / -1; border-top:1px dashed var(--border); padding-top:6px; margin-top:2px;">' +
    '      <div style="color:var(--text-secondary); font-weight:700; margin-bottom:2px;">CATATAN TRANSAKSI</div>' +
    '      <div style="font-style:italic; color:var(--text);">' + esc(tx.catatan || '-') + '</div>' +
    '    </div>' +
    '  </div>' +
    '' +
    '  <!-- Bagian Pembelian: List Item -->' +
    '  <div>' +
    '    <div style="font-size:12px; color:var(--text-secondary); font-weight:700; margin-bottom:10px; letter-spacing:0.5px;">LIST PEMBELIAN</div>' +
    '    <div style="display:flex; flex-direction:column; gap:8px; max-height:200px; overflow-y:auto; padding-right:4px;">';
    
  tx.items.forEach(function(it) {
    detailHtml += '      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px dashed var(--border);">' +
      '        <div>' +
      '          <div style="font-weight:700; font-size:13px; color:var(--text);">' + esc(it.nama) + '</div>' +
      '          <div style="font-size:11px; color:var(--text-secondary);">' + fR(it.hargaJual) + ' x ' + it.qty + '</div>' +
      '        </div>' +
      '        <div style="font-family:\'Outfit\'; font-weight:800; font-size:13px; color:var(--text);">' + fR(it.qty * it.hargaJual) + '</div>' +
      '      </div>';
  });
  
  var total = tx.total;
  var subtotal = tx.total + (tx.diskon || 0);

  detailHtml += '    </div>' +
    '  </div>' +
    '' +
    '  <!-- Ringkasan Keuangan -->' +
    '  <div style="display:flex; flex-direction:column; gap:6px; background:var(--bg); padding:12px; border-radius:8px; border:1px solid var(--border); font-size:12px; margin-top:4px;">' +
    '    <div style="display:flex; justify-content:space-between;"><span>Subtotal</span><span>' + fR(subtotal) + '</span></div>' +
    '    <div style="display:flex; justify-content:space-between; color:var(--red);"><span>Potongan Diskon</span><span>- ' + fR(tx.diskon || 0) + '</span></div>' +
    '    <hr style="border:none; border-top:1px dashed var(--border); margin:4px 0;">' +
    '    <div style="display:flex; justify-content:space-between; font-weight:800; font-size:14px; color:var(--primary);"><span>TOTAL TAGIHAN</span><span>' + fR(total) + '</span></div>' +
    '    <div style="display:flex; justify-content:space-between; color:var(--text-secondary);"><span>Dibayar</span><span>' + (isHutang ? 'Rp 0' : fR(tx.bayar)) + '</span></div>' +
    '    <div style="display:flex; justify-content:space-between; color:var(--green);"><span>Kembalian</span><span>' + fR(tx.kembalian) + '</span></div>' +
    '  </div>' +
    '' +
    '  <!-- Tombol Aksi Struk di Bawah -->' +
    '  <div style="display:flex; gap:8px; margin-top:12px;">' +
    '    <button class="btn btn-s" style="flex:1; height:40px; font-size:12px; margin:0; border-color:var(--red-light); color:var(--red);" onclick="refundTransaksi(\'' + tx.id + '\')">↩️ Refund</button>' +
    '    <button class="btn btn-g" style="flex:1.2; height:40px; font-size:12px; margin:0; background:#22c55e; color:#fff;" onclick="shareFakturWA()">📲 WA Bagikan</button>' +
    '    <button class="btn btn-y" style="flex:1; height:40px; font-size:12px; margin:0;" onclick="printFaktur()">🖨️ Cetak PDF</button>' +
    '    <button class="btn btn-o" style="flex:1; height:40px; font-size:12px; margin:0;" onclick="downloadFakturPNG()">💾 Unduh JPG</button>' +
    '  </div>' +
    '</div>';

  // Jika layar lebar desktop, masukkan detail ke panel kanan secara langsung!
  if (window.innerWidth >= 768) {
    var detailContainer = document.getElementById('riwayat-detail-container');
    if (detailContainer) {
      detailContainer.innerHTML = detailHtml;
      return; // Selesai! Jangan tampilkan pop-up modal!
    }
  }

  // Jika di mobile, gunakan pop-up modal biasa
  var c = document.getElementById('detail-tx-content');
  if (c) {
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
}

function refundTransaksi(txId) {
  var tx = S.transactions.find(function(t) { return t.id === txId });
  if (!tx) return;
  
  if (confirm("Apakah Anda yakin ingin melakukan refund/retur untuk transaksi " + txId + "? Tindakan ini akan mengembalikan stok barang dan menghapus transaksi dari riwayat.")) {
    // Kembalikan stok
    tx.items.forEach(function(it) {
      var p = S.produk.find(function(prod) { return prod.id === it.id });
      if (p) {
        p.stok = (p.stok || 0) + it.qty;
        // Tambah log stok
        S.stockLogs.push({
          id: 'SL-' + Date.now() + '-' + Math.floor(Math.random() * 100),
          produkId: p.id,
          produkNama: p.nama,
          tipe: 'Masuk',
          jumlah: it.qty,
          stokAwal: p.stok - it.qty,
          stokAkhir: p.stok,
          keterangan: 'Refund Transaksi ' + txId,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Hapus transaksi
    S.transactions = S.transactions.filter(function(t) { return t.id !== txId });
    
    // Jika hutang, hapus hutangnya juga
    S.hutang = S.hutang.filter(function(h) { return h.txId !== txId });
    
    saveState();
    
    // Reset detail container kanan ke placeholder awal
    var detailContainer = document.getElementById('riwayat-detail-container');
    if (detailContainer) {
      detailContainer.innerHTML = '<div class="card" style="text-align:center; padding:40px 20px; color:var(--text-secondary); height:100%; display:flex; align-items:center; justify-content:center; border-style:dashed;">' +
        '  <div>' +
        '    <div style="font-size:32px; margin-bottom:12px;">📑</div>' +
        '    <div style="font-weight:700; font-size:14px;">Detail Nota Transaksi</div>' +
        '    <div style="font-size:11px; margin-top:4px;">Pilih salah satu transaksi di sebelah kiri untuk melihat rincian nota belanja.</div>' +
        '  </div>' +
        '</div>';
    }
    
    renderRiwayat();
    renderDashboard();
    alert("Refund berhasil! Stok telah dikembalikan.");
  }
}

/* ====== DEBT BOOK (HUTANG / PIUTANG) ====== */
function simpanHutang() {
  var nama = document.getElementById('h-nama').value.trim();
  var wa = document.getElementById('h-wa').value.trim();
  var alamat = document.getElementById('h-alamat').value.trim();
  var jumlah = parseRibuan('h-jumlah');
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
  var jum = parseRibuan('exp-jumlah');
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

  // CaLK - BLU
  setText('calk-kas', fR(d.kas));
  setText('calk-piutang', fR(d.totalPiutang));
  setText('calk-persediaan', fR(d.persediaan));
  setText('calk-total-aktiva', fR(d.totalAktiva));
  var elCalkHeader = document.getElementById('calk-header-kios');
  if (elCalkHeader) elCalkHeader.textContent = namaKios;
  var elCalkPeriode = document.getElementById('calk-periode-label');
  if (elCalkPeriode) elCalkPeriode.textContent = 'Periode: ' + d.periodeLabel + ' (Hingga ' + d.tglNow + ')';
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
  S.config.modalAwal = parseRibuan('set-modal');
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
  updateSidebarUserFooter();
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

function logoutUser() {
  if (confirm('Apakah Anda yakin ingin keluar/mengunci aplikasi?')) {
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
    openSheet('sheet-login');
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
    var infoDriver = log.driver ? ' • Driver: ' + esc(log.driver) : '';
    
    el.innerHTML = '<div>' +
      '  <div style="font-weight:700;font-size:13px;color:var(--text);">' + esc(log.namaProduk) + '</div>' +
      '  <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' + esc(log.type) + ' • ' + tgl + infoDriver + '</div>' +
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

/* ====== SAAS ERP LOGIC (KLEDO STYLE) ====== */
function toggleSbDropdown(btn) {
  var dropdown = btn.closest('.sb-dropdown');
  if (dropdown) {
    // Tutup dropdown lain terlebih dahulu
    document.querySelectorAll('.sb-dropdown').forEach(function(d) {
      if (d !== dropdown) d.classList.remove('open');
    });
    dropdown.classList.toggle('open');
  }
}

function toggleSidebar() {
  var sb = document.querySelector('.sidebar');
  if (sb) {
    sb.classList.toggle('open');
  }
}

function filterSidebarMenu(query) {
  var q = query.toLowerCase().trim();
  document.querySelectorAll('.sidebar-menu .sbi, .sidebar-menu .sbi-sub').forEach(function(item) {
    if (item.classList.contains('sb-trigger')) return;
    var text = item.textContent.toLowerCase();
    if (text.indexOf(q) !== -1) {
      item.style.display = '';
      var parent = item.closest('.sb-dropdown');
      if (parent) {
        parent.style.display = '';
        parent.classList.add('open');
      }
    } else {
      item.style.display = 'none';
    }
  });

  document.querySelectorAll('.sb-dropdown').forEach(function(dropdown) {
    var visibleSubs = dropdown.querySelectorAll('.sbi-sub[style=""]');
    if (visibleSubs.length === 0 && q !== '') {
      dropdown.style.display = 'none';
    } else {
      dropdown.style.display = '';
    }
  });
}

function renderOverviewPenjualan() {
  var now = new Date();
  var thisMonth = now.getMonth();
  var thisYear = now.getFullYear();

  var txsThisMonth = S.transactions.filter(function(tx) {
    var d = new Date(tx.timestamp);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  var totalPenjualan = txsThisMonth.reduce(function(s, tx) { return s + tx.total }, 0);
  var totalDiterima = txsThisMonth.reduce(function(s, tx) { 
    return s + (tx.metode !== 'Hutang' ? tx.total : (tx.bayar || 0)); 
  }, 0);
  var totalMenunggu = txsThisMonth.reduce(function(s, tx) { 
    return s + (tx.metode === 'Hutang' ? (tx.total - (tx.bayar || 0)) : 0); 
  }, 0);

  var activeDebts = S.hutang.filter(function(h) { return h.jumlah > 0 });
  var totalTempo = activeDebts.reduce(function(s, h) { return s + h.jumlah }, 0);

  var elPenjualan = document.getElementById('ov-penjualan-val');
  var elDiterima = document.getElementById('ov-diterima-val');
  var elMenunggu = document.getElementById('ov-menunggu-val');
  var elTempo = document.getElementById('ov-tempo-val');
  var elTempoCount = document.getElementById('ov-tempo-count');

  if (elPenjualan) elPenjualan.textContent = fR(totalPenjualan);
  if (elDiterima) elDiterima.textContent = fR(totalDiterima);
  if (elMenunggu) elMenunggu.textContent = fR(totalMenunggu);
  if (elTempo) elTempo.textContent = fR(totalTempo);
  if (elTempoCount) elTempoCount.textContent = activeDebts.length + ' Tagihan';

  var rasio = totalPenjualan > 0 ? Math.round((totalDiterima / totalPenjualan) * 100) : 0;
  var elGaugeText = document.getElementById('ov-gauge-text');
  var elGaugeCircle = document.getElementById('ov-gauge-circle');

  if (elGaugeText) elGaugeText.textContent = rasio + '%';
  if (elGaugeCircle) {
    var offset = 251.2 - (rasio / 100) * 251.2;
    elGaugeCircle.style.strokeDashoffset = offset;
  }

  var prodMap = {};
  txsThisMonth.forEach(function(tx) {
    tx.items.forEach(function(it) {
      if (!prodMap[it.nama]) prodMap[it.nama] = { qty: 0, revenue: 0 };
      prodMap[it.nama].qty += it.qty;
      prodMap[it.nama].revenue += it.qty * it.hargaJual;
    });
  });

  var sortedProds = [];
  for (var name in prodMap) {
    sortedProds.push({ nama: name, qty: prodMap[name].qty, revenue: prodMap[name].revenue });
  }
  sortedProds.sort(function(a, b) { return b.revenue - a.revenue });

  var elProdList = document.getElementById('ov-produk-list');
  if (elProdList) {
    elProdList.innerHTML = '';
    if (sortedProds.length === 0) {
      elProdList.innerHTML = '<div style="text-align:center;font-size:12px;color:var(--text-secondary);padding:20px 0;">Belum ada penjualan bulan ini.</div>';
    } else {
      sortedProds.slice(0, 5).forEach(function(p, i) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);';
        row.innerHTML = '  <div style="display:flex;align-items:center;gap:8px;">' +
          '    <div style="font-weight:700;font-size:11px;width:18px;height:18px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;">' + (i+1) + '</div>' +
          '    <div>' +
          '      <div style="font-weight:700;font-size:12px;color:var(--text);">' + esc(p.nama) + '</div>' +
          '      <div style="font-size:10px;color:var(--text-secondary);">' + p.qty + ' Terjual</div>' +
          '    </div>' +
          '  </div>' +
          '  <span style="font-family:\'Outfit\';font-weight:800;font-size:12px;color:var(--text);">' + fR(p.revenue) + '</span>';
        elProdList.appendChild(row);
      });
    }
  }
}

function renderOverviewPembelian() {
  var now = new Date();
  var thisMonth = now.getMonth();
  var thisYear = now.getFullYear();

  var logsThisMonth = S.stockLogs.filter(function(log) {
    if (log.type !== 'Stok Masuk') return false;
    var d = new Date(log.timestamp);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  var totalPembelian = 0;
  logsThisMonth.forEach(function(log) {
    var p = S.produk.find(function(prod) { return prod.nama === log.namaProduk });
    var hpp = p ? (p.hargaHpp || 0) : 0;
    totalPembelian += log.delta * hpp;
  });

  var supplierDebts = S.hutang.filter(function(h) {
    return h.jumlah > 0 && h.ket && (h.ket.toLowerCase().indexOf('supplier') !== -1 || h.ket.toLowerCase().indexOf('restock') !== -1);
  });
  
  var totalHutangSupplier = supplierDebts.reduce(function(s, h) { return s + h.jumlah }, 0);
  var totalPembayaranTerkirim = totalPembelian - totalHutangSupplier;
  if (totalPembayaranTerkirim < 0) totalPembayaranTerkirim = 0;

  var elPembelian = document.getElementById('ov-pembelian-val');
  var elTerkirim = document.getElementById('ov-pembelian-diterima-val');
  var elMenunggu = document.getElementById('ov-pembelian-menunggu-val');
  var elTempo = document.getElementById('ov-pembelian-tempo-val');
  var elTempoCount = document.getElementById('ov-pembelian-tempo-count');

  if (elPembelian) elPembelian.textContent = fR(totalPembelian);
  if (elTerkirim) elTerkirim.textContent = fR(totalPembayaranTerkirim);
  if (elMenunggu) elMenunggu.textContent = fR(totalHutangSupplier);
  if (elTempo) elTempo.textContent = fR(0);
  if (elTempoCount) elTempoCount.textContent = supplierDebts.length + ' Tagihan';

  var rasio = totalPembelian > 0 ? Math.round((totalPembayaranTerkirim / totalPembelian) * 100) : 100;
  var elGaugeText = document.getElementById('ov-pembelian-gauge-text');
  var elGaugeCircle = document.getElementById('ov-pembelian-gauge-circle');

  if (elGaugeText) elGaugeText.textContent = rasio + '%';
  if (elGaugeCircle) {
    var offset = 251.2 - (rasio / 100) * 251.2;
    elGaugeCircle.style.strokeDashoffset = offset;
  }

  var supplierMap = {};
  logsThisMonth.forEach(function(log) {
    var p = S.produk.find(function(prod) { return prod.nama === log.namaProduk });
    var hpp = p ? (p.hargaHpp || 0) : 0;
    var supplier = p && p.supplier ? p.supplier : 'Supplier Umum';
    if (!supplierMap[supplier]) supplierMap[supplier] = 0;
    supplierMap[supplier] += log.delta * hpp;
  });

  var sortedSuppliers = [];
  for (var name in supplierMap) {
    sortedSuppliers.push({ nama: name, total: supplierMap[name] });
  }
  sortedSuppliers.sort(function(a, b) { return b.total - a.total });

  var elSupplierList = document.getElementById('ov-supplier-list');
  if (elSupplierList) {
    elSupplierList.innerHTML = '';
    if (sortedSuppliers.length === 0) {
      elSupplierList.innerHTML = '<div style="text-align:center;font-size:12px;color:var(--text-secondary);padding:20px 0;">Belum ada pembelian dari supplier.</div>';
    } else {
      sortedSuppliers.slice(0, 5).forEach(function(s, i) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);';
        row.innerHTML = '  <div style="display:flex;align-items:center;gap:8px;">' +
          '    <div style="font-weight:700;font-size:11px;width:18px;height:18px;border-radius:50%;background:var(--blue-light);color:var(--blue);display:flex;align-items:center;justify-content:center;">' + (i+1) + '</div>' +
          '    <div style="font-weight:700;font-size:12px;color:var(--text);">' + esc(s.nama) + '</div>' +
          '  </div>' +
          '  <span style="font-family:\'Outfit\';font-weight:800;font-size:12px;color:var(--text);">' + fR(s.total) + '</span>';
        elSupplierList.appendChild(row);
      });
    }
  }
}

var tpFilter = 'all';
function setTPFilter(status, btn) {
  tpFilter = status;
  document.querySelectorAll('#tp-filter-chips .fchip').forEach(function(b) { b.classList.remove('active') });
  btn.classList.add('active');
  renderTagihanPembelian();
}

function renderTagihanPembelian() {
  var tbody = document.getElementById('tp-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  var logs = S.stockLogs.filter(function(l) { return l.type === 'Stok Masuk' });

  var searchVal = document.getElementById('tp-search') ? document.getElementById('tp-search').value.trim().toLowerCase() : '';
  if (searchVal) {
    logs = logs.filter(function(l) {
      return l.id.toLowerCase().indexOf(searchVal) !== -1 || l.namaProduk.toLowerCase().indexOf(searchVal) !== -1;
    });
  }

  var dateStart = document.getElementById('tp-date-start') ? document.getElementById('tp-date-start').value : '';
  var dateEnd = document.getElementById('tp-date-end') ? document.getElementById('tp-date-end').value : '';
  if (dateStart) {
    logs = logs.filter(function(l) { return new Date(l.timestamp) >= new Date(dateStart + 'T00:00:00') });
  }
  if (dateEnd) {
    logs = logs.filter(function(l) { return new Date(l.timestamp) <= new Date(dateEnd + 'T23:59:59') });
  }

  if (tpFilter !== 'all') {
    logs = logs.filter(function(l) {
      var sisa = 0;
      var pending = S.hutang.find(function(h) { return h.ket && h.ket.indexOf(l.id) !== -1 && h.jumlah > 0 });
      if (pending) sisa = pending.jumlah;
      var isLunas = sisa === 0;
      return tpFilter === 'Lunas' ? isLunas : !isLunas;
    });
  }

  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-secondary);">Tidak ada tagihan pembelian ditemukan.</td></tr>';
    return;
  }

  logs.forEach(function(l) {
    var p = S.produk.find(function(prod) { return prod.nama === l.namaProduk });
    var hpp = p ? (p.hargaHpp || 0) : 0;
    var vendor = p && p.supplier ? p.supplier : 'Supplier Umum';
    var total = l.delta * hpp;
    
    var pendingHutang = S.hutang.find(function(h) { return h.ket && h.ket.indexOf(l.id) !== -1 && h.jumlah > 0 });
    var sisa = pendingHutang ? pendingHutang.jumlah : 0;
    var statusText = sisa > 0 ? 'Belum Dibayar' : 'Lunas';
    var statusClass = sisa > 0 ? 'belum' : 'lunas';

    var tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border)';
    tr.innerHTML = '  <td style="padding:12px 16px; font-weight:700; color:var(--text);">' + l.id + '</td>' +
      '  <td style="padding:12px 16px;">' + esc(vendor) + '</td>' +
      '  <td style="padding:12px 16px;">Restock ' + esc(l.namaProduk) + ' (' + l.delta + ')</td>' +
      '  <td style="padding:12px 16px;">' + new Date(l.timestamp).toLocaleDateString('id-ID') + '</td>' +
      '  <td style="padding:12px 16px;"><span class="status-pill ' + statusClass + '">' + statusText + '</span></td>' +
      '  <td style="padding:12px 16px; text-align:right; font-weight:700;">' + fR(sisa) + '</td>' +
      '  <td style="padding:12px 16px; text-align:right; font-weight:700; color:var(--primary);">' + fR(total) + '</td>';
    tbody.appendChild(tr);
  });
}

var biayaFilter = 'all';
function setBiayaFilter(status, btn) {
  biayaFilter = status;
  document.querySelectorAll('#biaya-filter-chips .fchip').forEach(function(b) { b.classList.remove('active') });
  btn.classList.add('active');
  renderBiayaPage();
}

function renderBiayaPage() {
  var tbody = document.getElementById('biaya-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  var list = S.pengeluaran || [];

  var searchVal = document.getElementById('biaya-search') ? document.getElementById('biaya-search').value.trim().toLowerCase() : '';
  if (searchVal) {
    list = list.filter(function(b) {
      return b.nama.toLowerCase().indexOf(searchVal) !== -1 || b.kategori.toLowerCase().indexOf(searchVal) !== -1;
    });
  }

  var dateStart = document.getElementById('biaya-date-start') ? document.getElementById('biaya-date-start').value : '';
  var dateEnd = document.getElementById('biaya-date-end') ? document.getElementById('biaya-date-end').value : '';
  if (dateStart) {
    list = list.filter(function(b) { return new Date(b.tanggal) >= new Date(dateStart + 'T00:00:00') });
  }
  if (dateEnd) {
    list = list.filter(function(b) { return new Date(b.tanggal) <= new Date(dateEnd + 'T23:59:59') });
  }

  if (biayaFilter !== 'all') {
    list = list.filter(function(b) {
      var isLunas = b.status === 'Lunas' || b.sisa === 0 || !b.sisa;
      return biayaFilter === 'Lunas' ? isLunas : !isLunas;
    });
  }

  var now = new Date();
  var thisMonth = now.getMonth();
  var thisYear = now.getFullYear();

  var thisMonthExpenses = list.filter(function(b) {
    var d = new Date(b.tanggal);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  var totalThisMonth = thisMonthExpenses.reduce(function(s, b) { return s + b.jumlah }, 0);
  var totalUnpaid = list.reduce(function(s, b) { return s + (b.sisa || 0) }, 0);
  var total30d = list.filter(function(b) {
    var d = new Date(b.tanggal);
    return (now - d) <= (30 * 24 * 60 * 60 * 1000);
  }).reduce(function(s, b) { return s + b.jumlah }, 0);

  var elMonth = document.getElementById('ov-biaya-month');
  var el30d = document.getElementById('ov-biaya-30d');
  var elUnpaid = document.getElementById('ov-biaya-unpaid');
  var elTempo = document.getElementById('ov-biaya-tempo');

  if (elMonth) elMonth.textContent = fR(totalThisMonth);
  if (el30d) el30d.textContent = fR(total30d);
  if (elUnpaid) elUnpaid.textContent = fR(totalUnpaid);
  if (elTempo) elTempo.textContent = fR(0);

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-secondary);">Belum ada pencatatan biaya.</td></tr>';
    return;
  }

  list.forEach(function(b) {
    var statusText = (b.sisa || 0) > 0 ? 'Belum Dibayar' : 'Lunas';
    var statusClass = (b.sisa || 0) > 0 ? 'belum' : 'lunas';

    var tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border)';
    tr.innerHTML = '  <td style="padding:12px 16px;">' + new Date(b.tanggal).toLocaleDateString('id-ID') + '</td>' +
      '  <td style="padding:12px 16px; font-weight:700; color:var(--text);">' + b.id + '</td>' +
      '  <td style="padding:12px 16px;">' + esc(b.kategori) + ' - ' + esc(b.nama) + '</td>' +
      '  <td style="padding:12px 16px;">Operasional Toko</td>' +
      '  <td style="padding:12px 16px;"><span class="status-pill ' + statusClass + '">' + statusText + '</span></td>' +
      '  <td style="padding:12px 16px; text-align:right; font-weight:700;">' + fR(b.sisa || 0) + '</td>' +
      '  <td style="padding:12px 16px; text-align:right; font-weight:700; color:var(--red);">' + fR(b.jumlah) + '</td>';
    tbody.appendChild(tr);
  });
}

function updateSidebarUserFooter() {
  var userName = S.config.security ? (S.config.security.user || 'Operator') : 'Operator';
  if (S.currentUser && S.currentUser.nama) userName = S.currentUser.nama;
  var initial = userName.charAt(0).toUpperCase();

  // Sidebar footer
  var elName = document.getElementById('sb-user-name');
  var elAvatar = document.getElementById('sb-avatar-letter');
  if (elName) elName.textContent = userName;
  if (elAvatar) elAvatar.textContent = initial;

  // Header dropdown (kanan atas)
  var hdrLabel = document.getElementById('hdr-user-label');
  var hdrAvatar = document.getElementById('hdr-avatar-letter');
  var hdrDdName = document.getElementById('hdr-dd-name');
  var hdrDdAvatar = document.getElementById('hdr-dd-avatar');
  if (hdrLabel) hdrLabel.textContent = userName;
  if (hdrAvatar) hdrAvatar.textContent = initial;
  if (hdrDdName) hdrDdName.textContent = userName;
  if (hdrDdAvatar) hdrDdAvatar.textContent = initial;
}

function toggleHeaderDropdown(e) {
  if (e) e.stopPropagation();
  var menu = document.getElementById('hdr-dropdown-menu');
  if (!menu) return;
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// Close header dropdown when clicking elsewhere
document.addEventListener('click', function(e) {
  var menu = document.getElementById('hdr-dropdown-menu');
  if (menu && menu.style.display === 'block') {
    var dropdown = document.querySelector('.hdr-user-dropdown');
    if (dropdown && !dropdown.contains(e.target)) {
      menu.style.display = 'none';
    }
  }
});

/* ======================================================== */
/* NEW SAAS ERP VIEWS GENERATORS (KLEDO STYLE) */
/* ======================================================== */
function renderProdukPage() {
  var tbody = document.getElementById('pm-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  var prods = S.produk || [];

  // Metrik Persediaan
  var countTersedia = 0;
  var countHampirHabis = 0;
  var countHabis = 0;
  var totalStok = 0;
  var totalNilaiProduk = 0; // stok * hargaJual
  var totalHPP = 0;         // stok * hargaHpp

  prods.forEach(function(p) {
    var stok = p.stok != null ? p.stok : 0;
    totalStok += stok;
    totalNilaiProduk += stok * (p.hargaJual || 0);
    totalHPP += stok * (p.hargaHpp || 0);

    if (stok > 10) {
      countTersedia++;
    } else if (stok > 0) {
      countHampirHabis++;
    } else {
      countHabis++;
    }
  });

  var elTersedia = document.getElementById('pm-tersedia');
  var elHampirHabis = document.getElementById('pm-hampir-habis');
  var elHabis = document.getElementById('pm-habis');
  var elTotalStok = document.getElementById('pm-total-stok');
  var elNilaiProduk = document.getElementById('pm-nilai-produk');
  var elTotalHPP = document.getElementById('pm-total-hpp');

  if (elTersedia) elTersedia.textContent = countTersedia;
  if (elHampirHabis) elHampirHabis.textContent = countHampirHabis;
  if (elHabis) elHabis.textContent = countHabis;
  if (elTotalStok) elTotalStok.textContent = totalStok;
  if (elNilaiProduk) elNilaiProduk.textContent = fR(totalNilaiProduk);
  if (elTotalHPP) elTotalHPP.textContent = fR(totalHPP);

  // Populate filter kategori
  var selectKat = document.getElementById('pm-filter-kategori');
  if (selectKat && selectKat.options.length <= 1) {
    var cats = S.categories || [];
    cats.forEach(function(c) {
      var opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      selectKat.appendChild(opt);
    });
  }

  // Filter Search & Kategori
  var searchVal = document.getElementById('pm-search') ? document.getElementById('pm-search').value.trim().toLowerCase() : '';
  var filterKat = document.getElementById('pm-filter-kategori') ? document.getElementById('pm-filter-kategori').value : '';

  if (searchVal) {
    prods = prods.filter(function(p) {
      return p.nama.toLowerCase().indexOf(searchVal) !== -1 || (p.sku && p.sku.toLowerCase().indexOf(searchVal) !== -1) || (p.kategori && p.kategori.toLowerCase().indexOf(searchVal) !== -1);
    });
  }
  if (filterKat) {
    prods = prods.filter(function(p) { return p.kategori === filterKat });
  }

  if (prods.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text-secondary);">Tidak ada produk ditemukan.</td></tr>';
    return;
  }

  prods.forEach(function(p) {
    var stok = p.stok != null ? p.stok : 0;
    var tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border)';
    tr.innerHTML = '  <td style="padding:12px 16px; font-weight:700; color:var(--text);">' + esc(p.nama) + '</td>' +
      '  <td style="padding:12px 16px; color:var(--text-secondary);">' + esc(p.sku || '-') + '</td>' +
      '  <td style="padding:12px 16px;"><span class="fchip" style="font-size:10px; padding:2px 8px;">' + esc(p.kategori || 'Umum') + '</span></td>' +
      '  <td style="padding:12px 16px; color:var(--text-secondary);">' + esc(p.satuan || 'Pcs') + '</td>' +
      '  <td style="padding:12px 16px; text-align:right; font-weight:700;">' + fR(p.hargaHpp || 0) + '</td>' +
      '  <td style="padding:12px 16px; text-align:right; font-weight:700; color:var(--primary);">' + fR(p.hargaJual || 0) + '</td>' +
      '  <td style="padding:12px 16px; text-align:right; font-weight:700;">' + stok + '</td>' +
      '  <td style="padding:12px 16px; text-align:right; font-weight:700;">' + fR(stok * (p.hargaHpp || 0)) + '</td>' +
      '  <td style="padding:12px 16px; text-align:center;">' +
      '    <div style="display:flex; gap:6px; justify-content:center;">' +
      '      <button class="btn btn-g" style="padding:2px 6px; font-size:10px; height:24px; margin:0;" onclick="openRestock(\'' + p.id + '\')">Restock</button>' +
      '      <button class="btn btn-s" style="padding:2px 6px; font-size:10px; height:24px; margin:0; background:var(--blue-light); color:var(--blue); border:none;" onclick="openProdukSheet(\'' + p.id + '\')">Edit</button>' +
      '    </div>' +
      '  </td>';
    tbody.appendChild(tr);
  });
}

function renderInventoriPage() {
  var tbody = document.getElementById('im-mutation-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  var prods = S.produk || [];
  var totalStok = 0;
  var totalNilaiJual = 0;
  var totalNilaiHPP = 0;

  prods.forEach(function(p) {
    var stok = p.stok != null ? p.stok : 0;
    totalStok += stok;
    totalNilaiJual += stok * (p.hargaJual || 0);
    totalNilaiHPP += stok * (p.hargaHpp || 0);
  });

  var elTotalStok = document.getElementById('im-total-stok');
  var elNilaiJual = document.getElementById('im-nilai-jual');
  var elNilaiHPP = document.getElementById('im-nilai-hpp');

  if (elTotalStok) elTotalStok.textContent = totalStok + ' Unit';
  if (elNilaiJual) elNilaiJual.textContent = fR(totalNilaiJual);
  if (elNilaiHPP) elNilaiHPP.textContent = fR(totalNilaiHPP);

  // Stock mutation log entries (limit to 10 latest)
  var logs = (S.stockLogs || []).slice(0, 10);
  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-secondary);">Belum ada riwayat mutasi persediaan.</td></tr>';
    return;
  }

  logs.forEach(function(l) {
    var tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border)';
    
    var timeStr = new Date(l.timestamp).toLocaleDateString('id-ID') + ' ' + new Date(l.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
    var typeColor = l.type === 'Stok Masuk' ? 'var(--green)' : 'var(--red)';
    var typeText = l.type === 'Stok Masuk' ? 'Masuk' : 'Keluar';
    var driverInfo = l.driver ? ' <span style="font-size:9px;color:var(--text-secondary);font-weight:normal;">(Driver: ' + esc(l.driver) + ')</span>' : '';

    tr.innerHTML = '  <td style="padding:8px 12px; color:var(--text-secondary);">' + timeStr + '</td>' +
      '  <td style="padding:8px 12px; font-weight:700;">' + esc(l.namaProduk) + '</td>' +
      '  <td style="padding:8px 12px; color:' + typeColor + '; font-weight:700;">' + typeText + driverInfo + '</td>' +
      '  <td style="padding:8px 12px; text-align:right; font-weight:700; color:' + typeColor + ';">' + (l.type === 'Stok Masuk' ? '+' : '-') + l.delta + '</td>';
    tbody.appendChild(tr);
  });
}

function renderAkunPage() {
  var tbody = document.getElementById('coa-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  // Calculate dynamic values
  var totalRevenue = S.transactions.reduce(function(s, tx) { return s + tx.total }, 0);
  var totalCashSales = S.transactions.filter(function(tx) { return tx.metode !== 'Hutang' }).reduce(function(s, tx) { return s + tx.total }, 0);
  var totalHPPValue = S.produk.reduce(function(s, p) { return s + ((p.stok || 0) * (p.hargaHpp || 0)) }, 0);
  
  var totalCostSold = 0;
  S.transactions.forEach(function(tx) {
    tx.items.forEach(function(it) {
      var prod = S.produk.find(function(p) { return p.nama === it.nama });
      var hpp = prod ? (prod.hargaHpp || 0) : 0;
      totalCostSold += it.qty * hpp;
    });
  });

  var totalExpensesPaid = (S.pengeluaran || []).filter(function(ex) { return ex.sisa === 0 || !ex.sisa }).reduce(function(s, ex) { return s + ex.jumlah }, 0);
  var totalExpensesUnpaid = (S.pengeluaran || []).reduce(function(s, ex) { return s + (ex.sisa || 0) }, 0);

  // Dynamic balance variables
  var saldoKas = totalCashSales - totalExpensesPaid;
  if (saldoKas < 0) saldoKas = 0;

  var saldoPiutang = S.hutang.filter(function(h) {
    return h.jumlah > 0 && h.ket && h.ket.toLowerCase().indexOf('piutang') !== -1;
  }).reduce(function(s, h) { return s + h.jumlah }, 0);

  var saldoHutangSupplier = S.hutang.filter(function(h) {
    return h.jumlah > 0 && h.ket && (h.ket.toLowerCase().indexOf('supplier') !== -1 || h.ket.toLowerCase().indexOf('restock') !== -1);
  }).reduce(function(s, h) { return s + h.jumlah }, 0);

  var dynamicCOA = [
    { code: '1-10001', name: 'Kas Tunai Toko', category: 'Kas & Bank', balance: saldoKas },
    { code: '1-10002', name: 'Rekening Bank Mandiri', category: 'Kas & Bank', balance: totalRevenue * 0.15 },
    { code: '1-10003', name: 'Giro Bisnis', category: 'Kas & Bank', balance: 0 },
    { code: '1-10100', name: 'Piutang Usaha Pelanggan', category: 'Akun Piutang', balance: saldoPiutang },
    { code: '1-10200', name: 'Persediaan Barang Dagangan', category: 'Persediaan', balance: totalHPPValue },
    { code: '1-10700', name: 'Aset Tetap - Tanah', category: 'Aset Tetap BLU', balance: 150000000 },
    { code: '1-10701', name: 'Aset Tetap - Bangunan', category: 'Aset Tetap BLU', balance: 75000000 },
    { code: '2-20100', name: 'Utang Usaha / Vendor', category: 'Kewajiban Jangka Pendek', balance: saldoHutangSupplier + totalExpensesUnpaid },
    { code: '3-30000', name: 'Ekuitas Awal Kelolaan BLU', category: 'Ekuitas', balance: 250000000 },
    { code: '3-30100', name: 'Surplus/Defisit Akumulasian LO', category: 'Ekuitas', balance: (totalRevenue - totalCostSold - totalExpensesPaid) > 0 ? (totalRevenue - totalCostSold - totalExpensesPaid) : 0 },
    { code: '4-40000', name: 'Pendapatan Penjualan POS', category: 'Pendapatan', balance: totalRevenue },
    { code: '5-50000', name: 'Beban Pokok Pendapatan (HPP)', category: 'Harga Pokok Penjualan', balance: totalCostSold },
    { code: '6-60101', name: 'Beban Gaji & Upah', category: 'Beban', balance: totalExpensesPaid * 0.4 },
    { code: '6-60217', name: 'Beban Listrik', category: 'Beban', balance: totalExpensesPaid * 0.2 },
    { code: '6-60218', name: 'Beban Air', category: 'Beban', balance: totalExpensesPaid * 0.1 },
    { code: '6-60400', name: 'Biaya Sewa - Bangunan', category: 'Beban', balance: totalExpensesPaid * 0.3 }
  ];

  var searchVal = document.getElementById('coa-search') ? document.getElementById('coa-search').value.trim().toLowerCase() : '';
  if (searchVal) {
    dynamicCOA = dynamicCOA.filter(function(a) {
      return a.code.toLowerCase().indexOf(searchVal) !== -1 || a.name.toLowerCase().indexOf(searchVal) !== -1 || a.category.toLowerCase().indexOf(searchVal) !== -1;
    });
  }

  dynamicCOA.forEach(function(a) {
    var tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border)';
    tr.innerHTML = '  <td style="padding:12px 16px; font-family:\'Outfit\'; font-weight:700; color:var(--text);">' + a.code + '</td>' +
      '  <td style="padding:12px 16px;">' + esc(a.name) + '</td>' +
      '  <td style="padding:12px 16px; color:var(--text-secondary);">' + a.category + '</td>' +
      '  <td style="padding:12px 16px; text-align:right; font-weight:700; color:var(--primary);">' + fR(a.balance) + '</td>';
    tbody.appendChild(tr);
  });

  // Saldo per Kategori rendering
  var katMap = {};
  var katColors = {
    'Kas & Bank': '#ff5c8a',
    'Akun Piutang': '#ffb703',
    'Persediaan': '#2a9d8f',
    'Aset Tetap BLU': '#8d99ae',
    'Kewajiban Jangka Pendek': '#7209b7',
    'Ekuitas': '#f77f00',
    'Pendapatan': '#d62828',
    'Harga Pokok Penjualan': '#5c0d24',
    'Beban': '#ff70a6'
  };

  dynamicCOA.forEach(function(a) {
    if (!katMap[a.category]) katMap[a.category] = 0;
    katMap[a.category] += a.balance;
  });

  var elKat = document.getElementById('coa-kat-analytics');
  if (elKat) {
    elKat.innerHTML = '';
    for (var cat in katMap) {
      var color = katColors[cat] || '#cbd5e1';
      var row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; font-size:11px; padding:6px 0; border-bottom:1px solid var(--border);';
      row.innerHTML = '  <div style="display:flex; align-items:center; gap:8px;">' +
        '    <span style="width:8px; height:8px; border-radius:50%; background:' + color + '; display:inline-block;"></span>' +
        '    <span style="font-weight:600; color:var(--text);">' + esc(cat) + '</span>' +
        '  </div>' +
        '  <span style="font-weight:800; font-family:\'Outfit\'; color:var(--text);">' + fR(katMap[cat]) + '</span>';
      elKat.appendChild(row);
    }
  }

  // Saldo per Akun rendering (showing top 6 accounts by balance)
  var sortedCOA = dynamicCOA.slice().sort(function(a, b) { return b.balance - a.balance });
  var elAkun = document.getElementById('coa-akun-analytics');
  if (elAkun) {
    elAkun.innerHTML = '';
    sortedCOA.slice(0, 6).forEach(function(a) {
      var color = katColors[a.category] || '#cbd5e1';
      var row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; font-size:11px; padding:6px 0; border-bottom:1px solid var(--border);';
      row.innerHTML = '  <div style="display:flex; align-items:center; gap:8px;">' +
        '    <span style="width:8px; height:8px; border-radius:50%; background:' + color + '; display:inline-block;"></span>' +
        '    <span style="font-weight:600; color:var(--text);">' + esc(a.name) + '</span>' +
        '    <span style="font-size:8px; color:var(--text-secondary);">(' + a.code + ')</span>' +
        '  </div>' +
        '  <span style="font-weight:800; font-family:\'Outfit\'; color:var(--text);">' + fR(a.balance) + '</span>';
      elAkun.appendChild(row);
    });
  }
}

var kmFilter = 'all';
function setKMFilter(type, btn) {
  kmFilter = type;
  var chips = document.querySelectorAll('#km-filter-chips .fchip');
  if (chips) {
    chips.forEach(function(b) { b.classList.remove('active') });
  }
  if (btn) btn.classList.add('active');
  renderKontakPage();
}

function renderKontakPage() {
  var tbody = document.getElementById('km-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  // Get unique customers
  var custMap = {};
  (S.transactions || []).forEach(function(tx) {
    if (tx.pelanggan && tx.pelanggan.nama) {
      custMap[tx.pelanggan.nama] = {
        nama: tx.pelanggan.nama,
        tipe: 'Pelanggan',
        perusahaan: 'Individu',
        alamat: tx.pelanggan.alamat || 'Papua, Indonesia',
        email: '-',
        telepon: tx.pelanggan.wa || '-'
      };
    }
  });

  // Get unique suppliers
  var suppMap = {};
  (S.produk || []).forEach(function(p) {
    var supp = p.supplier || 'Supplier Umum';
    if (!suppMap[supp]) {
      suppMap[supp] = {
        nama: supp,
        tipe: 'Vendor',
        perusahaan: 'Distributor Mitra',
        alamat: 'Distrik Jayapura, Papua',
        email: supp.toLowerCase().replace(/\s+/g, '') + '@uncen.com',
        telepon: '0811-480-' + Math.floor(1000 + Math.random() * 9000)
      };
    }
  });

  // Combine lists
  var contacts = [];
  for (var k in suppMap) contacts.push(suppMap[k]);
  for (var k in custMap) contacts.push(custMap[k]);

  // Pegawai
  contacts.push({
    nama: 'Dinar Robusta',
    tipe: 'Pegawai',
    perusahaan: 'U2PA Uncen Fresh',
    alamat: 'Kampus Uncen Waena, Jayapura',
    email: 'dinar@uncen.com',
    telepon: '0812-4455-8899'
  });
  contacts.push({
    nama: 'Kasir Utama',
    tipe: 'Pegawai',
    perusahaan: 'U2PA Uncen Fresh',
    alamat: 'Jayapura, Papua',
    email: 'kasir@uncen.com',
    telepon: '0812-4455-1122'
  });

  // Filter chips
  if (kmFilter !== 'all') {
    contacts = contacts.filter(function(c) { return c.tipe === kmFilter });
  }

  // Calculate metrics
  var merekaHutang = (S.hutang || []).filter(function(h) {
    return h.jumlah > 0 && h.ket && h.ket.toLowerCase().indexOf('piutang') !== -1;
  }).reduce(function(s, h) { return s + h.jumlah }, 0);

  var andaHutang = (S.hutang || []).filter(function(h) {
    return h.jumlah > 0 && h.ket && (h.ket.toLowerCase().indexOf('supplier') !== -1 || h.ket.toLowerCase().indexOf('restock') !== -1);
  }).reduce(function(s, h) { return s + h.jumlah }, 0);

  var elAndaHutang = document.getElementById('km-anda-hutang');
  var elMerekaHutang = document.getElementById('km-mereka-hutang');
  var elDiterima = document.getElementById('km-diterima');
  var elTotal = document.getElementById('km-pembayaran-total');

  var totalRevenue = (S.transactions || []).reduce(function(s, tx) { return s + tx.total }, 0);

  if (elAndaHutang) elAndaHutang.textContent = fR(andaHutang);
  if (elMerekaHutang) elMerekaHutang.textContent = fR(merekaHutang);
  if (elDiterima) elDiterima.textContent = fR(totalRevenue);
  if (elTotal) elTotal.textContent = fR(totalRevenue);

  if (contacts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-secondary);">Tidak ada kontak ditemukan.</td></tr>';
    return;
  }

  contacts.forEach(function(c) {
    var badgeColor = 'var(--text-secondary)';
    var badgeBg = 'var(--bg)';
    if (c.tipe === 'Pelanggan') { badgeColor = 'var(--primary)'; badgeBg = 'var(--primary-light)'; }
    else if (c.tipe === 'Vendor') { badgeColor = 'var(--blue)'; badgeBg = 'var(--blue-light)'; }
    else if (c.tipe === 'Pegawai') { badgeColor = '#b45309'; badgeBg = '#fef3c7'; }

    var tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border)';
    tr.innerHTML = '  <td style="padding:12px 16px; font-weight:700; color:var(--text);">' + esc(c.nama) + '</td>' +
      '  <td style="padding:12px 16px;"><span class="status-pill" style="color:' + badgeColor + '; background:' + badgeBg + '; font-size:10px; font-weight:800; padding:2px 8px; border-radius:20px; display:inline-block;">' + c.tipe + '</span></td>' +
      '  <td style="padding:12px 16px; color:var(--text-secondary);">' + esc(c.perusahaan) + '</td>' +
      '  <td style="padding:12px 16px; color:var(--text-secondary);">' + esc(c.alamat) + '</td>' +
      '  <td style="padding:12px 16px; color:var(--text-secondary);">' + esc(c.email) + '</td>' +
      '  <td style="padding:12px 16px; text-align:right; font-weight:700;">' + esc(c.telepon) + '</td>';
    tbody.appendChild(tr);
  });
}

function renderPOSOrdersPage() {
  var tbody = document.getElementById('po-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  var txs = S.transactions || [];

  var elTotal = document.getElementById('po-total-count');
  var elSelesai = document.getElementById('po-selesai-count');

  if (elTotal) elTotal.textContent = txs.length;
  if (elSelesai) elSelesai.textContent = txs.length;

  if (txs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-secondary);">Belum ada data pesanan POS.</td></tr>';
    return;
  }

  txs.forEach(function(tx) {
    var tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border)';
    tr.innerHTML = '  <td style="padding:12px 16px; font-weight:700; color:var(--text);">' + tx.id + '</td>' +
      '  <td style="padding:12px 16px; color:var(--text-secondary);">' + new Date(tx.timestamp).toLocaleDateString('id-ID') + '</td>' +
      '  <td style="padding:12px 16px;">' + esc(tx.pelanggan ? tx.pelanggan.nama : 'Umum') + '</td>' +
      '  <td style="padding:12px 16px; color:var(--text-secondary);">' + esc(tx.operator || 'Operator') + '</td>' +
      '  <td style="padding:12px 16px; text-align:right; font-weight:700; color:var(--primary);">' + fR(tx.total) + '</td>';
    tbody.appendChild(tr);
  });
}

function toggleLocalDropdown(e, btn) {
  e.stopPropagation();
  var parent = btn.parentElement;
  var menu = parent ? parent.querySelector('.local-dropdown-menu') : null;
  
  // Close all other dropdown menus
  document.querySelectorAll('.local-dropdown-menu').forEach(function(m) {
    if (m !== menu) m.classList.remove('show');
  });

  if (menu) {
    menu.classList.toggle('show');
  }
}

// Click away listener
document.addEventListener('click', function() {
  document.querySelectorAll('.local-dropdown-menu').forEach(function(m) {
    m.classList.remove('show');
  });
});

// Auto-boot
document.addEventListener('DOMContentLoaded', function() {
  init();
});
