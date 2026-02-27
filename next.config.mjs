/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Módulos nativos que no deben ser bundleados por webpack
  serverExternalPackages: ["@libsql/client"],
}

export default nextConfig
