import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Tree } from "./Tree";

function Ground() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#6f9a45"; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = Math.random() > 0.5 ? "rgba(60,100,35,0.5)" : "rgba(150,190,90,0.35)";
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 4);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <circleGeometry args={[30, 48]} />
      <meshStandardMaterial map={tex} roughness={1} />
    </mesh>
  );
}

export default function Scene() {
  const [sway, setSway] = useState(true);
  return (
    <div className="relative h-screen w-full bg-sky" data-scene-ready>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [9, 5, 9], fov: 40 }}>
        <color attach="background" args={["#cfe6ee"]} />
        <fog attach="fog" args={["#cfe6ee", 14, 48]} />
        <hemisphereLight args={["#e6f6ff", "#4f6e32", 0.75]} />
        <directionalLight position={[8, 14, 6]} intensity={2.8} color="#fff0d2" castShadow
          shadow-mapSize={[1024, 1024]} shadow-radius={4} shadow-camera-left={-8} shadow-camera-right={8}
          shadow-camera-top={10} shadow-camera-bottom={-4} shadow-bias={-0.0005} shadow-normalBias={0.03} />
        <Environment resolution={64}>
          <Lightformer intensity={1.5} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
          <Lightformer intensity={0.6} color="#9fd" position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
        </Environment>
        <Tree sway={sway} />
        <Ground />
        <ContactShadows position={[0, 0.01, 0]} opacity={0.6} scale={7} blur={2.2} far={3} resolution={256} frames={1} />
        <OrbitControls target={[0, 3.2, 0]} minDistance={3} maxDistance={25} maxPolarAngle={Math.PI / 2.05} enableDamping />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
        <div className="rounded-xl bg-card/80 px-4 py-2 backdrop-blur">
          <h1 className="font-semibold text-card-foreground">Oak · Hardwood</h1>
          <p className="text-xs text-muted-foreground">Drag to orbit · pinch / scroll to zoom</p>
        </div>
        <button onClick={() => setSway((s) => !s)}
          className="pointer-events-auto rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow">
          Breeze: {sway ? "On" : "Off"}
        </button>
      </div>
    </div>
  );
}
