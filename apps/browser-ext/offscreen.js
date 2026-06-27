import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { GestureEngine } from '../../packages/gesture-engine/src/index';
import { CursorController } from '../../packages/input-mapper/src/index';

let faceLandmarker;
let gestureEngine;
let cursorController;
let lastVideoTime = -1;

async function initAI() {
    const video = document.getElementById('webcam');
    const wasmPath = chrome.runtime.getURL("wasm/"); 
    const modelPath = chrome.runtime.getURL("models/face_landmarker.task");

    try {
        // Coba akses kamera
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        video.srcObject = stream;

        const vision = await FilesetResolver.forVisionTasks(wasmPath);
        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: modelPath, delegate: "GPU" },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1
        });

        cursorController = new CursorController({ width: window.screen.width, height: window.screen.height });

        gestureEngine = new GestureEngine((action, data) => {
            const timestamp = performance.now();
            const coords = cursorController.applyMovement(data.yaw || 0, data.pitch || 0, timestamp);
            chrome.runtime.sendMessage({
                type: 'AI_CURSOR_EVENT',
                payload: { x: coords.x, y: coords.y, action: action }
            });
        });

        video.onloadeddata = () => processLoop();

    } catch (err) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDismissedError") {
            // Minta background buka floating window
            chrome.runtime.sendMessage({ type: 'REQUEST_PERMISSION_WINDOW' });
        } else {
            console.error("Engine Init Failed:", err);
        }
    }
}

function processLoop() {
    const video = document.getElementById('webcam');
    const timestamp = performance.now();
    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const results = faceLandmarker.detectForVideo(video, timestamp);
        if (results.faceLandmarks?.[0]) {
            gestureEngine.processFaceFrame(results.faceLandmarks[0], timestamp);
        }
    }
    requestAnimationFrame(processLoop);
}

initAI();