export declare class OneEuroFilter {
    private minCutoff;
    private beta;
    private dCutoff;
    private xPrev;
    private dxPrev;
    private tPrev;
    /**
     * @param minCutoff - Decreasing this reduces low-speed jitter.
     * @param beta - Increasing this reduces high-speed lag.
     */
    constructor(minCutoff?: number, beta?: number, dCutoff?: number);
    private alpha;
    filter(x: number, timestamp: number): number;
}
