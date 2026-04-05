import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

// 定义需要保护的路由（所有内容页面都需要登录）
const protectedRoutes = [
  '/',              // 首页/视频列表
  '/videos',        // 视频详情页
  '/admin',         // 管理后台
  '/vocabulary',    // 词汇页面
  '/favorites',     // 收藏页面
  '/completed',     // 已完成课程
  '/settings',      // 设置页面
  '/notes',         // 笔记页面
  '/feedback',      // 反馈页面
  '/landing'        // 着陆页（如果存在）
]
// 定义需要管理员权限的路由
const adminRoutes = ['/admin']
// 定义认证路由（已登录用户不能访问，会重定向到首页）
const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/sign-in']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('token')?.value

  console.log(`[Middleware] Path: ${pathname}, Token exists: ${!!token}`)

  // 验证 token
  let user = null
  if (token) {
    user = await verifyToken(token)
    console.log(`[Middleware] User: ${user ? user.email : 'null'}`)
  }

  // 检查是否是管理后台
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))
  if (isAdminRoute) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 检查是否是受保护的路由
  const isProtectedRoute = protectedRoutes.some(route => {
    // 首页精确匹配，其他路由使用 startsWith
    if (route === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(route)
  })
  console.log(`[Middleware] isProtectedRoute: ${isProtectedRoute}, hasUser: ${!!user}`)
  if (isProtectedRoute && !user) {
    console.log(`[Middleware] Redirecting to /login`)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 检查是否是认证路由
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
