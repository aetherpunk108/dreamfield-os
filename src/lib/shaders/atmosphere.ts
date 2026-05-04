/**
 * Phase 14: Custom shader materials for atmosphere, warp, and ghost effects.
 */

import * as THREE from 'three';

/**
 * Atmospheric scattering shader for planet rim glow.
 */
export function createAtmosphereShader(color = '#4488ff', intensity = 1.0): THREE.ShaderMaterial {
	return new THREE.ShaderMaterial({
		uniforms: {
			uColor: { value: new THREE.Color(color) },
			uIntensity: { value: intensity },
			uTime: { value: 0 },
		},
		vertexShader: `
			varying vec3 vNormal;
			varying vec3 vPosition;
			void main() {
				vNormal = normalize(normalMatrix * normal);
				vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
		fragmentShader: `
			uniform vec3 uColor;
			uniform float uIntensity;
			uniform float uTime;
			varying vec3 vNormal;
			varying vec3 vPosition;
			void main() {
				vec3 viewDir = normalize(-vPosition);
				float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
				rim = pow(rim, 3.0) * uIntensity;
				float pulse = 1.0 + sin(uTime * 0.5) * 0.1;
				gl_FragColor = vec4(uColor * rim * pulse, rim * 0.8);
			}
		`,
		transparent: true,
		side: THREE.BackSide,
		depthWrite: false,
	});
}

/**
 * Warp speed tunnel shader (for flight boost effect).
 */
export function createWarpShader(): THREE.ShaderMaterial {
	return new THREE.ShaderMaterial({
		uniforms: {
			uTime: { value: 0 },
			uSpeed: { value: 0 },
			uColor: { value: new THREE.Color('#00ffcc') },
		},
		vertexShader: `
			varying vec2 vUv;
			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
		fragmentShader: `
			uniform float uTime;
			uniform float uSpeed;
			uniform vec3 uColor;
			varying vec2 vUv;
			void main() {
				vec2 center = vUv - 0.5;
				float dist = length(center);
				float angle = atan(center.y, center.x);
				float streak = sin(angle * 20.0 + uTime * 10.0 * uSpeed) * 0.5 + 0.5;
				streak *= smoothstep(0.5, 0.1, dist);
				streak *= uSpeed;
				float alpha = streak * 0.6;
				gl_FragColor = vec4(uColor * streak, alpha);
			}
		`,
		transparent: true,
		depthWrite: false,
		side: THREE.DoubleSide,
	});
}

/**
 * Ghost quantum shimmer shader.
 */
export function createGhostShimmerShader(color = '#00ffcc'): THREE.ShaderMaterial {
	return new THREE.ShaderMaterial({
		uniforms: {
			uColor: { value: new THREE.Color(color) },
			uTime: { value: 0 },
			uCollapse: { value: 0 }, // 0 = superposition, 1 = collapsed
			uOpacity: { value: 0.7 },
		},
		vertexShader: `
			uniform float uTime;
			uniform float uCollapse;
			varying vec3 vNormal;
			varying vec3 vPosition;
			varying float vDisplacement;
			void main() {
				vNormal = normalize(normalMatrix * normal);
				// Quantum shimmer displacement (reduces when collapsed)
				float shimmer = sin(position.x * 10.0 + uTime * 3.0)
					* cos(position.y * 8.0 + uTime * 2.0)
					* sin(position.z * 12.0 + uTime * 4.0);
				float displace = shimmer * 0.05 * (1.0 - uCollapse);
				vDisplacement = shimmer;
				vec3 newPos = position + normal * displace;
				vPosition = (modelViewMatrix * vec4(newPos, 1.0)).xyz;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
			}
		`,
		fragmentShader: `
			uniform vec3 uColor;
			uniform float uTime;
			uniform float uCollapse;
			uniform float uOpacity;
			varying vec3 vNormal;
			varying vec3 vPosition;
			varying float vDisplacement;
			void main() {
				vec3 viewDir = normalize(-vPosition);
				float fresnel = pow(1.0 - max(0.0, dot(viewDir, vNormal)), 2.0);
				vec3 color = uColor;
				// When collapsed, shift toward white/solid
				color = mix(color, vec3(1.0), uCollapse * 0.3);
				// Shimmer highlights
				float highlight = abs(vDisplacement) * (1.0 - uCollapse) * 0.5;
				color += highlight;
				float alpha = (fresnel * 0.5 + 0.3 + highlight) * uOpacity;
				// Fade edges more in superposition
				alpha *= mix(0.7, 1.0, uCollapse);
				gl_FragColor = vec4(color, alpha);
			}
		`,
		transparent: true,
		depthWrite: false,
	});
}

/**
 * Scan pulse shader (expanding ring effect).
 */
export function createScanPulseShader(): THREE.ShaderMaterial {
	return new THREE.ShaderMaterial({
		uniforms: {
			uTime: { value: 0 },
			uRadius: { value: 0 },
			uMaxRadius: { value: 10.0 },
			uColor: { value: new THREE.Color('#00ffcc') },
		},
		vertexShader: `
			varying vec2 vUv;
			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
		fragmentShader: `
			uniform float uTime;
			uniform float uRadius;
			uniform float uMaxRadius;
			uniform vec3 uColor;
			varying vec2 vUv;
			void main() {
				vec2 center = vUv - 0.5;
				float dist = length(center) * 2.0;
				float ring = smoothstep(uRadius - 0.02, uRadius, dist)
					* smoothstep(uRadius + 0.02, uRadius, dist);
				ring *= 1.0 - (uRadius / uMaxRadius); // fade as expands
				gl_FragColor = vec4(uColor, ring * 0.8);
			}
		`,
		transparent: true,
		depthWrite: false,
		side: THREE.DoubleSide,
	});
}
