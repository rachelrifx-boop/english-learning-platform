const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn']
})

async function checkFavorites() {
  try {
    console.log('=== 检查 FavoriteVideo 表 ===')

    // 获取所有收藏记录
    const allFavorites = await prisma.favoriteVideo.findMany({
      include: {
        video: true,
        user: {
          select: { id: true, username: true, email: true }
        }
      }
    })

    console.log(`\n总共找到 ${allFavorites.length} 条收藏记录:`)

    for (const fav of allFavorites) {
      console.log('\n--- 收藏记录 ---')
      console.log('ID:', fav.id)
      console.log('用户:', fav.user?.username || '(未知)', `(${fav.userId})`)
      console.log('视频ID:', fav.videoId)
      if (fav.video) {
        console.log('视频标题:', fav.video.title)
        console.log('视频存在: 是')
      } else {
        console.log('视频存在: 否 (视频已被删除或ID无效)')
      }
      console.log('创建时间:', fav.createdAt)
    }

    // 按用户分组统计
    console.log('\n=== 按用户统计 ===')
    const userStats = {}
    for (const fav of allFavorites) {
      const username = fav.user?.username || fav.userId
      if (!userStats[username]) {
        userStats[username] = { total: 0, withVideo: 0 }
      }
      userStats[username].total++
      if (fav.video) userStats[username].withVideo++
    }

    for (const [user, stats] of Object.entries(userStats)) {
      console.log(`${user}: ${stats.withVideo}/${stats.total} (有效/总数)`)
    }

  } catch (error) {
    console.error('查询出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkFavorites()
