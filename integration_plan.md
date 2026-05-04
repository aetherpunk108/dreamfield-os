# Dreamfield OS — Cesium Ion Integration Plan

## Phase 6: Advanced (Cesium + Geospatial Streaming)

### Step 1: Cesium Dependencies & Configuration

**Files to create/modify:**
- `src/lib/cesium/config.ts` — Ion token, asset IDs, endpoint config
- `src/lib/cesium/index.ts` — barrel export
- `.env` — `VITE_CESIUM_ION_TOKEN`

**Install:**
```bash
bun add @cesium/engine cesium
```

**Test:**
```bash
bun run test -- --grep cesium
```

---

### Step 2: 3D Tiles Streaming Loader

**Files to create/modify:**
- `src/lib/cesium/tileLoader.ts` — Fetch & decode 3D Tiles from Ion, convert to Three.js meshes
- `src/lib/cesium/terrainProvider.ts` — Cesium World Terrain quantized-mesh decoding
- `src/lib/components/cesium/TilesetRenderer.svelte` — Threlte component for streaming tilesets

**Integration with existing spatial system:**
- Bridge `src/lib/spatial/octree/field.ts` to index incoming tiles in our octree
- Map tile LOD levels to observation tensor collapse thresholds

**Test:**
```bash
bun run dev  # Visual: tileset loads at orrery camera position
curl -H "Authorization: Bearer $CESIUM_TOKEN" https://api.cesium.com/v1/assets
```

---

### Step 3: Terrain & Photogrammetry Ingestion

**Files to create/modify:**
- `src/lib/cesium/terrainSampler.ts` — Sample elevation at geodetic coords (uses our coords.ts)
- `src/lib/cesium/photogrammetry.ts` — Stream photogrammetry assets as Ghost primitives
- `src/server/routes/cesium.ts` — Proxy endpoint for Ion API (keeps token server-side)

**Bridge to existing geospatial:**
- `src/lib/geospatial/coords.ts` already has WGS84↔ECEF — terrain sampler uses these directly
- Photogrammetry meshes become Ghost primitives in the observation tensor

**Test:**
```bash
bun run server  # API proxy at :3001/cesium/terrain?lat=48.8566&lon=2.3522
bun run test -- --grep terrain
```

---

### Step 4: Gaussian Splat Integration

**Files to create/modify:**
- `src/lib/cesium/splatLoader.ts` — Load .splat/.ply from Ion, convert to our Ghost format
- `src/lib/components/renderers/CesiumSplatRenderer.svelte` — WebGPU splat renderer
- `src/lib/spatial/primitives/ghost.ts` — Extend Ghost to support splat point clouds

**Key integration:**
- Splats map 1:1 to our Ghost (gaussian splat) primitive
- Each splat enters the trinary observation tensor as superposition state
- Collapse via ray intersection triggers LOD streaming of nearby tiles

**Test:**
```bash
bun run dev  # Upload test .ply to Ion, verify streaming in spatial view
```

---

### Step 5: Real-time Data Feeds & WebSocket Sync

**Files to create/modify:**
- `src/lib/cesium/liveStream.ts` — Subscribe to Ion asset updates, GPS telemetry
- `src/server/routes/cesium-ws.ts` — WebSocket bridge: Ion events → client spatial updates
- `src/lib/stores/cesium.svelte.ts` — Reactive store for streaming tile state
- `src/lib/components/hud/CesiumStatus.svelte` — HUD widget showing stream health

**Integration with existing WebSocket:**
- Extends `src/server/index.ts` Elysia WebSocket with `/cesium` channel
- Eden client subscribes via existing `src/lib/api/client.ts` patterns
- Incoming data updates breath voxels and observation tensor in real-time

**Test:**
```bash
bun run server  # WS at ws://localhost:3001/cesium
bun run test -- --grep "cesium ws"
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│              Dreamfield OS UI               │
│  (SvelteKit + Threlte + Tweakpane)          │
├─────────────────────────────────────────────┤
│  Observation Tensor  │  Cesium Tile Store   │
│  (trinary states)    │  (LOD streaming)     │
├──────────────────────┼──────────────────────┤
│  Spatial Octree      │  3D Tiles Decoder    │
│  (field.ts)          │  (tileLoader.ts)     │
├──────────────────────┼──────────────────────┤
│  Geospatial Math     │  Cesium Ion API      │
│  (coords/orbits)     │  (terrainProvider)   │
├──────────────────────┴──────────────────────┤
│           Elysia Backend (port 3001)        │
│  REST + WebSocket + Ion Proxy               │
└─────────────────────────────────────────────┘
```

## Token

Ion access token stored in `.env` (never committed):
```
VITE_CESIUM_ION_TOKEN=<configured>
```
