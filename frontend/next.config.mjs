/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    // 8GB dev box: static-workers each carry a ~2.2GB V8 heap floor;
    // cap to a single worker so `next build` doesn't OOM.
    cpus: 1
  }
};

export default nextConfig;