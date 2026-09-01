/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    // 8GB dev box: static-workers each carry a ~2.2GB V8 heap floor;
    // cap to a single worker so `next build` doesn't OOM.
    cpus: 1
  },
  async rewrites() {
    // Route all API traffic through the Next server so the app is a single
    // origin (same-origin admin cookies under SameSite=Strict work). The
    // backend runs on the internal loopback port on the same host/container.
    // Set INTERNAL_API_URL at BUILD time if the loopback port differs.
    const internal = (process.env.INTERNAL_API_URL || "http://127.0.0.1:4000").replace(/\/+$/, "");
    return [
      { source: "/api/:path*", destination: `${internal}/api/:path*` },
      { source: "/health", destination: `${internal}/health` }
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" }
        ]
      }
    ];
  }
};

export default nextConfig;