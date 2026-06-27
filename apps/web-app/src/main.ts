import { FaceLandmarkerManager, HandLandmarkerManager, ImageSegmenterManager } from '@ai-cursor/core-vision';
import { GestureEngine } from '@ai-cursor/gesture-engine';
import { CursorController } from '@ai-cursor/input-mapper';

type ControlEngine = 'face' | 'hand';

const ENGINE_STORAGE_KEY = 'flizzy.controlEngine';

interface PreviewMaskSource {
    width: number;
    height: number;
    getAsUint8Array(): Uint8Array;
    getAsFloat32Array(): Float32Array;
}

interface PreviewMaskSelection {
    mask: PreviewMaskSource;
    kind: 'category' | 'confidence';
    invert: boolean;
    foregroundCategory?: number;
}

function isEmbeddedApp(): boolean {
    try {
        return window.self !== window.top;
    } catch {
        return true;
    }
}

function getSavedEngine(): ControlEngine {
    return localStorage.getItem(ENGINE_STORAGE_KEY) === 'hand' ? 'hand' : 'face';
}

function getOrCreateVideo(): HTMLVideoElement {
    const existing = document.getElementById('webcam');
    if (existing instanceof HTMLVideoElement) return existing;

    const video = document.createElement('video');
    video.id = 'webcam';
    video.autoplay = true;
    video.playsInline = true;
    return video;
}

function getOrCreateCursor(): HTMLDivElement {
    const existing = document.getElementById('cursor');
    if (existing instanceof HTMLDivElement) return existing;

    const cursor = document.createElement('div');
    cursor.id = 'cursor';
    document.body.appendChild(cursor);
    return cursor;
}

function ensureRuntimeStyle() {
    if (document.getElementById('flizzy-ai-runtime-style')) return;

    const style = document.createElement('style');
    style.id = 'flizzy-ai-runtime-style';
    style.textContent = `
        :root {
            --flizzy-panel: rgba(9, 14, 23, 0.88);
            --flizzy-panel-border: rgba(148, 163, 184, 0.28);
            --flizzy-text: #f8fafc;
            --flizzy-muted: #a8b3c7;
            --flizzy-face: #22d3ee;
            --flizzy-hand: #f59e0b;
            --flizzy-alert: #fb7185;
        }

        body.flizzy-ai-ready {
            cursor: none;
        }

        body.flizzy-ai-ready a,
        body.flizzy-ai-ready button,
        body.flizzy-ai-ready [role="button"],
        body.flizzy-ai-ready .app-card,
        body.flizzy-ai-ready .track-card,
        body.flizzy-ai-ready .movie-card {
            cursor: none !important;
        }

        .flizzy-control-panel {
            position: fixed;
            left: 24px;
            bottom: 24px;
            width: min(360px, calc(100vw - 48px));
            display: grid;
            gap: 10px;
            padding: 12px;
            color: var(--flizzy-text);
            background: var(--flizzy-panel);
            border: 1px solid var(--flizzy-panel-border);
            border-radius: 8px;
            box-shadow: 0 18px 46px rgba(0, 0, 0, 0.32);
            backdrop-filter: blur(18px);
            z-index: 9999998;
        }

        .flizzy-engine-row {
            display: grid;
            grid-template-columns: 1fr 1fr 40px;
            gap: 8px;
            min-height: 40px;
        }

        .flizzy-control-panel button {
            min-width: 0;
            min-height: 40px;
            border: 1px solid rgba(148, 163, 184, 0.22);
            border-radius: 6px;
            color: var(--flizzy-text);
            background: rgba(15, 23, 42, 0.72);
            font: 700 0.78rem/1 "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
            letter-spacing: 0;
            transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
        }

        .flizzy-control-panel button:hover,
        .flizzy-control-panel button:focus-visible,
        .flizzy-control-panel button.flizzy-ai-hover {
            outline: none;
            transform: translateY(-1px);
            border-color: var(--flizzy-face);
        }

        body.flizzy-gesture-hand .flizzy-control-panel button:hover,
        body.flizzy-gesture-hand .flizzy-control-panel button:focus-visible,
        body.flizzy-gesture-hand .flizzy-control-panel button.flizzy-ai-hover {
            border-color: var(--flizzy-hand);
        }

        .flizzy-control-panel button[aria-pressed="true"] {
            color: #041016;
            background: var(--flizzy-face);
            border-color: var(--flizzy-face);
        }

        body.flizzy-gesture-hand .flizzy-control-panel button[aria-pressed="true"] {
            color: #1c1203;
            background: var(--flizzy-hand);
            border-color: var(--flizzy-hand);
        }

        .flizzy-recenter {
            padding: 0;
        }

        .flizzy-status-line {
            min-height: 18px;
            color: var(--flizzy-muted);
            font: 600 0.72rem/1.35 "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .camera-hud.flizzy-ai-hud {
            position: fixed;
            right: 24px;
            bottom: 24px;
            width: clamp(116px, 14vw, 168px);
            padding: 6px;
            background: linear-gradient(145deg, rgba(7, 12, 20, 0.94), rgba(17, 24, 39, 0.9));
            border: 1px solid var(--flizzy-panel-border);
            border-radius: 8px;
            box-shadow: 0 18px 46px rgba(0, 0, 0, 0.32);
            backdrop-filter: blur(18px);
            isolation: isolate;
            overflow: hidden;
            z-index: 9999997;
        }

        .flizzy-camera-stage {
            position: relative;
            width: 100%;
            aspect-ratio: 4 / 3;
            overflow: hidden;
            border-radius: 6px;
            background:
                linear-gradient(rgba(34, 211, 238, 0.12) 1px, transparent 1px),
                linear-gradient(90deg, rgba(245, 158, 11, 0.1) 1px, transparent 1px),
                #0b1220;
            background-size: 18px 18px;
        }

        .flizzy-camera-stage::before {
            content: "";
            position: absolute;
            inset: 8px;
            border: 1px solid rgba(248, 250, 252, 0.18);
            border-radius: 5px;
            z-index: 2;
            pointer-events: none;
        }

        .flizzy-camera-stage::after {
            content: "";
            position: absolute;
            left: 50%;
            top: 50%;
            width: 38%;
            height: 56%;
            border: 1px dashed rgba(248, 250, 252, 0.28);
            border-radius: 999px;
            transform: translate(-50%, -50%);
            z-index: 2;
            pointer-events: none;
        }

        .camera-hud.flizzy-ai-hud video {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
            transform: scaleX(-1);
            filter: contrast(1.16) brightness(1.05) saturate(1.08);
            opacity: 0;
            position: absolute;
            inset: 0;
            z-index: 0;
        }

        .flizzy-camera-preview {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
            transform: scaleX(-1);
            position: relative;
            z-index: 1;
        }

        .flizzy-camera-label {
            margin-top: 6px;
            color: var(--flizzy-muted);
            font: 700 0.58rem/1.2 "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
            letter-spacing: 0;
            text-align: center;
        }

        #cursor {
            position: fixed;
            left: 50vw;
            top: 50vh;
            width: 32px;
            height: 32px;
            border: 2px solid var(--flizzy-face);
            border-radius: 50%;
            background: rgba(34, 211, 238, 0.12);
            pointer-events: none;
            z-index: 9999999;
            transform: translate(-50%, -50%);
            transition: background 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
            box-shadow: 0 0 18px rgba(34, 211, 238, 0.55);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        body.flizzy-gesture-hand #cursor {
            border-color: var(--flizzy-hand);
            background: rgba(245, 158, 11, 0.14);
            box-shadow: 0 0 18px rgba(245, 158, 11, 0.5);
        }

        #cursor::after {
            content: "";
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: currentColor;
            color: var(--flizzy-face);
        }

        body.flizzy-gesture-hand #cursor::after {
            color: var(--flizzy-hand);
        }

        #cursor.click-anim {
            transform: translate(-50%, -50%) scale(0.58);
            background: var(--flizzy-face);
        }

        body.flizzy-gesture-hand #cursor.click-anim {
            background: var(--flizzy-hand);
        }

        .flizzy-ai-hover {
            outline: 2px solid color-mix(in srgb, var(--flizzy-face) 72%, transparent);
            outline-offset: 3px;
        }

        body.flizzy-gesture-hand .flizzy-ai-hover {
            outline-color: color-mix(in srgb, var(--flizzy-hand) 76%, transparent);
        }

        .app-card.flizzy-ai-hover,
        .track-card.flizzy-ai-hover,
        .movie-card.flizzy-ai-hover,
        .btn.flizzy-ai-hover,
        .nav-back.flizzy-ai-hover,
        .player-btn.flizzy-ai-hover,
        .close-video.flizzy-ai-hover,
        .btn-exit.flizzy-ai-hover {
            transform: translateY(-4px);
            border-color: var(--flizzy-face) !important;
            box-shadow: 0 12px 28px rgba(34, 211, 238, 0.18) !important;
        }

        body.flizzy-gesture-hand .app-card.flizzy-ai-hover,
        body.flizzy-gesture-hand .track-card.flizzy-ai-hover,
        body.flizzy-gesture-hand .movie-card.flizzy-ai-hover,
        body.flizzy-gesture-hand .btn.flizzy-ai-hover,
        body.flizzy-gesture-hand .nav-back.flizzy-ai-hover,
        body.flizzy-gesture-hand .player-btn.flizzy-ai-hover,
        body.flizzy-gesture-hand .close-video.flizzy-ai-hover,
        body.flizzy-gesture-hand .btn-exit.flizzy-ai-hover {
            border-color: var(--flizzy-hand) !important;
            box-shadow: 0 12px 28px rgba(245, 158, 11, 0.2) !important;
        }

        .flizzy-embedded-app .camera-hud,
        .flizzy-embedded-app #cursor,
        .flizzy-embedded-app .flizzy-control-panel {
            display: none !important;
        }

        @media (max-width: 760px) {
            .flizzy-control-panel {
                left: 12px;
                right: 12px;
                bottom: 12px;
                width: auto;
            }

            .camera-hud.flizzy-ai-hud {
                right: 12px;
                bottom: 120px;
                width: 112px;
            }
        }
    `;
    document.head.appendChild(style);
}

function ensureHud(video: HTMLVideoElement): HTMLElement {
    let hud: HTMLElement | null = document.querySelector<HTMLElement>('.camera-hud');
    if (!(hud instanceof HTMLElement)) {
        hud = document.createElement('div');
        hud.className = 'camera-hud';
        document.body.appendChild(hud);
    }

    hud.classList.add('flizzy-ai-hud');

    let stage = hud.querySelector<HTMLElement>('.flizzy-camera-stage');
    if (!(stage instanceof HTMLElement)) {
        stage = document.createElement('div');
        stage.className = 'flizzy-camera-stage';
        hud.prepend(stage);
    }

    if (!stage.contains(video)) {
        stage.appendChild(video);
    }

    let preview = stage.querySelector<HTMLCanvasElement>('.flizzy-camera-preview');
    if (!(preview instanceof HTMLCanvasElement)) {
        preview = document.createElement('canvas');
        preview.className = 'flizzy-camera-preview';
        stage.appendChild(preview);
    }

    let label = hud.querySelector('.flizzy-camera-label');
    if (!(label instanceof HTMLElement)) {
        label = document.createElement('div');
        label.className = 'flizzy-camera-label';
        hud.appendChild(label);
    }
    label.textContent = 'FACE_ENGINE';

    return hud;
}

function ensureControlPanel(activeEngine: ControlEngine) {
    let panel: HTMLElement | null = document.querySelector<HTMLElement>('.flizzy-control-panel');
    if (!(panel instanceof HTMLElement)) {
        panel = document.createElement('div');
        panel.className = 'flizzy-control-panel';
        panel.innerHTML = `
            <div class="flizzy-engine-row">
                <button type="button" data-ai-engine="face">Face</button>
                <button type="button" data-ai-engine="hand">Hand</button>
                <button type="button" class="flizzy-recenter" data-ai-recenter title="Center">C</button>
            </div>
            <div class="flizzy-status-line" data-ai-status>Starting...</div>
        `;
        document.body.appendChild(panel);
    }

    for (const button of panel.querySelectorAll<HTMLButtonElement>('[data-ai-engine]')) {
        button.setAttribute('aria-pressed', button.dataset.aiEngine === activeEngine ? 'true' : 'false');
    }

    return panel;
}

function findInteractiveTarget(target: Element | null): HTMLElement | null {
    if (!target) return null;
    return target.closest<HTMLElement>(
        'button, a, input, select, textarea, [role="button"], [tabindex], .app-card, .track-card, .movie-card, .btn, .nav-back, .player-btn, .close-video, .btn-exit'
    );
}

function setupIframeClickBridge(clickAt: (x: number, y: number, source: string) => void) {
    window.addEventListener('message', (event) => {
        const payload = event.data as { type?: string; x?: number; y?: number } | null;
        if (!payload || payload.type !== 'AI_CLICK') return;
        if (typeof payload.x !== 'number' || typeof payload.y !== 'number') return;

        clickAt(payload.x, payload.y, 'iframe');
    });
}

async function initAI() {
    ensureRuntimeStyle();

    if (isEmbeddedApp()) {
        document.documentElement.classList.add('flizzy-embedded-app');
        setupIframeClickBridge((x, y) => {
            const target = document.elementFromPoint(x, y) as HTMLElement | null;
            findInteractiveTarget(target)?.click();
        });
        return;
    }

    const video = getOrCreateVideo();
    const cursor = getOrCreateCursor();
    const hud = ensureHud(video);
    const previewCanvas = hud.querySelector<HTMLCanvasElement>('.flizzy-camera-preview');
    const previewContext = previewCanvas?.getContext('2d') ?? null;
    const foregroundCanvas = document.createElement('canvas');
    const foregroundContext = foregroundCanvas.getContext('2d');
    const maskCanvas = document.createElement('canvas');
    const maskContext = maskCanvas.getContext('2d');
    const processingCanvas = document.createElement('canvas');
    const processingContext = processingCanvas.getContext('2d');

    let activeEngine = getSavedEngine();
    const panel = ensureControlPanel(activeEngine);
    const statusLine = panel.querySelector<HTMLElement>('[data-ai-status]');
    const cameraLabel = document.querySelector<HTMLElement>('.flizzy-camera-label');

    const cursorController = new CursorController({
        width: window.innerWidth,
        height: window.innerHeight
    });

    const gestureEngine = new GestureEngine((action, data) => {
        const source = data?.source === 'hand' ? 'hand' : 'face';
        if (source !== activeEngine && action !== 'enter') return;

        if (action === 'move' && data) {
            const timestamp = data.timestampMs ?? performance.now();
            const coords = source === 'hand'
                ? cursorController.applyPointerPosition(data.x ?? 0.5, data.y ?? 0.5, timestamp, { mirrorX: true })
                : cursorController.applyMovement(data.yaw ?? 0, data.pitch ?? 0, timestamp);

            currentCursorX = coords.x;
            currentCursorY = coords.y;
            moveCursor(coords.x, coords.y);
            updateHoverTarget(coords.x, coords.y);
            return;
        }

        if (action === 'click') {
            executeRealClick(source);
            return;
        }

        if (action === 'drag_start') {
            cursor.classList.add('dragging');
            return;
        }

        if (action === 'drag_end') {
            cursor.classList.remove('dragging');
        }
    });

    let currentCursorX = window.innerWidth / 2;
    let currentCursorY = window.innerHeight / 2;
    let lastClickTime = 0;
    let clickTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastHoveredTarget: HTMLElement | null = null;
    let faceLandmarker: Awaited<ReturnType<typeof FaceLandmarkerManager.getInstance>> | null = null;
    let handLandmarker: Awaited<ReturnType<typeof HandLandmarkerManager.getInstance>> | null = null;
    let imageSegmenter: Awaited<ReturnType<typeof ImageSegmenterManager.getInstance>> | null = null;
    let segmenterLabels: string[] = [];
    let virtualBackgroundFailed = false;
    let lastVideoTime = -1;
    let modelLoadVersion = 0;
    let loopStarted = false;

    function setStatus(message: string) {
        if (statusLine) statusLine.textContent = message;
    }

    function syncEngineUi() {
        document.body.classList.toggle('flizzy-gesture-hand', activeEngine === 'hand');
        document.body.classList.toggle('flizzy-gesture-face', activeEngine === 'face');
        for (const button of panel.querySelectorAll<HTMLButtonElement>('[data-ai-engine]')) {
            button.setAttribute('aria-pressed', button.dataset.aiEngine === activeEngine ? 'true' : 'false');
        }
        if (cameraLabel) {
            cameraLabel.textContent = activeEngine === 'hand' ? 'HAND_ENGINE' : 'FACE_ENGINE';
        }
    }

    function moveCursor(x: number, y: number) {
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
    }

    function updateHoverTarget(x: number, y: number) {
        const target = findInteractiveTarget(document.elementFromPoint(x, y));
        if (target === lastHoveredTarget) return;

        lastHoveredTarget?.classList.remove('flizzy-ai-hover');
        target?.classList.add('flizzy-ai-hover');
        lastHoveredTarget = target;
    }

    function sendClickIntoFrame(frame: HTMLIFrameElement, x: number, y: number) {
        const rect = frame.getBoundingClientRect();
        frame.contentWindow?.postMessage({
            type: 'AI_CLICK',
            x: x - rect.left,
            y: y - rect.top
        }, '*');
    }

    function dispatchClickSequence(element: HTMLElement, x: number, y: number, source: string) {
        const common: MouseEventInit = {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            button: 0
        };

        if ('PointerEvent' in window) {
            const pointerCommon: PointerEventInit = {
                ...common,
                pointerId: 1,
                pointerType: source === 'hand' ? 'touch' : 'mouse',
                isPrimary: true,
                buttons: 1
            };
            element.dispatchEvent(new PointerEvent('pointerdown', pointerCommon));
        }

        element.dispatchEvent(new MouseEvent('mousedown', { ...common, buttons: 1 }));

        if ('PointerEvent' in window) {
            element.dispatchEvent(new PointerEvent('pointerup', {
                ...common,
                pointerId: 1,
                pointerType: source === 'hand' ? 'touch' : 'mouse',
                isPrimary: true
            }));
        }

        element.dispatchEvent(new MouseEvent('mouseup', common));
        element.dispatchEvent(new MouseEvent('click', common));

        const anchor = element.closest<HTMLAnchorElement>('a[href]');
        if (anchor && anchor.target === '_blank') {
            window.open(anchor.href, '_blank');
        }

        if (element instanceof HTMLIFrameElement) {
            sendClickIntoFrame(element, x, y);
        }
    }

    function clickAt(x: number, y: number, source: string) {
        const elementToClick = document.elementFromPoint(x, y) as HTMLElement | null;
        cursor.classList.add('click-anim');
        setTimeout(() => cursor.classList.remove('click-anim'), 150);

        if (!elementToClick) return;
        dispatchClickSequence(elementToClick, x, y, source);
    }

    function executeRealClick(source: string) {
        const now = Date.now();
        const timeDiff = now - lastClickTime;

        if (timeDiff < 420 && timeDiff > 0) {
            if (clickTimeout) {
                clearTimeout(clickTimeout);
                clickTimeout = null;
            }

            const elementToClick = document.elementFromPoint(currentCursorX, currentCursorY) as HTMLElement | null;
            if (elementToClick) {
                elementToClick.dispatchEvent(new MouseEvent('dblclick', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: currentCursorX,
                    clientY: currentCursorY
                }));
            }
            lastClickTime = 0;
            return;
        }

        lastClickTime = now;
        if (clickTimeout) clearTimeout(clickTimeout);

        clickTimeout = setTimeout(() => {
            clickAt(currentCursorX, currentCursorY, source);
            clickTimeout = null;
        }, 260);
    }

    async function ensureLandmarker(engine: ControlEngine) {
        if (engine === 'face') {
            faceLandmarker = faceLandmarker ?? await FaceLandmarkerManager.getInstance();
            return;
        }

        handLandmarker = handLandmarker ?? await HandLandmarkerManager.getInstance();
    }

    async function activateEngine(nextEngine: ControlEngine) {
        activeEngine = nextEngine;
        localStorage.setItem(ENGINE_STORAGE_KEY, nextEngine);
        cursorController.resetCalibration();
        gestureEngine.resetInteractionState();
        moveCursor(cursorController.currentX, cursorController.currentY);
        syncEngineUi();

        const loadId = ++modelLoadVersion;
        setStatus(nextEngine === 'hand' ? 'Loading hand model...' : 'Loading face model...');

        try {
            await ensureLandmarker(nextEngine);
            if (loadId === modelLoadVersion) {
                setStatus(nextEngine === 'hand' ? 'Hand engine active' : 'Face engine active');
            }
        } catch (error) {
            if (loadId === modelLoadVersion) {
                setStatus('Model failed to load');
            }
            throw error;
        }
    }

    function predictWebcam() {
        if (lastVideoTime !== video.currentTime) {
            const startTimeMs = performance.now();
            lastVideoTime = video.currentTime;
            const detectionFrame = prepareDetectionFrame();
            renderVirtualPreview(detectionFrame, startTimeMs);

            if (activeEngine === 'face' && faceLandmarker) {
                const faceResults = faceLandmarker.detectForVideo(detectionFrame, startTimeMs);
                if (faceResults.faceLandmarks?.length) {
                    gestureEngine.processFaceFrame(faceResults.faceLandmarks[0] as any, startTimeMs);
                }
            }

            if (activeEngine === 'hand' && handLandmarker) {
                const handResults = handLandmarker.detectForVideo(detectionFrame, startTimeMs);
                if (handResults.landmarks?.length) {
                    gestureEngine.processHandFrame(handResults.landmarks[0] as any, startTimeMs);
                }
            }
        }

        requestAnimationFrame(predictWebcam);
    }

    function prepareDetectionFrame(): HTMLVideoElement | HTMLCanvasElement {
        if (!processingContext || video.videoWidth === 0 || video.videoHeight === 0) {
            return video;
        }

        if (processingCanvas.width !== video.videoWidth || processingCanvas.height !== video.videoHeight) {
            processingCanvas.width = video.videoWidth;
            processingCanvas.height = video.videoHeight;
        }

        processingContext.save();
        processingContext.filter = 'contrast(1.16) brightness(1.05) saturate(1.08)';
        processingContext.drawImage(video, 0, 0, processingCanvas.width, processingCanvas.height);
        processingContext.restore();

        return processingCanvas;
    }

    function ensurePreviewSize(source: HTMLVideoElement | HTMLCanvasElement): boolean {
        if (!previewCanvas || !previewContext || !foregroundContext || !maskContext) return false;

        const width = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
        const height = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
        if (width === 0 || height === 0) return false;

        if (previewCanvas.width !== width || previewCanvas.height !== height) {
            previewCanvas.width = width;
            previewCanvas.height = height;
            foregroundCanvas.width = width;
            foregroundCanvas.height = height;
        }

        return true;
    }

    function drawVirtualBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, activeEngine === 'hand' ? '#241405' : '#07131c');
        gradient.addColorStop(0.48, '#0b1220');
        gradient.addColorStop(1, activeEngine === 'hand' ? '#3a2509' : '#102a35');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.strokeStyle = activeEngine === 'hand' ? '#f59e0b' : '#22d3ee';
        ctx.lineWidth = Math.max(1, width / 220);
        const step = Math.max(18, width / 12);
        for (let x = -step; x < width + step; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + height * 0.35, height);
            ctx.stroke();
        }
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = activeEngine === 'hand' ? '#f59e0b' : '#22d3ee';
        ctx.beginPath();
        ctx.ellipse(width * 0.76, height * 0.22, width * 0.22, height * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawPrivacyFallback(source: HTMLVideoElement | HTMLCanvasElement) {
        if (!previewCanvas || !previewContext || !ensurePreviewSize(source)) return;

        drawVirtualBackground(previewContext, previewCanvas.width, previewCanvas.height);

        previewContext.save();
        previewContext.globalAlpha = 0.72;
        previewContext.fillStyle = '#f8fafc';
        previewContext.font = `${Math.max(11, previewCanvas.width * 0.045)}px JetBrains Mono, monospace`;
        previewContext.textAlign = 'center';
        previewContext.fillText('VIRTUAL_BG', previewCanvas.width / 2, previewCanvas.height - 18);
        previewContext.restore();
    }

    function getMaskRegionStats(mask: PreviewMaskSource, values: Float32Array | Uint8Array, invert = false) {
        let centerSum = 0;
        let centerCount = 0;
        let edgeSum = 0;
        let edgeCount = 0;

        const step = Math.max(1, Math.floor(Math.min(mask.width, mask.height) / 80));
        for (let y = 0; y < mask.height; y += step) {
            const ny = y / mask.height;
            for (let x = 0; x < mask.width; x += step) {
                const nx = x / mask.width;
                const index = y * mask.width + x;
                const rawValue = values[index];
                const normalized = values instanceof Uint8Array ? rawValue / 255 : rawValue;
                const value = invert ? 1 - normalized : normalized;
                const inCenter = nx > 0.28 && nx < 0.72 && ny > 0.16 && ny < 0.82;
                const inEdge = nx < 0.12 || nx > 0.88 || ny < 0.12 || ny > 0.88;

                if (inCenter) {
                    centerSum += value;
                    centerCount++;
                }

                if (inEdge) {
                    edgeSum += value;
                    edgeCount++;
                }
            }
        }

        return {
            center: centerCount ? centerSum / centerCount : 0,
            edge: edgeCount ? edgeSum / edgeCount : 0
        };
    }

    function inferForegroundCategory(mask: PreviewMaskSource): number {
        const data = mask.getAsUint8Array();
        const centerCounts = new Map<number, number>();
        const edgeCounts = new Map<number, number>();
        let centerTotal = 0;
        let edgeTotal = 0;
        const step = Math.max(1, Math.floor(Math.min(mask.width, mask.height) / 90));

        for (let y = 0; y < mask.height; y += step) {
            const ny = y / mask.height;
            for (let x = 0; x < mask.width; x += step) {
                const nx = x / mask.width;
                const category = data[y * mask.width + x];
                const inCenter = nx > 0.28 && nx < 0.72 && ny > 0.16 && ny < 0.82;
                const inEdge = nx < 0.12 || nx > 0.88 || ny < 0.12 || ny > 0.88;

                if (inCenter) {
                    centerCounts.set(category, (centerCounts.get(category) ?? 0) + 1);
                    centerTotal++;
                }

                if (inEdge) {
                    edgeCounts.set(category, (edgeCounts.get(category) ?? 0) + 1);
                    edgeTotal++;
                }
            }
        }

        let bestCategory = 0;
        let bestScore = Number.NEGATIVE_INFINITY;
        for (const [category, centerCount] of centerCounts) {
            const centerRatio = centerTotal ? centerCount / centerTotal : 0;
            const edgeRatio = edgeTotal ? (edgeCounts.get(category) ?? 0) / edgeTotal : 0;
            const score = centerRatio - edgeRatio * 0.8;

            if (score > bestScore) {
                bestScore = score;
                bestCategory = category;
            }
        }

        return bestCategory;
    }

    function chooseConfidenceMask(masks: PreviewMaskSource[]): PreviewMaskSelection | null {
        if (!masks.length) return null;

        const labels = segmenterLabels.map(label => label.toLowerCase());
        const personIndex = labels.findIndex(label => (
            label.includes('person') ||
            label.includes('human') ||
            label.includes('selfie') ||
            label.includes('foreground')
        ));

        if (personIndex >= 0 && masks[personIndex]) {
            return { mask: masks[personIndex], kind: 'confidence', invert: false };
        }

        const backgroundIndex = labels.findIndex(label => label.includes('background'));
        if (backgroundIndex >= 0 && masks[backgroundIndex]) {
            return { mask: masks[backgroundIndex], kind: 'confidence', invert: true };
        }

        let bestSelection: PreviewMaskSelection | null = null;
        let bestScore = Number.NEGATIVE_INFINITY;

        masks.forEach(mask => {
            const data = mask.getAsFloat32Array();
            const normalStats = getMaskRegionStats(mask, data);
            const invertedStats = getMaskRegionStats(mask, data, true);
            const normalScore = normalStats.center - normalStats.edge;
            const invertedScore = invertedStats.center - invertedStats.edge;
            const invert = invertedScore > normalScore;
            const score = Math.max(normalScore, invertedScore);

            if (score > bestScore) {
                bestScore = score;
                bestSelection = { mask, kind: 'confidence', invert };
            }
        });

        return bestSelection;
    }

    function choosePreviewMask(result: {
        confidenceMasks?: PreviewMaskSource[];
        categoryMask?: PreviewMaskSource;
    }): PreviewMaskSelection | null {
        const confidenceSelection = chooseConfidenceMask(result.confidenceMasks ?? []);
        if (confidenceSelection) return confidenceSelection;

        if (result.categoryMask) {
            const labels = segmenterLabels.map(label => label.toLowerCase());
            const labeledPersonCategory = labels.findIndex(label => (
                label.includes('person') ||
                label.includes('human') ||
                label.includes('selfie') ||
                label.includes('foreground')
            ));

            return {
                mask: result.categoryMask,
                kind: 'category',
                invert: false,
                foregroundCategory: labeledPersonCategory >= 0
                    ? labeledPersonCategory
                    : inferForegroundCategory(result.categoryMask)
            };
        }

        return null;
    }

    function renderVirtualPreview(source: HTMLVideoElement | HTMLCanvasElement, timestampMs: number) {
        if (!previewCanvas || !previewContext || !foregroundContext || !maskContext || !ensurePreviewSize(source)) {
            return;
        }

        if (!imageSegmenter) {
            drawPrivacyFallback(source);
            return;
        }

        try {
            const result = imageSegmenter.segmentForVideo(source, timestampMs);
            const selection = choosePreviewMask(result);
            if (!selection) {
                result.close();
                drawPrivacyFallback(source);
                return;
            }

            const mask = selection.mask;
            drawVirtualBackground(previewContext, previewCanvas.width, previewCanvas.height);

            foregroundContext.clearRect(0, 0, foregroundCanvas.width, foregroundCanvas.height);
            foregroundContext.filter = 'contrast(1.12) brightness(1.04) saturate(1.06)';
            foregroundContext.drawImage(source, 0, 0, foregroundCanvas.width, foregroundCanvas.height);
            foregroundContext.filter = 'none';

            maskCanvas.width = mask.width;
            maskCanvas.height = mask.height;
            const maskImage = maskContext.createImageData(mask.width, mask.height);

            if (selection.kind === 'category') {
                const maskData = mask.getAsUint8Array();
                const foregroundCategory = selection.foregroundCategory ?? 0;
                for (let i = 0, p = 0; i < maskData.length; i++, p += 4) {
                    const alpha = maskData[i] === foregroundCategory ? 255 : 0;
                    maskImage.data[p] = 255;
                    maskImage.data[p + 1] = 255;
                    maskImage.data[p + 2] = 255;
                    maskImage.data[p + 3] = alpha;
                }
            } else {
                const maskData = mask.getAsFloat32Array();
                for (let i = 0, p = 0; i < maskData.length; i++, p += 4) {
                    const confidence = selection.invert ? 1 - maskData[i] : maskData[i];
                    const alpha = Math.max(0, Math.min(255, (confidence - 0.42) * 460));
                    maskImage.data[p] = 255;
                    maskImage.data[p + 1] = 255;
                    maskImage.data[p + 2] = 255;
                    maskImage.data[p + 3] = alpha;
                }
            }

            maskContext.putImageData(maskImage, 0, 0);
            foregroundContext.save();
            foregroundContext.globalCompositeOperation = 'destination-in';
            foregroundContext.drawImage(maskCanvas, 0, 0, foregroundCanvas.width, foregroundCanvas.height);
            foregroundContext.restore();

            previewContext.drawImage(foregroundCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
            result.close();
        } catch (error) {
            if (!virtualBackgroundFailed) {
                virtualBackgroundFailed = true;
                console.warn('Virtual background fallback active:', error);
                setStatus('Virtual bg fallback active');
            }
            drawPrivacyFallback(source);
        }
    }

    function startLoopOnce() {
        if (loopStarted) return;
        loopStarted = true;
        predictWebcam();
    }

    window.addEventListener('resize', () => {
        cursorController.updateBounds({
            width: window.innerWidth,
            height: window.innerHeight
        });
    });

    panel.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const engineButton = target.closest<HTMLButtonElement>('[data-ai-engine]');
        if (engineButton?.dataset.aiEngine === 'face' || engineButton?.dataset.aiEngine === 'hand') {
            void activateEngine(engineButton.dataset.aiEngine);
            return;
        }

        if (target.closest('[data-ai-recenter]')) {
            cursorController.resetCalibration();
            gestureEngine.resetInteractionState();
            moveCursor(cursorController.currentX, cursorController.currentY);
            setStatus(activeEngine === 'hand' ? 'Hand center reset' : 'Face center reset');
        }
    });

    setupIframeClickBridge(clickAt);
    syncEngineUi();
    moveCursor(currentCursorX, currentCursorY);
    document.body.classList.add('flizzy-ai-ready');

    if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('Camera API unavailable');
        return;
    }

    try {
        setStatus('Opening camera...');
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 640,
                height: 480,
                frameRate: { ideal: 30 }
            },
            audio: false
        });
        video.srcObject = stream;
        await video.play().catch(() => undefined);

        void ImageSegmenterManager.getInstance()
            .then((segmenter) => {
                imageSegmenter = segmenter;
                segmenterLabels = segmenter.getLabels();
                virtualBackgroundFailed = false;
            })
            .catch((error) => {
                virtualBackgroundFailed = true;
                console.warn('Virtual background unavailable:', error);
                setStatus('Virtual bg fallback active');
            });

        await activateEngine(activeEngine);
        if (video.readyState >= 2) {
            startLoopOnce();
        } else {
            video.addEventListener('loadeddata', startLoopOnce, { once: true });
        }
    } catch (error) {
        console.error('Flizzy AI runtime error:', error);
        setStatus('Camera or model blocked');
    }
}

void initAI();
