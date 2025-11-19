import type { Map as MapLibreGl, StyleSpecification } from "maplibre-gl";
import { haversine } from "~/assets/utils/helpers";
import type { Node, Edge, Coord } from "~~/shared/types/geojson/geojson";
import { loadGraph } from "~/assets/utils/clientGraph";

export async function initializeMap(
    container: HTMLElement
): Promise<MapLibreGl> {
    const maplibregl = (await import("maplibre-gl")).default;
    const { Protocol, PMTiles } = await import("pmtiles");

    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);

    const PMTILES_URL = "/ets2.pmtiles";
    const pmtiles = new PMTiles(PMTILES_URL);
    protocol.add(pmtiles);

    const style: StyleSpecification = {
        version: 8,

        name: "ETS2 PMTiles (local)",
        sources: {
            ets2: {
                type: "vector",

                url: `pmtiles://${PMTILES_URL}`,
            },
        },

        layers: [
            {
                id: "background",
                type: "background",
                paint: { "background-color": "#272d39" },
            },
            {
                id: "ets2-lines",
                type: "line",
                source: "ets2",
                "source-layer": "ets2",
                paint: {
                    "line-color": "#3d546e",
                    "line-width": 2,
                },
            },
        ],
    };

    const map = new maplibregl.Map({
        container,
        style,
        center: [10, 50],
        zoom: 4,
        minZoom: 5,
        maxZoom: 11,
    });

    map.on("load", async () => {
        // ADDING WATER BORDERS
        map.addSource("ets2-water", {
            type: "geojson",
            data: "geojson/ets2-water.geojson",
        });

        // OUTLINE
        map.addLayer({
            id: "ets2-water-outline",
            type: "line",
            source: "ets2-water",
            paint: {
                "line-color": "#1e3a5f",
                "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    5,
                    7, // Zoomed out value
                    10,
                    4, // Zoomed in value
                ],
                "line-opacity": 0.6,
            },
        });

        // WATER
        map.addLayer({
            id: "ets2-water",
            type: "fill",
            source: "ets2-water",
            paint: {
                "fill-color": "#24467b",
                "fill-opacity": 0.6,
            },
        });

        // ROAD CASING (dark outline for depth)
        map.addLayer({
            id: "ets2-road-casing",
            type: "line",
            source: "ets2",
            "source-layer": "ets2",
            filter: ["==", ["get", "type"], "road"],
            paint: {
                "line-color": "#1a1f2a",
                "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    5,
                    1,
                    8,
                    3,
                    12,
                    10,
                    16,
                    16,
                ],
                "line-opacity": 0.9,
            },
        });

        // THICK ROADS
        map.addLayer({
            id: "ets2-roads",
            type: "line",
            source: "ets2",
            "source-layer": "ets2",
            filter: ["==", ["get", "type"], "road"],
            paint: {
                "line-color": "#4a5f7a",
                "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    5,
                    0.5, //
                    8,
                    2, //
                    10,
                    7, //
                    14,
                    30, //
                ],
                "line-opacity": 1,
            },
        });

        // POLYGONS FOR PARKING ETC
        map.addLayer(
            {
                id: "maparea-zones",
                type: "fill",
                source: "ets2",
                "source-layer": "ets2",
                filter: ["==", ["get", "type"], "mapArea"],
                paint: {
                    "fill-color": [
                        "match",
                        ["get", "color"],
                        0,
                        "#3d546e",
                        1,
                        "#4a5f7a",
                        2,
                        "#556b7f",
                        3,
                        "#6b7f93",
                        4,
                        "#7d93a7",
                        "#3d546e",
                    ],
                    "fill-opacity": 0.5,
                },
            },
            "ets2-lines"
        );

        // FOOTPRINTS (BUILDINGS AND STUFF)
        map.addSource("ets2-footprints", {
            type: "vector",
            url: "pmtiles://ets2-footprints.pmtiles",
        });

        map.addLayer({
            id: "footprints-fill",
            type: "fill",
            source: "ets2-footprints",
            "source-layer": "footprints",
            paint: {
                "fill-color": "#2e3f52",
                "fill-opacity": 0.4,
            },
        });

        // VILLAGE LABELS
        map.addSource("ets2-villages", {
            type: "geojson",
            data: "/geojson/ets2-villages.geojson",
        });

        map.addLayer({
            id: "village-labels",
            type: "symbol",
            source: "ets2-villages",
            layout: {
                "text-field": ["get", "name"],
                "text-font": ["Quicksand medium"],
                "text-size": 13,
                "text-anchor": "center",
                "text-offset": [0, 0],
            },
            paint: {
                "text-color": "#ffffff",
            },
            minzoom: 7,
        });

        // CITY LABELS
        map.addLayer({
            id: "city-labels",
            type: "symbol",
            source: "ets2",
            "source-layer": "ets2",
            filter: ["==", ["get", "type"], "city"],
            layout: {
                "text-field": ["get", "name"],
                "text-font": ["Quicksand medium"],
                "text-size": 15,
                "text-anchor": "center",
            },
            paint: {
                "text-color": "#ffffff",
            },
            minzoom: 6,
        });

        // CAPITAL POINTS
        map.addLayer({
            id: "capital-major-labels",
            type: "symbol",
            filter: ["==", ["get", "capital"], 2],
            source: "ets2",
            "source-layer": "ets2",
            layout: {
                "text-field": ["get", "name"],
                "text-size": 18,
                "text-font": ["Quicksand medium"],
                "text-anchor": "center",
            },
            paint: {
                "text-color": "#ffffff",
            },
            minzoom: 4,
        });

        // COUNTRY DELIMITATION
        map.addSource("country-borders", {
            type: "geojson",
            data: "geojson/ets2-countries.geojson",
        });

        map.addLayer({
            id: "country-borders",
            type: "line",
            source: "country-borders",
            paint: {
                "line-color": "#3d546e",
                "line-width": 5,
                "line-blur": 2,
                "line-opacity": 0.4,
            },
        });

        map.addSource("route", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
        });

        map.addLayer({
            id: "route-layer",
            type: "line",
            source: "route",
            paint: {
                "line-color": "blue",
                "line-width": 10,
            },
        });

        const { nodes, edges } = await loadGraph();

        const adj: Map<
            number,
            { to: number; weight: number; geometry: Coord[] }[]
        > = new Map();
        edges.forEach((e) => {
            if (!adj.has(e.from)) adj.set(e.from, []);
            // Add 'geometry' here
            adj.get(e.from)!.push({
                to: e.to,
                weight: e.weight,
                geometry: e.geometry!, // <--- Pass this through
            });
        });

        let startNode: Node | null = null;
        let endNode: Node | null = null;

        function findNearestNode(coord: Coord): Node {
            let best: Node = nodes[0]!;
            let bestDist = Infinity;
            for (const n of nodes) {
                const d = haversine(coord, [n.lng, n.lat]);
                if (d < bestDist) {
                    bestDist = d;
                    best = n;
                }
            }
            return best;
        }

        function dijkstra(
            start: number,
            end: number,
            adj: Map<number, { to: number; weight: number }[]>
        ): number[] | null {
            const dist = new Map<number, number>();
            const prev = new Map<number, number | null>();
            const visited = new Set<number>();
            const pq: { node: number; cost: number }[] = [];

            dist.set(start, 0);
            pq.push({ node: start, cost: 0 });

            while (pq.length > 0) {
                // Get node with smallest cost
                pq.sort((a, b) => a.cost - b.cost);
                const { node: u } = pq.shift()!;

                if (visited.has(u)) continue;
                visited.add(u);

                if (u === end) break;

                const neighbors = adj.get(u) || [];
                for (const { to: v, weight } of neighbors) {
                    if (visited.has(v)) continue;
                    const alt = (dist.get(u) ?? Infinity) + weight;
                    if (alt < (dist.get(v) ?? Infinity)) {
                        dist.set(v, alt);
                        prev.set(v, u);
                        pq.push({ node: v, cost: alt });
                    }
                }
            }

            // Reconstruct path
            const path: number[] = [];
            let u: number | null | undefined = end;
            while (u !== null && u !== undefined) {
                path.unshift(u);
                u = prev.get(u) ?? null;
            }

            if (path[0] !== start) return null; // no path
            return path;
        }

        map.on("click", (e) => {
            const clickCoord: Coord = [e.lngLat.lng, e.lngLat.lat];
            const nearest = findNearestNode(clickCoord);

            if (!startNode) {
                startNode = nearest;
                console.log("Start node selected:", nearest.id);
            } else {
                endNode = nearest;
                console.log("End node selected:", nearest.id);

                // 1. Get the list of Node IDs from Dijkstra
                const pathIds = dijkstra(startNode.id, endNode.id, adj);

                if (pathIds && pathIds.length > 0) {
                    const detailedCoordinates: number[][] = [];

                    // Helper to find the edge object between two nodes
                    function getEdge(u: number, v: number) {
                        // You need access to your 'edges' array here
                        // Or a lookup map like: edgeMap.get(`${u}-${v}`)
                        return edges.find((e) => e.from === u && e.to === v);
                    }

                    for (let i = 0; i < pathIds.length - 1; i++) {
                        const u = pathIds[i]!;
                        const v = pathIds[i + 1]!;

                        const edge = getEdge(u, v);

                        if (edge && edge.geometry) {
                            // 1. If we have previous coordinates, check for a gap
                            if (detailedCoordinates.length > 0) {
                                const lastPoint =
                                    detailedCoordinates[
                                        detailedCoordinates.length - 1
                                    ]!;
                                const nextPoint = edge.geometry[0]!;

                                // Check distance (optional, but good for debugging)
                                // If distance is > 0, we simply draw a line between them.
                                // This "Stitches" the prefab gap.
                                if (
                                    lastPoint[0] !== nextPoint[0] ||
                                    lastPoint[1] !== nextPoint[1]
                                ) {
                                    // The gap exists here! The line will be drawn automatically
                                    // because we are adding points to the same LineString array.
                                }
                            }

                            // 2. Add the road geometry
                            detailedCoordinates.push(...edge.geometry);
                        } else {
                            // Fallback for edges without geometry (straight line)
                            const n1 = nodes[u]!;
                            const n2 = nodes[v]!;
                            detailedCoordinates.push([n1.lng, n1.lat]);
                            detailedCoordinates.push([n2.lng, n2.lat]);
                        }
                    }

                    // Draw the stitched route
                    const routeGeojson = {
                        type: "FeatureCollection",
                        features: [
                            {
                                type: "Feature",
                                geometry: {
                                    type: "LineString",
                                    coordinates: detailedCoordinates,
                                },
                                properties: {},
                            },
                        ],
                    };

                    // Update map source...
                    (map.getSource("route") as any).setData(routeGeojson);
                }
            }
        });

        map.addControl(new maplibregl.NavigationControl());
        map.addControl(new maplibregl.FullscreenControl());
    });

    return map;
}
