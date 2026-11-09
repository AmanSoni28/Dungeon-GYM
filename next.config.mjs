/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // optional: build into another folder (e.g. to verify a build while `npm run dev` is running)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  transpilePackages: ["three"],
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 85],
    deviceSizes: [640, 828, 1080, 1280, 1600, 1920, 2560],
  },
};

export default nextConfig;
