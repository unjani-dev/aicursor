// apps/browser-ext/permission.js
async function requestAccess() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Jika berhasil, matikan kamera di sini (Offscreen yang akan memakainya)
        stream.getTracks().forEach(track => track.stop());
        
        // Beritahu background bahwa izin sudah didapat
        chrome.runtime.sendMessage({ type: 'PERMISSION_GRANTED' });
        
        // Tutup floating window ini
        window.close();
    } catch (err) {
        document.body.innerHTML = `
            <h2 style="color: #ef4444;">Akses Ditolak</h2>
            <p style="color: white;">Harap izinkan kamera di pengaturan browser agar Flizzy OS dapat berfungsi.</p>
            <button onclick="window.close()" style="padding:10px 20px; background:#ef4444; color:white; border:none; border-radius:5px; cursor:pointer;">Tutup</button>
        `;
    }
}

requestAccess();