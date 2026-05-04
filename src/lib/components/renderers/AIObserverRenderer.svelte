<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';
	import type { AIObserverConfig, AIObserverState } from '$lib/agents/observer-ai.js';
	import type { Ghost } from '$lib/spatial/primitives/ghost.js';

	interface Agent {
		id: string;
		name: string;
		color: string;
		state: AIObserverState;
	}

	interface Props {
		agents: Agent[];
		ghosts: Ghost[];
	}

	let { agents, ghosts }: Props = $props();

	// Per-agent state for animation
	interface AgentVisual {
		time: number;
		flashTimer: number;
		prevMood: string;
		trail: THREE.Vector3[];
		trailGeo: THREE.BufferGeometry;
		trailPositions: Float32Array;
		labelSprite: THREE.Sprite;
		group: THREE.Group;
		orb: THREE.Mesh;
		ring: THREE.Mesh;
		attentionLine: THREE.Line;
		attentionLineGeo: THREE.BufferGeometry;
		pointLight: THREE.PointLight;
	}

	const TRAIL_LENGTH = 30;

	function makeLabel(name: string, color: string): THREE.Sprite {
		const canvas = document.createElement('canvas');
		canvas.width = 128;
		canvas.height = 32;
		const ctx = canvas.getContext('2d')!;
		ctx.clearRect(0, 0, 128, 32);
		ctx.font = 'bold 14px monospace';
		ctx.fillStyle = color;
		ctx.shadowColor = color;
		ctx.shadowBlur = 6;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(name, 64, 16);
		const tex = new THREE.CanvasTexture(canvas);
		const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
		const sprite = new THREE.Sprite(mat);
		sprite.scale.set(0.6, 0.15, 1);
		return sprite;
	}

	function makeTrailGeo(): { geo: THREE.BufferGeometry; positions: Float32Array } {
		const positions = new Float32Array(TRAIL_LENGTH * 3);
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		return { geo, positions };
	}

	function makeAttentionLineGeo(): { geo: THREE.BufferGeometry } {
		const positions = new Float32Array(6); // 2 points * 3 components
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		return { geo };
	}

	function buildAgentVisual(agent: Agent): AgentVisual {
		const color = new THREE.Color(agent.color);

		// Orb
		const orbGeo = new THREE.SphereGeometry(0.15, 16, 12);
		const orbMat = new THREE.MeshStandardMaterial({
			color,
			emissive: color,
			emissiveIntensity: 1.5,
			transparent: true,
			opacity: 0.9,
			depthWrite: false,
		});
		const orb = new THREE.Mesh(orbGeo, orbMat);

		// Pulsing ring
		const ringGeo = new THREE.RingGeometry(0.22, 0.27, 48);
		const ringMat = new THREE.MeshBasicMaterial({
			color,
			transparent: true,
			opacity: 0.4,
			side: THREE.DoubleSide,
			depthWrite: false,
		});
		const ring = new THREE.Mesh(ringGeo, ringMat);
		ring.rotation.x = Math.PI / 2;

		// Point light
		const pointLight = new THREE.PointLight(color, 1.2, 3, 2);

		// Label sprite
		const labelSprite = makeLabel(agent.name, agent.color);
		labelSprite.position.set(0, 0.35, 0);

		// Trail
		const { geo: trailGeo, positions: trailPositions } = makeTrailGeo();
		const trailMat = new THREE.PointsMaterial({
			color,
			size: 0.04,
			transparent: true,
			opacity: 0.5,
			depthWrite: false,
			sizeAttenuation: true,
		});
		const trailPoints = new THREE.Points(trailGeo, trailMat);

		// Attention line
		const { geo: attentionLineGeo } = makeAttentionLineGeo();
		const attentionLineMat = new THREE.LineBasicMaterial({
			color,
			transparent: true,
			opacity: 0.2,
			depthWrite: false,
		});
		const attentionLine = new THREE.Line(attentionLineGeo, attentionLineMat);

		// Group
		const group = new THREE.Group();
		group.add(orb);
		group.add(ring);
		group.add(pointLight);
		group.add(labelSprite);
		group.add(trailPoints);
		group.add(attentionLine);

		const pos = agent.state.position;
		group.position.set(pos[0], pos[1], pos[2]);

		// Initialize trail positions at agent spawn
		for (let i = 0; i < TRAIL_LENGTH; i++) {
			trailPositions[i * 3] = pos[0];
			trailPositions[i * 3 + 1] = pos[1];
			trailPositions[i * 3 + 2] = pos[2];
		}
		trailGeo.attributes.position.needsUpdate = true;

		return {
			time: 0,
			flashTimer: 0,
			prevMood: agent.state.mood,
			trail: Array.from({ length: TRAIL_LENGTH }, () => new THREE.Vector3(pos[0], pos[1], pos[2])),
			trailGeo,
			trailPositions,
			labelSprite,
			group,
			orb,
			ring,
			attentionLine,
			attentionLineGeo,
			pointLight,
		};
	}

	// Build visuals reactively per agent id
	let visualMap = $state(new Map<string, AgentVisual>());

	$effect(() => {
		const currentIds = new Set(agents.map((a) => a.id));

		// Remove stale visuals
		for (const [id, vis] of visualMap) {
			if (!currentIds.has(id)) {
				vis.group.clear();
				visualMap.delete(id);
			}
		}

		// Add new visuals
		for (const agent of agents) {
			if (!visualMap.has(agent.id)) {
				visualMap.set(agent.id, buildAgentVisual(agent));
			}
		}
	});

	const ghostMap = $derived(new Map(ghosts.map((g) => [g.id, g])));

	useTask((delta) => {
		for (const agent of agents) {
			const vis = visualMap.get(agent.id);
			if (!vis) continue;

			vis.time += delta;

			const s = agent.state;
			const mood = s.mood;

			// Detect flash trigger: mood changed to excited
			if (mood === 'excited' && vis.prevMood !== 'excited') {
				vis.flashTimer = 0.4;
			}
			vis.prevMood = mood;
			if (vis.flashTimer > 0) vis.flashTimer -= delta;

			// Move group to agent position
			vis.group.position.set(s.position[0], s.position[1], s.position[2]);

			// Mood-driven pulse parameters
			let orbOpacity = 0.9;
			let emissiveIntensity = 1.5;
			let ringOpacity = 0.4;
			let lightIntensity = 1.2;
			let ringScale = 1.0;

			if (vis.flashTimer > 0) {
				// Excited flash
				const flashStrength = vis.flashTimer / 0.4;
				emissiveIntensity = 3.0 + flashStrength * 4.0;
				orbOpacity = 1.0;
				ringOpacity = 0.8;
				lightIntensity = 3.0 + flashStrength * 3.0;
				ringScale = 1.0 + flashStrength * 0.5;
			} else if (mood === 'curious') {
				// Gentle pulse
				const pulse = Math.sin(vis.time * 2.0) * 0.3;
				emissiveIntensity = 1.2 + pulse;
				ringOpacity = 0.3 + Math.sin(vis.time * 2.0) * 0.1;
				lightIntensity = 1.0 + pulse * 0.5;
			} else if (mood === 'focused') {
				// Steady glow
				emissiveIntensity = 2.0;
				ringOpacity = 0.5;
				lightIntensity = 1.8;
			} else if (mood === 'resting') {
				// Dim
				orbOpacity = 0.4;
				emissiveIntensity = 0.4;
				ringOpacity = 0.1;
				lightIntensity = 0.3;
			}

			// Apply to orb material
			const orbMat = vis.orb.material as THREE.MeshStandardMaterial;
			orbMat.opacity = orbOpacity;
			orbMat.emissiveIntensity = emissiveIntensity;

			// Animate ring
			const ringMat = vis.ring.material as THREE.MeshBasicMaterial;
			ringMat.opacity = ringOpacity;
			vis.ring.rotation.z = vis.time * 0.8;
			vis.ring.scale.setScalar(ringScale + Math.sin(vis.time * 3.0) * 0.05);

			// Point light
			vis.pointLight.intensity = lightIntensity;

			// Update trail: shift and prepend current position
			const pos = s.position;
			// Shift trail back
			for (let i = TRAIL_LENGTH - 1; i > 0; i--) {
				vis.trail[i].copy(vis.trail[i - 1]);
			}
			vis.trail[0].set(pos[0], pos[1], pos[2]);

			// Write to buffer with fading alpha encoded as y-offset (not possible in Points without custom shader)
			// Use position only; opacity fades via material
			for (let i = 0; i < TRAIL_LENGTH; i++) {
				vis.trailPositions[i * 3] = vis.trail[i].x;
				vis.trailPositions[i * 3 + 1] = vis.trail[i].y;
				vis.trailPositions[i * 3 + 2] = vis.trail[i].z;
			}
			vis.trailGeo.attributes.position.needsUpdate = true;

			// Update attention line
			const attentionGhost = s.attention ? ghostMap.get(s.attention) : null;
			const attPosAttr = vis.attentionLineGeo.attributes.position as THREE.BufferAttribute;
			const attArr = attPosAttr.array as Float32Array;

			if (attentionGhost) {
				// Line from agent (local 0,0,0 since group is positioned) to ghost world pos
				// We use world coords and keep line in world space (group not parent of line's geo coords)
				// Line is child of group so subtract group position
				attArr[0] = 0;
				attArr[1] = 0;
				attArr[2] = 0;
				attArr[3] = attentionGhost.position[0] - pos[0];
				attArr[4] = attentionGhost.position[1] - pos[1];
				attArr[5] = attentionGhost.position[2] - pos[2];
				attPosAttr.needsUpdate = true;
				vis.attentionLine.visible = true;
				const attLineMat = vis.attentionLine.material as THREE.LineBasicMaterial;
				attLineMat.opacity = 0.15 + Math.sin(vis.time * 3.0) * 0.05;
			} else {
				vis.attentionLine.visible = false;
			}
		}
	});
</script>

{#each agents as agent (agent.id)}
	{@const vis = visualMap.get(agent.id)}
	{#if vis}
		<T is={vis.group} />
	{/if}
{/each}
