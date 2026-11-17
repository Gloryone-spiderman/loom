<script setup lang="ts">
  import type { CanvasNode} from "../types/topology";

  defineProps<{ node: CanvasNode | null }>();
  const emit = defineEmits<{
    "rename-node": [label: string];
  }>();

  function onLabelInput(event: Event) {
    const input = event.target as HTMLInputElement;
    emit("rename-node", input.value);
  }
</script>
<template>
  <aside class="property-inspector">
    <header class="inspector-header">
      <h2>属性</h2>
    </header>
    <div v-if="node">
      <p>编号：{{ node.id }}</p>
      <label>
        名称
        <input type="text" :value="node.label" @input="onLabelInput" />
      </label>
    </div>
    <p v-else>未选中节点</p>
  </aside>
</template>
