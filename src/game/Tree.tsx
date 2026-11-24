import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { createOakTree } from "../../tree";

/** Preview wrapper: the tree itself lives in ./tree (framework-free Three.js). */
export function Tree({ sway }: { sway: boolean }) {
  const oak = useMemo(() => createOakTree(), []);
  useEffect(() => oak.setSway(sway), [oak, sway]);
  useEffect(() => () => oak.dispose(), [oak]);
  useFrame((_, dt) => oak.update(dt));
  return <primitive object={oak.group} />;
}
