import { HandLandmarker } from "@mediapipe/tasks-vision";
export declare class HandLandmarkerManager {
    private static instance;
    static getInstance(): Promise<HandLandmarker>;
}
