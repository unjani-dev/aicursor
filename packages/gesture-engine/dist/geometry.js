/**
 * Calculates the Euclidean distance between two 3D points.
 */
export function distance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) +
        Math.pow(p1.y - p2.y, 2) +
        Math.pow(p1.z - p2.z, 2));
}
/**
 * Calculates Eye Aspect Ratio (EAR) for blink detection.
 * Expects 6 landmarks outlining the eye.
 */
export function calculateEAR(eyeLandmarks) {
    if (eyeLandmarks.length !== 6)
        throw new Error("EAR requires exactly 6 landmarks");
    // Vertical distances
    const v1 = distance(eyeLandmarks[1], eyeLandmarks[5]);
    const v2 = distance(eyeLandmarks[2], eyeLandmarks[4]);
    // Horizontal distance
    const h = distance(eyeLandmarks[0], eyeLandmarks[3]);
    return (v1 + v2) / (2.0 * h);
}
/**
 * Calculates Mouth Aspect Ratio (MAR) for open mouth detection.
 * Expects landmarks for top, bottom, and corners of the inner lip.
 */
export function calculateMAR(mouthLandmarks) {
    const vertical = distance(mouthLandmarks[1], mouthLandmarks[3]); // Top to bottom inner lip
    const horizontal = distance(mouthLandmarks[0], mouthLandmarks[2]); // Left to right corner
    return vertical / horizontal;
}
/**
 * Simplistic Pitch/Yaw calculation based on nose tip relative to eyes.
 * Returns normalized values between -1.0 and 1.0.
 */
export function calculateHeadPose(nose, leftEye, rightEye) {
    const midEyeX = (leftEye.x + rightEye.x) / 2;
    const midEyeY = (leftEye.y + rightEye.y) / 2;
    // Calculate deviation from center (assuming face is looking straight when nose aligns with midEye)
    // Note: These scalars require tuning based on camera FOV in production.
    const yaw = (nose.x - midEyeX) * 10;
    const pitch = (nose.y - midEyeY) * 10;
    return { pitch, yaw };
}
