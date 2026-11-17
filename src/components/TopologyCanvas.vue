<script setup lang="ts">
  import { reactive, ref, watch } from "vue";
  import type { CanvasNode, DragState, PanState } from "../types/topology";

  const props = defineProps<{
    nodes: CanvasNode[];
    selectedNodeId: string | null;
    zoom: number;
  }>();

  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 10;
  const WHEEL_ZOOM_STEP = 0.1;
  const canvasElement = ref<HTMLElement | null>(null);
  const camera = reactive({ x: 0, y: 0 });
  let dragState: DragState | null = null;
  let panState: PanState | null = null;

  let skipNextZoomWatch = false;

  const emit = defineEmits<{
    "create-node": [position: { x: number; y: number }];
    "select-node": [id: string];
    "move-node": [node: { id: string; x: number; y: number }];
    "clear-selection": [];
    "zoom-change": [zoom: number];
  }>();

  function getCanvas() {
    return canvasElement.value;
  }

  function getWorldPosition(clientX: number, clientY: number) {
    const canvas = getCanvas();
    if (!canvas) return { x: clientX / props.zoom, y: clientY / props.zoom };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - camera.x) / props.zoom,
      y: (clientY - rect.top - camera.y) / props.zoom,
    };
  }

  function zoomAroundPoint(nextZoom: number, clientX: number, clientY: number) {
    const canvas = getCanvas();
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pointX = clientX - rect.left;
    const pointY = clientY - rect.top;
    const worldX = (pointX - camera.x) / props.zoom;
    const worldY = (pointY - camera.y) / props.zoom;

    camera.x = pointX - worldX * nextZoom;
    camera.y = pointY - worldY * nextZoom;
    skipNextZoomWatch = true;
    emit("zoom-change", nextZoom);
  }

  function handleWheel(event: WheelEvent) {
    if (event.deltaY === 0) return;

    const direction = event.deltaY < 0 ? 1 : -1;
    const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number((props.zoom + direction * WHEEL_ZOOM_STEP).toFixed(2))));
    if (nextZoom === props.zoom) return;

    zoomAroundPoint(nextZoom, event.clientX, event.clientY);
  }

  watch(
    () => props.zoom,
    (nextZoom, previousZoom) => {
      if (nextZoom === previousZoom || skipNextZoomWatch) {
        skipNextZoomWatch = false;
        return;
      }

      const canvas = getCanvas();
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const pointX = rect.width / 2;
      const pointY = rect.height / 2;
      const worldX = (pointX - camera.x) / previousZoom;
      const worldY = (pointY - camera.y) / previousZoom;
      camera.x = pointX - worldX * nextZoom;
      camera.y = pointY - worldY * nextZoom;
    },
  );

  function createNode(event: MouseEvent) {
    emit("create-node", getWorldPosition(event.clientX, event.clientY));
  }

  function moveNode(event: PointerEvent) {
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const position = getWorldPosition(event.clientX, event.clientY);
    emit("move-node", {
      id: dragState.id,
      x: position.x - dragState.offsetX,
      y: position.y - dragState.offsetY,
    });
  }

  function startNodeDrag(event: PointerEvent, node: CanvasNode) {
    if (event.button !== 0) return;

    const element = event.currentTarget as HTMLElement;
    const position = getWorldPosition(event.clientX, event.clientY);
    dragState = {
      id: node.id,
      pointerId: event.pointerId,
      offsetX: position.x - node.x,
      offsetY: position.y - node.y,
    };
    element.setPointerCapture(event.pointerId);
    emit("select-node", node.id);
  }

  function stopNodeDrag(event: PointerEvent) {
    if (dragState?.pointerId !== event.pointerId) return;

    const element = event.currentTarget as HTMLElement;
    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
    dragState = null;
  }
  function startCanvasPan(event: PointerEvent) {
    if (event.button !== 1) return;
    const target = event.target;
    if (target instanceof Element && target.closest(".canvas-node")) {
      return;
    }
    event.preventDefault();
    const canvas = event.currentTarget as HTMLElement;
    panState = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startCameraX: camera.x,
      startCameraY: camera.y,
    };
    canvas.setPointerCapture(event.pointerId);
  }
  function moveCanvasPan(event: PointerEvent) {
    if (!panState || panState.pointerId !== event.pointerId) return;
    camera.x = panState.startCameraX + event.clientX - panState.startClientX;
    camera.y = panState.startCameraY + event.clientY - panState.startClientY;
  }
  function stopCanvasPan(event: PointerEvent) {
    if (!panState || panState.pointerId !== event.pointerId) return;
    const canvas = event.currentTarget as HTMLElement;

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    panState = null;
  }
</script>

<template>
  <main
    ref="canvasElement"
    class="topology-canvas"
    aria-label="拓扑画布"
    @pointerdown="startCanvasPan"
    @pointermove="moveCanvasPan"
    @pointerup="stopCanvasPan"
    @pointercancel="stopCanvasPan"
    @contextmenu.prevent
    @wheel.prevent="handleWheel">
    <div
      class="canvas-world"
      :style="{
        width: `${100 / props.zoom}%`,
        height: `${100 / props.zoom}%`,
        transform: `matrix(${props.zoom}, 0, 0, ${props.zoom}, ${camera.x}, ${camera.y})`,
      }"
      @dblclick.self="createNode"
      @click.self="emit('clear-selection')">
      <div
        v-for="node in nodes"
        :key="node.id"
        class="canvas-node"
        :class="{ selected: selectedNodeId === node.id }"
        @click="emit('select-node', node.id)"
        @pointerdown="startNodeDrag($event, node)"
        @pointermove="moveNode"
        @pointerup="stopNodeDrag"
        @pointercancel="stopNodeDrag"
        :style="{ left: `${node.x}px`, top: `${node.y}px` }">
        {{ node.label }}
      </div>
    </div>
  </main>
</template>
