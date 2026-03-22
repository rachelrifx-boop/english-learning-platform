# Vercel 部署修复指南

## 问题：登录按钮点击无反应

### 已修复的问题

1. **Cookie 设置优化**
   - 在生产环境中将 `sameSite` 设置为 `'none'`，以确保跨域请求时 cookie 能正确发送
   - 添加 `path: '/'` 确保 cookie 在所有路径下都可用

2. **统一认证配置**
   - 登录和注册 API 现在使用相同的 cookie 设置

### 需要在 Vercel 上检查的配置

#### 1. 环境变量配置

登录到 Vercel Dashboard，进入你的项目设置，确保以下环境变量已正确配置：

**必需的环境变量：**
- `DATABASE_URL` - PostgreSQL 数据库连接字符串
- `JWT_SECRET` - JWT token 签名密钥

**可选的环境变量：**
- `NEXT_PUBLIC_API_URL` - API 基础 URL

#### 2. 检查环境变量的步骤

1. 访问 https://vercel.com/dashboard
2. 选择你的项目 `english-learning-platform-rosy`
3. 点击 Settings → Environment Variables
4. 确保以下变量已设置：

```
DATABASE_URL = postgresql://postgres:Raifxdd#11ffr@db.cknvuclkzgylbmksfkfs.supabase.co:5432/postgres
JWT_SECRET = e84c71dd040c771717b0619634a65e7b6bfd88cdfcc6bab38a09b5ecf86f5011
```

**重要提示：**
- 确保环境变量在所有环境（Production, Preview, Development）中都设置
- 修改环境变量后需要重新部署才能生效

### 重新部署步骤

#### 方法 1：通过 Vercel Dashboard（推荐）

1. 访问 https://vercel.com/dashboard
2. 选择你的项目 `english-learning-platform-rosy`
3. 点击 "Deployments" 标签
4. 点击最新部署右侧的 "..." 菜单
5. 选择 "Redeploy"
6. 等待部署完成

#### 方法 2：通过 Vercel CLI

```bash
# 安装 Vercel CLI（如果尚未安装）
npm i -g vercel

# 登录 Vercel
vercel login

# 部署到生产环境
vercel --prod
```

#### 方法 3：通过 Git 推送

```bash
git add .
git commit -m "fix: 修复登录 cookie 设置问题"
git push origin main
```

### 验证修复

部署完成后，访问 https://english-learning-platform-rosy.vercel.app/ 并测试：

1. ✅ 点击登录按钮是否有响应
2. ✅ 输入邮箱和密码后点击登录
3. ✅ 检查是否成功跳转到首页
4. ✅ 检查浏览器开发者工具的 Console 标签，查看是否有错误

### 如果问题仍然存在

#### 检查浏览器控制台

1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签
3. 尝试登录
4. 查看是否有错误信息

#### 检查网络请求

1. 打开浏览器开发者工具（F12）
2. 切换到 Network 标签
3. 尝试登录
4. 查找 `/api/auth/login` 请求
5. 检查：
   - 请求状态码（应该是 200）
   - Response Headers 中的 `set-cookie` 是否存在
   - Response Body 是否包含 `success: true`

#### 常见问题排查

**问题 1：CORS 错误**
- 确认 `NEXT_PUBLIC_API_URL` 设置正确
- 如果使用自定义域名，确保域名已正确配置

**问题 2：Cookie 未设置**
- 检查浏览器设置，确保允许第三方 cookie
- 尝试在隐私模式下测试

**问题 3：数据库连接错误**
- 确认 `DATABASE_URL` 正确
- 检查数据库服务是否在线
- 验证数据库用户权限

### 联系支持

如果以上步骤都无法解决问题，请提供以下信息：

1. 浏览器控制台的错误截图
2. 网络请求的详细信息
3. Vercel 部署日志
4. 环境变量配置（隐藏敏感信息）

---

**最后更新：** 2026-03-22
