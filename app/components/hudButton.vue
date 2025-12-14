<script lang="ts" setup>
defineProps<{ lockCamera: () => void; iconName: string }>();
</script>

<template>
    <button class="option-btn center-btn" @click.prevent="lockCamera">
        <Icon :name="iconName" size="24" />
    </button>
</template>

<style lang="scss" scoped>
@use "~/assets/scss/scoped/hudButton.scss";
</style>
