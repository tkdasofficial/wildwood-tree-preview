import { createFileRoute } from "@tanstack/react-router";
import Scene from "@/game/Scene";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Stylized Forest Tree – 3D Preview" },
      { name: "description", content: "Interactive 3D preview of a thick-trunked stylized survival-game tree." },
      { property: "og:title", content: "Stylized Forest Tree – 3D Preview" },
      { property: "og:description", content: "Orbit, zoom and toggle the breeze on a stylized hardwood tree." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Scene,
});
