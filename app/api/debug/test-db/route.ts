import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {},
    tests: {}
  }

  // 检查环境变量
  results.env.JWT_SECRET = !!process.env.JWT_SECRET
  results.env.DATABASE_URL = !!process.env.DATABASE_URL
  results.env.NODE_ENV = process.env.NODE_ENV

  // 测试 Prisma 连接
  try {
    results.tests.prismaConnect = 'connecting...'
    await prisma.$connect()
    results.tests.prismaConnect = 'success'
  } catch (error: any) {
    results.tests.prismaConnect = `failed: ${error.message}`
  }

  // 测试数据库查询
  try {
    results.tests.dbQuery = 'querying...'
    const count = await prisma.user.count()
    results.tests.dbQuery = `success: ${count} users`
  } catch (error: any) {
    results.tests.dbQuery = `failed: ${error.message}`
  }

  // 测试 bcryptjs
  try {
    results.tests.bcrypt = 'testing...'
    const bcrypt = require('bcryptjs')
    const hash = await bcrypt.hash('test123', 10)
    const verify = await bcrypt.compare('test123', hash)
    results.tests.bcrypt = verify ? 'success' : 'failed'
  } catch (error: any) {
    results.tests.bcrypt = `failed: ${error.message}`
  }

  // 测试 jose (JWT)
  try {
    results.tests.jose = 'testing...'
    const { SignJWT } = require('jose')
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'test-secret')
    const token = await new SignJWT({ test: 'data' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret)
    results.tests.jose = `success: ${token.substring(0, 20)}...`
  } catch (error: any) {
    results.tests.jose = `failed: ${error.message}`
  }

  return NextResponse.json(results)
}
