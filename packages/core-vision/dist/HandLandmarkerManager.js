import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
export class HandLandmarkerManager {
    static async getInstance() {
        if (this.instance)
            return this.instance;
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
        this.instance = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
        });
        return this.instance;
    }
}
HandLandmarkerManager.instance = null;
