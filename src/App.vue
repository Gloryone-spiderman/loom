<script setup lang="ts">
  import { ref, computed } from "vue";

  type NodeShape = "rectangle" | "ellipse";

  interface CanvasNode {
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    shape: NodeShape;
    fillColor: string;
    borderColor: string;
  }
  interface CanvasEdge {
    id: string;
    sourceId: string;
    targetId: string;
  }
  interface DragState {
    nodeId: string;
    pointerId: number;
    offsetX: number;
    offsetY: number;
  }
  interface DrawableEdge {
    id: string;
    sourceNode: CanvasNode;
    targetNode: CanvasNode;
  }

  const NODE_WIDTH = 140;
  const NODE_HEIGHT = 56;

  //canvas data
  const nodes = ref<CanvasNode[]>([]);
  const edges = ref<CanvasEdge[]>([]);

  //Element references
  const canvasElement = ref<HTMLElement | null>(null);

  //Interaction state
  const dragState = ref<DragState | null>(null);
  const selectedNodeId = ref<string | null>(null);
  const connectingFromNodeId = ref<string | null>(null);

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
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      shape: "rectangle",
      fillColor: "#ffffff",
      borderColor: "#176b5b",
    });
  }

  function startNodeDrag(event: PointerEvent, node: CanvasNode) {
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

  function updateNodeDrag(event: PointerEvent) {
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

    const maxX = canvas.clientWidth - node.width;
    const maxY = canvas.clientHeight - node.height;

    node.x = Math.max(0, Math.min(nextX, maxX));
    node.y = Math.max(0, Math.min(nextY, maxY));
  }

  function stopNodeDrag(event: PointerEvent) {
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
    if (connectingFromNodeId.value === nodeIdToDelete) {
      connectingFromNodeId.value = null;
    }

    selectedNodeId.value = null;
  }
  function clearNodeSelection() {
    selectedNodeId.value = null;
  }

  function addNodeEdge() {
    if (nodes.value.length < 2) {
      return;
    }
    const sourceId = connectingFromNodeId.value;
    const targetId = selectedNodeId.value;
    if (sourceId === null || targetId === null) {
      return;
    }

    if (sourceId === targetId) {
      return;
    }
    const edgeAlreadyExists = edges.value.some((edge) => {
      const sameDirection = edge.sourceId === sourceId && edge.targetId === targetId;

      const oppositeDirection = edge.sourceId === targetId && edge.targetId === sourceId;

      return sameDirection || oppositeDirection;
    });

    if (edgeAlreadyExists) {
      return;
    }
    const number = nextEdgeNumber;
    nextEdgeNumber += 1;
    edges.value.push({
      id: `edge-${number}`,
      sourceId,
      targetId,
    });
    connectingFromNodeId.value = null;
  }
  function startConnection() {
    if (selectedNodeId.value === null) {
      return;
    }

    connectingFromNodeId.value = selectedNodeId.value;
  }
  function normalizeSelectedNodeSize() {
    const canvas = canvasElement.value;
    const node = selectedNode.value;

    if (!canvas || !node) {
      return;
    }
    const inputWidth = Number(node.width);
    const inputHeight = Number(node.height);

    if (!Number.isFinite(inputWidth)) {
      node.width = NODE_WIDTH;
    } else {
      node.width = Math.max(40, Math.min(inputWidth, 600));
    }

    if (!Number.isFinite(inputHeight)) {
      node.height = NODE_HEIGHT;
    } else {
      node.height = Math.max(30, Math.min(inputHeight, 400));
    }
    const maxX = Math.max(0, canvas.clientWidth - node.width);
    const maxY = Math.max(0, canvas.clientHeight - node.height);

    node.x = Math.max(0, Math.min(node.x, maxX));
    node.y = Math.max(0, Math.min(node.y, maxY));
  }
</script>

<template>
  <div class="app">
    <header class="toolbar">
      <h1>自由画布</h1>
      <span>{{ nodes.length }} 个节点</span>
      <span>{{ edges.length }} 条连线</span>
      <div class="toolbar-actions">
        <span v-if="connectingFromNodeId"> 连线起点：{{ connectingFromNodeId }} </span>
        <button type="button" :disabled="selectedNodeId === null" @click="startConnection"> 设为连线起点 </button>
        <button type="button" :disabled="selectedNodeId === null" @click="deleteSelectedNode"> 删除所选 </button>
        <button type="button" :disabled="nodes.length < 2" @click="addNodeEdge"> 添加连线 </button>
      </div>
    </header>
    <div class="workspace">
      <main ref="canvasElement" class="canvas-area" @dblclick="addNode" @pointerdown.self="clearNodeSelection">
        <p v-if="nodes.length === 0" class="canvas-hint">双击空白处创建节点</p>
        <svg class="edge-layer" aria-hidden="true">
          <line
            v-for="edge in drawableEdges"
            :key="edge.id"
            :x1="edge.sourceNode.x + edge.sourceNode.width / 2"
            :y1="edge.sourceNode.y + edge.sourceNode.height / 2"
            :x2="edge.targetNode.x + edge.targetNode.width / 2"
            :y2="edge.targetNode.y + edge.targetNode.height / 2" />
        </svg>
        <div
          v-for="node in nodes"
          :key="node.id"
          class="canvas-node"
          :class="{
            selected: selectedNodeId === node.id,
            'connection-source': connectingFromNodeId === node.id,
            'shape-ellipse': node.shape === 'ellipse',
          }"
          :style="{
            left: `${node.x}px`,
            top: `${node.y}px`,
            width: `${node.width}px`,
            height: `${node.height}px`,
            backgroundColor: node.fillColor,
            borderColor: node.borderColor,
          }"
          @pointerdown="startNodeDrag($event, node)"
          @pointermove="updateNodeDrag"
          @pointerup="stopNodeDrag"
          @pointercancel="stopNodeDrag"
          @dblclick.stop>
          {{ node.label }}
        </div>
      </main>
      <aside class="property-inspector">
        <section v-if="selectedNode">
          <h2>节点属性</h2>
          <label v-if="selectedNode">
            形状
            <select v-model="selectedNode.shape">
              <option value="rectangle">矩形</option>
              <option value="ellipse">椭圆</option>
            </select>
          </label>
          <input v-if="selectedNode" v-model="selectedNode.label" />
          <label v-if="selectedNode">
            宽度
            <input v-model.number="selectedNode.width" type="number" min="40" max="600" @change="normalizeSelectedNodeSize" />
          </label>
          <label v-if="selectedNode">
            高度
            <input v-model.number="selectedNode.height" type="number" min="30" max="400" @change="normalizeSelectedNodeSize" />
          </label>
          <label v-if="selectedNode">
            填充色
            <input v-model="selectedNode.fillColor" type="color" />
          </label>

          <label v-if="selectedNode">
            边框色
            <input v-model="selectedNode.borderColor" type="color" />
          </label>
        </section>
        <section v-else>
          <h2>画布属性</h2>
        </section>
      </aside>
    </div>
  </div>
</template>
