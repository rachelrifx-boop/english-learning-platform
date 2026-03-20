import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-this')

export interface JWTPayload {
  userId: string
  email: string
  role: string
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as JWTPayload
  } catch (error) {
    return null
  }
}

export async function verifyUser(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return null

    const payload = await verifyToken(token)
    if (!payload) return null

    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, username: true, role: true }
    })

    return user
  } catch (error) {
    console.error('Verify user error:', error)
    return null
  }
}

export async function verifyAdmin(request: NextRequest) {
  try {
    const user = await verifyUser(request)
    if (!user || user.role !== 'ADMIN') return null
    return user
  } catch (error) {
    console.error('Verify admin error:', error)
    return null
  }
}

