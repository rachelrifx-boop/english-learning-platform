/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 在生产构建时禁用 ESLint 警告作为错误
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 在生产构建时禁用 TypeScript 类型检查警告
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
