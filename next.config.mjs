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
  experimental: {
    // 增加 API 路由超时时间（字幕生成需要较长时间）
    serverActionsBodySizeLimit: '50mb',
    serverComponentsExternalPackages: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],
  },
  // 确保 AWS SDK 包正确处理
  serverExternalPackages: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],
  // 增加静态生成超时
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
};

export default nextConfig;
