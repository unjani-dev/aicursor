[[[[[[[[[[[[RUNNING BROWSER]]]]]]]]]]]]

# Pastikan symlink lokal terbuat
npm install

# Kompilasi seluruh package
npm run build:packages


# Masuk ke folder core-vision
cd packages/core-vision

# Paksa instalasi MediaPipe Tasks Vision di sini


# Build secara manual untuk melihat apakah ada error lain
npx tsc

# Kembali ke root folder
cd ../..

# Install seluruh dependency dari Root
npm install

# Kompilasi paket (gesture engine, dll)
npm run build:packages

# Masuk ke aplikasi web dan jalankan!
cd apps/web-app

# Uji coba web based nya
npm run dev

[[[[[[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]]]]]]]

[[[[[[[[RUNNING EXTENSION]]]]]]]]





[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]


# Install Package

npm install

# Running Build Ekstension

npm run build:ext

# Cara Load "Unpacked" ke Browser Chrome
Setelah Anda menjalankan perintah npm run build di folder root monorepo, Anda akan mendapatkan folder hasil kompilasi. Ikuti langkah-langkah ini untuk memasangnya:

1. Buka Halaman Ekstensi: Ketik chrome://extensions/ di bilah alamat browser Chrome Anda.

2. Aktifkan Mode Pengembang: Di pojok kanan atas, nyalakan sakelar (Developer Mode).

3. Muat Ekstensi: Klik tombol "Load unpacked" yang muncul di pojok kiri atas.

4. Pilih Folder Build: Arahkan ke folder proyek Anda dan pilih folder apps/browser-ext/dist.

Catatan: Pastikan Anda memilih folder dist (hasil build Vite), bukan folder kode mentah, karena browser butuh file yang sudah di-bundle.

Verifikasi: Ikon Flizzy OS - AI Vision akan muncul di daftar ekstensi. Klik ikon tersebut (atau buka Side Panel) untuk memberikan izin kamera dan memulai kontrol kursor.