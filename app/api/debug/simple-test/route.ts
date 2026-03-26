import { NextResponse } from 'next/server'

export async function GET() {
  const results: Record<string, any> = {}

  // 测试 1: 环境变量
  results.env = {
    JWT_SECRET: !!process.env.JWT_SECRET,
    DATABASE_URL: !!process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV
  }

  // 测试 2: jose (JWT)
  try {
    const { SignJWT } = require('jose')
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'test-secret')
    const token = await new SignJWT({ test: 'data' })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret)
    results.jose = 'OK'
  } catch (e: any) {
    results.jose = e.message
  }

  // 测试 3: bcryptjs
  try {
    const bcrypt = require('bcryptjs')
    await bcrypt.hash('test', 10)
    results.bcryptjs = 'OK'
  } catch (e: any) {
    results.bcryptjs = e.message
  }

  // 测试 4: Prisma 加载
  try {
    const { PrismaClient } = require('@prisma/client')
    results.prismaLoad = 'OK'
  } catch (e: any) {
    results.prismaLoad = e.message
  }

  // 测试 5: Prisma 连接
  try {
    const { prisma } = require('@/lib/prisma')
    await prisma.$connect()
    results.prismaConnect = 'OK'
    await prisma.$disconnect()
  } catch (e: any) {
    results.prismaConnect = e.message
  }

  return NextResponse.json(results)
}
