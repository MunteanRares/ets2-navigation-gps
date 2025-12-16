<script lang="ts" setup>
const props = defineProps<{ hasInGameMarker: boolean; hasMarker: boolean }>();

const isExpanded = ref(false);

watch(
    () => props.hasMarker,
    (newValue) => {
        if (newValue === true) {
            isExpanded.value = false;
        }
    }
);

const onToggleExpanded = () => {
    isExpanded.value = !isExpanded.value;
};
</script>

<template>
    <Transition name="compact-slide">
        <div
            v-if="hasInGameMarker && !hasMarker"
            class="compact-trip-progress"
            :class="{ expanded: isExpanded }"
            v-on:click="onToggleExpanded"
        >
            <Icon
                :name="isExpanded ? 'bxs:chevron-right' : 'bxs:chevron-left'"
                size="22"
            />
            <div class="warning-message">
                <Icon name="ant-design:warning-filled" size="22" />

                <div class="text-content">
                    <span class="text-nowrap"
                        >External Route Detected: Set Waypoint</span
                    >
                </div>
            </div>
        </div>
    </Transition>
</template>

<style lang="scss" scoped src="~/assets/scss/scoped/warningSlide.scss"></style>
