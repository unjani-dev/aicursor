// apps/browser-ext/popup.js
document.addEventListener('DOMContentLoaded', () => {
    const statusEl = document.getElementById('status');
    const startBtn = document.getElementById('startBtn');

    // 1. Cek status Persistent saat popup baru dibuka
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
        if (response?.active) {
            statusEl.innerText = "Status: ACTIVE";
            statusEl.style.color = "#00f0ff";
            startBtn.innerText = "System Running";
            startBtn.disabled = true; // Nonaktifkan tombol jika sudah nyala
        }
    });

    // 2. Handle Klik
    startBtn.addEventListener('click', () => {
        statusEl.innerText = "Menghubungkan ke Engine...";
        
        chrome.runtime.sendMessage({ type: 'START_NEURAL_ENGINE' }, (response) => {
            if (response?.success) {
                statusEl.innerText = "Status: ACTIVE";
                statusEl.style.color = "#00f0ff";
                startBtn.innerText = "System Running";
                startBtn.disabled = true;
            }
        });
    });
});