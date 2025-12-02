<script lang="ts" setup>
import { ref, onMounted, shallowRef } from "vue";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl"; // Ensure this is imported for Types/Markers
import { haversine } from "~/assets/utils/helpers";
import { loadGraph } from "~/assets/utils/clientGraph";
import RBush from "rbush";

interface NodeIndexItem {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    id: number;
    coord: [number, number];
}

const mapEl = ref<HTMLElement | null>(null);
const map = shallowRef<maplibregl.Map | null>(null);

const loading = ref(false);

//// ROUTING STATE
const startNodeId = ref<number | null>(null);
const endNodeId = ref<number | null>(null);
const startMarker = ref<maplibregl.Marker | null>(null);
const endMarker = ref<maplibregl.Marker | null>(null);
const nodeTree = new RBush<NodeIndexItem>();

//// GRAPH DATA
const adjacency = new Map<
    number,
    { to: number; weight: number; roadType: string }[]
>();
const nodeCoords = new Map<number, [number, number]>();

onMounted(async () => {
    if (!mapEl.value) return;

    try {
        map.value = await initializeMap(mapEl.value);

        if (!map.value) return;

        map.value.on("load", visualizeGraph);

        // Listen for clicks to route
        map.value.on("click", handleMapClick);
    } catch (e) {
        console.error(e);
    }
});

//// HANDLE CLICKS
function handleMapClick(e: maplibregl.MapMouseEvent) {
    if (adjacency.size === 0) return;

    const clickedCoords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
    console.log(clickedCoords);

    const nodeId = findClosestNode(clickedCoords);

    if (nodeId === null) {
        console.warn("No nodes found.");
        return;
    }

    const nodeLoc = nodeCoords.get(nodeId);
    if (!nodeLoc) return;

    if (startNodeId.value === null) {
        startNodeId.value = nodeId;

        if (startMarker.value) startMarker.value.remove();
        if (endMarker.value) endMarker.value.remove();
        endNodeId.value = null;
        clearRouteLayer();

        startMarker.value = new maplibregl.Marker({ color: "#00FF00" })
            .setLngLat(nodeLoc as [number, number])
            .addTo(map.value!);
    } else {
        endNodeId.value = nodeId;

        if (endMarker.value) endMarker.value.remove();
        endMarker.value = new maplibregl.Marker({ color: "#FF0000" })
            .setLngLat(nodeLoc as [number, number])
            .addTo(map.value!);

        const path = calculateRoute(startNodeId.value, endNodeId.value);

        if (path) {
            drawRoute(path);
            startNodeId.value = null;
        }
    }
}

function buildNodeIndex(nodes: { id: number; lng: number; lat: number }[]) {
    const items: NodeIndexItem[] = nodes.map((n) => ({
        minX: n.lng,
        minY: n.lat,
        maxX: n.lng,
        maxY: n.lat,
        id: n.id,
        coord: [n.lng, n.lat],
    }));

    nodeTree.load(items);
}

//// FIND NEAREST NODE ON CLICK
function findClosestNode(target: [number, number]): number | null {
    let closestId: number | null = null;
    let minDist = Infinity;

    const radius = 0.5;

    const candidates = nodeTree.search({
        minX: target[0] - radius,
        minY: target[1] - radius,
        maxX: target[0] + radius,
        maxY: target[1] + radius,
    });

    for (const item of candidates) {
        const dist = haversine(target, item.coord);
        if (dist < minDist) {
            minDist = dist;
            closestId = item.id;
        }
    }

    return closestId;
}

function toRad(deg: number) {
    return (deg * Math.PI) / 180;
}

function toDeg(rad: number) {
    return (rad * 180) / Math.PI;
}

function getBearing(start: [number, number], end: [number, number]) {
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

function getSignedAngle(
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

//// DIJKSTRA ALGORITHM + COST
function calculateRoute(start: number, end: number): [number, number][] | null {
    const costs = new Map<number, number>();
    const previous = new Map<number, number>();
    const pq = new Set<number>();

    costs.set(start, 0);
    pq.add(start);

    while (pq.size > 0) {
        let currentId: number | null = null;
        let lowestCost = Infinity;

        for (const id of pq) {
            const c = costs.get(id) ?? Infinity;
            if (c < lowestCost) {
                lowestCost = c;
                currentId = id;
            }
        }

        if (currentId === null) break;
        if (currentId === end) break;

        pq.delete(currentId);

        const neighbors = adjacency.get(currentId) || [];
        const currentCoord = nodeCoords.get(currentId);
        const prevId = previous.get(currentId);
        const prevCoord = prevId !== undefined ? nodeCoords.get(prevId) : null;

        for (const edge of neighbors) {
            const neighborId = edge.to;

            let stepCost = edge.weight || 1;
            const neighborCoord = nodeCoords.get(neighborId);

            if (prevCoord && currentCoord && neighborCoord) {
                const angle = getSignedAngle(
                    prevCoord,
                    currentCoord,
                    neighborCoord
                );
                const absAngle = Math.abs(angle);

                //// 1.MANUAL ROUNDABOUT
                if (edge.roadType === "roundabout") {
                    stepCost *= 0.5;

                    if (angle < -100) {
                        stepCost += 10000;
                    }
                }

                //// 2. GLOBAL SAFETY
                if (absAngle > 100) {
                    stepCost += 1000.0;
                }

                //// 3. WRONG WAY SHORTCUTS
                else if (angle < -100) {
                    stepCost += 1000.0;
                }

                //// 4. HIGHWAY FLOW
                else if (absAngle < 20) {
                    stepCost *= 0.9;
                }

                //// 5. STANDARD TURNS
                else {
                    stepCost += 0.05;
                }
            }

            if (stepCost < 1) stepCost = 1;
            const newTotalCost = lowestCost + stepCost;
            const oldCost = costs.get(neighborId) ?? Infinity;

            if (newTotalCost < oldCost) {
                costs.set(neighborId, newTotalCost);
                previous.set(neighborId, currentId);
                pq.add(neighborId);
            }
        }
    }

    if (!previous.has(end) && start !== end) return null;

    const path: [number, number][] = [];
    let curr: number | undefined = end;
    while (curr !== undefined) {
        const coord = nodeCoords.get(curr);
        if (coord) path.unshift(coord);
        curr = previous.get(curr);
    }

    return path;
}

//// DRAWING THE ROUTE
function drawRoute(coords: [number, number][]) {
    if (!map.value) return;

    const source = map.value.getSource(
        "debug-route"
    ) as maplibregl.GeoJSONSource;
    if (source) {
        source.setData({
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    properties: {},
                    geometry: {
                        type: "LineString",
                        coordinates: coords,
                    },
                },
            ],
        });
    }
}

//// CLEARS CURRENT ROUTE ON CLICKING AFTER SUCCESSFUL ROUTE
function clearRouteLayer() {
    if (!map.value) return;
    const source = map.value.getSource(
        "debug-route"
    ) as maplibregl.GeoJSONSource;
    if (source) {
        source.setData({ type: "FeatureCollection", features: [] });
    }
}

//// GRAPH DRAWING
async function visualizeGraph() {
    if (!map.value) return;
    loading.value = true;

    try {
        const { nodes, edges } = await loadGraph();
        adjacency.clear();
        nodeCoords.clear();

        const spatialIndex = new Map<string, number>();
        const idRedirect = new Map<number, number>();
        const uniqueNodes: any[] = [];

        for (const node of nodes) {
            const key = `${node.lat.toFixed(5)},${node.lng.toFixed(5)}`;

            if (spatialIndex.has(key)) {
                const masterId = spatialIndex.get(key)!;
                idRedirect.set(node.id, masterId);
            } else {
                spatialIndex.set(key, node.id);
                idRedirect.set(node.id, node.id);
                nodeCoords.set(node.id, [node.lng, node.lat]);
                adjacency.set(node.id, []);
                uniqueNodes.push(node);
            }
        }

        //// CREATING BBOX FOR NODES (FASTER SEARCH)
        buildNodeIndex(uniqueNodes);

        //// BUILD EDGES
        const edgeFeatures: any[] = [];
        let connectedCount = 0;

        for (const edge of edges) {
            const u = idRedirect.get(edge.from);
            const v = idRedirect.get(edge.to);

            if (u === undefined || v === undefined || u === v) continue;

            const start = nodeCoords.get(u);
            const end = nodeCoords.get(v);

            if (start && end) {
                const rType = edge.properties?.roadType || "local";
                adjacency
                    .get(u)
                    ?.push({ to: v, weight: edge.weight, roadType: rType });
                connectedCount++;

                //// UNCOMMENT THIS ONLY WHEN DEBUGGING EDGES.
                // edgeFeatures.push({
                //     type: "Feature",
                //     geometry: { type: "LineString", coordinates: [start, end] },
                //     properties: {
                //         weight: edge.weight,
                //         color:
                //             edge.properties?.roadType === "freeway"
                //                 ? "#ff00ff"
                //                 : "#00ff00",
                //     },
                // });
            }
        }

        if (!map.value.getSource("debug-route")) {
            map.value.addSource("debug-route", {
                type: "geojson",
                data: { type: "FeatureCollection", features: [] },
            });
            map.value.addLayer({
                id: "debug-route-line",
                type: "line",
                source: "debug-route",
                layout: { "line-join": "round", "line-cap": "round" },
                paint: {
                    "line-color": "#FFD700",
                    "line-width": 6,
                    "line-opacity": 0.9,
                },
            });
        }

        //// UNCOMMENT THIS ONLY WHEN DEBUGGING EDGES.
        // if (!map.value.getSource("debug-edges")) {
        //     map.value.addSource("debug-edges", {
        //         type: "geojson",
        //         data: { type: "FeatureCollection", features: edgeFeatures },
        //     });
        //     map.value.addLayer({
        //         id: "debug-edges-lines",
        //         type: "line",
        //         source: "debug-edges",
        //         layout: { "line-join": "round", "line-cap": "round" },
        //         paint: {
        //             "line-color": ["get", "color"],
        //             "line-width": 1.5,
        //             "line-opacity": 0.4,
        //         },
        //     });
        //     if (!map.value.getLayer("debug-edges-arrows")) {
        //         map.value.addLayer({
        //             id: "debug-edges-arrows",
        //             type: "symbol",
        //             source: "debug-edges",
        //             minzoom: 9,
        //             layout: {
        //                 "symbol-placement": "line",
        //                 "symbol-spacing": 50,
        //                 "text-field": "▶",
        //                 "text-size": 18,
        //                 "text-keep-upright": false,
        //                 "text-allow-overlap": true,
        //             },
        //             paint: {
        //                 "text-color": "#ffffff",
        //                 "text-halo-color": "#000000",
        //                 "text-halo-width": 2,
        //             },
        //         });
        //     }
        // }

        loading.value = false;
    } catch (err) {
        console.error("Error loading graph:", err);
    }
}
</script>

<template>
    <div ref="mapEl" class="map-container"></div>
    <div class="legend">
        <div class="item"><span class="color road"></span> Road Graph</div>
        <div class="item">
            <span class="color snap"></span> Auto-Stitch (Gap Fix)
        </div>
        <div class="item"><span class="color route"></span> Route</div>
    </div>
</template>

<style scoped>
.map-container {
    width: 100%;
    height: 100vh;
    background-color: #272d39;
}
</style>
