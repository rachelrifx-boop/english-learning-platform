# Cloudflare R2 配置指南

## 📋 申请步骤

### 1. 申请R2访问权限

1. 访问 https://dash.cloudflare.com
2. 登录或注册账号
3. 在左侧菜单找到 **R2 Object Storage**
4. 点击 **"Request Access"** 或 **"Enable R2"**
5. 填写申请表单（说明：英语学习平台存储教育视频）
6. 等待审批（1-2个工作日）

---

### 2. 审批通过后的配置

#### 2.1 创建Bucket

1. 进入 **R2 Object Storage**
2. 点击 **"Create Bucket"**
3. 填写信息：
   - **Bucket name**: `english-learning-videos`
   - **Location**: 选择 **APAC**（亚太地区）
4. 点击 **"Create Bucket"**

#### 2.2 创建API Token

1. 在R2页面，点击 **"Manage R2 API Tokens"**
2. 点击 **"Create API Token"**
3. 配置：
   - **Token name**: `English Learning Platform`
   - **Permissions**: ✅ Read ✅ Edit ✅ List
   - **TTL**: `Never expire`
4. 点击 **"Create API Token"**
5. **复制并保存以下信息**：
   - Account ID
   - Access Key ID
   - Secret Access Key ⚠️ **只显示一次！**

#### 2.3 配置Public Access（可选，推荐）

为了通过自定义域名访问文件（更快的加载速度）：

1. 在你的域名设置中，添加CNAME记录：
   - **Name**: `videos`（或你喜欢的子域名）
   - **Target**: `[bucket-name].[account-id].r2.cloudflarestorage.com`
2. 在R2 Bucket设置中，启用Public Access
3. 自定义域名：`https://videos.yourdomain.com`

---

### 3. 配置环境变量

将以下信息添加到项目环境变量：

#### 本地开发（.env）：

```bash
# Cloudflare R2配置
CLOUDFLARE_R2_ACCOUNT_ID=你的Account_ID
CLOUDFLARE_R2_ACCESS_KEY_ID=你的Access_Key_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY=你的Secret_Access_Key
CLOUDFLARE_R2_BUCKET_NAME=english-learning-videos
CLOUDFLARE_R2_CUSTOM_DOMAIN=videos.yourdomain.com（可选）
```

#### Vercel生产环境：

```bash
vercel env add CLOUDFLARE_R2_ACCOUNT_ID production
vercel env add CLOUDFLARE_R2_ACCESS_KEY_ID production
vercel env add CLOUDFLARE_R2_SECRET_ACCESS_KEY production
vercel env add CLOUDFLARE_R2_BUCKET_NAME production
vercel env add CLOUDFLARE_R2_CUSTOM_DOMAIN production（可选）
```

---

## 📊 费用说明

### 免费额度：
- ✅ 存储：10GB/月
- ✅ Class A操作（上传）：100万次/月
- ✅ Class B操作（下载）：1000万次/月
- ✅ **出口流量：完全免费** ⭐

### 超出免费额度后的费用：
- 存储：$0.015/GB/月（约¥0.1/GB）
- Class A操作：$4.50/百万次
- Class B操作：$0.36/百万次

### 成本估算：

**场景：200个视频，每个平均100MB**
- 总存储：20GB
- 超出免费：10GB
- **月费用**：10GB × $0.015 = **$0.15/月**（约¥1）

**用户观看流量**：
- 假设每天100个用户，每人观看1个视频（100MB）
- 每月流量：100用户 × 100MB × 30天 = 300GB
- **其他云服务费用**：300GB × $0.09 = $27/月
- **Cloudflare R2费用**：**$0**（完全免费）💰

---

## 🚀 使用说明

配置完成后，在管理后台上传视频时：
1. 系统会自动使用R2存储（而不是Supabase）
2. 支持任意大小的视频文件
3. 显示上传进度
4. 无超时限制

---

## ❓ 常见问题

**Q: R2和Supabase Storage可以同时使用吗？**
A: 可以。小文件（<50MB）可以用Supabase，大文件用R2。代码会自动选择。

**Q: 如何从Supabase迁移到R2？**
A: 下载Supabase中的文件，然后上传到R2，更新数据库中的URL即可。

**Q: R2的访问速度怎么样？**
A: Cloudflare有全球CDN网络，访问速度很快。如果配置自定义域名，可以进一步优化。

**Q: 需要修改代码吗？**
A: 不需要。代码已经准备完毕，只需配置环境变量即可。

---

## 📞 获取帮助

审批通过后，请将以下信息告诉我：
- Account ID
- Access Key ID
- Secret Access Key
- Bucket Name
- Custom Domain（如果配置了）

我会帮你完成最后的配置！
