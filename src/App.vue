<script setup lang="ts">
  import { ref, computed } from "vue";

  interface CanvasNode {
    id: string;
    label: string;
    x: number;
    y: number;
  }
  interface DragState {
    nodeId: string;
    pointerId: number;
    offsetX: number;
    offsetY: number;
  }
  interface NodeEdge {
    id: string;
    sourceId: string;
    targetId: string;
  }
  interface DrawableEdge {
    id: string;
    sourceNode: CanvasNode;
    targetNode: CanvasNode;
  }
  const NODE_WIDTH = 140;
  const NODE_HEIGHT = 56;

  const nodes = ref<CanvasNode[]>([]);
  const canvasElement = ref<HTMLElement | null>(null);
  const dragState = ref<DragState | null>(null);
  const edges = ref<NodeEdge[]>([]);

  const selectedNodeId = ref<string | null>(null);
  const connectionSourceId = ref<string | null>(null);

  let nextNodeNumber = 1;
  let nextEdgeNumber = 1;

  const selectedNode = computed(() => {
    return (
      nodes.value.find((node) => {
        return node.id === selectedNodeId.value;
      }) ?? null
    );
  });
  const drawableEdges = computed<DrawableEdge[]>(() => {
    const result: DrawableEdge[] = [];

    for (const edge of edges.value) {
      const sourceNode = nodes.value.find((node) => {
        return node.id === edge.sourceId;
      });

      const targetNode = nodes.value.find((node) => {
        return node.id === edge.targetId;
      });

      if (!sourceNode || !targetNode) {
        continue;
      }

      result.push({
        id: edge.id,
        sourceNode,
        targetNode,
      });
    }
    return result;
  });
  const edgeAlreadyExists = edges.value.some((edge) => {
    const sameDirection = edge.sourceId === sourceId && edge.targetId === targetId;

    const oppositeDirection = edge.sourceId === targetId && edge.targetId === sourceId;

    return sameDirection || oppositeDirection;
  });

  if (edgeAlreadyExists) {
    return;
  }
  function addNode(event: MouseEvent) {
    const canvas = event.currentTarget as HTMLElement;
    const canvasRect = canvas.getBoundingClientRect();

    const number = nextNodeNumber;
    nextNodeNumber += 1;
    const rawX = event.clientX - canvasRect.left - NODE_WIDTH / 2;
    const rawY = event.clientY - canvasRect.top - NODE_HEIGHT / 2;

    const maxX = canvas.clientWidth - NODE_WIDTH;
    const maxY = canvas.clientHeight - NODE_HEIGHT;

    const x = Math.max(0, Math.min(rawX, maxX));
    const y = Math.max(0, Math.min(rawY, maxY));

    nodes.value.push({
      id: `node-${number}`,
      label: `节点 ${number}`,
      x,
      y,
    });
  }

  function startDrag(event: PointerEvent, node: CanvasNode) {
    const canvas = canvasElement.value;
    selectedNodeId.value = node.id;
    if (!canvas) {
      return;
    }

    event.preventDefault();

    const canvasRect = canvas.getBoundingClientRect();
    const nodeElement = event.currentTarget as HTMLElement;

    dragState.value = {
      nodeId: node.id,
      pointerId: event.pointerId,
      offsetX: event.clientX - canvasRect.left - node.x,
      offsetY: event.clientY - canvasRect.top - node.y,
    };

    nodeElement.setPointerCapture(event.pointerId);
  }

  function dragNode(event: PointerEvent) {
    const canvas = canvasElement.value;
    const currentDrag = dragState.value;

    if (!canvas || !currentDrag || currentDrag.pointerId !== event.pointerId) {
      return;
    }

    const node = nodes.value.find((item) => item.id === currentDrag.nodeId);

    if (!node) {
      return;
    }

    const canvasRect = canvas.getBoundingClientRect();

    const nextX = event.clientX - canvasRect.left - currentDrag.offsetX;

    const nextY = event.clientY - canvasRect.top - currentDrag.offsetY;

    const maxX = canvas.clientWidth - NODE_WIDTH;
    const maxY = canvas.clientHeight - NODE_HEIGHT;

    node.x = Math.max(0, Math.min(nextX, maxX));
    node.y = Math.max(0, Math.min(nextY, maxY));
  }

  function stopDrag(event: PointerEvent) {
    const nodeElement = event.currentTarget as HTMLElement;

    if (nodeElement.hasPointerCapture(event.pointerId)) {
      nodeElement.releasePointerCapture(event.pointerId);
    }

    dragState.value = null;
  }
  function deleteSelectedNode() {
    if (selectedNodeId.value === null) {
      return;
    }
    const nodeIdToDelete = selectedNodeId.value;
    nodes.value = nodes.value.filter((node) => {
      return node.id !== nodeIdToDelete;
    });
    edges.value = edges.value.filter((edge) => {
      return edge.sourceId !== nodeIdToDelete && edge.targetId !== nodeIdToDelete;
    });
    if (connectionSourceId.value === nodeIdToDelete) {
      connectionSourceId.value = null;
    }

    selectedNodeId.value = null;
  }
  function clearSelectionNode() {
    selectedNodeId.value = null;
  }

  function addNodeEdge() {
    if (nodes.value.length < 2) {
      return;
    }
    const sourceId = connectionSourceId.value;
    const targetId = selectedNodeId.value;
    if (sourceId === null || targetId === null) {
      return;
    }

    if (sourceId === targetId) {
      return;
    }
    const number = nextEdgeNumber;
    nextEdgeNumber += 1;
    edges.value.push({
      id: `edge-${number}`,
      sourceId,
      targetId,
    });
    connectionSourceId.value = null;
  }
  function startConnection() {
    if (selectedNodeId.value === null) {
      return;
    }

    connectionSourceId.value = selectedNodeId.value;
  }
</script>

<template>
  <div class="app">
    <header class="toolbar">
      <h1>自由画布</h1>
      <span>{{ nodes.length }} 个节点</span>
      <span>{{ edges.length }} 条连线</span>

      <button type="button" :disabled="selectedNodeId === null" @click="deleteSelectedNode"> 删除所选 </button>
      <button type="button" :disabled="nodes.length < 2" @click="addNodeEdge"> 添加连线 </button>
      <button type="button" :disabled="selectedNodeId === null" @click="startConnection"> 设为连线起点 </button>
      <span v-if="connectionSourceId"> 连线起点：{{ connectionSourceId }} </span>
      <input v-if="selectedNode" v-model="selectedNode.label" />
    </header>

    <main ref="canvasElement" class="canvas-area" @dblclick="addNode" @pointerdown.self="clearSelectionNode">
      <p v-if="nodes.length === 0" class="canvas-hint">双击空白处创建节点</p>
      <svg class="edge-layer" aria-hidden="true">
        <line
          v-for="edge in drawableEdges"
          :key="edge.id"
          :x1="edge.sourceNode.x + NODE_WIDTH / 2"
          :y1="edge.sourceNode.y + NODE_HEIGHT / 2"
          :x2="edge.targetNode.x + NODE_WIDTH / 2"
          :y2="edge.targetNode.y + NODE_HEIGHT / 2" />
      </svg>
      <div
        v-for="node in nodes"
        :key="node.id"
        class="canvas-node"
        :class="{ selected: selectedNodeId === node.id }"
        :style="{
          left: `${node.x}px`,
          top: `${node.y}px`,
        }"
        @pointerdown="startDrag($event, node)"
        @pointermove="dragNode"
        @pointerup="stopDrag"
        @pointercancel="stopDrag"
        @dblclick.stop>
        {{ node.label }}
      </div>
    </main>
  </div>
</template>
