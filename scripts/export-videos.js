const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// 连接到本地SQLite数据库
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
});

async function exportVideos() {
  console.log('正在导出本地视频数据...\n');

  try {
    // 查询所有视频
    const videos = await prisma.video.findMany({
      orderBy: { createdAt: 'desc' }
    });

    console.log(`找到 ${videos.length} 个视频\n`);

    if (videos.length === 0) {
      console.log('本地数据库中没有视频数据');
      return;
    }

    // 保存到JSON文件
    const outputPath = path.join(__dirname, '..', 'videos-export.json');
    fs.writeFileSync(outputPath, JSON.stringify(videos, null, 2));

    console.log('视频列表：');
    videos.forEach((video, index) => {
      console.log(`${index + 1}. ${video.title}`);
      console.log(`   文件: ${video.videoUrl}`);
      console.log(`   字幕: ${video.subtitleUrl || '无'}`);
      console.log(`   创建时间: ${video.createdAt}\n`);
    });

    console.log(`✅ 数据已导出到: ${outputPath}`);
  } catch (error) {
    console.error('❌ 导出失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

exportVideos();
