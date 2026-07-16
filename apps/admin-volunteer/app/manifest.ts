import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function manifest(): MetadataRoute.Manifest { return { name: "KidsChurchLog Registration", short_name: "KCL Register", description: "Assisted family registration and Family Pass issuance", start_url: "/", display: "standalone", background_color: "#F6F2EC", theme_color: "#FFC43D", icons: [] }; }
