/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The worker shares lib/ with the app; these packages only run on the server.
  serverExternalPackages: ["postgres", "web-push"],
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] }];
  },
};

export default nextConfig;
