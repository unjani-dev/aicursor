const { app, BrowserWindow, session } = require('electron');
const path = require('path');

// 1. CHROME FLAGS: Paksa Chromium untuk auto-grant media (kamera/mic)
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
// 2. CHROME FLAGS: Izinkan akses file lokal (berguna untuk asset engine)
app.commandLine.appendSwitch('allow-file-access-from-files');

function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // 3. MATIKAN WEB SECURITY: Wajib agar file:// bisa nge-fetch CDN MediaPipe tanpa error CORS
      webSecurity: false 
    }
  });

  // Lapis kedua pengamanan izin (sebagai *fallback*)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Muat file index.html
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  
  // 4. BUKA DEVTOOLS OTOMATIS: Supaya kita bisa lihat error merah kalau MediaPipe gagal load
  win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});