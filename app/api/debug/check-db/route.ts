import { NextResponse } from 'next/server'

export async function GET() {
  const result: Record<string, any> = {
    timestamp: new Date().toISOString(),
    steps: []
  }

  result.steps.push({ step: '1. Loading Prisma', status: 'started' })

  try {
    // 动态导入 Prisma
    const { PrismaClient } = require('@prisma/client')
    result.steps.push({ step: '1. Loading Prisma', status: 'success' })
  } catch (e: any) {
    result.steps.push({ step: '1. Loading Prisma', status: 'failed', error: e.message })
    return NextResponse.json(result)
  }

  result.steps.push({ step: '2. Creating Prisma Client', status: 'started' })
  let prisma
  try {
    const { PrismaClient } = require('@prisma/client')
    prisma = new PrismaClient()
    result.steps.push({ step: '2. Creating Prisma Client', status: 'success' })
  } catch (e: any) {
    result.steps.push({ step: '2. Creating Prisma Client', status: 'failed', error: e.message })
    return NextResponse.json(result)
  }

  result.steps.push({ step: '3. Connecting to Database', status: 'started' })
  try {
    await prisma.$connect()
    result.steps.push({ step: '3. Connecting to Database', status: 'success' })
  } catch (e: any) {
    result.steps.push({ step: '3. Connecting to Database', status: 'failed', error: e.message })
    return NextResponse.json(result)
  }

  result.steps.push({ step: '4. Querying User Count', status: 'started' })
  try {
    const count = await prisma.user.count()
    result.steps.push({ step: '4. Querying User Count', status: 'success', count })
  } catch (e: any) {
    result.steps.push({ step: '4. Querying User Count', status: 'failed', error: e.message, errorName: e.name, fullError: String(e) })
  }

  result.steps.push({ step: '5. Finding User by Email', status: 'started' })
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    })
    result.steps.push({ step: '5. Finding User by Email', status: 'success', found: !!user })
  } catch (e: any) {
    result.steps.push({ step: '5. Finding User by Email', status: 'failed', error: e.message, errorName: e.name, fullError: String(e) })
  }

  try {
    await prisma.$disconnect()
  } catch {}

  return NextResponse.json(result)
}
