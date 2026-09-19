# 🎯 TikTok Stalker & Historical Monitoring Tool

Tools pemantau akun TikTok otomatis secara historis menggunakan framework semantik **[Pico CSS v2](https://github.com/picocss/pico)**. Mendeteksi perubahan (**postingan/video baru, bio, username/nickname, foto profil, link bio, jumlah followers/following/likes, story aktif 24 jam, status privat, dll**), mencatat riwayat perubahan (*historical diff*), mengunduh media story (`.jpg` & `.mp4`), dan mengambil tangkapan layar otomatis ke dalam folder terstruktur.

---

## ⚡ 1. Cara Menjalankan Tiap 6 Jam & Manual

### A. Menjalankan Manual Kapan Saja
Kapan pun Anda ingin mengecek perubahan akun detik ini juga:
```bash
# Cek akun sekarang
npm run check

# Cek akun sekarang lalu langsung sync & update website publik
npm run check:push
```

### B. Menjalankan Otomatis Tiap 6 Jam (Mode Watch di Terminal)
Jika laptop/PC menyala dan Anda ingin proses berjalan otomatis di latar belakang setiap 6 jam:
```bash
npm run watch
```
*(Proses ini akan langsung memeriksa saat pertama kali dijalankan, lalu secara periodik memeriksa kembali setiap 6 jam menggunakan koneksi internet rumah Anda).*

### C. Menjalankan Otomatis Tiap 6 Jam via Windows Task Scheduler (Tanpa Buka Terminal)
Jika Anda ingin sistem berjalan otomatis di background Windows tanpa perlu membuka terminal:
```bash
# Aktifkan jadwal otomatis setiap 6 jam
npm run schedule

# Cek status jadwal Windows
npm run schedule:status

# Hapus jadwal jika sudah tidak ingin dipakai
npm run schedule:remove
```

---

## 🌐 2. Cara Scrape Pakai Internet Rumah tapi Laporan Bisa Diakses Publik

Ini adalah metode **paling aman, gratis, dan anti-blokir**:

### Kenapa Pakai Metode Ini?
1. **Scraping berjalan di Laptop/PC Anda (Internet Rumah):**
   - Menggunakan IP residensial (*Indihome/Biznet/FirstMedia/Telkomsel dll*).
   - TikTok **tidak memblokir atau membatasi** IP rumahan (berbeda dengan server cloud/VPS datacenter yang rawan diblokir WAF TikTok).
2. **Laporan & Screenshot Di-Host di GitHub Pages (Publik 24/7):**
   - Hasil laporan (`index.html`) dan folder `screenshots/` otomatis di-push ke GitHub.
   - GitHub Pages menyajikan website statis secara publik di `https://USERNAME.github.io/stalk/`.
   - Anda dapat membuka dashboard dari HP, tablet, atau komputer mana pun dari luar rumah tanpa perlu menyalakan port forwarding atau membahayakan IP rumah.

---

### 🚀 Cara Menghubungkan ke GitHub Pages (Hanya 1 Kali Setting)

#### Langkah 1: Buat Repository di GitHub
1. Buka [github.com/new](https://github.com/new).
2. Beri nama repository: `stalk` (pilih **Public**).
3. Klik **Create repository**.

#### Langkah 2: Hubungkan & Push Proyek
Buka terminal di folder proyek ini (`C:\Users\nioh\Documents\Project\Stalk`):
```bash
# Ganti USERNAME dengan username akun GitHub Anda
git remote add origin https://github.com/USERNAME/stalk.git

# Push seluruh data awal ke GitHub
git branch -M main
git push -u origin main
```

#### Langkah 3: Aktifkan GitHub Pages
1. Di repository GitHub Anda, buka menu **Settings** &rarr; **Pages** (di sidebar kiri).
2. Di bagian **Build and deployment**:
   - **Source**: Pilih **Deploy from a branch**.
   - **Branch**: Pilih `main` dan folder `/ (root)`.
3. Klik **Save**.
4. Website Anda langsung aktif di:
   ```
   https://USERNAME.github.io/stalk/
   ```

Setiap kali Anda menjalankan `npm run check:push` atau saat jadwal 6 jam berjalan, data terbaru otomatis di-push ke GitHub dan website publik Anda akan langsung ter-update!

---

## 👥 Daftar Akun Yang Sedang Dipantau (6 Akun)

1. `@cecil2507`
2. `@yukohanz` (Story Aktif terdeteksi)
3. `@yucallhanz_` (Story Aktif terdeteksi)
4. `@cecilelek2507`
5. `@cecil250725`
6. `@saaaaa_180`

Untuk menambah akun baru:
```bash
node src/index.js add username_baru
```
Untuk melihat status terkini seluruh akun di terminal:
```bash
npm run list
```

---

## 🖥️ Melihat Laporan di Komputer Lokal
Buka berkas `index.html` atau `report.html` di browser Anda:
```bash
npm run report
```
*(Dibangun dengan 100% Pico CSS v2 murni, tanpa font monospace, tanpa garis neon slop, responsif di mobile & desktop).*
