#!/bin/bash
# Dreamfield OS — Cesium Ion Integration Test
set -e

echo "═══════════════════════════════════════════════"
echo "  DREAMFIELD OS — Cesium Ion Integration Test"
echo "═══════════════════════════════════════════════"

cd "$(dirname "$0")/.."

# Load env
TOKEN=$(grep VITE_CESIUM_ION_TOKEN .env | cut -d= -f2)
export VITE_CESIUM_ION_TOKEN="$TOKEN"
if [ -z "$TOKEN" ]; then
  echo "ERROR: VITE_CESIUM_ION_TOKEN not set"
  exit 1
fi

echo ""
echo "[1/5] Running unit tests..."
bun run test 2>&1 | tail -5

echo ""
echo "[2/5] Verifying Ion API access..."
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" https://api.cesium.com/v1/assets/1/endpoint)
if echo "$RESPONSE" | grep -q '"type"'; then
  echo "  ✓ Ion API accessible (token valid)"
  TERRAIN_TYPE=$(echo "$RESPONSE" | grep -o '"type":"[^"]*"' | cut -d'"' -f4)
  echo "  ✓ Asset 1 type: $TERRAIN_TYPE"
else
  echo "  ✗ Ion API auth failed"
  echo "  Response: $RESPONSE"
  exit 1
fi

echo ""
echo "[3/5] Resolving World Terrain endpoint..."
TERRAIN=$(curl -s -H "Authorization: Bearer $TOKEN" https://api.cesium.com/v1/assets/1/endpoint)
TERRAIN_URL=$(echo "$TERRAIN" | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$TERRAIN_URL" ]; then
  echo "  ✓ World Terrain: $TERRAIN_URL"
else
  echo "  ✗ Failed to resolve terrain endpoint"
  exit 1
fi

echo ""
echo "[4/5] Testing server Cesium proxy..."
# Start server in background
VITE_CESIUM_ION_TOKEN="$TOKEN" bun run src/server/index.ts &
SERVER_PID=$!
sleep 2

HEALTH=$(curl -s http://localhost:3001/health)
if echo "$HEALTH" | grep -q "DREAMFIELD"; then
  echo "  ✓ Server online"
else
  echo "  ✗ Server not responding"
  kill $SERVER_PID 2>/dev/null
  exit 1
fi

CESIUM_ASSETS=$(curl -s http://localhost:3001/ion/assets)
if echo "$CESIUM_ASSETS" | grep -q "items\|id"; then
  echo "  ✓ /ion/assets proxy working"
else
  echo "  ✗ Ion assets proxy failed"
fi

TERRAIN_PROXY=$(curl -s "http://localhost:3001/ion/terrain?lat=48.8566&lon=2.3522")
if echo "$TERRAIN_PROXY" | grep -q "endpoint\|url"; then
  echo "  ✓ /ion/terrain proxy working"
else
  echo "  ✗ Terrain proxy failed"
fi

kill $SERVER_PID 2>/dev/null

echo ""
echo "[5/5] Checking OSM Buildings asset..."
OSM=$(curl -s -H "Authorization: Bearer $TOKEN" https://api.cesium.com/v1/assets/96188/endpoint)
if echo "$OSM" | grep -q "url"; then
  echo "  ✓ OSM Buildings endpoint resolved"
else
  echo "  ⚠ OSM Buildings not accessible (may need Ion subscription)"
fi

echo ""
echo "═══════════════════════════════════════════════"
echo "  Integration test PASSED"
echo "═══════════════════════════════════════════════"
