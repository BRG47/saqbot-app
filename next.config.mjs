/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The worker shares lib/ with the app; these packages only run on the server.
  serverExternalPackages: ["postgres", "web-push"],
  async headers() {
    // The Content Security Policy is set per request in middleware.ts (it needs a fresh nonce).
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
    ];
    return [
      { source: "/:path*", headers: security },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};

export default nextConfig;
