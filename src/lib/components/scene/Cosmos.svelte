<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';
	import { onMount } from 'svelte';

	// Scene
	import Starfield from '$lib/components/scene/Starfield.svelte';
	import EnvironmentMap from '$lib/components/scene/EnvironmentMap.svelte';
	import PostFX from '$lib/components/scene/PostFX.svelte';

	// Flight
	import { createShipState, updateShip, type ShipState } from '$lib/flight/ship.js';
	import { processInput, createInputState, getDefaultConfig, type InputState, type FlightConfig } from '$lib/flight/input.js';
	import { createCurve, type CurveType } from '$lib/flight/curves.js';
	import FlightHud from '$lib/components/flight/FlightHud.svelte';
	import CosmosHud from '$lib/components/hud/CosmosHud.svelte';
	import GamePanel from '$lib/components/game/GamePanel.svelte';
	import { createPlayerState, consumeFuel, rechargeShield, checkLevelUp, distance as dist, SHIP_CLASSES, generateGPSMissions, initWarp, updateWarp, type PlayerState, type WarpState, type GPSMission } from '$lib/game/engine.js';
	import { getPins, initDefaultPins } from '$lib/navigation/pins.js';

	// Shaders
	import { createAtmosphereShader } from '$lib/shaders/atmosphere.js';

	interface Props {
		flightEnabled?: boolean;
	}

	let { flightEnabled = true }: Props = $props();

	// ============================
	// GAME WORLD LAYOUT
	// Scaled so you can fly between bodies in ~20-60 seconds at full speed
	// ============================
	const WORLD = {
		earth: { pos: [0, 0, 0] as [number,number,number], radius: 6, color: '#1a4a2a' },
		moon: { dist: 60, radius: 1.6, color: '#888888', orbitSpeed: 0.02 },
		sun: { pos: [400, 50, -200] as [number,number,number], radius: 30, color: '#ffcc44' },
		// Space stations
		stations: [
			{ name: 'ISS ALPHA', pos: [0, 8, 9] as [number,number,number], color: '#00ffcc' },
			{ name: 'LUNAR GATE', pos: [55, 3, 15] as [number,number,number], color: '#4466ff' },
			{ name: 'SUN OUTPOST', pos: [200, 20, -100] as [number,number,number], color: '#ffcc44' },
		],
		// Asteroids belt between Earth and Moon
		asteroids: Array.from({ length: 40 }, (_, i) => {
			const angle = (i / 40) * Math.PI * 2 + Math.random() * 0.3;
			const dist = 25 + Math.random() * 15;
			const y = (Math.random() - 0.5) * 8;
			return {
				pos: [Math.cos(angle) * dist, y, Math.sin(angle) * dist] as [number,number,number],
				radius: 0.1 + Math.random() * 0.4,
				rotation: Math.random() * Math.PI,
				rotSpeed: (Math.random() - 0.5) * 2,
			};
		}),
		// Nebula clouds (decorative)
		nebulae: [
			{ pos: [80, 20, 40] as [number,number,number], radius: 15, color: '#4466ff' },
			{ pos: [-60, -10, 80] as [number,number,number], radius: 12, color: '#ff44aa' },
			{ pos: [150, -30, -80] as [number,number,number], radius: 20, color: '#00ffcc' },
		],
	};

	// Time
	let time = $state(0);
	let moonAngle = $state(0);

	// Flight
	let ship = $state(createShipState());
	let flightConfig = $state<FlightConfig>(getDefaultConfig('desktop'));
	let inputState = $state<InputState>(createInputState());
	let rawInput = $state({ pitch: 0, yaw: 0, roll: 0, throttle: 0 });
	let cameraRef: THREE.PerspectiveCamera;
	let locked = $state(false);
	let showGamePanel = $state(false);

	// Player state
	let player = $state<PlayerState>(createPlayerState('PILOT'));
	let warp = $state<WarpState | null>(null);
	let gpsMissions = $state<GPSMission[]>([]);

	// Nearest body tracking
	let nearestBody = $state('');
	let nearestDist = $state(0);

	const shipConfig = {
		maxSpeed: 120,
		boostMultiplier: 3.5,
		acceleration: 25,
		deceleration: 3,
		pitchRate: 2.2,
		yawRate: 2.5,
		rollRate: 3.0,
		drag: 0.997,
		brakeForce: 20,
	};

	// ============================
	// BUILD THREE.JS SCENE
	// ============================

	// Earth
	const earthGeo = new THREE.SphereGeometry(WORLD.earth.radius, 64, 48);
	const earthMat = new THREE.MeshStandardMaterial({
		color: WORLD.earth.color, emissive: '#0a2a1a', emissiveIntensity: 0.2, roughness: 0.7
	});
	const earthMesh = new THREE.Mesh(earthGeo, earthMat);
	const earthWireGeo = new THREE.SphereGeometry(WORLD.earth.radius * 1.002, 32, 20);
	const earthWireMat = new THREE.MeshBasicMaterial({ color: '#00ffcc', wireframe: true, transparent: true, opacity: 0.06 });
	const earthWire = new THREE.Mesh(earthWireGeo, earthWireMat);
	const earthAtmosGeo = new THREE.SphereGeometry(WORLD.earth.radius * 1.15, 48, 32);
	const earthAtmosMat = createAtmosphereShader('#4488ff', 1.3);
	const earthAtmos = new THREE.Mesh(earthAtmosGeo, earthAtmosMat);
	const earthGroup = new THREE.Group();
	earthGroup.add(earthMesh, earthWire, earthAtmos);

	// Moon
	const moonGeo = new THREE.SphereGeometry(WORLD.moon.radius, 32, 24);
	const moonMat = new THREE.MeshStandardMaterial({ color: WORLD.moon.color, roughness: 0.9, emissive: '#222222', emissiveIntensity: 0.1 });
	const moonMesh = new THREE.Mesh(moonGeo, moonMat);
	const moonWireGeo = new THREE.SphereGeometry(WORLD.moon.radius * 1.01, 16, 12);
	const moonWireMat = new THREE.MeshBasicMaterial({ color: '#aaaacc', wireframe: true, transparent: true, opacity: 0.08 });
	const moonWire = new THREE.Mesh(moonWireGeo, moonWireMat);
	const moonGroup = new THREE.Group();
	moonGroup.add(moonMesh, moonWire);

	// Sun
	const sunGeo = new THREE.SphereGeometry(WORLD.sun.radius, 48, 32);
	const sunMat = new THREE.MeshBasicMaterial({ color: WORLD.sun.color });
	const sunMesh = new THREE.Mesh(sunGeo, sunMat);
	const sunGlowGeo = new THREE.SphereGeometry(WORLD.sun.radius * 1.5, 32, 24);
	const sunGlowMat = new THREE.MeshBasicMaterial({ color: '#ffaa22', transparent: true, opacity: 0.06, side: THREE.BackSide });
	const sunGlow = new THREE.Mesh(sunGlowGeo, sunGlowMat);
	const sunGroup = new THREE.Group();
	sunGroup.add(sunMesh, sunGlow);
	sunGroup.position.set(...WORLD.sun.pos);

	// Moon orbit ring
	const moonOrbitCurve = new THREE.EllipseCurve(0, 0, WORLD.moon.dist, WORLD.moon.dist, 0, Math.PI * 2, false, 0);
	const moonOrbitPts = moonOrbitCurve.getPoints(128);
	const moonOrbitGeo = new THREE.BufferGeometry().setFromPoints(moonOrbitPts.map(p => new THREE.Vector3(p.x, 0, p.y)));
	const moonOrbitMat = new THREE.LineBasicMaterial({ color: '#666688', transparent: true, opacity: 0.06 });
	const moonOrbitLine = new THREE.Line(moonOrbitGeo, moonOrbitMat);

	// Space stations
	const stationGroup = new THREE.Group();
	const stationMeshes: THREE.Group[] = [];
	for (const st of WORLD.stations) {
		const g = new THREE.Group();
		// Core
		const core = new THREE.Mesh(
			new THREE.OctahedronGeometry(0.4, 0),
			new THREE.MeshBasicMaterial({ color: st.color, wireframe: true, transparent: true, opacity: 0.8 })
		);
		// Ring
		const ring = new THREE.Mesh(
			new THREE.TorusGeometry(0.7, 0.05, 8, 24),
			new THREE.MeshBasicMaterial({ color: st.color, transparent: true, opacity: 0.5 })
		);
		// Light
		const light = new THREE.PointLight(st.color, 1, 8, 2);
		g.add(core, ring, light);
		g.position.set(...st.pos);
		stationGroup.add(g);
		stationMeshes.push(g);
	}

	// Asteroids
	const asteroidGroup = new THREE.Group();
	const asteroidMeshes: THREE.Mesh[] = [];
	for (const ast of WORLD.asteroids) {
		const geo = new THREE.IcosahedronGeometry(ast.radius, 0);
		const mat = new THREE.MeshStandardMaterial({
			color: '#444444', roughness: 1, metalness: 0.3, flatShading: true
		});
		const mesh = new THREE.Mesh(geo, mat);
		mesh.position.set(...ast.pos);
		mesh.rotation.set(ast.rotation, ast.rotation * 0.7, 0);
		asteroidGroup.add(mesh);
		asteroidMeshes.push(mesh);
	}

	// Nebula clouds (large transparent spheres)
	const nebulaGroup = new THREE.Group();
	for (const neb of WORLD.nebulae) {
		const geo = new THREE.SphereGeometry(neb.radius, 16, 12);
		const mat = new THREE.MeshBasicMaterial({
			color: neb.color, transparent: true, opacity: 0.015, side: THREE.DoubleSide, depthWrite: false
		});
		const mesh = new THREE.Mesh(geo, mat);
		mesh.position.set(...neb.pos);
		nebulaGroup.add(mesh);
	}

	// Ship
	const shipGroup = new THREE.Group();
	const shipBody = new THREE.Mesh(
		new THREE.ConeGeometry(0.2, 0.8, 6).rotateX(Math.PI / 2),
		new THREE.MeshBasicMaterial({ color: '#00ffcc', wireframe: true, transparent: true, opacity: 0.8 })
	);
	const shipWings = new THREE.Mesh(
		new THREE.BoxGeometry(1.2, 0.02, 0.3),
		new THREE.MeshBasicMaterial({ color: '#00ffcc', transparent: true, opacity: 0.4 })
	);
	shipWings.position.z = 0.15;
	const engineGlow = new THREE.Mesh(
		new THREE.SphereGeometry(0.1, 8, 6),
		new THREE.MeshBasicMaterial({ color: '#00ffcc', transparent: true, opacity: 0.6 })
	);
	engineGlow.position.z = 0.45;
	shipGroup.add(shipBody, shipWings, engineGlow);

	// Trail
	const trailGeo = new THREE.BufferGeometry();
	const trailPos = new Float32Array(900); // 300 points
	trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
	const trailMat = new THREE.PointsMaterial({
		color: '#00ffcc', size: 0.05, transparent: true, opacity: 0.3,
		blending: THREE.AdditiveBlending, depthWrite: false
	});
	const trail = new THREE.Points(trailGeo, trailMat);
	let trailIdx = 0;

	// Input handlers
	function handleKeyDown(e: KeyboardEvent) {
		// Tab opens game panel (works even when not locked)
		if (e.key === 'Tab') { e.preventDefault(); showGamePanel = !showGamePanel; return; }
		// V to warp to nearest station
		if (e.key.toLowerCase() === 'v' && locked && nearestDist > 5) {
			const bodies = [
				...WORLD.stations.map(s => ({ name: s.name, pos: s.pos })),
				{ name: 'TERRA', pos: WORLD.earth.pos },
			];
			const nearest = bodies.sort((a, b) => dist(ship.position, a.pos) - dist(ship.position, b.pos))[0];
			if (nearest) {
				const target: [number,number,number] = [nearest.pos[0], nearest.pos[1] + 2, nearest.pos[2] + 3];
				warp = initWarp(ship.position, target, nearest.name);
			}
			return;
		}
		if (!locked || showGamePanel) return;
		inputState.keys.add(e.key.toLowerCase());
	}
	function handleKeyUp(e: KeyboardEvent) {
		inputState.keys.delete(e.key.toLowerCase());
		inputState.keyHoldTime.delete(e.key.toLowerCase());
	}
	function handleMouseMove(e: MouseEvent) {
		if (!locked) return;
		inputState.mouseDeltaX = e.movementX;
		inputState.mouseDeltaY = e.movementY;
	}
	function handlePointerLock() { locked = document.pointerLockElement !== null; }
	function requestLock(e: MouseEvent) {
		if (locked) return;
		(e.target as HTMLElement)?.requestPointerLock?.();
	}
	function handleCurveChange(axis: string, type: CurveType) {
		const c = createCurve(type);
		if (axis === 'yaw') flightConfig.yawCurve = c;
		else if (axis === 'pitch') flightConfig.pitchCurve = c;
		else if (axis === 'throttle') flightConfig.throttleCurve = c;
	}

	function dist3(a: [number,number,number], b: [number,number,number]): number {
		return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
	}

	onMount(() => {
		ship.position = [0, WORLD.earth.radius + 3, 10];
		ship.rotation = { pitch: -0.1, yaw: 0, roll: 0 };
		if (getPins().length === 0) initDefaultPins();
		// Generate GPS missions from pins
		const pins = getPins().filter(p => p.visible).map(p => ({
			name: p.name, lat: p.lat, lon: p.lon,
			position: (p.worldPosition ?? [0,0,0]) as [number,number,number],
		}));
		gpsMissions = generateGPSMissions(pins);
	});

	useTask((delta) => {
		time += delta;
		moonAngle += WORLD.moon.orbitSpeed * delta;

		// Moon orbit
		const moonX = Math.cos(moonAngle) * WORLD.moon.dist;
		const moonZ = Math.sin(moonAngle) * WORLD.moon.dist;
		moonGroup.position.set(moonX, 0, moonZ);

		// Earth rotation
		earthGroup.rotation.y += 0.01 * delta;

		// Atmosphere shader time
		earthAtmosMat.uniforms.uTime.value = time;

		// Sun corona pulse
		sunGlowMat.opacity = 0.05 + Math.sin(time * 1.2) * 0.02;

		// Rotate stations
		for (let i = 0; i < stationMeshes.length; i++) {
			stationMeshes[i].rotation.y += 0.5 * delta;
			stationMeshes[i].rotation.x += 0.2 * delta;
		}

		// Rotate asteroids
		for (let i = 0; i < WORLD.asteroids.length; i++) {
			asteroidMeshes[i].rotation.x += WORLD.asteroids[i].rotSpeed * delta * 0.3;
			asteroidMeshes[i].rotation.y += WORLD.asteroids[i].rotSpeed * delta * 0.5;
		}

		// Flight physics
		if (locked) {
			for (const key of inputState.keys) {
				const prev = inputState.keyHoldTime.get(key) ?? 0;
				inputState.keyHoldTime.set(key, prev + delta);
			}

			const processed = processInput(inputState, flightConfig, delta);
			rawInput = { pitch: processed.pitch, yaw: processed.yaw, roll: processed.roll, throttle: processed.throttle };
			ship = updateShip(ship, processed, shipConfig, delta);

			// Gravity toward Earth (subtle)
			const earthDist = dist3(ship.position, WORLD.earth.pos);
			if (earthDist > WORLD.earth.radius && ship.throttleLevel < 0.05) {
				const gForce = 3 / (earthDist * earthDist) * delta;
				ship.position = [
					ship.position[0] - (ship.position[0] / earthDist) * gForce,
					ship.position[1] - (ship.position[1] / earthDist) * gForce,
					ship.position[2] - (ship.position[2] / earthDist) * gForce,
				];
			}

			// Collision with Earth
			if (earthDist < WORLD.earth.radius + 0.3) {
				const pushDist = WORLD.earth.radius + 0.3;
				ship.position = [
					ship.position[0] * pushDist / earthDist,
					ship.position[1] * pushDist / earthDist,
					ship.position[2] * pushDist / earthDist,
				];
				ship.speed *= 0.3;
			}

			// Collision with Moon
			const moonPos: [number,number,number] = [moonX, 0, moonZ];
			const moonDist = dist3(ship.position, moonPos);
			if (moonDist < WORLD.moon.radius + 0.2) {
				const pushDist = WORLD.moon.radius + 0.2;
				ship.position = [
					moonPos[0] + (ship.position[0] - moonPos[0]) * pushDist / moonDist,
					moonPos[1] + (ship.position[1] - moonPos[1]) * pushDist / moonDist,
					moonPos[2] + (ship.position[2] - moonPos[2]) * pushDist / moonDist,
				];
				ship.speed *= 0.3;
			}

			// Update ship visual
			shipGroup.position.set(...ship.position);
			shipGroup.rotation.set(ship.rotation.pitch, ship.rotation.yaw, ship.rotation.roll, 'YXZ');

			// Engine color
			const engineMat = engineGlow.material as THREE.MeshBasicMaterial;
			const bodyMat = shipBody.material as THREE.MeshBasicMaterial;
			if (ship.boostActive) {
				engineMat.color.set('#ff44aa');
				bodyMat.color.set('#ff44aa');
				trailMat.color.set('#ff44aa');
				engineMat.opacity = 0.9;
			} else {
				engineMat.color.set('#00ffcc');
				bodyMat.color.set('#00ffcc');
				trailMat.color.set('#00ffcc');
				engineMat.opacity = 0.3 + ship.throttleLevel * 0.6;
			}

			// Trail
			trailPos[trailIdx * 3] = ship.position[0];
			trailPos[trailIdx * 3 + 1] = ship.position[1];
			trailPos[trailIdx * 3 + 2] = ship.position[2];
			trailIdx = (trailIdx + 1) % 300;
			trailGeo.attributes.position.needsUpdate = true;

			// Camera
			if (cameraRef) {
				const offset = new THREE.Vector3(0, 1.8, -5);
				offset.applyEuler(new THREE.Euler(ship.rotation.pitch * 0.3, ship.rotation.yaw, 0, 'YXZ'));
				const camTarget = new THREE.Vector3(...ship.position).add(offset);
				cameraRef.position.lerp(camTarget, 0.06);
				cameraRef.lookAt(new THREE.Vector3(...ship.position));
			}

			inputState.mouseDeltaX = 0;
			inputState.mouseDeltaY = 0;
		}

		// Warp drive
		if (warp?.active && warp.target) {
			const result = updateWarp(warp, ship.position, delta);
			ship.position = result.position;
			shipGroup.position.set(...result.position);
			if (result.complete) warp = null;
		}

		// Fuel & shield
		if (locked) {
			consumeFuel(player, delta, ship.throttleLevel, ship.boostActive);
			if (player.fuel <= 0) { ship.speed *= 0.95; } // out of fuel = decelerate
		}
		rechargeShield(player, delta);

		// Sync player state
		player.position = ship.position;
		player.rotation = ship.rotation;
		player.speed = ship.speed;

		// Docking check
		const dockRange = 3;
		const stationBodies = WORLD.stations;
		let docked = false;
		for (const st of stationBodies) {
			if (dist(ship.position, st.pos) < dockRange && ship.speed < 2) {
				player.docked = true;
				player.dockedAt = st.name;
				docked = true;
				break;
			}
		}
		if (!docked) { player.docked = false; player.dockedAt = null; }

		// Nearest body detection
		const bodies: { name: string; pos: [number,number,number]; }[] = [
			{ name: 'EARTH', pos: WORLD.earth.pos },
			{ name: 'MOON', pos: [moonX, 0, moonZ] },
			{ name: 'SUN', pos: WORLD.sun.pos },
			...WORLD.stations.map(s => ({ name: s.name, pos: s.pos })),
		];
		let minDist = Infinity;
		let minName = '';
		for (const b of bodies) {
			const d = dist3(ship.position, b.pos);
			if (d < minDist) { minDist = d; minName = b.name; }
		}
		nearestBody = minName;
		nearestDist = minDist;
	});
</script>

<svelte:window
	onkeydown={handleKeyDown}
	onkeyup={handleKeyUp}
	onmousemove={handleMouseMove}
	onpointerlockchange={handlePointerLock}
/>

<!-- Camera -->
<T.PerspectiveCamera makeDefault bind:ref={cameraRef}
	position={[0, 12, 18]} fov={65} near={0.01} far={200000}
/>

<!-- Lighting -->
<T.AmbientLight intensity={0.01} color="#0a0a22" />
<T.DirectionalLight position={WORLD.sun.pos} intensity={0.6} color="#ffffee" />
<T.PointLight position={WORLD.sun.pos} intensity={2} color="#ffcc44" distance={500} decay={1} />

<!-- Earth -->
<T is={earthGroup} />

<!-- Moon (orbiting) -->
<T is={moonGroup} />
<T is={moonOrbitLine} />

<!-- Sun -->
<T is={sunGroup} />

<!-- Space Stations -->
<T is={stationGroup} />

<!-- Asteroid Belt -->
<T is={asteroidGroup} />

<!-- Nebulae -->
<T is={nebulaGroup} />

<!-- Ship + Trail -->
<T is={shipGroup} />
<T is={trail} />

<!-- Environment -->
<Starfield count={4000} radius={1500} twinkleSpeed={0.8} />
<EnvironmentMap />
<PostFX bloomIntensity={2.5} bloomThreshold={0.06} bloomRadius={0.95} />

<!-- Click to fly overlay -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="lock-area" onmousedown={requestLock} class:locked>
	{#if !locked}
		<div class="lock-prompt">
			<div class="cosmos-title">C O S M O S</div>
			<div class="cosmos-sub">Click to fly — WASD + Mouse | Shift = Boost | Ctrl = Brake</div>
			<div class="cosmos-hint">Explore Earth, Moon, Sun, space stations & asteroids</div>
		</div>
	{/if}
</div>

<!-- Cosmos Game HUD -->
<CosmosHud
	{ship}
	{locked}
	{nearestBody}
	{nearestDist}
	timeElapsed={time}
	destinations={[
		{ name: 'EARTH', distance: dist3(ship.position, WORLD.earth.pos), color: '#00ffcc' },
		{ name: 'MOON', distance: dist3(ship.position, [Math.cos(moonAngle)*WORLD.moon.dist, 0, Math.sin(moonAngle)*WORLD.moon.dist]), color: '#aaaacc' },
		{ name: 'SUN', distance: dist3(ship.position, WORLD.sun.pos), color: '#ffcc44' },
		{ name: 'ISS ALPHA', distance: dist3(ship.position, WORLD.stations[0].pos), color: '#00ffcc' },
		{ name: 'LUNAR GATE', distance: dist3(ship.position, WORLD.stations[1].pos), color: '#4466ff' },
		{ name: 'SUN OUTPOST', distance: dist3(ship.position, WORLD.stations[2].pos), color: '#ffcc44' },
	]}
/>

<!-- Curve scopes (bottom-right, only when flying) -->
{#if locked}
	<FlightHud {ship} {flightConfig} {rawInput} oncurvechange={handleCurveChange} />
{/if}

<!-- Warp effect overlay -->
{#if warp?.active}
	<div class="warp-overlay">
		<div class="warp-tunnel"></div>
		<div class="warp-text">WARPING TO {warp.targetName}</div>
		<div class="warp-bar"><div class="warp-fill" style:width="{warp.progress * 100}%"></div></div>
	</div>
{/if}

<!-- Fuel/shield/dock status bar -->
<div class="status-bar">
	<div class="sb-item"><span class="sb-label">FUEL</span><div class="sb-bar"><div class="sb-fill fuel" style:width="{player.fuel}%"></div></div></div>
	<div class="sb-item"><span class="sb-label">SHIELD</span><div class="sb-bar"><div class="sb-fill shield" style:width="{(player.shield / (SHIP_CLASSES.find(s => s.id === player.shipClass)?.shield ?? 100)) * 100}%"></div></div></div>
	{#if player.docked}<div class="sb-docked">DOCKED: {player.dockedAt}</div>{/if}
</div>

<!-- Game Panel (Tab to open) -->
<GamePanel
	{player}
	visible={showGamePanel}
	{gpsMissions}
	onclose={() => showGamePanel = false}
	onwarp={(pos, name) => { warp = initWarp(ship.position, pos, name); showGamePanel = false; }}
	onshipchange={(id) => { player.shipClass = id; const s = SHIP_CLASSES.find(c => c.id === id); if (s) { player.hull = s.hull; player.shield = s.shield; } }}
	ondock={(action) => {
		if (action === 'refuel') player.fuel = 100;
		if (action === 'repair') { const s = SHIP_CLASSES.find(c => c.id === player.shipClass); if (s) player.hull = s.hull; }
	}}
/>

<!-- Cosmos badge -->
<div class="cosmos-badge">
	<span class="badge-dot"></span>
	COSMOS
	<span class="badge-mode">{locked ? 'FLYING' : 'CLICK TO FLY'}</span>
	<span class="badge-hint">TAB = Menu | V = Warp</span>
</div>

<style>
	.lock-area {
		position: absolute;
		inset: 0;
		z-index: 30;
		cursor: crosshair;
	}
	.lock-area.locked { cursor: none; pointer-events: none; }

	.lock-prompt {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		pointer-events: none;
		animation: breathe 3s ease-in-out infinite;
	}

	.cosmos-title {
		font-size: 1.4rem;
		letter-spacing: 0.6em;
		color: #00ffcc55;
		text-shadow: 0 0 30px #00ffcc22, 0 0 60px #00ffcc11;
		margin-bottom: 0.6rem;
	}

	.cosmos-sub {
		font-size: 0.55rem;
		color: #00ffcc44;
		letter-spacing: 0.12em;
		margin-bottom: 0.3rem;
	}

	.cosmos-hint {
		font-size: 0.45rem;
		color: #ffffff22;
		letter-spacing: 0.08em;
	}

	@keyframes breathe { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }

	.nav-overlay {
		position: absolute;
		top: 50px;
		left: 16px;
		pointer-events: none;
		z-index: 40;
	}

	.nearest {
		display: flex;
		flex-direction: column;
		margin-bottom: 1rem;
	}

	.nav-label { font-size: 0.4rem; color: #555; letter-spacing: 0.12em; margin-bottom: 2px; }
	.nav-body { font-size: 0.8rem; color: #00ffcc; font-weight: 300; }
	.nav-dist { font-size: 0.55rem; color: #00ffcc88; }

	.proximity-alert {
		font-size: 0.5rem;
		color: #ffcc44;
		letter-spacing: 0.1em;
		margin-bottom: 0.8rem;
		animation: blink 1s infinite;
	}

	.proximity-alert.danger {
		color: #ff44aa;
		text-shadow: 0 0 6px #ff44aa66;
	}

	@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

	.destinations {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.dest-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.5rem;
		color: #888;
	}

	.dest-dot {
		width: 5px; height: 5px; border-radius: 50%;
	}
	.dest-dot.earth { background: #00ffcc; }
	.dest-dot.moon { background: #aaaacc; }
	.dest-dot.sun { background: #ffcc44; }
	.dest-dist { margin-left: auto; color: #555; font-variant-numeric: tabular-nums; }

	.cosmos-badge {
		position: absolute;
		bottom: 12px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.8rem;
		background: rgba(10, 10, 18, 0.85);
		border: 1px solid #1a1a2a;
		border-radius: 4px;
		font-size: 0.5rem;
		letter-spacing: 0.2em;
		color: #00ffcc88;
		pointer-events: none;
		z-index: 40;
		backdrop-filter: blur(4px);
	}

	.badge-dot {
		width: 5px; height: 5px; border-radius: 50%;
		background: #00ffcc;
		box-shadow: 0 0 6px #00ffcc66;
		animation: breathe 2s infinite;
	}

	.badge-mode { color: #4466ff; margin-left: 0.3rem; }
	.badge-hint { color: #333; font-size: 0.35rem; margin-left: 0.5rem; }

	/* Warp effect */
	.warp-overlay {
		position: absolute; inset: 0; z-index: 60;
		display: flex; flex-direction: column; align-items: center; justify-content: center;
		pointer-events: none;
		background: radial-gradient(ellipse at center, rgba(68, 102, 255, 0.05) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.8) 100%);
	}
	.warp-tunnel {
		width: 200px; height: 200px; border-radius: 50%;
		border: 2px solid #4466ff33;
		box-shadow: 0 0 40px #4466ff22, inset 0 0 40px #4466ff11;
		animation: warpSpin 0.5s linear infinite;
	}
	@keyframes warpSpin { from { transform: rotate(0deg) scale(0.8); } to { transform: rotate(360deg) scale(1.2); } }
	.warp-text { font-size: 0.6rem; color: #4466ff; letter-spacing: 0.2em; margin-top: 1rem; animation: breathe 1s infinite; }
	.warp-bar { width: 200px; height: 3px; background: #111; border-radius: 2px; margin-top: 0.5rem; overflow: hidden; }
	.warp-fill { height: 100%; background: linear-gradient(90deg, #4466ff, #00ffcc); transition: width 0.2s; }

	/* Status bar */
	.status-bar {
		position: absolute; bottom: 36px; left: 50%; transform: translateX(-50%);
		display: flex; align-items: center; gap: 0.8rem;
		padding: 0.3rem 1rem; background: rgba(8,8,14,0.8);
		border: 1px solid #1a1a2a; border-radius: 4px;
		pointer-events: none; z-index: 40; backdrop-filter: blur(4px);
	}
	.sb-item { display: flex; align-items: center; gap: 0.3rem; }
	.sb-label { font-size: 0.35rem; color: #555; letter-spacing: 0.1em; min-width: 32px; }
	.sb-bar { width: 60px; height: 3px; background: #111; border-radius: 2px; overflow: hidden; }
	.sb-fill { height: 100%; transition: width 0.3s; }
	.sb-fill.fuel { background: #00ffcc; }
	.sb-fill.shield { background: #4466ff; }
	.sb-docked {
		font-size: 0.4rem; color: #44ff88; letter-spacing: 0.1em;
		padding: 0.15rem 0.4rem; background: #44ff8815; border: 1px solid #44ff8833; border-radius: 3px;
	}
</style>
