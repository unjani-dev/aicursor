import { Point3D } from './geometry';
export interface GestureConfig {
    blinkThreshold: number;
    doubleBlinkWindowMs: number;
    mouthOpenThreshold: number;
    nodVelocityThreshold: number;
    handPinchThreshold: number;
    doublePinchWindowMs: number;
}
export type GestureCallback = (action: 'move' | 'click' | 'drag_start' | 'drag_end' | 'enter', data?: any) => void;
export declare class GestureEngine {
    private config;
    private onGesture;
    private previousPitch;
    private nodTimestamps;
    private isDragging;
    private isBlinking;
    private isPinching;
    private lastBlinkTimestamp;
    private lastPinchTimestamp;
    constructor(onGesture: GestureCallback, config?: Partial<GestureConfig>);
    processFaceFrame(landmarks: Point3D[], timestampMs: number): void;
    processHandFrame(landmarks: Point3D[], timestampMs: number): void;
    resetInteractionState(): void;
    private detectNod;
    private detectDoubleBlink;
    private detectDoublePinch;
}
