import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Настройка для корректной работы с Supabase
  experimental: {
    serverComponentsExternalPackages: [],
  },
}

export default nextConfig
