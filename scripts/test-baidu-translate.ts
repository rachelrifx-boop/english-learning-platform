/**
 * 测试百度翻译 API 配置
 */
import crypto from 'crypto'

function generateBaiduSign(appId: string, query: string, salt: string, secretKey: string): string {
  const str = appId + query + salt + secretKey
  return crypto.createHash('md5').update(str).digest('hex')
}

async function testBaiduTranslate() {
  // 从环境变量或直接输入获取API配置
  const appId = process.env.BAIDU_APP_ID || '' // 替换为你的APP_ID
  const secretKey = process.env.BAIDU_SECRET_KEY || '' // 替换为你的SECRET_KEY

  if (!appId || !secretKey) {
    console.log('请设置百度翻译API配置：')
    console.log('方法1: 设置环境变量 BAIDU_APP_ID 和 BAIDU_SECRET_KEY')
    console.log('方法2: 直接修改本脚本中的 appId 和 secretKey')
    return
  }

  console.log('测试百度翻译API')
  console.log('APP_ID:', appId)
  console.log('SECRET_KEY:', secretKey.substring(0, 4) + '****')

  const testText = 'Hello'
  const salt = Date.now().toString()
  const sign = generateBaiduSign(appId, testText, salt, secretKey)

  console.log('\n测试文本:', testText)
  console.log('签名:', sign)

  const apiUrl = `https://fanyi-api.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(testText)}&from=en&to=zh&appid=${appId}&salt=${salt}&sign=${sign}`

  console.log('\n请求URL:', apiUrl.substring(0, 100) + '...')

  try {
    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(10000)
    })

    const data = await response.json()

    console.log('\n响应状态:', response.status)
    console.log('响应数据:', JSON.stringify(data, null, 2))

    if (data.error_code) {
      console.log('\n❌ 翻译失败')
      console.log('错误码:', data.error_code)
      console.log('错误信息:', data.error_msg)

      console.log('\n常见错误码说明:')
      console.log('52000 - 成功')
      console.log('52001 - 请求超时')
      console.log('52002 - 系统错误')
      console.log('52003 - 未授权用户')
      console.log('54000 - 必填参数为空')
      console.log('54001 - 签名错误（检查APP_ID和SECRET_KEY）')
      console.log('54003 - 访问频率受限')
      console.log('58000 - 客户端IP非法')
      console.log('58001 - 语言不支持')
      console.log('90107 - 认证未通过或未生效')
    } else if (data.trans_code === '52000' && data.trans_result) {
      console.log('\n✅ 翻译成功!')
      console.log('原文:', testText)
      console.log('译文:', data.trans_result[0].dst)
    }
  } catch (error) {
    console.error('\n❌ 请求失败:', (error as Error).message)
  }
}

testBaiduTranslate().then(() => process.exit(0))
