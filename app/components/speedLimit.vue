<script lang="ts" setup>
defineProps<{
    truckSpeed: number;
    speedLimit: number;
    variant: "sheet" | "bottom";
}>();
</script>

<template>
    <div
        v-if="speedLimit !== 0"
        class="speed-limit-circle"
        :class="`speed-limit-circle-${variant}`"
    >
        <Transition name="over-limit">
            <div
                v-if="truckSpeed > speedLimit + 5"
                class="speed-limit-circle-over-limit"
            >
                <div class="over-limit">{{ truckSpeed }}</div>
            </div>
        </Transition>
        <div class="speed-limit">
            {{ speedLimit }}
        </div>
    </div>
</template>

<style lang="scss" scoped>
@use "~/assets/scss/scoped/speedLimit.scss";
</style>
