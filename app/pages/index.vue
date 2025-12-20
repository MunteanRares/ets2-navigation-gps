<script lang="ts" setup>
const { isElectron, isMobile, isWeb } = usePlatform();

const currentView = ref<string>("");

onMounted(() => {
    if (isWeb.value || isMobile.value) {
        currentView.value = "map";
    } else if (isElectron) {
        currentView.value = "home";
    }
});

const launchMap = () => {
    currentView.value = "map";
};

const goHome = () => {
    currentView.value = "home";
};
</script>

<template>
    <DesktopIndex v-if="currentView === 'home'" :launch-map="launchMap" />
    <LazyMap v-if="currentView === 'map'" :goHome="goHome" />
</template>
