import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

// 在生产环境也复用实例，避免 serverless 环境中连接池耗尽
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// 优雅关闭连接（仅在非 serverless 环境）
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}
