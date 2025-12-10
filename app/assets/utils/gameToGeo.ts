import proj4 from "proj4";

const EARTH_RADIUS = 6370997;
const DEG_LEN = (EARTH_RADIUS * Math.PI) / 180;
const PROJ_DEF = "+proj=lcc +lat_1=37 +lat_2=65 +lat_0=50 +lon_0=15 +R=6370997";
const MAP_OFFSET = [16660, 4150] as const;
const MAP_FACTOR = [-0.000171570875, 0.0001729241463] as const;

const converter = proj4(PROJ_DEF);

export function convertGameToGeo(
    gameX: number,
    gameZ: number
): [number, number] {
    let x = gameX - MAP_OFFSET[0];
    let y = gameZ - MAP_OFFSET[1];

    const ukScale = 0.75;
    const calaisBound = [-31100, -5500] as const;

    if (x * ukScale < calaisBound[0] && y * ukScale < calaisBound[1]) {
        x = (x + calaisBound[0] / 2) * ukScale;
        y = (y + calaisBound[1] / 2) * ukScale;
    }

    const projectedX = x * MAP_FACTOR[1] * DEG_LEN;
    const projectedY = y * MAP_FACTOR[0] * DEG_LEN;

    const result = converter.inverse([projectedX, projectedY]);

    return result as [number, number];
}

// ADD THIS ONE (Geo -> Game)
export function convertGeoToGame(lng: number, lat: number): [number, number] {
    const projected = converter.forward([lng, lat]);
    const projX = projected[0]!;
    const projY = projected[1]!;

    let x = projX / (MAP_FACTOR[1] * DEG_LEN);
    let y = projY / (MAP_FACTOR[0] * DEG_LEN);

    const gameX = x + MAP_OFFSET[0];
    const gameY = y + MAP_OFFSET[1];

    return [gameX, gameY];
}
