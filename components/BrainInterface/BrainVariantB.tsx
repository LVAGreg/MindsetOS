"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { AGENT_NODES } from "./agentData";
import type { BrainVariantProps } from "./types";

// ─── Lobe Definitions ─────────────────────────────────────────────────────────

interface LobeDef {
  name: string;
  color: string;
  position: [number, number, number];
  scale: [number, number, number];
  primarySlug: string;
}

const LOBES: LobeDef[] = [
  { name: "assessment",     color: "#F59E0B", position: [0,     0.5,   0.2],  scale: [0.35, 0.30, 0.35], primarySlug: "mindset-score"        },
  { name: "coaching",       color: "#8B5CF6", position: [0.45,  0.2,   0.1],  scale: [0.38, 0.32, 0.30], primarySlug: "architecture-coach"   },
  { name: "self-awareness", color: "#EC4899", position: [-0.45, 0.0,  -0.1],  scale: [0.36, 0.30, 0.32], primarySlug: "inner-world-mapper"   },
  { name: "strategy",       color: "#3B82F6", position: [0.1,   0.1,   0.45], scale: [0.30, 0.28, 0.25], primarySlug: "decision-framework"   },
  { name: "accountability", color: "#059669", position: [0.5,  -0.1,  -0.3],  scale: [0.30, 0.28, 0.28], primarySlug: "accountability-partner"},
  { name: "mindset",        color: "#A855F7", position: [-0.35, 0.1,   0.2],  scale: [0.40, 0.35, 0.38], primarySlug: "belief-debugger"      },
  { name: "performance",    color: "#FBBF24", position: [0,    -0.5,  -0.2],  scale: [0.38, 0.28, 0.35], primarySlug: "energy-optimizer"     },
  { name: "content",        color: "#14B8A6", position: [0,    -0.3,   0.35], scale: [0.28, 0.22, 0.25], primarySlug: "conversation-curator" },
];

// ─── Label State (projected screen positions) ─────────────────────────────────

interface LabelData {
  slug: string;
  shortName: string;
  color: string;
  x: number; // px from left
  y: number; // px from top
  visible: boolean;
}

interface TooltipData {
  lobeName: string;
  lobeColor: string;
  agents: string[];
  x: number;
  y: number;
}

// ─── Scene refs (not state — no re-renders) ───────────────────────────────────

interface SceneRefs {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  lobeMeshes: THREE.Mesh[];           // index matches LOBES
  wireframes: THREE.Mesh[];
  pointLights: THREE.PointLight[];
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  hoveredLobeIdx: number;
  animFrameId: number;
  targetRotY: number;
  targetTiltX: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BrainVariantB({ onAgentSelect, activeSlug }: BrainVariantProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneRefs | null>(null);

  const [labels, setLabels] = useState<LabelData[]>([]);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Map: category → agent slugs
  const categoryAgents = useCallback((): Map<string, string[]> => {
    const m = new Map<string, string[]>();
    for (const lobe of LOBES) m.set(lobe.name, []);
    for (const agent of AGENT_NODES) {
      const bucket = m.get(agent.category);
      if (bucket) bucket.push(agent.shortName);
    }
    return m;
  }, []);

  // Project a 3D position to 2D screen coords
  const projectToScreen = useCallback(
    (
      pos: THREE.Vector3,
      camera: THREE.PerspectiveCamera,
      width: number,
      height: number
    ): { x: number; y: number } => {
      const v = pos.clone().project(camera);
      return {
        x: ((v.x + 1) / 2) * width,
        y: ((-v.y + 1) / 2) * height,
      };
    },
    []
  );

  // Build label positions from agent 3D positions
  const rebuildLabels = useCallback(
    (camera: THREE.PerspectiveCamera, width: number, height: number) => {
      const next: LabelData[] = AGENT_NODES.map((agent) => {
        const pos = new THREE.Vector3(...agent.position);
        const { x, y } = projectToScreen(pos, camera, width, height);
        // Cull labels that project behind camera
        const ndc = pos.clone().project(camera);
        return {
          slug: agent.slug,
          shortName: agent.shortName,
          color: agent.color,
          x,
          y,
          visible: ndc.z < 1,
        };
      });
      setLabels(next);
    },
    [projectToScreen]
  );

  // ── Setup Three.js scene ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
    camera.position.set(0, 0.1, 2.2);
    camera.lookAt(0, 0, 0);

    // ── Lighting ────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1.5, 2, 1);
    scene.add(dirLight);

    // Point lights per lobe (added after lobes so indices match)
    const pointLights: THREE.PointLight[] = [];

    // ── Lobes ───────────────────────────────────────────────────────────────
    const lobeMeshes: THREE.Mesh[] = [];
    const wireframes: THREE.Mesh[] = [];
    const baseGeometry = new THREE.SphereGeometry(1, 32, 24);

    LOBES.forEach((lobe) => {
      const [px, py, pz] = lobe.position;
      const [sx, sy, sz] = lobe.scale;

      // Solid lobe
      const mat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(lobe.color),
        emissive: new THREE.Color(lobe.color),
        emissiveIntensity: 0.15,
        transparent: true,
        opacity: 0.35,
        side: THREE.FrontSide,
        shininess: 40,
        specular: new THREE.Color(lobe.color).multiplyScalar(0.3),
      });

      const mesh = new THREE.Mesh(baseGeometry, mat);
      mesh.position.set(px, py, pz);
      mesh.scale.set(sx, sy, sz);
      mesh.userData = { lobeIdx: lobeMeshes.length, lobeName: lobe.name };
      scene.add(mesh);
      lobeMeshes.push(mesh);

      // Wireframe overlay
      const wireMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(lobe.color),
        wireframe: true,
        transparent: true,
        opacity: 0.12,
      });
      const wireMesh = new THREE.Mesh(baseGeometry, wireMat);
      wireMesh.position.set(px, py, pz);
      wireMesh.scale.set(sx * 1.001, sy * 1.001, sz * 1.001); // hair above solid
      wireMesh.userData = { lobeIdx: wireframes.length };
      scene.add(wireMesh);
      wireframes.push(wireMesh);

      // Point light
      const pl = new THREE.PointLight(new THREE.Color(lobe.color), 0.2, 2);
      pl.position.set(px, py, pz);
      scene.add(pl);
      pointLights.push(pl);
    });

    // ── Raycaster + mouse ────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-9, -9);

    // ── Scene refs ───────────────────────────────────────────────────────────
    const refs: SceneRefs = {
      renderer,
      scene,
      camera,
      lobeMeshes,
      wireframes,
      pointLights,
      raycaster,
      mouse,
      hoveredLobeIdx: -1,
      animFrameId: 0,
      targetRotY: 0,
      targetTiltX: 0,
    };
    sceneRef.current = refs;

    // Initial label pass
    rebuildLabels(camera, W, H);

    // ── Animation loop ───────────────────────────────────────────────────────
    const catAgents = categoryAgents();

    function animate() {
      refs.animFrameId = requestAnimationFrame(animate);

      // Auto-rotation
      refs.targetRotY += 0.002;

      // Smooth tilt toward mouse parallax
      scene.rotation.y = refs.targetRotY;
      scene.rotation.x += (refs.targetTiltX - scene.rotation.x) * 0.06;

      // Raycasting
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(lobeMeshes, false);
      const hitIdx = hits.length > 0 ? (hits[0].object.userData.lobeIdx as number) : -1;

      if (hitIdx !== refs.hoveredLobeIdx) {
        // Restore previous
        if (refs.hoveredLobeIdx >= 0) {
          const prevMat = lobeMeshes[refs.hoveredLobeIdx].material as THREE.MeshPhongMaterial;
          prevMat.emissiveIntensity = 0.15;
          prevMat.opacity = 0.35;
          const ps = LOBES[refs.hoveredLobeIdx].scale;
          lobeMeshes[refs.hoveredLobeIdx].scale.set(ps[0], ps[1], ps[2]);
          pointLights[refs.hoveredLobeIdx].intensity = 0.2;
        }
        refs.hoveredLobeIdx = hitIdx;

        if (hitIdx >= 0) {
          const mat = lobeMeshes[hitIdx].material as THREE.MeshPhongMaterial;
          mat.emissiveIntensity = 0.6;
          mat.opacity = 0.65;
          const ls = LOBES[hitIdx].scale;
          lobeMeshes[hitIdx].scale.set(ls[0] * 1.05, ls[1] * 1.05, ls[2] * 1.05);
          pointLights[hitIdx].intensity = 0.5;

          // Build tooltip
          const lobePos = new THREE.Vector3(...LOBES[hitIdx].position);
          const cw = container.clientWidth;
          const ch = container.clientHeight;
          const projected = projectToScreen(lobePos, camera, cw, ch);
          const agentNames = catAgents.get(LOBES[hitIdx].name) ?? [];
          setTooltip({
            lobeName: LOBES[hitIdx].name,
            lobeColor: LOBES[hitIdx].color,
            agents: agentNames,
            x: projected.x,
            y: projected.y,
          });
        } else {
          setTooltip(null);
        }
      }

      // Sync wireframe positions/scales to lobe meshes (handles hover scale)
      lobeMeshes.forEach((mesh, i) => {
        wireframes[i].position.copy(mesh.position);
        wireframes[i].scale.copy(mesh.scale).multiplyScalar(1.001);
      });

      // Rebuild labels each frame (they follow the rotating scene)
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      rebuildLabels(camera, cw, ch);

      renderer.render(scene, camera);
    }

    animate();

    // ── Resize handler ────────────────────────────────────────────────────────
    function onResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    const resizeObs = new ResizeObserver(onResize);
    resizeObs.observe(container);

    // ── Mouse move ────────────────────────────────────────────────────────────
    function onMouseMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      refs.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      refs.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      // Parallax tilt: ±0.12 rad
      refs.targetTiltX = -refs.mouse.y * 0.12;
    }

    function onMouseLeave() {
      refs.mouse.set(-9, -9);
      refs.targetTiltX = 0;
      setTooltip(null);
    }

    function onClick(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const tempMouse = new THREE.Vector2(mx, my);
      const rc = new THREE.Raycaster();
      rc.setFromCamera(tempMouse, camera);
      const hits = rc.intersectObjects(lobeMeshes, false);
      if (hits.length > 0) {
        const idx = hits[0].object.userData.lobeIdx as number;
        onAgentSelect(LOBES[idx].primarySlug);
      }
    }

    function onPointerMove(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      onMouseMove({ clientX: e.clientX, clientY: e.clientY } as MouseEvent);
    }
    function onPointerUp(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      onClick({ clientX: e.clientX, clientY: e.clientY } as MouseEvent);
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);

    return () => {
      cancelAnimationFrame(refs.animFrameId);
      resizeObs.disconnect();
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      renderer.dispose();
      // Do NOT dispose baseGeometry here — each mesh clones it via scale,
      // but THREE reuses the buffer. Dispose per-mesh geometry instead.
      refs.lobeMeshes.forEach((m) => m.geometry.dispose());
      refs.wireframes.forEach((m) => m.geometry.dispose());
    };
  }, [categoryAgents, onAgentSelect, projectToScreen, rebuildLabels]);

  // Highlight active lobe when activeSlug changes
  useEffect(() => {
    const refs = sceneRef.current;
    if (!refs) return;
    const activeAgent = AGENT_NODES.find((a) => a.slug === activeSlug);
    if (!activeAgent) return;
    const lobeIdx = LOBES.findIndex((l) => l.name === activeAgent.category);
    if (lobeIdx < 0) return;

    LOBES.forEach((_, i) => {
      const mat = refs.lobeMeshes[i].material as THREE.MeshPhongMaterial;
      if (i === lobeIdx) {
        mat.emissiveIntensity = 0.45;
        mat.opacity = 0.55;
        refs.pointLights[i].intensity = 0.4;
      } else {
        mat.emissiveIntensity = 0.10;
        mat.opacity = 0.28;
        refs.pointLights[i].intensity = 0.12;
      }
    });
  }, [activeSlug]);

  // ── Label rendering helpers ──────────────────────────────────────────────────
  const activeAgent = AGENT_NODES.find((a) => a.slug === activeSlug);
  const activeCategory = activeAgent?.category ?? null;

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* Three.js canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-pointer"
        style={{ display: "block" }}
      />

      {/* Agent short-name labels overlay */}
      {labels.map((label) => {
        const isActive = label.slug === activeSlug;
        const agent = AGENT_NODES.find((a) => a.slug === label.slug)!;
        const isInActiveCategory = activeCategory !== null && agent.category === activeCategory;
        if (!label.visible) return null;
        return (
          <div
            key={label.slug}
            className="absolute pointer-events-none select-none flex items-center gap-1"
            style={{
              left: label.x,
              top: label.y,
              transform: "translate(-50%, -50%)",
              opacity: isActive ? 1 : isInActiveCategory ? 0.9 : 0.55,
              transition: "opacity 0.3s",
              zIndex: isActive ? 20 : 10,
            }}
          >
            {/* Dot indicator */}
            <span
              className="rounded-full flex-shrink-0"
              style={{
                width: isActive ? 5 : 3,
                height: isActive ? 5 : 3,
                backgroundColor: label.color,
                boxShadow: isActive ? `0 0 6px ${label.color}` : "none",
              }}
            />
            {/* Name */}
            <span
              style={{
                fontSize: 10,
                fontFamily: "ui-monospace, monospace",
                fontWeight: isActive ? 600 : 400,
                color: label.color,
                textShadow: `0 0 8px ${label.color}80`,
                whiteSpace: "nowrap",
                letterSpacing: "0.03em",
              }}
            >
              {label.shortName}
            </span>
          </div>
        );
      })}

      {/* Tooltip on lobe hover */}
      {tooltip && (
        <div
          className="absolute pointer-events-none select-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, calc(-100% - 12px))",
            zIndex: 30,
          }}
        >
          <div
            className="rounded-lg px-3 py-2 text-xs backdrop-blur-sm"
            style={{
              background: "rgba(0, 0, 0, 0.78)",
              border: `1px solid ${tooltip.lobeColor}40`,
              boxShadow: `0 0 16px ${tooltip.lobeColor}30`,
              minWidth: 120,
              maxWidth: 180,
            }}
          >
            {/* Lobe title */}
            <div
              className="font-semibold mb-1 uppercase tracking-widest"
              style={{
                fontSize: 9,
                color: tooltip.lobeColor,
                letterSpacing: "0.1em",
              }}
            >
              {tooltip.lobeName}
            </div>
            {/* Agent list */}
            {tooltip.agents.length > 0 ? (
              <ul className="space-y-0.5">
                {tooltip.agents.map((name) => (
                  <li
                    key={name}
                    className="text-white/70"
                    style={{ fontSize: 10, fontFamily: "ui-monospace, monospace" }}
                  >
                    · {name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-white/40" style={{ fontSize: 10 }}>
                No agents mapped
              </p>
            )}
          </div>
          {/* Caret */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-1.5 overflow-hidden"
          >
            <div
              className="w-2 h-2 rotate-45 mx-auto"
              style={{
                background: "rgba(0,0,0,0.78)",
                border: `1px solid ${tooltip.lobeColor}40`,
                transform: "translateY(-50%) rotate(45deg)",
              }}
            />
          </div>
        </div>
      )}

      {/* Bottom legend: lobe colour key */}
      <div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 flex-wrap justify-center"
        style={{ zIndex: 10 }}
      >
        {LOBES.map((lobe) => (
          <div
            key={lobe.name}
            className="flex items-center gap-1 cursor-pointer"
            onClick={() => {
              const agent = AGENT_NODES.find((a) => a.category === lobe.name);
              if (agent) onAgentSelect(agent.slug);
            }}
          >
            <span
              className="rounded-full"
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                backgroundColor: lobe.color,
                boxShadow: `0 0 5px ${lobe.color}80`,
                opacity:
                  activeCategory === null || activeCategory === lobe.name ? 1 : 0.35,
                transition: "opacity 0.3s",
              }}
            />
            <span
              className="text-white/60 uppercase"
              style={{
                fontSize: 8,
                fontFamily: "ui-monospace, monospace",
                letterSpacing: "0.08em",
                opacity:
                  activeCategory === null || activeCategory === lobe.name ? 1 : 0.35,
                transition: "opacity 0.3s",
              }}
            >
              {lobe.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
