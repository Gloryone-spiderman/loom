<script setup lang="ts">
import PropertyInspector from "./components/PropertyInspector.vue";
import TopologyCanvas from "./components/TopologyCanvas.vue";
</script>

<template>
  <div class="app-shell">
    <header class="app-toolbar">
      <h1>自由画布</h1>
    </header>

    <div class="editor-workspace">
      <TopologyCanvas />
      <PropertyInspector />
    </div>
  </div>
</template>
