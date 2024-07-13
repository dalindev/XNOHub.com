/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['avatars.githubusercontent.com', 'avatar.vercel.sh']
  },
  reactStrictMode: true,
  transpilePackages: ['@tremor/react'],
  experimental: {
  }
};

module.exports = nextConfig;
