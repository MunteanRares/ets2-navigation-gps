import "leaflet/dist/leaflet.css";
import L from "leaflet";

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.provide("leaflet", L);
});
