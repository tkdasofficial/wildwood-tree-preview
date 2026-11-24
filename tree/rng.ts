/** Deterministic seeded RNG (Park–Miller). Same seed => identical tree. */
export function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}
