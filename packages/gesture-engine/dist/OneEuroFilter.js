// packages/gesture-engine/src/OneEuroFilter.ts
export class OneEuroFilter {
    /**
     * @param minCutoff - Decreasing this reduces low-speed jitter.
     * @param beta - Increasing this reduces high-speed lag.
     */
    constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
        this.xPrev = null;
        this.dxPrev = 0;
        this.tPrev = null;
        this.minCutoff = minCutoff;
        this.beta = beta;
        this.dCutoff = dCutoff;
    }
    alpha(cutoff, dt) {
        const tau = 1.0 / (2 * Math.PI * cutoff);
        return 1.0 / (1.0 + tau / dt);
    }
    filter(x, timestamp) {
        if (this.xPrev === null || this.tPrev === null) {
            this.xPrev = x;
            this.tPrev = timestamp;
            return x;
        }
        const dt = (timestamp - this.tPrev) / 1000.0; // convert to seconds
        if (dt <= 0)
            return x;
        // Calculate velocity (dx)
        const dx = (x - this.xPrev) / dt;
        // Smooth velocity
        const edx = this.alpha(this.dCutoff, dt) * dx + (1 - this.alpha(this.dCutoff, dt)) * this.dxPrev;
        this.dxPrev = edx;
        // Calculate dynamic cutoff
        const cutoff = this.minCutoff + this.beta * Math.abs(edx);
        // Calculate smoothed value
        const smoothedX = this.alpha(cutoff, dt) * x + (1 - this.alpha(cutoff, dt)) * this.xPrev;
        this.xPrev = smoothedX;
        this.tPrev = timestamp;
        return smoothedX;
    }
}
