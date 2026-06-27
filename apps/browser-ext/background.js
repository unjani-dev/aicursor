// apps/browser-ext/background.js
const OFFSCREEN_PATH = 'offscreen.html';
let isEngineActive = false;

// Fungsi krusial: Memaksa injeksi kursor ke semua tab lama tanpa perlu refresh
async function injectToExistingTabs() {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    
    for (const tab of tabs) {
        try {
            await chrome.scripting.insertCSS({
                target: { tabId: tab.id },
                files: ['content.css']
            });
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
        } catch (e) {
            // Abaikan error pada halaman sistem Chrome (chrome://)
        }
    }
}

async function setupOffscreen() {
    const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    if (contexts.length > 0) {
        isEngineActive = true;
        return true;
    }

    try {
        await chrome.offscreen.createDocument({
            url: OFFSCREEN_PATH,
            reasons: ['USER_MEDIA'],
            justification: 'Akses kamera untuk kursor AI.'
        });
        isEngineActive = true;
        return true;
    } catch (e) {
        console.error("Background Error:", e);
        return false;
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Cek Status
    if (message.type === 'GET_STATUS') {
        sendResponse({ active: isEngineActive });
        return true;
    }

    // Memulai Engine dari Popup
    if (message.type === 'START_NEURAL_ENGINE') {
        setupOffscreen().then(success => {
            if (success) {
                injectToExistingTabs(); // Eksekusi injeksi ke seluruh tab!
            }
            sendResponse({ success });
        });
        return true; 
    }

    // Router Kursor AI ke Web aktif
    if (message.type === 'AI_CURSOR_EVENT') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {});
            }
        });
    }

    // Pemicu Izin Jendela Melayang
    if (message.type === 'REQUEST_PERMISSION_WINDOW') {
        chrome.windows.create({
            url: 'permission.html',
            type: 'popup',
            width: 400, height: 350, focused: true
        });
    }

    // Izin didapatkan
    if (message.type === 'PERMISSION_GRANTED') {
        setupOffscreen().then(() => injectToExistingTabs());
    }
});