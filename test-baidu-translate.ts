// 测试百度翻译API
async function testBaiduTranslate() {
  // 请在这里填入你的百度翻译API信息
  const APP_ID = '你的APP_ID'
  const SECRET_KEY = '你的密钥'

  const query = 'Hello, world!'
  const from = 'en'
  const to = 'zh'
  const salt = Date.now().toString()

  // 生成签名
  function generateSign(appId: string, query: string, salt: string, secretKey: string): string {
    const crypto = require('crypto')
    const str = appId + query + salt + secretKey
    return crypto.createHash('md5').update(str).digest('hex')
  }

  const sign = generateSign(APP_ID, query, salt, SECRET_KEY)
  const apiUrl = `https://fanyi-api.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(query)}&from=${from}&to=${to}&appid=${APP_ID}&salt=${salt}&sign=${sign}`

  console.log('正在测试百度翻译API...')
  console.log('API URL:', apiUrl.substring(0, 100) + '...')

  try {
    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(10000)
    })

    const data = await response.json()

    console.log('\n=== 测试结果 ===')
    console.log('HTTP状态:', response.status)
    console.log('响应数据:', JSON.stringify(data, null, 2))

    if (data.error_code) {
      console.log('\n❌ API调用失败')
      console.log('错误码:', data.error_code)
      console.log('错误信息:', data.error_msg)

      // 常见错误码说明
      const errorMap: Record<string, string> = {
        '52001': '请求超时',
        '52002': '系统错误',
        '52003': '未授权用户',
        '54000': '必填参数为空',
        '54001': '签名错误',
        '54003': '访问频率受限',
        '54004': '账户余额不足',
        '58000': '客户端IP非法',
        '58001': '语言不支持',
        '58002': '服务当前已禁用',
        '90107': '认证未通过或未生效'
      }
      console.log('错误说明:', errorMap[data.error_code] || '未知错误')
    } else if (data.trans_result) {
      console.log('\n✅ API调用成功')
      console.log('原文:', query)
      console.log('译文:', data.trans_result[0].dst)
    }
  } catch (error: any) {
    console.log('\n❌ 请求失败:', error.message)
  }
}

testBaiduTranslate()
