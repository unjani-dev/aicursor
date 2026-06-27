// Pastikan fungsi 'distance' sudah diekspor dari file geometry.ts Anda
import { Point3D, calculateEAR, calculateMAR, calculateHeadPose, distance } from './geometry';

// Indeks Standar MediaPipe Face Mesh (468 Titik)
const FACE_INDICES = {
    NOSE_TIP: 1,
    LEFT_EYE: [33, 160, 158, 133, 153, 144], 
    RIGHT_EYE: [362, 385, 387, 263, 373, 380], 
    INNER_LIP: [78, 13, 308, 14] 
};

// Indeks Standar MediaPipe Hands (21 Titik)
const HAND_INDICES = {
    WRIST: 0,
    THUMB_TIP: 4,      // Ujung Jempol
    INDEX_TIP: 8,      // Ujung Telunjuk
    MIDDLE_TIP: 12     // Ujung Jari Tengah
};

export interface GestureConfig {
    blinkThreshold: number;
    doubleBlinkWindowMs: number;
    mouthOpenThreshold: number;
    nodVelocityThreshold: number;
    handPinchThreshold: number; // Jarak untuk deteksi klik tangan (cubit)
    doublePinchWindowMs: number;
}

export type GestureCallback = (action: 'move' | 'click' | 'drag_start' | 'drag_end' | 'enter', data?: any) => void;

export class GestureEngine {
    private config: GestureConfig;
    private onGesture: GestureCallback;
    
    // State Tracker (Untuk mencegah spam klik / getaran)
    private previousPitch: number = 0;
    private nodTimestamps: number[] = [];
    private isDragging: boolean = false;
    private isBlinking: boolean = false;
    private isPinching: boolean = false;
    private lastBlinkTimestamp: number = 0;
    private lastPinchTimestamp: number = 0;

    constructor(onGesture: GestureCallback, config?: Partial<GestureConfig>) {
        this.onGesture = onGesture;
        this.config = {
            blinkThreshold: 0.22,
            doubleBlinkWindowMs: 620,
            mouthOpenThreshold: 0.5,
            nodVelocityThreshold: 0.05,
            handPinchThreshold: 0.04, // 4% dari jarak layar. Sesuaikan jika susah klik.
            doublePinchWindowMs: 620,
            ...config
        };
    }

    // ==========================================
    // SISTEM 1: PEMROSESAN WAJAH & KEPALA
    // ==========================================
    public processFaceFrame(landmarks: Point3D[], timestampMs: number) {
        if (!landmarks || landmarks.length < 468) return;

        // 1. Head Movement
        const nose = landmarks[FACE_INDICES.NOSE_TIP];
        const leftEyeOuter = landmarks[FACE_INDICES.LEFT_EYE[0]];
        const rightEyeOuter = landmarks[FACE_INDICES.RIGHT_EYE[3]];
        
        const { pitch, yaw } = calculateHeadPose(nose, leftEyeOuter, rightEyeOuter);
        this.onGesture('move', { pitch, yaw, timestampMs, source: 'face' });

        // 2. Click (Blink) - Dilengkapi pencegah spam
        const leftEyePoints = FACE_INDICES.LEFT_EYE.map(i => landmarks[i]);
        const rightEyePoints = FACE_INDICES.RIGHT_EYE.map(i => landmarks[i]);
        const avgEAR = (calculateEAR(leftEyePoints) + calculateEAR(rightEyePoints)) / 2;
        
        if (avgEAR < this.config.blinkThreshold) {
            if (!this.isBlinking) {
                this.isBlinking = true;
                this.detectDoubleBlink(timestampMs);
            }
        } else {
            this.isBlinking = false;
        }

        // 3. Drag (Mouth Open)
        const mouthPoints = FACE_INDICES.INNER_LIP.map(i => landmarks[i]);
        const mar = calculateMAR(mouthPoints);
        
        if (mar > this.config.mouthOpenThreshold && !this.isDragging) {
            this.isDragging = true;
            this.onGesture('drag_start', { source: 'face' });
        } else if (mar <= this.config.mouthOpenThreshold && this.isDragging) {
            this.isDragging = false;
            this.onGesture('drag_end', { source: 'face' });
        }

        // 4. Enter (Double Nod)
        this.detectNod(pitch, timestampMs);
    }

    // ==========================================
    // SISTEM 2: PEMROSESAN TANGAN (HAND GESTURE)
    // ==========================================
    public processHandFrame(landmarks: Point3D[], timestampMs: number) {
        if (!landmarks || landmarks.length < 21) return;

        // 1. Hand Movement (Menggunakan Ujung Telunjuk)
        const indexTip = landmarks[HAND_INDICES.INDEX_TIP];

        // Karena CursorController kita menggunakan sistem relatif (delta), 
        // kita ubah koordinat asli tangan menjadi pseudo-yaw dan pseudo-pitch 
        // (dikurangi 0.5 agar posisi tengah layar bernilai 0, lalu dikali skala).
        const pseudoYaw = (indexTip.x - 0.5) * 2.0;
        const pseudoPitch = (indexTip.y - 0.5) * 2.0;

        this.onGesture('move', {
            x: indexTip.x,
            y: indexTip.y,
            z: indexTip.z,
            pitch: pseudoPitch,
            yaw: pseudoYaw,
            timestampMs,
            source: 'hand'
        });

        // 2. Click (Pinch / Mencubit)
        const thumbTip = landmarks[HAND_INDICES.THUMB_TIP];
        
        // Hitung jarak Euclidean 3D antara Jempol dan Telunjuk
        const pinchDistance = distance(indexTip, thumbTip);

        if (pinchDistance < this.config.handPinchThreshold) {
            if (!this.isPinching) {
                this.isPinching = true; // Kunci agar tidak klik berkali-kali
                this.detectDoublePinch(timestampMs);
            }
        } else {
            this.isPinching = false; // Buka kunci saat jari dilepas
        }
    }

    public resetInteractionState() {
        this.previousPitch = 0;
        this.nodTimestamps = [];
        this.isDragging = false;
        this.isBlinking = false;
        this.isPinching = false;
        this.lastBlinkTimestamp = 0;
        this.lastPinchTimestamp = 0;
    }

    // ==========================================
    // UTILITAS
    // ==========================================
    private detectNod(currentPitch: number, timestampMs: number) {
        const pitchVelocity = currentPitch - this.previousPitch;
        
        if (pitchVelocity > this.config.nodVelocityThreshold) {
            this.nodTimestamps.push(timestampMs);
            this.nodTimestamps = this.nodTimestamps.filter(t => timestampMs - t < 1000);
            
            if (this.nodTimestamps.length >= 2) {
                this.onGesture('enter');
                this.nodTimestamps = []; 
            }
        }
        this.previousPitch = currentPitch;
    }

    private detectDoubleBlink(timestampMs: number) {
        const elapsed = timestampMs - this.lastBlinkTimestamp;

        if (this.lastBlinkTimestamp > 0 && elapsed <= this.config.doubleBlinkWindowMs) {
            this.onGesture('click', { source: 'face' });
            this.lastBlinkTimestamp = 0;
            return;
        }

        this.lastBlinkTimestamp = timestampMs;
    }

    private detectDoublePinch(timestampMs: number) {
        const elapsed = timestampMs - this.lastPinchTimestamp;

        if (this.lastPinchTimestamp > 0 && elapsed <= this.config.doublePinchWindowMs) {
            this.onGesture('click', { source: 'hand' });
            this.lastPinchTimestamp = 0;
            return;
        }

        this.lastPinchTimestamp = timestampMs;
    }
}
