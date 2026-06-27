import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
export class FaceLandmarkerManager {
    static async getInstance() {
        if (this.instance)
            return this.instance;
        // Memuat file WebAssembly (WASM) untuk MediaPipe
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
        // Inisialisasi model Face Mesh yang ringan (dikompilasi ke float16)
        this.instance = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                delegate: "GPU" // Coba GPU, fallback ke CPU otomatis jika tidak didukung
            },
            outputFaceBlendshapes: false, // Matikan fitur ekstra untuk menghemat RAM
            runningMode: "VIDEO",
            numFaces: 1
        });
        return this.instance;
    }
}
FaceLandmarkerManager.instance = null;
