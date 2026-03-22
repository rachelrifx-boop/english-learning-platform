# 数据库连接修复指南

## 问题
Vercel 无法连接到 Supabase PostgreSQL 数据库。

## 解决方案

### 方案 1：使用 Supabase 连接池（推荐）

Supabase 提供了连接池服务，专门用于 serverless 环境（如 Vercel）。

#### 步骤：

1. **登录 Supabase Dashboard**
   - 访问 https://supabase.com/dashboard
   - 选择你的项目

2. **找到连接池信息**
   - 点击左侧菜单的 **Settings** → **Database**
   - 向下滚动到 **Connection Pooling** 部分
   - 你会看到两个连接字符串：
     - **Transaction mode** (用于事务)
     - **Session mode** (用于长连接)

3. **复制连接字符串**
   - 复制 **Transaction mode** 的连接字符串
   - 格式类似：`postgresql://postgres:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
   - 注意：端口是 `6543` 而不是 `5432`

4. **更新 Vercel 环境变量**
   使用以下命令更新 `DATABASE_URL`：

   ```bash
   # 先删除旧的 DATABASE_URL
   vercel env rm DATABASE_URL production

   # 添加新的连接池 URL
   vercel env add DATABASE_URL production
   ```

   当提示输入值时，粘贴你复制的连接池 URL。

5. **重新部署**
   ```bash
   vercel --prod
   ```

### 方案 2：允许所有 IP 访问（不推荐，仅用于测试）

如果你不想使用连接池，可以临时允许所有 IP 访问：

#### 步骤：

1. **登录 Supabase Dashboard**
   - 访问 https://supabase.com/dashboard
   - 选择你的项目

2. **配置网络设置**
   - 点击 **Settings** → **Database**
   - 找到 **Connection info** 部分
   - 点击 **View database settings**

3. **添加防火墙规则**
   - 找到 **Database settings** → **Connection restrictions**
   - 添加规则：`0.0.0.0/0` (允许所有 IP)
   - **注意：这会降低安全性，只用于测试！**

4. **重新部署**
   ```bash
   vercel --prod
   ```

## 验证修复

部署完成后，访问健康检查端点：

```
https://english-learning-platform-rosy.vercel.app/api/health
```

应该返回类似：
```json
{
  "success": true,
  "status": "healthy",
  "database": "connected",
  "userCount": 0,
  "timestamp": "2026-03-22T..."
}
```

## 测试登录

1. 访问 https://english-learning-platform-rosy.vercel.app/
2. 点击"登录"
3. 输入邮箱和密码
4. 应该能成功登录

## 常见问题

### Q: 为什么会出现这个问题？
A: Vercel 使用 serverless 函数，每次请求可能来自不同的 IP 地址。Supabase 默认只允许特定 IP 访问，以保护数据库安全。

### Q: 连接池和直连有什么区别？
A:
- **直连** (`port 5432`): 直接连接数据库，适合传统服务器
- **连接池** (`port 6543`): 通过 Supabase 的连接池服务，适合 serverless 环境（Vercel、AWS Lambda 等）

### Q: 使用连接池有什么限制？
A: 连接池模式下，某些功能可能受限（如 prepared statements）。但对于基本的 CRUD 操作，完全足够。

## 推荐做法

**强烈推荐使用方案 1（连接池）**，因为：
1. ✅ 更安全
2. ✅ 专为 serverless 环境优化
3. ✅ 自动管理连接
4. ✅ 性能更好

---

**创建时间：** 2026-03-22
**适用环境：** Vercel + Supabase + Next.js
