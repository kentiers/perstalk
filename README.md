# 🎯 TikTok Stalker & Historical Monitoring Tool

Tools otomatis untuk memantau perubahan akun TikTok setiap hari secara historis. Jika ada perubahan (**postingan/video baru, bio, username/nickname, foto profil, link bio, jumlah followers/following/likes, story aktif, status privat, dll**), sistem akan mendeteksi perubahannya, mencatat riwayat perubahan (*historical diff*), mengunduh media story, dan mengambil screenshot secara otomatis ke dalam struktur folder yang rapi.

---

## 📌 Jawaban Masalah & Fitur Utama

### 1. Kenapa Muncul Tulisan *"Ada masalah / Maaf atas hal tersebut! Coba lagi nanti"* di Web TikTok?
Pesan ini muncul di bagian feed grid video bawah karena TikTok versi web desktop secara default **membatasi pengunjung anonim (yang belum login)** agar tidak bisa men-scroll daftar video pengguna secara bebas.

**Solusi yang disediakan tools ini:**
- **Tanpa Login Pun Tetap Akurat**: Tools ini mengekstrak data langsung dari internal server hydration (`__UNIVERSAL_DATA_FOR_REHYDRATION__`), sehingga **jumlah postingan (`videoCount`), bio, nama, followers, likes, hingga status privasi tetap terbaca 100% akurat**. Jika target mengunggah video baru, tools ini langsung mendeteksi pertambahan jumlah video (misal 10 -> 11).
- **Ingin Video Grid Muncul Penuh?**: Cukup jalankan `npm run login` satu kali. Google Chrome akan terbuka agar Anda dapat login ke TikTok. Sesi login & cookies akan tersimpan permanen di `data/browser-session/`, sehingga saat pemeriksaan berikutnya semua thumbnail video dan feed akan terbuka penuh tanpa pesan error atau captcha.

---

### 2. Fitur Story Scraper & Screenshot
Tools ini **sudah otomatis mendeteksi dan meng-capture Story TikTok**:
- **Deteksi Story Aktif**: Mengetahui apakah akun sedang memiliki story yang aktif.
- **Tangkapan Layar (Screenshot) Story**: Membuka story viewer dan mengambil screenshot layar penuh dari setiap story.
- **Unduh Media Asli (Foto/Video Story)**: Mengunduh langsung file resolusi tinggi (`.jpg` / `.mp4`) dari story target sebelum story tersebut hilang/expired (24 jam).
- **Pencatatan Riwayat Story**: ID story, caption, tautan langsung, screenshot, dan file media dicatat rapi di `data/history.json` dan `CHANGELOG.md`.

---

### 3. Struktur Folder Rapi & Terorganisir

Seluruh tangkapan layar dan file media diatur ke dalam subfolder per akun dan per kategori:

```
Stalk/
├── config/
│   └── accounts.json                 # Konfigurasi akun target & browser
├── data/
│   ├── latest-state.json             # Snapshot kondisi terkini setiap akun
│   ├── history.json                  # Database seluruh riwayat peristiwa & perubahan
│   └── browser-session/              # Sesi login & cookies Chrome (permanen)
├── screenshots/
│   ├── @cecil2507/
│   │   ├── profile/                  # Tangkapan layar profil
│   │   │   ├── YYYY-MM-DD_baseline.png
│   │   │   └── YYYY-MM-DD_change.png
│   │   └── stories/                  # Tangkapan layar & media story
│   │       ├── YYYY-MM-DD_story_<id>.png
│   │       └── YYYY-MM-DD_story_<id>_media.jpg
│   └── @yukohanz/
│       ├── profile/
│       │   └── 2026-09-19_18-45-45_baseline.png
│       └── stories/
│           ├── 2026-09-19_story_7686861101333613845.png
│           ├── 2026-09-19_story_7686861101333613845_media.jpg
│           ├── 2026-09-19_story_7686953387497147668.png
│           └── 2026-09-19_story_7686953387497147668_media.jpg
├── src/
│   ├── checker.js                    # Engine scraper, detektor diff, screenshot & story
│   ├── reporter.js                   # Generator CHANGELOG.md & report.html
│   ├── scheduler.js                  # Pengelola Windows Task Scheduler & Watcher
│   ├── login.js                      # Helper interaktif login Chrome
│   └── index.js                      # CLI utama
├── report.html                       # Dashboard visual interaktif untuk web browser
├── CHANGELOG.md                      # Catatan riwayat kronologis format Markdown
├── package.json
└── README.md
```

---

## 🚀 Cara Penggunaan

### 1. Pengecekan Manual
Jalankan pengecekan akun sekarang:
```bash
npm run check
# atau
node src/index.js check
```

### 2. Membuka Dashboard Laporan Visual (HTML)
Untuk melihat kartu profil, galeri screenshot, dan riwayat perubahan dengan antarmuka web modern:
```bash
npm run report
# atau
node src/index.js report
```
*(Atau langsung klik ganda file `report.html` di File Explorer).*

---

## ⏰ Menjalankan Otomatis Setiap Hari

### Cara 1: Menggunakan Windows Task Scheduler (Direkomendasikan)
Tools ini dapat didaftarkan langsung ke Windows Task Scheduler sehingga otomatis berjalan setiap hari pada jam tertentu (misal jam 08:00 pagi) bahkan tanpa membuka aplikasi atau terminal.

**Daftarkan jadwal harian (default pukul 08:00 pagi):**
```bash
node src/index.js schedule 08:00
```
*(Ganti `08:00` dengan jam yang Anda inginkan, format 24 jam `HH:mm`)*

**Cek status jadwal:**
```bash
node src/index.js schedule:status
```

**Hapus jadwal harian jika sudah tidak ingin dijalankan:**
```bash
node src/index.js schedule:remove
```

### Cara 2: Mode Watch / Background Service
Jika Anda ingin membiarkan terminal memantau secara terus-menerus:
```bash
node src/index.js watch 24
```
*(Parameter `24` berarti interval pengecekan setiap 24 jam)*

---

## 👥 Menambah Akun Yang Dipantau

Untuk menambah akun baru:
```bash
node src/index.js add username_baru
```
Atau edit langsung file `config/accounts.json`.

Untuk melihat status dan daftar akun saat ini:
```bash
node src/index.js list
```

---

## 🔑 Login TikTok (Opsional)
Jika Anda ingin tools ini memiliki akses penuh ke feed video akun tanpa pembatasan pengunjung anonim:
```bash
npm run login
```
Jendela Google Chrome akan terbuka. Silakan login ke akun TikTok Anda. Session login & cookies akan tersimpan secara otomatis di folder `data/browser-session/` untuk seluruh pengecekan selanjutnya.
