<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';

	let time = $state(0);
	useTask((delta) => { time += delta; });

	const gridMaterial = new THREE.ShaderMaterial({
		transparent: true,
		side: THREE.DoubleSide,
		depthWrite: false,
		uniforms: {
			uTime: { value: 0 },
			uColor: { value: new THREE.Color(0x00ffcc) },
		},
		vertexShader: `
			varying vec2 vUv;
			varying vec3 vWorldPos;
			void main() {
				vUv = uv;
				vec4 worldPos = modelMatrix * vec4(position, 1.0);
				vWorldPos = worldPos.xyz;
				gl_Position = projectionMatrix * viewMatrix * worldPos;
			}
		`,
		fragmentShader: `
			uniform float uTime;
			uniform vec3 uColor;
			varying vec2 vUv;
			varying vec3 vWorldPos;

			void main() {
				vec2 grid = abs(fract(vWorldPos.xz) - 0.5);
				float line = min(grid.x, grid.y);
				float gridAlpha = 1.0 - smoothstep(0.0, 0.05, line);

				float dist = length(vWorldPos.xz);
				float fade = 1.0 - smoothstep(2.0, 15.0, dist);

				float pulse = 0.5 + 0.5 * sin(uTime * 0.5 - dist * 0.3);

				float alpha = gridAlpha * fade * pulse * 0.3;
				gl_FragColor = vec4(uColor, alpha);
			}
		`
	});

	const planeGeo = new THREE.PlaneGeometry(40, 40);
	const gridMesh = new THREE.Mesh(planeGeo, gridMaterial);
	gridMesh.rotation.x = -Math.PI / 2;
	gridMesh.position.y = -0.01;

	$effect(() => {
		gridMaterial.uniforms.uTime.value = time;
	});
</script>

<T is={gridMesh} />
