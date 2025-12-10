export function toRad(deg: number) {
    return (deg * Math.PI) / 180;
}

export function toDeg(rad: number) {
    return (rad * 180) / Math.PI;
}

export function getBearing(start: [number, number], end: [number, number]) {
    const startLat = toRad(start[1]);
    const startLng = toRad(start[0]);
    const endLat = toRad(end[1]);
    const endLng = toRad(end[0]);
    const y = Math.sin(endLng - startLng) * Math.cos(endLat);
    const x =
        Math.cos(startLat) * Math.sin(endLat) -
        Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
    const brng = toDeg(Math.atan2(y, x));
    return (brng + 360) % 360;
}

export function getSignedAngle(
    p1: [number, number],
    p2: [number, number],
    p3: [number, number]
) {
    const b1 = getBearing(p1, p2);
    const b2 = getBearing(p2, p3);
    let diff = b2 - b1;
    while (diff <= -180) diff += 360;
    while (diff > 180) diff -= 360;
    return diff;
}

export function getAngleDiff(angle1: number, angle2: number): number {
    const diff = Math.abs(angle1 - angle2) % 360;
    return diff > 180 ? 360 - diff : diff;
}
