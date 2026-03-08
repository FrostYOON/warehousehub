import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    // monorepo root: pnpm workspace에서 next가 루트 node_modules에 있어 올바른 resolve를 위해 필요
    root: path.resolve(__dirname, '..', '..'),
  },
};

export default nextConfig;
