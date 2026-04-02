import nodemailer from 'nodemailer'

// SMTP配置从环境变量读取
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.qq.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
}

// 创建邮件发送器
let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
      console.warn('[EMAIL] SMTP credentials not configured, email sending will be disabled')
      return null
    }
    transporter = nodemailer.createTransport(smtpConfig)
  }
  return transporter
}

// 发送密码重置邮件
export async function sendPasswordResetEmail(email: string, username: string, resetUrl: string) {
  const transport = getTransporter()
  if (!transport) {
    console.log('[EMAIL] SMTP未配置，重置链接:', resetUrl)
    return { success: false, message: 'SMTP未配置', resetUrl }
  }

  try {
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
            <p>您好，${username}！</p>
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
    }

    await transport.sendMail(mailOptions)
    console.log('[EMAIL] 密码重置邮件已发送至:', email)
    return { success: true, message: '邮件已发送' }
  } catch (error) {
    console.error('[EMAIL] 发送邮件失败:', error)
    return { success: false, message: '发送失败', error }
  }
}
