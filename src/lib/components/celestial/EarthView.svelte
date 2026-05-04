<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import * as THREE from 'three';

	export interface LocationPin {
		id: string;
		lat: number;
		lon: number;
		label?: string;
		color?: string;
	}

	interface Props {
		pins?: LocationPin[];
		selectedPinId?: string | null;
		onpinselect?: (id: string) => void;
		onlocationclick?: (lat: number, lon: number) => void;
	}

	const {
		pins = [],
		selectedPinId = null,
		onpinselect,
		onlocationclick,
	}: Props = $props();

	const EARTH_RADIUS = 3;

	// ---- Earth sphere (color-banded by latitude) ----
	// Use ShaderMaterial for latitude-based color banding
	const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 64, 48);

	const earthMat = new THREE.ShaderMaterial({
		uniforms: {
			uTime: { value: 0 },
		},
		vertexShader: /* glsl */`
			varying vec3 vNormal;
			varying vec3 vPosition;
			void main() {
				vNormal = normalize(normalMatrix * normal);
				vPosition = position;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
		fragmentShader: /* glsl */`
			varying vec3 vNormal;
			varying vec3 vPosition;
			void main() {
				// Latitude: sin(lat) = y / radius, range -1..1
				float lat = vPosition.y / ${EARTH_RADIUS.toFixed(1)};

				// Poles: blue-grey, mid-latitudes: mixed, equator: green
				vec3 polarColor    = vec3(0.12, 0.18, 0.35);
				vec3 midColor      = vec3(0.08, 0.22, 0.18);
				vec3 equatorColor  = vec3(0.06, 0.29, 0.14);

				float absLat = abs(lat);
				// 0 = equator, 1 = pole
				vec3 col = mix(equatorColor, midColor, smoothstep(0.0, 0.45, absLat));
				col = mix(col, polarColor, smoothstep(0.45, 0.9, absLat));

				// Simple diffuse shading from above
				float light = 0.35 + 0.65 * max(0.0, dot(vNormal, normalize(vec3(1.0, 0.6, 0.8))));
				col *= light;

				gl_FragColor = vec4(col, 0.92);
			}
		`,
		transparent: true,
	});

	const earthMesh = new THREE.Mesh(earthGeo, earthMat);

	// ---- Wireframe grid overlay (high detail) ----
	const wireGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.002, 64, 48);
	const wireMat = new THREE.MeshBasicMaterial({
		color: new THREE.Color('#00ffcc'),
		wireframe: true,
		transparent: true,
		opacity: 0.07,
		depthWrite: false,
	});
	const wireMesh = new THREE.Mesh(wireGeo, wireMat);

	// ---- Atmosphere rim glow ----
	const atmosGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.12, 48, 36);
	const atmosMat = new THREE.MeshBasicMaterial({
		color: new THREE.Color('#4488ff'),
		transparent: true,
		opacity: 0.13,
		side: THREE.BackSide,
		depthWrite: false,
	});
	const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);

	// Outer atmosphere halo
	const haloGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.22, 32, 24);
	const haloMat = new THREE.MeshBasicMaterial({
		color: new THREE.Color('#2255cc'),
		transparent: true,
		opacity: 0.04,
		side: THREE.BackSide,
		depthWrite: false,
	});
	const haloMesh = new THREE.Mesh(haloGeo, haloMat);

	// ---- Equator ring ----
	const equatorCurve = new THREE.EllipseCurve(0, 0, EARTH_RADIUS * 1.003, EARTH_RADIUS * 1.003, 0, Math.PI * 2, false, 0);
	const equatorPts = equatorCurve.getPoints(128);
	const equatorGeo = new THREE.BufferGeometry().setFromPoints(
		equatorPts.map(p => new THREE.Vector3(p.x, 0, p.y))
	);
	const equatorMat = new THREE.LineBasicMaterial({ color: '#00ffcc', transparent: true, opacity: 0.25 });
	const equatorLine = new THREE.Line(equatorGeo, equatorMat);

	// ---- Starfield (500 stars, radius 50) ----
	const STAR_COUNT = 500;
	const starPositions = new Float32Array(STAR_COUNT * 3);
	const starColors = new Float32Array(STAR_COUNT * 3);

	for (let i = 0; i < STAR_COUNT; i++) {
		const phi = Math.acos(1 - 2 * (i + 0.5) / STAR_COUNT);
		const theta = Math.PI * (1 + Math.sqrt(5)) * i;
		const r = 50;
		starPositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
		starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
		starPositions[i * 3 + 2] = r * Math.cos(phi);

		const t = Math.random();
		if (t < 0.6) {
			starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 1.0; starColors[i * 3 + 2] = 1.0;
		} else if (t < 0.82) {
			starColors[i * 3] = 0.82; starColors[i * 3 + 1] = 0.9; starColors[i * 3 + 2] = 1.0;
		} else {
			starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.9; starColors[i * 3 + 2] = 0.65;
		}
	}

	const starGeo = new THREE.BufferGeometry();
	starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
	starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

	const starMat = new THREE.PointsMaterial({
		vertexColors: true,
		size: 0.12,
		sizeAttenuation: true,
		transparent: true,
		opacity: 0.85,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	});
	const starPoints = new THREE.Points(starGeo, starMat);

	// ---- Ambient + directional lighting ----
	const ambientLight = new THREE.AmbientLight(0x111133, 0.5);
	const sunLight = new THREE.DirectionalLight(0xffeedd, 1.6);
	sunLight.position.set(10, 5, 8);

	// ---- Earth group ----
	const earthGroup = new THREE.Group();
	earthGroup.add(earthMesh, wireMesh, atmosMesh, haloMesh, equatorLine);

	// ---- Pin geometry helpers ----
	function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
		const phi = (90 - lat) * (Math.PI / 180);
		const theta = (lon + 180) * (Math.PI / 180);
		return new THREE.Vector3(
			-r * Math.sin(phi) * Math.cos(theta),
			r * Math.cos(phi),
			r * Math.sin(phi) * Math.sin(theta)
		);
	}

	function buildPinMesh(pin: LocationPin, selected: boolean): THREE.Group {
		const pinGroup = new THREE.Group();
		const pos = latLonToVec3(pin.lat, pin.lon, EARTH_RADIUS * 1.01);
		pinGroup.position.copy(pos);
		// Orient pin outward from sphere center
		pinGroup.lookAt(pos.clone().multiplyScalar(2));

		const color = pin.color ?? (selected ? '#ffcc00' : '#00ffcc');

		// Spike
		const spikeGeo = new THREE.CylinderGeometry(0, 0.025, 0.18, 6);
		const spikeMat = new THREE.MeshBasicMaterial({ color });
		const spike = new THREE.Mesh(spikeGeo, spikeMat);
		spike.position.y = 0.09;

		// Base dot
		const dotGeo = new THREE.SphereGeometry(0.035, 8, 6);
		const dotMat = new THREE.MeshBasicMaterial({
			color,
			transparent: true,
			opacity: selected ? 1.0 : 0.8,
		});
		const dot = new THREE.Mesh(dotGeo, dotMat);

		pinGroup.add(spike, dot);
		return pinGroup;
	}

	// Rebuild pin meshes reactively
	let pinGroup = $state(new THREE.Group());

	$effect(() => {
		// Remove old
		while (pinGroup.children.length) pinGroup.remove(pinGroup.children[0]);
		// Rebuild
		for (const pin of pins) {
			const mesh = buildPinMesh(pin, pin.id === selectedPinId);
			mesh.userData.pinId = pin.id;
			pinGroup.add(mesh);
		}
	});

	// ---- Raycasting for globe click (lat/lon) and pin selection ----
	const raycaster = new THREE.Raycaster();
	const mouse = new THREE.Vector2();

	function handleCanvasClick(event: MouseEvent) {
		const canvas = (event.target as HTMLElement).closest('canvas');
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		// We need the camera — grab from the scene's renderer context
		// Use the global THREE camera via the canvas's Threlte context is not directly accessible here,
		// so we store a camera ref via bind:ref on the T.PerspectiveCamera
		if (!cameraRef) return;
		raycaster.setFromCamera(mouse, cameraRef);

		// Check pins first
		const pinMeshes: THREE.Object3D[] = [];
		pinGroup.traverse(obj => { if (obj instanceof THREE.Mesh) pinMeshes.push(obj); });
		const pinHits = raycaster.intersectObjects(pinMeshes, false);
		if (pinHits.length > 0) {
			let obj: THREE.Object3D | null = pinHits[0].object;
			while (obj && !obj.userData.pinId) obj = obj.parent;
			if (obj?.userData.pinId) {
				onpinselect?.(obj.userData.pinId as string);
				return;
			}
		}

		// Check globe surface
		const globeHits = raycaster.intersectObject(earthMesh, false);
		if (globeHits.length > 0 && onlocationclick) {
			const pt = globeHits[0].point;
			// Convert intersection point back to lat/lon
			const r = pt.length();
			const lat = 90 - Math.acos(pt.y / r) * (180 / Math.PI);
			const lon = Math.atan2(pt.z, -pt.x) * (180 / Math.PI) - 180;
			onlocationclick(lat, lon);
		}
	}

	let cameraRef = $state<THREE.PerspectiveCamera | undefined>(undefined);

	// Per-frame: slowly pulse atmosphere
	let elapsed = $state(0);
	useTask((delta) => {
		elapsed += delta;
		atmosMat.opacity = 0.11 + 0.02 * Math.sin(elapsed * 0.8);
		(earthMat.uniforms.uTime as { value: number }).value = elapsed;
	});
</script>

<!-- Lighting -->
<T is={ambientLight} />
<T is={sunLight} />

<!-- Starfield -->
<T is={starPoints} />

<!-- Earth group -->
<T is={earthGroup} />

<!-- Pin group -->
<T is={pinGroup} />

<!-- Camera with OrbitControls (no autoRotate — user drags) -->
<T.PerspectiveCamera
	makeDefault
	bind:ref={cameraRef}
	fov={40}
	near={0.01}
	far={1000}
	position={[0, 0, 8]}
>
	<OrbitControls
		enableDamping
		dampingFactor={0.06}
		minDistance={3.5}
		maxDistance={30}
		target={[0, 0, 0]}
	/>
</T.PerspectiveCamera>

<!-- Click handler overlay (transparent, covers canvas) -->
<div
	class="earth-click-layer"
	role="button"
	tabindex="0"
	aria-label="Earth globe — click to place pin"
	onclick={handleCanvasClick}
	onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCanvasClick(e as unknown as MouseEvent); }}
></div>

<style>
	.earth-click-layer {
		position: absolute;
		inset: 0;
		cursor: crosshair;
		background: transparent;
		z-index: 1;
	}
</style>
