import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: '登出成功'
  })

  response.cookies.delete('token')

  return response
}
