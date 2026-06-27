import { FaceLandmarker } from "@mediapipe/tasks-vision";
export declare class FaceLandmarkerManager {
    private static instance;
    static getInstance(): Promise<FaceLandmarker>;
}
