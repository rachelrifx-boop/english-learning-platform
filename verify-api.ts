// 验证百度翻译API配置
async function verify() {
  const APP_ID = '20260317002574852'
  const SECRET_KEY = '1Ibz1FzHyOOOq45P2r1S'

  console.log('=== API配置信息 ===')
  console.log('APP_ID:', APP_ID)
  console.log('APP_ID长度:', APP_ID.length, '字符')
  console.log('SECRET_KEY:', SECRET_KEY.substring(0, 4) + '****' + SECRET_KEY.substring(SECRET_KEY.length - 4))
  console.log('SECRET_KEY长度:', SECRET_KEY.length, '字符')
  console.log('')

  // 生成签名测试
  const query = 'Hello'
  const salt = Date.now().toString()
  const crypto = require('crypto')
  const str = APP_ID + query + salt + SECRET_KEY
  const sign = crypto.createHash('md5').update(str).digest('hex')

  console.log('=== 签名测试 ===')
  console.log('待签名字符串:', str)
  console.log('生成的签名:', sign)
  console.log('')

  // 构造API URL
  const apiUrl = `https://fanyi-api.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(query)}&from=en&to=zh&appid=${APP_ID}&salt=${salt}&sign=${sign}`
  console.log('=== API请求URL ===')
  console.log(apiUrl)
  console.log('')

  console.log('正在发送请求...')
  try {
    const response = await fetch(apiUrl)
    const data = await response.json()
    console.log('=== 响应结果 ===')
    console.log(JSON.stringify(data, null, 2))
  } catch (error: any) {
    console.log('请求失败:', error.message)
  }
}

verify()
