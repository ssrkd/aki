/** @type {import('next').NextConfig} */
const nextConfig = {
  // Настройка для корректной работы с Supabase
  experimental: {
    serverComponentsExternalPackages: [],
  },
}

export default nextConfig

