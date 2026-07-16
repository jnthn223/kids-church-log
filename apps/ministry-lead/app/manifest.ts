import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KidsChurchLog Ministry Lead",
    short_name: "KCL Lead",
    description: "Children’s-ministry oversight and access governance",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F2EC",
    theme_color: "#F6F2EC",
    icons: []
  };
}
