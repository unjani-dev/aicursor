# Running Web Based

Panduan ini fokus untuk `apps/web-app` karena saat ini basis utama project adalah web app.

## 1. Jalankan Dari Root Project

Pastikan terminal berada di root repository:

```bash
cd folderProject/aicursor
```

Kalau dependency belum ada atau baru clone ulang:

```bash
npm install
```

Catatan: model MediaPipe untuk face, hand, dan virtual background dimuat dari CDN, jadi browser perlu koneksi internet saat pertama kali menjalankan app.

## 2. Build Package Internal

Jalankan ini setelah ada perubahan di folder `packages/*`:

```bash
npm run build --workspace @ai-cursor/core-vision
npm run build --workspace @ai-cursor/gesture-engine
npm run build --workspace @ai-cursor/input-mapper
```

## 3. Jalankan Web App Mode Development

Dari root project:

```bash
npm run dev --workspace web-app -- --host 127.0.0.1 --port 5173
```

Buka di browser:

```text
http://127.0.0.1:5173/
```

Halaman lain:

```text
http://127.0.0.1:5173/demo.html
http://127.0.0.1:5173/music.html
http://127.0.0.1:5173/movies.html
```

Browser akan meminta izin kamera. Izinkan kamera supaya gesture engine bisa aktif.

## 4. Gesture Yang Aktif

Panel engine ada di kiri bawah:

```text
Face | Hand | C
```

- `Face`: gerakkan cursor dengan kepala, lalu `double blink` untuk click.
- `Hand`: gerakkan cursor dengan telunjuk, lalu `double pinch` atau double cubit untuk click.
- `C`: reset center/calibration.

Preview kamera memakai virtual background privacy. Saat segmenter belum siap atau gagal load, preview tetap masuk privacy fallback agar ruangan tidak tampil polos.

## 5. Build Production Web App

Untuk membuat hasil build di `apps/web-app/dist`:

```bash
npm run build --workspace web-app
```

Output build akan berisi:

```text
apps/web-app/dist/index.html
apps/web-app/dist/demo.html
apps/web-app/dist/music.html
apps/web-app/dist/movies.html
apps/web-app/dist/assets/
```

## 6. Supaya Perubahan Tersimpan Permanen

File hasil coding sebenarnya sudah tersimpan di disk project. Supaya permanen secara versi project, commit perubahan ke Git.

Cek file yang berubah:

```bash
git status --short
```

Jangan pakai `git add .` dari root karena repository ini tidak punya `.gitignore` dan bisa ikut memasukkan `node_modules`.

Stage file yang relevan saja:

```bash
git add RUNNING.md
git add apps/web-app/index.html apps/web-app/demo.html apps/web-app/music.html apps/web-app/movies.html
git add apps/web-app/package.json apps/web-app/vite.config.mjs apps/web-app/src/main.ts apps/web-app/dist
git add packages/core-vision/src packages/core-vision/dist
git add packages/gesture-engine/src packages/gesture-engine/dist
git add packages/input-mapper/src packages/input-mapper/dist
```

Commit:

```bash
git commit -m "Upgrade web gesture controls and privacy camera preview"
```

Kalau repository memakai remote seperti GitHub/GitLab:

```bash
git push
```

Dengan begitu perubahan tetap aman walaupun terminal ditutup atau komputer restart.
