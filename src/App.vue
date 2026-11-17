<script setup lang="ts">
  import { ref, computed } from "vue";
  import type { ActionLog, ActionType, CanvasNode } from "./types/topology.ts";

  import PropertyInspector from "./components/PropertyInspector.vue";
  import TopologyCanvas from "./components/TopologyCanvas.vue";

  const nodes = ref<CanvasNode[]>([]);
  const selectedNodeId = ref<string | null>(null);

  //基础参数
  const isInspectorVisible = ref(true);
  const zoom = ref(1);
  const zoomOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const inspectorWidth = ref(280);
  const workspaceElement = ref<HTMLElement | null>(null);
  const actionLogs = ref<ActionLog[]>([]);
  let resizePointerId: number | null = null;

  // 初始参数

  const selectedNode = computed(() => {
    return nodes.value.find((node) => node.id === selectedNodeId.value) ?? null;
  });
  function recordAction(type: ActionType, targetId: string | undefined, before: unknown, after: unknown) {
    actionLogs.value.push({
      actionId: crypto.randomUUID(),
      type,
      timestamp: Date.now(),
      targetId,
      before: structuredClone(before),
      after: structuredClone(after),
    });
  }
  function addNode(position: { x: number; y: number }) {
    const before = cloneNodes();
    const node: CanvasNode = {
      id: crypto.randomUUID(),
      label: "",
      isLabelCustomized: false,
      x: position.x,
      y: position.y,
    };
    nodes.value.push(node);
    normalizeDefaultLabels();
    // recordAction("node.create", node.id, before, nodes.value);
    recordAction("node.create", node.id, before, cloneNodes());
  }
  function normalizeDefaultLabels() {
    let number = 1;
    for (const node of nodes.value) {
      if (!node.isLabelCustomized) {
        node.label = `节点${number}`;
        number += 1;
      }
    }
  }
  function selectNode(id: string) {
    selectedNodeId.value = id;
  }

  // 改成普通对象副本
  function cloneNodes(): CanvasNode[] {
    return nodes.value.map((node) => ({ ...node }));
  }

  function clearSelection() {
    selectedNodeId.value = null;
  }

  function updateNodePosition(position: { id: string; x: number; y: number }) {
    const node = nodes.value.find((item) => item.id === position.id);
    if (!node) return;

    node.x = position.x;
    node.y = position.y;
  }

  function startInspectorResize(event: PointerEvent) {
    resizePointerId = event.pointerId;
    const divider = event.currentTarget as HTMLElement;
    divider.setPointerCapture(event.pointerId);
  }

  function updateInspectorResize(event: PointerEvent) {
    if (resizePointerId !== event.pointerId || !workspaceElement.value) return;

    const rect = workspaceElement.value.getBoundingClientRect();
    const maxWidth = Math.max(220, Math.min(480, rect.width - 326));
    const proposedWidth = rect.right - event.clientX;

    inspectorWidth.value = Math.max(220, Math.min(proposedWidth, maxWidth));
  }

  function stopInspectorResize(event: PointerEvent) {
    if (resizePointerId !== event.pointerId) return;

    const divider = event.currentTarget as HTMLElement;
    if (divider.hasPointerCapture(event.pointerId)) {
      divider.releasePointerCapture(event.pointerId);
    }
    resizePointerId = null;
  }
  function renameSelectedNode(label: string) {
    if (!selectedNode.value) return;
    const before = cloneNodes();
    selectedNode.value.label = label;
    selectedNode.value.isLabelCustomized = true;
    // recordAction("node.rename", selectedNode.value.id, before, nodes.value);
    recordAction("node.rename", selectedNode.value.id, before, cloneNodes());
  }

  function deleteSelectedNode() {
    if (selectedNodeId.value === null) return;
    const targetId = selectedNodeId.value;
    const before = cloneNodes();
    nodes.value = nodes.value.filter((node) => node.id !== selectedNodeId.value);

    normalizeDefaultLabels();
    selectedNodeId.value = null;
    // recordAction("node.delete", targetId, before, nodes.value);
    recordAction("node.delete", targetId, before, cloneNodes());
  }
</script>

<template>
  <div class="app-shell">
    <header class="app-toolbar">
      <h1>自由画布</h1>
      <span>{{ nodes.length }}个节点</span>

      <label>
        缩放
        <select v-model.number="zoom">
          <option v-for="option in zoomOptions" :key="option" :value="option"> {{ option * 100 }}% </option>
        </select>
      </label>

      <button type="button" @click="isInspectorVisible = !isInspectorVisible">
        {{ isInspectorVisible ? "隐藏属性" : "显示属性" }}
      </button>
      <button type="button" :disabled="selectedNodeId === null" @click="deleteSelectedNode"> 删除节点 </button>
    </header>
    <div ref="workspaceElement" class="editor-workspace" :class="{ 'inspector-hidden': !isInspectorVisible }" :style="{ '--inspector-width': `${inspectorWidth}px` }">
      <TopologyCanvas
        :zoom="zoom"
        :nodes="nodes"
        :selected-node-id="selectedNodeId"
        @create-node="addNode"
        @select-node="selectNode"
        @move-node="updateNodePosition"
        @zoom-change="zoom = $event"
        @clear-selection="clearSelection" />
      <div
        v-if="isInspectorVisible"
        class="inspector-resizer"
        @pointerdown="startInspectorResize"
        @pointermove="updateInspectorResize"
        @pointerup="stopInspectorResize"
        @pointercancel="stopInspectorResize" />
      <PropertyInspector v-if="isInspectorVisible" :node="selectedNode" @rename-node="renameSelectedNode" />
    </div>
  </div>
</template>
