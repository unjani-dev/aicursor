import"./assets/modulepreload-polyfill.js";async function o(){try{(await navigator.mediaDevices.getUserMedia({video:!0})).getTracks().forEach(r=>r.stop()),chrome.runtime.sendMessage({type:"PERMISSION_GRANTED"}),window.close()}catch{document.body.innerHTML=`
            <h2 style="color: #ef4444;">Akses Ditolak</h2>
            <p style="color: white;">Harap izinkan kamera di pengaturan browser agar Flizzy OS dapat berfungsi.</p>
            <button onclick="window.close()" style="padding:10px 20px; background:#ef4444; color:white; border:none; border-radius:5px; cursor:pointer;">Tutup</button>
        `}}o();
