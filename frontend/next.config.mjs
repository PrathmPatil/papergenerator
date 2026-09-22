/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["*.trycloudflare.com"],
  async rewrites() {
    const api = process.env.BACKEND_ORIGIN || "http://127.0.0.1:5000";
    return [
      { source: "/api/:path*", destination: `${api}/api/:path*` },
      { source: "/uploads/:path*", destination: `${api}/uploads/:path*` },
    ];
  },
};

export default nextConfig
