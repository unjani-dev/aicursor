export interface Point3D {
    x: number;
    y: number;
    z: number;
}
/**
 * Calculates the Euclidean distance between two 3D points.
 */
export declare function distance(p1: Point3D, p2: Point3D): number;
/**
 * Calculates Eye Aspect Ratio (EAR) for blink detection.
 * Expects 6 landmarks outlining the eye.
 */
export declare function calculateEAR(eyeLandmarks: Point3D[]): number;
/**
 * Calculates Mouth Aspect Ratio (MAR) for open mouth detection.
 * Expects landmarks for top, bottom, and corners of the inner lip.
 */
export declare function calculateMAR(mouthLandmarks: Point3D[]): number;
/**
 * Simplistic Pitch/Yaw calculation based on nose tip relative to eyes.
 * Returns normalized values between -1.0 and 1.0.
 */
export declare function calculateHeadPose(nose: Point3D, leftEye: Point3D, rightEye: Point3D): {
    pitch: number;
    yaw: number;
};
