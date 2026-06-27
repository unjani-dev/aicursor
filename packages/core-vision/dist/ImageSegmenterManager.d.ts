import { ImageSegmenter } from "@mediapipe/tasks-vision";
export declare class ImageSegmenterManager {
    private static instance;
    static getInstance(): Promise<ImageSegmenter>;
}
