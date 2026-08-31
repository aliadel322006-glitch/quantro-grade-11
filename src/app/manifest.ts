import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Quantro AI — Grade 11",
    short_name: "Quantro AI",
    description: "Bilingual interactive lessons for Grade 11 Programming and Artificial Intelligence.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f8f7ff",
    theme_color: "#6657e8",
    lang: "en",
    dir: "auto",
    categories: ["education"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
