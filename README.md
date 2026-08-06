![Buku Kas Kios Banner](banner.jpg)

# Buku Kas Kios 📱💼
> **Aplikasi Kasir Pintar & Pembukuan Keuangan Digital UMKM Papua**

Aplikasi **Buku Kas Kios** dirancang khusus untuk mempermudah pelaku UMKM, mama-mama pedagang di Papua, serta pengelola unit usaha Kios **BUMKam (Badan Usaha Milik Kampung) / BUMDes** dalam mengelola pencatatan penjualan, inventaris barang, pengeluaran operasional, piutang usaha (kasbon), hingga penyusunan laporan keuangan terstandarisasi secara digital, sederhana, dan 100% offline-first.

Aplikasi ini merupakan bagian dari luaran program pengabdian masyarakat/KKN oleh **Fakultas Ekonomi dan Bisnis (FEB) Universitas Cenderawasih (UNCEN)** untuk mendorong digitalisasi ekonomi daerah.

---

## 🌟 Fitur Utama Aplikasi

### 1. 📊 Dashboard Utama (Beranda Kios)
* **Metrik Keuangan Real-time**: Menampilkan omset kotor (Total Penjualan) dan keuntungan bersih (Profit Hari Ini) secara otomatis berdasarkan pencatatan transaksi waktu lokal HP.
* **Grid Menu Utama (11 Modul)**:
  * 📦 **Produk**: Manajemen katalog barang, HPP/modal, harga jual, dan stok awal.
  * 📥 **Stok Masuk**: Penambahan persediaan barang masuk (restock) secara instan.
  * ⚖️ **Stok Opname**: Penyesuaian jumlah stok fisik di toko langsung dengan data aplikasi.
  * 📜 **Riwayat Stok**: Log audit otomatis mutasi stok barang (restock, opname, penjualan).
  * ⚠️ **Expired**: Pemantauan tanggal kedaluwarsa produk dengan indikator warna status.
  * 🏷️ **Kategori**: Pengaturan kategori barang (Sembako, Minuman, Makanan, dll.).
  * 📏 **Satuan**: Pengaturan unit barang (pcs, kg, bungkus, renceng, dll.).
  * 🧮 **Kalkulator**: Kalkulator kasir terintegrasi langsung di aplikasi.
  * 🔍 **Cek Harga**: Lookup instan harga modal, harga jual, margin keuntungan (Rp dan %), serta sisa stok.
  * 👥 **Pelanggan**: Manajemen kontak pelanggan kasbon (Buku Hutang/Piutang).
  * 🏬 **Supplier**: Kontak pemasok grosir barang dagangan lengkap dengan tombol pintas WA.

### 2. 🛒 Mesin Kasir POS (Tab Khusus)
* Tab mesin kasir mandiri terdedikasi untuk pelayanan penjualan barang secara cepat.
* Keranjang belanja interaktif dengan tombol kuantitas `+`/`-` dan input diskon transaksi serta catatan belanja.
* Fitur edit harga jual satuan barang langsung dari dalam keranjang untuk tawar-menawar yang fleksibel.
* Tombol pembayaran nominal cepat (Rp 20.000, Rp 50.000, Rp 100.000, dan Uang Pas).
* Cetak struk belanja fisik atau **Bagikan Gambar Struk Belanja** sebagai berkas gambar media .png putih bersih langsung ke WhatsApp pembeli secara instan.

### 3. 💸 Buku Pengeluaran (Beban Kios)
* Pencatatan pengeluaran operasional berdasarkan kategori: *Transportasi*, *Listrik & Air*, *Sewa Tempat*, *Gaji / Upah*, *Konsumsi*, dan *Lain-lain*.
* Catatan pengeluaran langsung mengurangi Kas Tunai (Neraca) dan menambah Beban Operasional Umum (Laba Rugi) secara real-time.

### 4. 📕 Buku Hutang (Piutang Usaha)
* Pencatatan pelanggan kasbon, sisa tagihan, riwayat cicilan, dan keterangan belanja.
* Tombol **WA Tagih** otomatis untuk mengirimkan pesan rincian tagihan secara instan ke WhatsApp pelanggan.
* Fitur pelunasan sekali klik dan ekspor daftar piutang ke PDF atau Excel CSV.

### 5. 📊 Laporan Keuangan Standar BUMKam/BUMDes
* **Filter Waktu**: Hari Ini, 7 Hari Terakhir, 30 Hari Terakhir, dan Semua Waktu.
* **Laporan Laba Rugi**: Menghitung Pendapatan Penjualan, HPP (modal barang), Laba Kotor, Beban Operasional, dan Laba Bersih.
* **Laporan Neraca Keuangan**: Menyajikan neraca seimbang antara Aktiva (Kas Kios, Piutang Dagang, Persediaan Barang) dan Pasiva (Hutang Usaha, Modal Awal, Laba Berjalan).
* **Laporan Arus Kas (Cash Flow)**: Rekapitulasi kas masuk/keluar dari aktivitas Operasional, Investasi (Restock), dan Pendanaan (Modal Awal).

### 6. 📷 Capture & Share Image (WhatsApp Share)
* Fitur ekspor visual untuk membagikan rekap **Laporan Keuangan** lengkap atau rekap **Buku Hutang** ke dalam format file gambar PNG berlatar belakang putih bersih langsung ke nomor WhatsApp pengurus kampung/BUMDes.

### 7. 🔒 Keamanan & Utilitas Data
* **Keamanan PIN**: Mengunci akses aplikasi dengan username dan PIN guna menghindari penyalahgunaan data.
* **Backup & Restore**: Cadangkan seluruh basis data lokal ke dalam file JSON ke HP, atau pulihkan kembali kapan saja secara offline.
* **Reset Data**: Bersihkan seluruh database untuk memulai pembukuan periode baru.

---

## 🛠️ Arsitektur Teknologi & Pembuatan

Aplikasi ini dibungkus menggunakan arsitektur hybrid WebView yang ringan dengan performa tinggi untuk mendukung perangkat Android dengan spesifikasi rendah:

1. **Frontend (Klien Web)**:
   - **HTML5 & Vanilla CSS**: Desain visual premium modern dengan dukungan adaptif mode terang dan gelap (*Dark/Light Mode*).
   - **Vanilla Javascript**: Pengolahan logika state, pencarian produk, kalkulasi laporan akuntansi, dan rendering grafis canvas.
2. **Android Wrapper (Native)**:
   - **Kotlin (Android SDK)**: WebView client yang dikonfigurasi khusus dengan jembatan komunikasi Javascript Interface (`AndroidStorage`).
   - **Native Storage**: Integrasi `SharedPreferences` Android guna menyimpan data lokal agar tidak terhapus meskipun cache browser dibersihkan.
   - **FileProvider**: Manajemen hak akses dan URI aman untuk melampirkan berkas gambar hasil ekspor langsung ke WhatsApp.

### ⚙️ Konfigurasi Rilis Android
* **SDK Minimum**: API Level 21 (Android 5.0 Lollipop) - memastikan kompatibilitas tinggi pada HP lama.
* **SDK Target**: API Level 34 (Android 14).
* **Sertifikat APK**: Signed release menggunakan keystore produksi (`release_key.jks`, alias: `kioskey`).

---

## 📂 Struktur Repositori

* `/app` - Kode sumber proyek Android Studio (Kotlin, Manifest, Aset Gradle).
* `/app/src/main/assets/index.html` - Sumber kode frontend utama aplikasi (HTML/CSS/JS).
* `/BukuKasKios.apk` - Berkas aplikasi Android rilis final siap pasang.
* `/buku-kas-kios (4).html` - Berkas salinan HTML cadangan untuk pengujian di browser.

---

## ✒️ Hak Cipta & Kontributor

* **Afiliasi**: KKN UMK FEB Universitas Cenderawasih, Papua - 2026.
* **Slogan**: *"Hen Wani KKN Kami Membumi FEB Uncen"*
* **Dibuat dengan ❤️ untuk UMKM Papua**

©2026 Hen Wani KKN Kami Membumi FEB Uncen  
Develop by [Enterdie](https://www.linkedin.com/in/papedatimur)  
Original concept by [YKaroma](https://www.instagram.com/karomayulianti)  
Dibuat dengan ❤️ untuk UMKM Papua

---

## ☕ Dukungan & Donasi
Jika aplikasi ini bermanfaat bagi Anda dan ingin memberikan apresiasi kepada pengembang, Anda dapat menyalurkan donasi/dukungan melalui Saweria:
👉 **[Donasi via Saweria](https://saweria.co/ekobot)**
