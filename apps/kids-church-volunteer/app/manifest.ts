import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KidsChurchLog Sunday Team",
    short_name: "KCL Sunday",
    description: "Kids Church check-in and verified check-out",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F7FB",
    theme_color: "#2D6CDF",
    icons: []
  };
}
