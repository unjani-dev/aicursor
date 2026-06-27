// apps/browser-ext/content.js

// CEGAH DOUBLE INJECTION: Memastikan script hanya berjalan 1 kali per tab
if (!window.flizzyCursorInjected) {
    window.flizzyCursorInjected = true;

    let aiCursor = null;
    let lastClickTime = 0;
    let clickTimeout = null;

    /**
     * Merender elemen kursor neon ke DOM
     */
    function renderCursor() {
        if (document.getElementById('flizzy-cursor')) {
            aiCursor = document.getElementById('flizzy-cursor');
            return;
        }
        
        aiCursor = document.createElement('div');
        aiCursor.id = 'flizzy-cursor';
        aiCursor.innerHTML = '<div class="cursor-inner"></div>';
        
        document.body.appendChild(aiCursor);
        console.log("Flizzy OS: Kursor berhasil disuntikkan ke halaman ini.");
    }

    /**
     * Mengeksekusi Klik pada elemen web di bawah kursor
     */
    function executeRealClick(x, y) {
        if (!aiCursor) return;

        const now = Date.now();
        const timeDiff = now - lastClickTime;

        // Visual Feedback Kedip (Class 'clicking' dari CSS)
        aiCursor.classList.add('clicking');
        setTimeout(() => aiCursor.classList.remove('clicking'), 150);

        // Trik Sembunyi: Agar document bisa mendeteksi elemen asli web, bukan kursor kita
        aiCursor.style.display = 'none';
        const elementToClick = document.elementFromPoint(x, y);
        aiCursor.style.display = 'flex'; 

        if (!elementToClick) return;

        if (timeDiff < 450 && timeDiff > 0) {
            // EKSEKUSI DOUBLE CLICK
            if (clickTimeout) { 
                clearTimeout(clickTimeout); 
                clickTimeout = null; 
            }
            const dblClickEvent = new MouseEvent('dblclick', { 
                view: window, bubbles: true, cancelable: true, clientX: x, clientY: y 
            });
            elementToClick.dispatchEvent(dblClickEvent);
            lastClickTime = 0; 
            console.log("🖱️ Flizzy OS: DOUBLE CLICK Executed!");
        } else {
            // EKSEKUSI SINGLE CLICK
            lastClickTime = now;
            if (clickTimeout) clearTimeout(clickTimeout);
            
            clickTimeout = setTimeout(() => {
                const clickEvent = new MouseEvent('click', { 
                    view: window, bubbles: true, cancelable: true, clientX: x, clientY: y 
                });
                elementToClick.dispatchEvent(clickEvent);

                // Tangani link buka di tab baru (_blank)
                const parentAnchor = elementToClick.closest('a');
                if (parentAnchor && parentAnchor.target === '_blank') {
                    window.open(parentAnchor.href, '_blank');
                }

                console.log("🖱️ Flizzy OS: SINGLE CLICK pada", elementToClick.tagName);
                clickTimeout = null;
            }, 450); 
        }
    }

    /**
     * Penjaga Kursor di Mode Fullscreen (YouTube/Netflix)
     */
    function ensureCursorOnTop() {
        if (!aiCursor) return;
        const fsElement = document.fullscreenElement || document.webkitFullscreenElement;
        
        if (fsElement && fsElement !== aiCursor.parentNode) {
            fsElement.appendChild(aiCursor); 
        } else if (!fsElement && aiCursor.parentNode !== document.body) {
            document.body.appendChild(aiCursor);
        }
    }

    /**
     * Listener Utama dari Background Service Worker
     */
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'AI_CURSOR_EVENT') {
            if (!aiCursor) renderCursor();
            ensureCursorOnTop();

            const { x, y, action } = message.payload;
            
            // Batasi koordinat agar tidak hilang di luar layar viewport
            const boundedX = Math.max(0, Math.min(x, window.innerWidth));
            const boundedY = Math.max(0, Math.min(y, window.innerHeight));

            // Memosisikan titik tengah kursor di koordinat X,Y yang sebenarnya
            aiCursor.style.left = `${boundedX}px`;
            aiCursor.style.top = `${boundedY}px`;
            aiCursor.style.transform = `translate(-50%, -50%)`;

            if (action === 'click' || action === 'double_click') {
                executeRealClick(boundedX, boundedY);
            }
        }
    });
}