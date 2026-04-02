"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AGENT_NODES, AGENT_MAP } from "./agentData";
import type { BrainVariantProps } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NodeMesh extends THREE.Mesh {
  userData: {
    slug: string;
    baseScale: number;
    targetScale: number;
    pointLight: THREE.PointLight;
  };
}

interface LabelState {
  visible: boolean;
  x: number;
  y: number;
  slug: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROTATION_SPEED = 0.003;
const PARALLAX_STRENGTH = 0.18;
const LERP_SPEED = 0.08;
const PARTICLE_COUNT = 200;
const SCENE_SCALE = 1.0; // world-space scale applied to positions

// ─── Component ────────────────────────────────────────────────────────────────

export default function BrainVariantA({
  onAgentSelect,
  activeSlug,
}: BrainVariantProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [label, setLabel] = useState<LabelState>({
    visible: false,
    x: 0,
    y: 0,
    slug: "",
  });

  // Keep a ref to the latest activeSlug so the animation loop can read it
  // without re-creating the whole effect
  const activeSlugRef = useRef<string | undefined>(activeSlug);
  useEffect(() => {
    activeSlugRef.current = activeSlug;
  }, [activeSlug]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const setSize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    // ── Scene ────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();

    // ── Camera ───────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.01,
      100
    );
    camera.position.set(0, 0, 2.5);
    camera.lookAt(0, 0, 0);

    setSize();

    // ── Lights ───────────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x09090f, 4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(0, 3, 2);
    scene.add(dirLight);

    // ── Brain Group (rotates as a whole) ──────────────────────────────────────
    const brainGroup = new THREE.Group();
    scene.add(brainGroup);

    // ── Node Meshes ───────────────────────────────────────────────────────────
    const nodeMeshes: NodeMesh[] = [];
    const meshBySlug: Record<string, NodeMesh> = {};

    for (const node of AGENT_NODES) {
      const radius = node.weight * 0.042;
      const geo = new THREE.SphereGeometry(radius, 32, 32);
      const color = new THREE.Color(node.color);

      const mat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.8,
        roughness: 0.25,
        metalness: 0.4,
      });

      const mesh = new THREE.Mesh(geo, mat) as NodeMesh;
      const [x, y, z] = node.position;
      mesh.position.set(x * SCENE_SCALE, y * SCENE_SCALE, z * SCENE_SCALE);

      const baseScale = 1.0;
      mesh.scale.setScalar(baseScale);

      // Point light at node
      const ptLight = new THREE.PointLight(node.color, 0.9, 0.8, 2);
      ptLight.position.copy(mesh.position);
      brainGroup.add(ptLight);

      mesh.userData = {
        slug: node.slug,
        baseScale,
        targetScale: baseScale,
        pointLight: ptLight,
      };

      brainGroup.add(mesh);
      nodeMeshes.push(mesh);
      meshBySlug[node.slug] = mesh;
    }

    // ── Connection Lines ──────────────────────────────────────────────────────
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x1e1e30,
      transparent: true,
      opacity: 0.4,
    });

    // Build a set to avoid duplicate pairs
    const drawnPairs = new Set<string>();
    const lineGeos: THREE.BufferGeometry[] = [];

    for (const node of AGENT_NODES) {
      const fromMesh = meshBySlug[node.slug];
      if (!fromMesh) continue;

      for (const targetSlug of node.connections) {
        const toMesh = meshBySlug[targetSlug];
        if (!toMesh) continue;

        const pairKey = [node.slug, targetSlug].sort().join("|");
        if (drawnPairs.has(pairKey)) continue;
        drawnPairs.add(pairKey);

        const points = [fromMesh.position.clone(), toMesh.position.clone()];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        lineGeos.push(lineGeo);
        const line = new THREE.Line(lineGeo, lineMat);
        brainGroup.add(line);
      }
    }

    // ── Background Particles ──────────────────────────────────────────────────
    const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    const particleVelocities = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      particlePositions[i3] = (Math.random() - 0.5) * 5;
      particlePositions[i3 + 1] = (Math.random() - 0.5) * 5;
      particlePositions[i3 + 2] = (Math.random() - 0.5) * 5;

      particleVelocities[i3] = (Math.random() - 0.5) * 0.0003;
      particleVelocities[i3 + 1] = (Math.random() - 0.5) * 0.0003;
      particleVelocities[i3 + 2] = (Math.random() - 0.5) * 0.0003;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );

    const particleMat = new THREE.PointsMaterial({
      color: 0x3a3a5c,
      size: 0.012,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles); // not in brainGroup — stays fixed while brain rotates

    // ── Raycaster + Mouse State ───────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 0.05 };
    const mouse = new THREE.Vector2(9999, 9999); // off-screen initially

    // Camera parallax target
    const cameraTarget = new THREE.Vector3(0, 0, 2.5);
    const cameraBase = new THREE.Vector3(0, 0, 2.5);

    let currentHoveredSlug: string | null = null;

    // ── Mouse Handlers ────────────────────────────────────────────────────────
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouse.set(nx, ny);

      // Parallax: tilt camera toward mouse
      cameraTarget.set(
        cameraBase.x + nx * PARALLAX_STRENGTH,
        cameraBase.y + ny * PARALLAX_STRENGTH * 0.6,
        cameraBase.z
      );
    };

    const onClick = () => {
      if (currentHoveredSlug) {
        onAgentSelect(currentHoveredSlug);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      onMouseMove({ clientX: e.clientX, clientY: e.clientY } as MouseEvent);
    };
    const onPointerUp = () => {
      if (currentHoveredSlug) onAgentSelect(currentHoveredSlug);
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);

    // ── Resize Observer ───────────────────────────────────────────────────────
    const resizeObserver = new ResizeObserver(() => setSize());
    resizeObserver.observe(container);

    // ── Animation Loop ────────────────────────────────────────────────────────
    // Reusable scratch vectors — avoids per-frame THREE.Vector3 allocations
    const _scaleTarget = new THREE.Vector3();
    const _worldPos = new THREE.Vector3();
    let rafId: number;
    let previousHoveredMesh: NodeMesh | null = null;

    const animate = () => {
      rafId = requestAnimationFrame(animate);

      // Rotate brain group
      brainGroup.rotation.y += ROTATION_SPEED;

      // Drift particles
      const pos = particleGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        (pos.array as Float32Array)[i3] += particleVelocities[i3];
        (pos.array as Float32Array)[i3 + 1] += particleVelocities[i3 + 1];
        (pos.array as Float32Array)[i3 + 2] += particleVelocities[i3 + 2];

        // Wrap
        for (let axis = 0; axis < 3; axis++) {
          if (Math.abs((pos.array as Float32Array)[i3 + axis]) > 2.5) {
            (pos.array as Float32Array)[i3 + axis] *= -1;
          }
        }
      }
      pos.needsUpdate = true;

      // Lerp camera toward parallax target
      camera.position.lerp(cameraTarget, LERP_SPEED);
      camera.lookAt(0, 0, 0);

      // ── Raycasting ──────────────────────────────────────────────────────────
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);

      let hoveredMesh: NodeMesh | null = null;
      if (intersects.length > 0) {
        hoveredMesh = intersects[0].object as NodeMesh;
      }

      // Update hovered state
      if (hoveredMesh !== previousHoveredMesh) {
        // Reset previous
        if (previousHoveredMesh) {
          previousHoveredMesh.userData.targetScale =
            previousHoveredMesh.userData.baseScale;
          const prevMat = previousHoveredMesh.material as THREE.MeshStandardMaterial;
          prevMat.emissiveIntensity = 0.8;
          previousHoveredMesh.userData.pointLight.intensity = 0.9;
          canvas.style.cursor = "default";
        }

        // Apply hover
        if (hoveredMesh) {
          hoveredMesh.userData.targetScale =
            hoveredMesh.userData.baseScale * 1.4;
          const mat = hoveredMesh.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 1.5;
          hoveredMesh.userData.pointLight.intensity = 1.6;
          canvas.style.cursor = "pointer";
          currentHoveredSlug = hoveredMesh.userData.slug;
        } else {
          currentHoveredSlug = null;
        }
        previousHoveredMesh = hoveredMesh;
      }

      // ── Node Scale Lerp + Active State ─────────────────────────────────────
      const active = activeSlugRef.current;
      for (const mesh of nodeMeshes) {
        const isActive = active && mesh.userData.slug === active;
        const target = isActive
          ? mesh.userData.baseScale * 1.2
          : mesh.userData.targetScale;
        _scaleTarget.set(target, target, target);
        mesh.scale.lerp(_scaleTarget, LERP_SPEED);

        if (isActive) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 1.2;
          mesh.userData.pointLight.intensity = 1.3;
        }
      }

      // ── Label Positioning ───────────────────────────────────────────────────
      if (hoveredMesh) {
        // Project world position to screen (reuse scratch vector)
        _worldPos.set(0, 0, 0);
        hoveredMesh.getWorldPosition(_worldPos);
        _worldPos.project(camera);

        const rect = canvas.getBoundingClientRect();
        const sx = ((_worldPos.x + 1) / 2) * rect.width;
        const sy = ((-_worldPos.y + 1) / 2) * rect.height;

        setLabel({
          visible: true,
          x: sx,
          y: sy,
          slug: hoveredMesh.userData.slug,
        });
      } else {
        setLabel((prev) =>
          prev.visible ? { ...prev, visible: false } : prev
        );
      }

      renderer.render(scene, camera);
    };

    animate();

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      resizeObserver.disconnect();
      scene.clear(); // detach all objects before releasing the WebGL context
      renderer.dispose();

      // Dispose geometries + materials
      for (const mesh of nodeMeshes) {
        mesh.geometry.dispose();
        (mesh.material as THREE.MeshStandardMaterial).dispose();
      }
      lineGeos.forEach((g) => g.dispose());
      particleGeo.dispose();
      particleMat.dispose();
      lineMat.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onAgentSelect]); // onAgentSelect is stable from parent; activeSlug via ref

  // ── Label node data ─────────────────────────────────────────────────────────
  const labelNode = label.slug ? AGENT_MAP[label.slug] : null;

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ touchAction: "none" }}
      />

      {/* Hover Label */}
      {label.visible && labelNode && (
        <div
          style={{
            position: "absolute",
            left: label.x,
            top: label.y,
            transform: "translate(-50%, -110%)",
            background: "rgba(18,18,31,0.95)",
            border: `1px solid ${labelNode.color}40`,
            color: "#ededf5",
            padding: "8px 12px",
            borderRadius: "10px",
            fontSize: "12px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            maxWidth: "220px",
            boxShadow: `0 0 12px ${labelNode.color}30`,
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontWeight: 600,
              marginBottom: "3px",
              color: labelNode.color,
              letterSpacing: "0.03em",
            }}
          >
            {labelNode.shortName}
          </div>
          <div
            style={{
              opacity: 0.8,
              whiteSpace: "normal",
              lineHeight: "1.4",
              maxWidth: "200px",
            }}
          >
            {labelNode.description.slice(0, 60)}
            {labelNode.description.length > 60 ? "…" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
