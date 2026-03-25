# 英语学习平台 | English Learning Platform

一个功能完整的沉浸式英语学习平台，采用现代深色主题设计。

![English Learning Platform](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat&logo=tailwindcss)

## 功能特性

### 核心功能
- **邀请码注册系统** - 管理员生成邀请码，控制用户注册
- **视频课程管理** - 上传视频、封面、双语字幕（SRT/VTT）
- **自定义视频播放器**
  - 倍速播放（0.5x - 2x）
  - 循环模式（全片循环 / AB 段循环）
  - 键盘快捷键支持
- **双语字幕系统**
  - 中英文字幕同步显示
  - 点击字幕跳转播放
  - 当前字幕高亮跟随
  - 字幕独立滚动面板

### 单词学习
- **单词点读** - 点击字幕中的单词查看定义
- **词性着色** - 不同词性用不同颜色标注
- **Web Speech API 发音** - 即时朗读单词
- **单词收藏** - 保存到个人单词本
- **Flashcard 复习模式** - 翻转卡片记忆单词

### 表达卡片
- 收藏整句英文表达
- 带中文翻译和时间戳
- 关联视频来源

### 跟读录音
- 录制自己的发音
- 波形可视化
- 回放对比原声

### 管理后台
- 视频上传管理
- 字幕文件绑定
- 邀请码批量生成
- 用户列表查看

### 单词本页面
- 列表 / Flashcard 两种模式
- 导出为 PDF（使用 jsPDF）

## 技术栈

- **前端框架**: Next.js 14 (App Router)
- **类型系统**: TypeScript
- **样式方案**: Tailwind CSS
- **数据库**: SQLite + Prisma ORM
- **认证**: JWT (httpOnly cookie) + bcrypt
- **视频处理**: ffmpeg（系统级调用）
- **UI 动画**: Framer Motion
- **PDF 生成**: jsPDF
- **表单处理**: React Hook Form + Zod

## 项目结构

```
english-learning-platform/
├── prisma/
│   ├── schema.prisma          # 数据库模型定义
│   └── dev.db                 # SQLite 数据库文件
├── public/
│   └── uploads/               # 上传文件目录
│       ├── videos/
│       ├── covers/
│       └── subtitles/
├── app/
│   ├── (auth)/                # 认证相关页面
│   │   ├── login/
│   │   └── register/
│   ├── admin/                 # 管理后台
│   │   ├── page.tsx           # 视频管理
│   │   └── invite-codes/      # 邀请码生成
│   ├── api/                   # API 路由
│   │   ├── auth/              # 认证 API
│   │   ├── admin/             # 管理员 API
│   │   ├── videos/            # 视频 API
│   │   ├── words/             # 单词 API
│   │   └── expressions/       # 表达卡片 API
│   ├── videos/[id]/           # 视频播放页
│   ├── vocabulary/            # 单词本页面
│   ├── layout.tsx             # 根布局
│   ├── page.tsx               # 首页
│   └── globals.css            # 全局样式
├── components/                # React 组件
│   ├── VideoPlayer.tsx        # 视频播放器
│   ├── SubtitlePanel.tsx      # 字幕面板
│   ├── WordCard.tsx           # 单词卡片
│   ├── ExpressionCard.tsx     # 表达卡片
│   ├── VoiceRecorder.tsx      # 录音组件
│   ├── VideoCard.tsx          # 视频卡片
│   └── SubtitleWordHighlight.tsx  # 字幕单词高亮
├── lib/                       # 工具函数
│   ├── prisma.ts              # Prisma Client
│   ├── auth.ts                # JWT 工具
│   ├── password.ts            # 密码哈希
│   ├── subtitle-parser.ts     # 字幕解析
│   ├── video-processor.ts     # 视频处理
│   ├── dictionary-api.ts      # 词典 API
│   └── utils.ts               # 通用工具
├── middleware.ts              # 路由中间件
├── tailwind.config.ts         # Tailwind 配置
└── package.json
```

## 数据库模型

- **User** - 用户信息
- **InviteCode** - 邀请码
- **Video** - 视频课程
- **Subtitle** - 字幕（中/英）
- **Word** - 收藏的单词
- **Expression** - 收藏的表达

## 本地启动

### 前置要求

- Node.js 18+
- npm/yarn/pnpm
- ffmpeg（需添加到系统 PATH）

### 安装步骤

1. **克隆项目**
```bash
cd english-learning-platform
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**

`.env` 文件已自动配置，默认使用 SQLite：
```env
DATABASE_URL="file:./dev.db"
```

如需修改 JWT 密钥，添加：
```env
JWT_SECRET="your-secret-key-here"
```

4. **初始化数据库**
```bash
npx prisma generate
npx prisma db push
```

5. **创建管理员用户**

由于需要邀请码才能注册，请先在数据库中手动创建一个管理员用户，或使用 Prisma Studio：

```bash
npx prisma studio
```

在 `InviteCode` 表中创建一个邀请码，然后使用该邀请码注册。

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
npm start
```

## ffmpeg 安装

### Windows
1. 下载 ffmpeg：https://ffmpeg.org/download.html
2. 解压到任意目录
3. 将 bin 目录添加到系统 PATH

### macOS
```bash
brew install ffmpeg
```

### Linux
```bash
sudo apt install ffmpeg  # Ubuntu/Debian
sudo yum install ffmpeg  # CentOS/RHEL
```

## API 路由

### 认证
- `POST /api/auth/register` - 注册（需邀请码）
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `GET /api/auth/me` - 获取当前用户

### 视频
- `GET /api/videos` - 视频列表（支持筛选）
- `GET /api/videos/[id]` - 视频详情

### 管理员
- `POST /api/admin/videos` - 上传视频
- `GET /api/admin/videos` - 视频管理列表
- `POST /api/admin/invite-codes` - 生成邀请码
- `GET /api/admin/invite-codes` - 邀请码列表

### 单词
- `GET /api/words` - 获取单词本
- `POST /api/words` - 添加单词
- `DELETE /api/words?id=[id]` - 删除单词
- `GET /api/words/lookup?word=[word]` - 查词

### 表达卡片
- `GET /api/expressions` - 获取表达卡片
- `POST /api/expressions` - 添加表达卡片
- `DELETE /api/expressions?id=[id]` - 删除表达卡片

## 注意事项

1. **文件上传限制**
   - 默认 Next.js API 路由请求体大小限制为 1MB
   - 上传大视频需要在 `next.config.js` 中配置

2. **字幕格式**
   - 支持 .srt 和 .vtt 格式
   - 时间戳格式自动检测

3. **单词 API 限制**
   - DictionaryAPI.dev 免费版每天 100 次调用
   - 建议实现缓存机制

4. **录音功能**
   - 需要用户授权麦克风权限
   - 在生产环境需要 HTTPS

## 部署建议

### 环境变量
生产环境需设置：
```env
DATABASE_URL="你的数据库连接"
JWT_SECRET="强密码"
NODE_ENV="production"
```

### 数据库
SQLite 适合小型项目，生产环境建议迁移到 PostgreSQL 或 MySQL。

### 文件存储
本地存储适合开发/小型部署，生产环境建议：
- AWS S3
- 阿里云 OSS
- 腾讯云 COS

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

