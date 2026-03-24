import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'

function loadEnv() {
  try {
    const envContent = readFileSync('.env', 'utf-8')
    for (const line of envContent.split('\n')) {
      const lineTrimmed = line.trim()
      if (!lineTrimmed || lineTrimmed.startsWith('#')) continue
      const eqIndex = lineTrimmed.indexOf('=')
      if (eqIndex === -1) continue
      const key = lineTrimmed.substring(0, eqIndex).trim()
      let value = lineTrimmed.substring(eqIndex + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (key && value) process.env[key] = value
    }
  } catch (e) {}
}

loadEnv()

async function check() {
  const prisma = new PrismaClient()
  const videos = await prisma.$queryRaw`
    SELECT v.id, v.title, v.difficulty, COUNT(s.id) as subtitle_count
    FROM "Video" v
    LEFT JOIN "Subtitle" s ON v.id = s."videoId"
    GROUP BY v.id, v.title, v.difficulty
    ORDER BY v."createdAt" DESC
    LIMIT 5
  `

  console.log('最近视频及字幕情况:')
  for (const v of videos) {
    console.log(`  - ${v.title}: 难度=${v.difficulty}, 字幕数=${v.subtitle_count}`)
  }

  await prisma.$disconnect()
}

check().catch(console.error)
