/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
      }
    ]
  },
  reactStrictMode: true,
  transpilePackages: ['@tremor/react'],
  experimental: {
  }
};

module.exports = nextConfig;
