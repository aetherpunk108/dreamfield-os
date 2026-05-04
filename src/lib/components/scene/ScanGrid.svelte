<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';

	let time = $state(0);
	useTask((delta) => { time += delta; });

	const mat = new THREE.ShaderMaterial({
		transparent: true,
		side: THREE.DoubleSide,
		depthWrite: false,
		uniforms: {
			uTime: { value: 0 },
			uColor1: { value: new THREE.Color('#00ffcc') },
			uColor2: { value: new THREE.Color('#4466ff') },
		},
		vertexShader: `
			varying vec2 vUv;
			varying vec3 vWorldPos;
			void main() {
				vUv = uv;
				vec4 wp = modelMatrix * vec4(position, 1.0);
				vWorldPos = wp.xyz;
				gl_Position = projectionMatrix * viewMatrix * wp;
			}
		`,
		fragmentShader: `
			uniform float uTime;
			uniform vec3 uColor1;
			uniform vec3 uColor2;
			varying vec2 vUv;
			varying vec3 vWorldPos;

			void main() {
				// Grid lines
				vec2 grid = abs(fract(vWorldPos.xz * 0.5) - 0.5);
				float line = min(grid.x, grid.y);
				float gridAlpha = 1.0 - smoothstep(0.0, 0.03, line);

				// Sub-grid
				vec2 subGrid = abs(fract(vWorldPos.xz * 2.0) - 0.5);
				float subLine = min(subGrid.x, subGrid.y);
				float subAlpha = (1.0 - smoothstep(0.0, 0.02, subLine)) * 0.15;

				// Distance fade
				float dist = length(vWorldPos.xz);
				float fade = 1.0 - smoothstep(3.0, 18.0, dist);

				// Scan pulse ring
				float scanRadius = mod(uTime * 3.0, 25.0);
				float scanRing = 1.0 - smoothstep(0.0, 1.5, abs(dist - scanRadius));
				float scan2 = 1.0 - smoothstep(0.0, 1.0, abs(dist - mod(uTime * 1.5 + 12.0, 25.0)));

				// Radial gradient color
				vec3 col = mix(uColor1, uColor2, smoothstep(0.0, 15.0, dist));

				// Combine
				float alpha = (gridAlpha * 0.25 + subAlpha) * fade;
				alpha += scanRing * 0.15 * fade;
				alpha += scan2 * 0.08 * fade;

				// Center glow
				float center = exp(-dist * 0.3) * 0.08;
				alpha += center;

				gl_FragColor = vec4(col, alpha);
			}
		`
	});

	const geo = new THREE.PlaneGeometry(50, 50);
	const mesh = new THREE.Mesh(geo, mat);
	mesh.rotation.x = -Math.PI / 2;
	mesh.position.y = -0.02;

	$effect(() => { mat.uniforms.uTime.value = time; });
</script>

<T is={mesh} />
