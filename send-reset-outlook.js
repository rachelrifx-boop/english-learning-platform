const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const { nanoid } = require('nanoid');

const prisma = new PrismaClient();

// 使用生产环境数据库
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:Raifxdd%2311ffr@db.cknvuclkzgylbmksfkfs.supabase.co:5432/postgres";

const prismaProd = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

// SMTP配置
const smtpConfig = {
  host: 'smtp.qq.com',
  port: 587,
  secure: false,
  auth: {
    user: '891855476@qq.com',
    pass: 'muvcocneejicbdei'
  }
};

async function sendPasswordReset() {
  try {
    const email = 'rachel-rifx@outlook.com';

    console.log('=== 发送密码重置邮件 ===');
    console.log('目标邮箱:', email);

    // 1. 查找用户
    console.log('\n1. 查找用户...');
    const user = await prismaProd.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('❌ 用户不存在');
      return;
    }
    console.log('✓ 找到用户:', user.username, user.id);

    // 2. 删除旧的重置token
    console.log('\n2. 清除旧的重置token...');
    await prismaProd.passwordReset.deleteMany({
      where: { userId: user.id }
    });
    console.log('✓ 已清除');

    // 3. 生成新的重置token
    console.log('\n3. 生成重置token...');
    const resetToken = nanoid(64);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1小时后过期

    await prismaProd.passwordReset.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt
      }
    });
    console.log('✓ Token已创建');

    // 4. 发送邮件 - 使用生产环境URL
    console.log('\n4. 发送重置邮件...');
    const transporter = nodemailer.createTransport(smtpConfig);

    const baseUrl = 'https://onsaylab.cn';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"英语学习平台" <${smtpConfig.auth.user}>`,
      to: email,
      subject: '重置您的密码',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>重置您的密码</h2>
            <p>您好，${user.username}！</p>
            <p>我们收到了您重置密码的请求。请点击下面的按钮重置您的密码：</p>
            <p><a href="${resetUrl}" class="button">重置密码</a></p>
            <p>或者复制以下链接到浏览器中打开：</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <p><strong>此链接将在1小时后失效。</strong></p>
            <p>如果您没有请求重置密码，请忽略此邮件。</p>
            <div class="footer">
              <p>这是一封自动发送的邮件，请勿直接回复。</p>
              <p>英语学习平台 | Onsay Lab</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✓ 邮件发送成功!');
    console.log('  邮件ID:', info.messageId);
    console.log('  响应:', info.response);

    console.log('\n=== 完成 ===');
    console.log('请检查', email, '邮箱（包括垃圾邮件文件夹）');
    console.log('\n重置链接:', resetUrl);

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prismaProd.$disconnect();
  }
}

sendPasswordReset();
