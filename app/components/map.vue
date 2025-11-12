<script lang="ts" setup>
import { TILESET_MAX_ZOOM } from "~~/shared/variables";
const nuxtApp = useNuxtApp();

onMounted(() => {
    const map = nuxtApp.$leaflet.map("map", {
        crs: nuxtApp.$leaflet.CRS.Simple,
        minZoom: 3,
        maxZoom: TILESET_MAX_ZOOM,
        zoomSnap: 0.5,
        zoomDelta: 0.5,
    });

    map.setView([900, 0], 0);
});
</script>

<template>
    <div id="map"></div>
</template>

<style scoped lang="scss">
@use "~/assets/scss/scoped/map";
</style>
