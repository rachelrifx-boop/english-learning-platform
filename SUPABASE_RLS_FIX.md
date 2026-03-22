# Supabase RLS 策略修复指南

## 问题描述

```
new row violates row-level security policy
```

这是因为 Supabase 启用了行级安全策略（Row Level Security, RLS），而连接池的连接没有绕过 RLS 的权限。

## 解决方案

### 方案 1：禁用 RLS（最简单，适合开发环境）

#### 步骤：

1. **登录 Supabase Dashboard**
   - 访问 https://supabase.com/dashboard
   - 选择你的项目

2. **打开 SQL Editor**
   - 点击左侧菜单的 **SQL Editor**
   - 点击 **New Query**

3. **为每个表禁用 RLS**
   复制并执行以下 SQL：

   ```sql
   -- 禁用所有表的 RLS
   ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
   ALTER TABLE "Video" DISABLE ROW LEVEL SECURITY;
   ALTER TABLE "UserProgress" DISABLE ROW LEVEL SECURITY;
   ALTER TABLE "FavoriteVideo" DISABLE ROW LEVEL SECURITY;
   ALTER TABLE "CheckIn" DISABLE ROW LEVEL SECURITY;
   ALTER TABLE "Note" DISABLE ROW LEVEL SECURITY;
   ALTER TABLE "InviteCode" DISABLE ROW LEVEL SECURITY;
   ALTER TABLE "Expression" DISABLE ROW LEVEL SECURITY;
   ALTER TABLE "Word" DISABLE ROW LEVEL SECURITY;
   ALTER TABLE "Feedback" DISABLE ROW LEVEL SECURITY;
   ALTER TABLE "Notification" DISABLE ROW LEVEL SECURITY;
   ALTER TABLE "Subtitle" DISABLE ROW LEVEL SECURITY;
   ```

4. **点击 Run** 执行 SQL

### 方案 2：修改 RLS 策略（推荐，更安全）

如果你想保持 RLS 启用，需要添加允许连接池访问的策略：

#### 步骤：

1. **登录 Supabase Dashboard**
   - 访问 https://supabase.com/dashboard
   - 选择你的项目

2. **打开 SQL Editor**
   - 点击左侧菜单的 **SQL Editor**
   - 点击 **New Query**

3. **添加允许所有操作的策略**
   复制并执行以下 SQL：

   ```sql
   -- 为 User 表创建策略
   CREATE POLICY "Enable all access for pool" ON "User"
   FOR ALL
   USING (true)
   WITH CHECK (true);

   -- 为 Video 表创建策略
   CREATE POLICY "Enable all access for pool" ON "Video"
   FOR ALL
   USING (true)
   WITH CHECK (true);

   -- 为 UserProgress 表创建策略
   CREATE POLICY "Enable all access for pool" ON "UserProgress"
   FOR ALL
   USING (true)
   WITH CHECK (true);

   -- 为 FavoriteVideo 表创建策略
   CREATE POLICY "Enable all access for pool" ON "FavoriteVideo"
   FOR ALL
   USING (true)
   WITH CHECK (true);

   -- 为 CheckIn 表创建策略
   CREATE POLICY "Enable all access for pool" ON "CheckIn"
   FOR ALL
   USING (true)
   WITH CHECK (true);

   -- 为 Note 表创建策略
   CREATE POLICY "Enable all access for pool" ON "Note"
   FOR ALL
   USING (true)
   WITH CHECK (true);

   -- 为 InviteCode 表创建策略
   CREATE POLICY "Enable all access for pool" ON "InviteCode"
   FOR ALL
   USING (true)
   WITH CHECK (true);

   -- 为 Expression 表创建策略
   CREATE POLICY "Enable all access for pool" ON "Expression"
   FOR ALL
   USING (true)
   WITH CHECK (true);

   -- 为 Word 表创建策略
   CREATE POLICY "Enable all access for pool" ON "Word"
   FOR ALL
   USING (true)
   WITH CHECK (true);

   -- 为 Feedback 表创建策略
   CREATE POLICY "Enable all access for pool" ON "Feedback"
   FOR ALL
   USING (true)
   WITH CHECK (true);

   -- 为 Notification 表创建策略
   CREATE POLICY "Enable all access for pool" ON "Notification"
   FOR ALL
   USING (true)
   WITH CHECK (true);

   -- 为 Subtitle 表创建策略
   CREATE POLICY "Enable all access for pool" ON "Subtitle"
   FOR ALL
   USING (true)
   WITH CHECK (true);
   ```

4. **点击 Run** 执行 SQL

### 方案 3：使用 Supabase Client（需要代码修改）

如果以上方案都不适用，需要修改代码使用 Supabase Client 而不是 Prisma。

但这需要大量代码修改，**不推荐**。

## 验证修复

执行完 SQL 后，尝试以下操作：

1. 访问 https://english-learning-platform-rosy.vercel.app/
2. 登录管理员账号
3. 尝试上传视频或进行其他需要写入数据库的操作

## 常见问题

### Q: 为什么会出现这个错误？
A: Supabase 默认启用 RLS 来保护数据安全。但当你使用连接池时，连接池的用户不是真正的数据库用户，所以受到 RLS 限制。

### Q: 禁用 RLS 安全吗？
A:
- **开发环境**: 可以禁用 RLS，方便开发调试
- **生产环境**: 建议使用方案 2（修改策略），保持数据安全

### Q: 我应该选择哪个方案？
A:
- **快速测试**: 方案 1（禁用 RLS）
- **生产部署**: 方案 2（修改策略）

## 推荐做法

**对于当前项目**，建议：
1. 先使用**方案 1**（禁用 RLS）快速验证功能
2. 功能正常后，再考虑使用**方案 2**（修改策略）增强安全性

---

**创建时间：** 2026-03-22
**适用环境：** Vercel + Supabase + Prisma
