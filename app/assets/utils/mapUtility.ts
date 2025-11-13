const ETS2_BOUNDS = {
    xMin: -72000,
    xMax: 52000,
    zMin: -56000,
    zMax: 56000,
};

export function ets2ToLeaflet(x: number, z: number): [number, number] {
    const mapX =
        -256 * ((x - ETS2_BOUNDS.xMin) / (ETS2_BOUNDS.xMax - ETS2_BOUNDS.xMin));
    const mapY =
        256 * ((z - ETS2_BOUNDS.zMin) / (ETS2_BOUNDS.zMax - ETS2_BOUNDS.zMin));
    return [mapY, mapX];
}
