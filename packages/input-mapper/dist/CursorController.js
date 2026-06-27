import { OneEuroFilter } from '@ai-cursor/gesture-engine';
export class CursorController {
    constructor(bounds) {
        // ==============================
        // CALIBRATION STATES
        // ==============================
        this.isFaceCalibrated = false;
        this.centerYaw = 0;
        this.centerPitch = 0;
        // ==============================
        // ANTI-DRIFT CONFIG (Face Focused)
        // ==============================
        this.faceSpeed = 320.0;
        /** * DEADZONE ditingkatkan ke 0.05
         * Ini mengunci kursor agar diam mutlak saat wajah lurus
         */
        this.deadzone = 0.05;
        // ==============================
        // CLICK & BLINK STATES
        // ==============================
        this.blinkThreshold = 0.21;
        this.blinkCooldown = 150;
        this.doubleBlinkWindow = 350;
        this.lastBlinkTime = 0;
        this.lastEyeClosed = false;
        this.blinkCount = 0;
        this.bounds = bounds;
        // Mulai di tengah layar
        this.currentX = this.bounds.width / 2;
        this.currentY = this.bounds.height / 2;
        this.initFilters();
    }
    initFilters() {
        /** * Parameter 1 Euro Filter diperkuat (0.8, 0.001)
         * Menghilangkan jitter (getaran) tanpa menambah delay
         */
        this.filterX = new OneEuroFilter(0.8, 0.001);
        this.filterY = new OneEuroFilter(0.8, 0.001);
    }
    resetToCenter() {
        this.currentX = this.bounds.width / 2;
        this.currentY = this.bounds.height / 2;
        this.initFilters();
        this.isFaceCalibrated = false;
        console.log("OS Sync: System Centered. Re-calibrating...");
    }
    updateBounds(newBounds) {
        this.bounds = newBounds;
    }
    /**
     * HANDLE: ABSOLUTE POINTER MOVEMENT
     * Dipakai untuk telunjuk/tangan: koordinat MediaPipe (0..1) langsung
     * dipetakan ke layar, lalu tetap dihaluskan dengan 1 Euro Filter.
     */
    applyPointerPosition(normalizedX, normalizedY, timestampMs, options = {}) {
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
    applyMovement(yaw, pitch, timestampMs) {
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
    processRelativeMovement(dX, dY, speed, timestampMs) {
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
    detectBlink(ear, timestampMs) {
        const eyeClosed = ear < this.blinkThreshold;
        if (eyeClosed && !this.lastEyeClosed) {
            const elapsed = timestampMs - this.lastBlinkTime;
            if (elapsed > this.blinkCooldown) {
                this.blinkCount++;
                if (this.blinkCount === 1)
                    this.lastBlinkTime = timestampMs;
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
    resetCalibration() {
        this.isFaceCalibrated = false;
        this.resetToCenter();
    }
}
