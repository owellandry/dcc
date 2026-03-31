import type { NextConfig } from 'next'

const config: NextConfig = {
  allowedDevOrigins: ['192.168.1.23', 'latribu', 'LATRIBU'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
}

export default config
