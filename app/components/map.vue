<script lang="ts" setup>
import { latLng } from "leaflet";
import { ets2ToLeaflet } from "~/assets/utils/mapUtility";
import type { GeojsonData } from "~~/shared/types/GeoJsonTypes/GeojsonData";
import type { TelemetryData } from "~~/shared/types/Telemetry/TelemetryData";

const { map, initMap } = useMap();
const telemetry = ref<TelemetryData | null>(null);

let truckMarker: L.Marker | null = null;
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
    await import("leaflet-rotatedmarker");

    // Initiating map with tiles and stuff from composable useMap()
    await initMap("map");

    // Read Geojson data
    const res = await fetch("/roadnetwork.geojson");
    const data: GeojsonData = await res.json();

    // Transofmr geojson to Graph for markers and routes
    const graph = new Graph();
    graph.buildGraph(data);

    if (!map.value) return;

    // Handle clicks on map
    map.value.on("click", (e: L.LeafletMouseEvent) => {
        const clickedKey: string | null = graph.snapToGraph(
            e.latlng.lat,
            e.latlng.lng
        );
        console.log(e.latlng.lat, e.latlng.lng);
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

    // Fetch from api/telemetry
    const fetchTelemetry = async () => {
        const res = await $fetch<TelemetryData>("/api/telemetry");
        telemetry.value = res;
        console.log("Telemetry updated:", telemetry.value);

        // // Get Truck Data
        // const truckData = telemetry.value!.truck;
        // const lat = truckData.placement.z;
        // const lng = truckData.placement.x;
        // const [latSimple, lngSimple] = ets2ToLeaflet(lat, lng);
        // const headingRad = truckData.placement.heading;
        // const headingDeg = headingRad * (180 / Math.PI);

        // console.log(truckData);

        // const truckIcon = L.icon({
        //     iconUrl: "/truckMarker.png",
        //     iconSize: [40, 40],
        //     iconAnchor: [20, 20],
        // });

        // if (!truckMarker) {
        //     truckMarker = L.marker([latSimple!, lngSimple!], {
        //         icon: truckIcon,
        //         rotationAngle: headingDeg,
        //         rotationOrigin: "center center",
        //     }).addTo(map.value!);
        // } else {
        //     truckMarker.setLatLng([latSimple!, lngSimple!]);
        //     truckMarker.setRotationAngle(headingDeg);
        // }

        // console.log("Truck in CRS.Simple:", [latSimple!, lngSimple!]);
    };

    fetchTelemetry();
    setInterval(fetchTelemetry, 1000);

    console.log(telemetry.value);
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
