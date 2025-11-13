<script lang="ts" setup>
import type { GeojsonData } from "~~/shared/types/GeoJsonTypes/GeojsonData";

const { map, initMap } = useMap();

let markers: L.Marker[] = [];
let routes: L.Polyline[] = [];

const resetMarkers = (map: L.Map) => {
    markers.forEach((marker) => map.removeLayer(marker));
    routes.forEach((route) => map.removeLayer(route));

    markers = [];
    routes = [];
};

const clearMap = () => {
    if (map.value) resetMarkers(map.value);
};

onMounted(async () => {
    const L = (await import("leaflet")).default;

    await initMap("map");

    const res = await fetch("/roadnetwork.geojson");
    const data: GeojsonData = await res.json();

    const graph = new Graph();
    graph.buildGraph(data);
    if (!map.value) return;

    map.value.on("click", (e: L.LeafletMouseEvent) => {
        const clickedKey: string | null = graph.snapToGraph(
            e.latlng.lat,
            e.latlng.lng
        );
        if (!clickedKey) return;

        const node = graph.getNode(clickedKey);
        if (!node) return;

        const marker = L.marker([node.lat, node.lng]).addTo(map.value!);
        markers.push(marker);

        marker.on("click", () => {
            map.value!.removeLayer(marker);
            const index = markers.indexOf(marker);
            markers.splice(index, 1);

            routes.forEach((r) => map.value!.removeLayer(r));
            routes.length = 0;

            for (let i = 1; i < markers.length; i++) {
                const prev = markers[i - 1];
                const curr = markers[i];
                const prevKey = graph.snapToGraph(
                    prev!.getLatLng().lat,
                    prev!.getLatLng().lng
                );
                const currKey = graph.snapToGraph(
                    curr!.getLatLng().lat,
                    curr!.getLatLng().lng
                );
                if (prevKey && currKey) {
                    const coords = graph.dijkstra(prevKey, currKey);
                    const polyline = L.polyline(coords, {
                        color: "cyan",
                        weight: 3,
                    }).addTo(map.value!);
                    routes.push(polyline);
                }
            }
        });

        if (markers?.length && markers.length > 1) {
            const lastKey = graph.snapToGraph(
                markers[markers.length - 2]!.getLatLng().lat,
                markers[markers.length - 2]!.getLatLng().lng
            );
            if (lastKey) {
                const routeCoords: [number, number][] = graph.dijkstra(
                    lastKey,
                    clickedKey
                );
                const polyline = L.polyline(routeCoords, {
                    color: "cyan",
                    weight: 3,
                }).addTo(map.value!);
                routes!.push(polyline);
            }
        }
    });
});
</script>

<template>
    <div id="map-wrapper">
        <div id="map"></div>
        <div id="button-wrapper">
            <input
                type="button"
                value="Clear Markers"
                class="bottom-btn btn"
                @click.stop="clearMap"
            />
        </div>
    </div>
</template>

<style scoped lang="scss">
@use "~/assets/scss/scoped/map";
</style>
