import type { Coord } from "~~/shared/types";

export function haversine(a: Coord, b: Coord): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b[1] - a[1]);
    const dLon = toRad(b[0] - a[0]);
    const lat1 = toRad(a[1]);
    const lat2 = toRad(b[1]);

    const sin1 = Math.sin(dLat / 2);
    const sin2 = Math.sin(dLon / 2);
    const h = sin1 * sin1 + Math.cos(lat1) * Math.cos(lat2) * sin2 * sin2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

export function convertTelemtryTime(time: string) {
    const date = new Date(time);
    return {
        formatted: `${date.getUTCHours().toString().padStart(2, "0")}:${date
            .getUTCMinutes()
            .toString()
            .padStart(2, "0")}`,
        raw: date,
    };
}
