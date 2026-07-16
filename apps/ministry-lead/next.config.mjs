/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  reactStrictMode: true,
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@kcl/firebase", "@kcl/types", "@kcl/ui", "@kcl/utils", "@kcl/validation"]
};

export default nextConfig;
