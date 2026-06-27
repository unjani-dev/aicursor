import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";

export class ImageSegmenterManager {
    private static instance: ImageSegmenter | null = null;

    public static async getInstance(): Promise<ImageSegmenter> {
        if (this.instance) return this.instance;

        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        this.instance = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite",
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            outputCategoryMask: true,
            outputConfidenceMasks: true
        });

        return this.instance;
    }
}
