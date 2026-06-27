import { OneEuroFilter } from '@ai-cursor/gesture-engine';

export interface ScreenBounds {
    width: number;
    height: number;
}

export type CursorAction = 'move' | 'click' | 'double_click' | 'drag_start' | 'drag_end';

export interface CursorEvent {
    action: CursorAction;
    x: number;
    y: number;
}

export interface PointerPositionOptions {
    mirrorX?: boolean;
}

export class CursorController {
    private bounds: ScreenBounds;
    private filterX!: OneEuroFilter;
    private filterY!: OneEuroFilter;

    public currentX: number;
    public currentY: number;

    // ==============================
    // CALIBRATION STATES
    // ==============================
    private isFaceCalibrated: boolean = false;
    private centerYaw: number = 0;
    private centerPitch: number = 0;

    // ==============================
    // ANTI-DRIFT CONFIG (Face Focused)
    // ==============================
    private faceSpeed: number = 320.0;
    
    /** * DEADZONE ditingkatkan ke 0.05 
     * Ini mengunci kursor agar diam mutlak saat wajah lurus 
     */
    private deadzone: number = 0.05;   

    // ==============================
    // CLICK & BLINK STATES
    // ==============================
    private blinkThreshold: number = 0.21;
    private blinkCooldown: number = 150;
    private doubleBlinkWindow: number = 350;
    private lastBlinkTime: number = 0;
    private lastEyeClosed: boolean = false;
    private blinkCount: number = 0;

    constructor(bounds: ScreenBounds) {
        this.bounds = bounds;
        // Mulai di tengah layar
        this.currentX = this.bounds.width / 2;
        this.currentY = this.bounds.height / 2;
        this.initFilters();
    }

    private initFilters() {
        /** * Parameter 1 Euro Filter diperkuat (0.8, 0.001)
         * Menghilangkan jitter (getaran) tanpa menambah delay 
         */
        this.filterX = new OneEuroFilter(0.8, 0.001);
        this.filterY = new OneEuroFilter(0.8, 0.001);
    }

    private resetToCenter() {
        this.currentX = this.bounds.width / 2;
        this.currentY = this.bounds.height / 2;
        this.initFilters();
        this.isFaceCalibrated = false;
        console.log("OS Sync: System Centered. Re-calibrating...");
    }

    public updateBounds(newBounds: ScreenBounds) {
        this.bounds = newBounds;
    }

    /**
     * HANDLE: ABSOLUTE POINTER MOVEMENT
     * Dipakai untuk telunjuk/tangan: koordinat MediaPipe (0..1) langsung
     * dipetakan ke layar, lalu tetap dihaluskan dengan 1 Euro Filter.
     */
    public applyPointerPosition(
        normalizedX: number,
        normalizedY: number,
        timestampMs: number,
        options: PointerPositionOptions = {}
    ): CursorEvent {
        const mirrorX = options.mirrorX ?? true;
        const safeX = Math.max(0, Math.min(1, normalizedX));
        const safeY = Math.max(0, Math.min(1, normalizedY));

        const targetX = (mirrorX ? 1 - safeX : safeX) * this.bounds.width;
        const targetY = safeY * this.bounds.height;

        this.currentX = this.filterX.filter(targetX, timestampMs);
        this.currentY = this.filterY.filter(targetY, timestampMs);

        return { action: 'move', x: this.currentX, y: this.currentY };
    }

    /**
     * HANDLE: FACE MOVEMENT
     * Fungsi utama untuk menggerakkan kursor dengan wajah
     */
    public applyMovement(yaw: number, pitch: number, timestampMs: number): CursorEvent {
        // Kalibrasi otomatis saat frame pertama atau setelah reset
        if (!this.isFaceCalibrated) {
            this.centerYaw = yaw;
            this.centerPitch = pitch;
            this.isFaceCalibrated = true;
            return { action: 'move', x: this.currentX, y: this.currentY };
        }

        // Hitung selisih dari posisi diam (0,0)
        const deltaYaw = yaw - this.centerYaw;
        const deltaPitch = pitch - this.centerPitch;

        return this.processRelativeMovement(deltaYaw, deltaPitch, this.faceSpeed, timestampMs);
    }

    /**
     * CORE: Engine Pergerakan Relatif Anti-Meluncur
     */
    private processRelativeMovement(dX: number, dY: number, speed: number, timestampMs: number): CursorEvent {
        const absX = Math.abs(dX);
        const absY = Math.abs(dY);
        
        /** * LOGIKA PENGUNCI (Anti-Drift): 
         * Jika gerakan di bawah deadzone, dX dan dY dipaksa 0 mutlak.
         */
        const safeX = absX > this.deadzone ? dX : 0;
        const safeY = absY > this.deadzone ? dY : 0;

        // Jika tidak ada gerakan yang cukup signifikan, kursor standby di tempat
        if (safeX === 0 && safeY === 0) {
            return { action: 'move', x: this.currentX, y: this.currentY };
        }

        /** * AKSELERASI NON-LINEAR (Pangkat 1.5):
         * Menghilangkan pergerakan lambat yang tidak disengaja 
         * dan memberikan kecepatan saat kepala menoleh cepat.
         */
        const accelX = Math.sign(safeX) * Math.pow(Math.abs(safeX), 1.5);
        const accelY = Math.sign(safeY) * Math.pow(Math.abs(safeY), 1.5);

        // Update posisi kursor
        // dX dikali -1 agar hadap kanan kursor ke kanan (Mirror Fix)
        let nextX = this.currentX + (accelX * speed * -1);
        let nextY = this.currentY + (accelY * speed);

        // Clamping: Agar kursor tidak bisa keluar dari batas layar browser
        nextX = Math.max(0, Math.min(nextX, this.bounds.width));
        nextY = Math.max(0, Math.min(nextY, this.bounds.height));

        // Terapkan Smoothing 1 Euro Filter
        this.currentX = this.filterX.filter(nextX, timestampMs);
        this.currentY = this.filterY.filter(nextY, timestampMs);

        return { action: 'move', x: this.currentX, y: this.currentY };
    }

    /**
     * FACE CLICK: Deteksi Kedipan (Blink)
     */
    public detectBlink(ear: number, timestampMs: number): CursorEvent | null {
        const eyeClosed = ear < this.blinkThreshold;

        if (eyeClosed && !this.lastEyeClosed) {
            const elapsed = timestampMs - this.lastBlinkTime;
            if (elapsed > this.blinkCooldown) {
                this.blinkCount++;
                if (this.blinkCount === 1) this.lastBlinkTime = timestampMs;
                else if (this.blinkCount === 2 && elapsed < this.doubleBlinkWindow) {
                    this.blinkCount = 0;
                    this.lastBlinkTime = 0;
                    this.lastEyeClosed = eyeClosed;
                    return { action: 'double_click', x: this.currentX, y: this.currentY };
                }
            }
        }

        if (!eyeClosed && this.lastEyeClosed) {
            const elapsed = timestampMs - this.lastBlinkTime;
            // Jika mata terbuka setelah satu kedipan pendek
            if (this.blinkCount === 1 && elapsed > 150) {
                this.blinkCount = 0;
                this.lastBlinkTime = 0;
                this.lastEyeClosed = eyeClosed;
                return { action: 'click', x: this.currentX, y: this.currentY };
            }
        }

        this.lastEyeClosed = eyeClosed;
        return null;
    }

    /** * Reset Kalibrasi secara manual 
     */
    public resetCalibration() {
        this.isFaceCalibrated = false;
        this.resetToCenter();
    }
}
