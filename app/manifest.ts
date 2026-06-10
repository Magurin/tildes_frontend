import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tildes AI — спасаем умирающие языки",
    short_name: "Tildes AI",
    description:
      "Платформа сохранения исчезающих языков через общение с носителем.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf6ee",
    theme_color: "#b45309",
    lang: "ru",
    categories: ["education", "reference"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
