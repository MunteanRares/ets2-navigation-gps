<script lang="ts" setup>
defineProps<{ progress: number }>();
</script>

<template>
    <div class="loading-screen">
        <div class="progress-text">{{ progress }}%</div>
        <div class="progress-bar-bg">
            <div
                class="progress-bar-fill"
                :style="{ width: progress + '%' }"
            ></div>
        </div>
        <h2>Loading Route Data...</h2>
    </div>
</template>

<style lang="scss" scoped src="~/assets/scss/scoped/loadingScreen.scss"></style>
