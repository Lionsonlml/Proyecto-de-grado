/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Configuración para sql.js
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push({
        'sql.js': 'commonjs sql.js'
      })
    }

    // Ignorar archivos .node de módulos nativos
    config.module = config.module || {}
    config.module.rules = config.module.rules || []
    
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    })

    return config
  },
}

export default nextConfig
