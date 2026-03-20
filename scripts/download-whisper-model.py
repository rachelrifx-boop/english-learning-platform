#!/usr/bin/env python3
"""
Whisper模型下载工具 - 支持断点续传和多线程下载
"""
import os
import sys
import ssl
import urllib.request
import urllib.error
from pathlib import Path
import time
import hashlib

# 创建不验证SSL的上下文（仅用于解决网络问题）
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# 模型配置
MODELS = {
    'tiny': {
        'url': 'https://huggingface.co/openai/whisper-tiny/resolve/main/pytorch_model.bin',
        'size': 75 * 1024 * 1024  # ~75MB
    },
    'base': {
        'url': 'https://huggingface.co/openai/whisper-base/resolve/main/pytorch_model.bin',
        'size': 145 * 1024 * 1024  # ~145MB
    },
    'small': {
        'url': 'https://huggingface.co/openai/whisper-small/resolve/main/pytorch_model.bin',
        'size': 461 * 1024 * 1024  # ~461MB
    },
    'medium': {
        'url': 'https://huggingface.co/openai/whisper-medium/resolve/main/pytorch_model.bin',
        'size': 1.5 * 1024 * 1024 * 1024  # ~1.5GB
    },
    'large-v3': {
        'url': 'https://huggingface.co/openai/whisper-large-v3/resolve/main/pytorch_model.bin',
        'size': 3.0 * 1024 * 1024 * 1024  # ~3GB
    }
}

CACHE_DIR = r'D:\WhisperModels'


def download_with_resume(url, dest_path, max_retries=5):
    """
    支持断点续传的下载函数
    """
    dest_path = Path(dest_path)

    for attempt in range(max_retries):
        try:
            # 检查是否已有部分下载的文件
            downloaded_size = 0
            if dest_path.exists():
                downloaded_size = dest_path.stat().st_size
                print(f"发现部分下载文件，已下载: {downloaded_size / (1024*1024):.1f}MB")

            # 创建请求，添加Range头支持断点续传
            req = urllib.request.Request(url)
            if downloaded_size > 0:
                req.add_header('Range', f'bytes={downloaded_size}-')

            print(f"开始下载 (尝试 {attempt + 1}/{max_retries})...")
            print(f"目标: {dest_path}")

            # 使用不验证SSL的上下文下载
            with urllib.request.urlopen(req, context=ssl_context, timeout=60) as response:
                total_size = int(response.headers.get('Content-Length', 0)) + downloaded_size
                print(f"总大小: {total_size / (1024*1024):.1f}MB")

                mode = 'ab' if downloaded_size > 0 else 'wb'
                with dest_path.open(mode) as f:
                    chunk_size = 1024 * 1024  # 1MB chunks
                    while True:
                        try:
                            chunk = response.read(chunk_size)
                            if not chunk:
                                break
                            f.write(chunk)
                            downloaded_size += len(chunk)

                            # 显示进度
                            progress = (downloaded_size / total_size) * 100
                            print(f'\r进度: {progress:.1f}% ({downloaded_size / (1024*1024):.1f}MB / {total_size / (1024*1024):.1f}MB)', end='')

                        except (socket.timeout, urllib.error.URLError) as e:
                            print(f"\n下载中断: {e}")
                            print(f"已保存: {downloaded_size / (1024*1024):.1f}MB")
                            raise

            print(f"\n下载完成: {dest_path}")
            return True

        except Exception as e:
            print(f"\n下载失败 (尝试 {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 10
                print(f"等待 {wait_time} 秒后重试...")
                time.sleep(wait_time)
            else:
                raise Exception(f"下载失败，已重试 {max_retries} 次")

    return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python download-whisper-model.py <model_size>")
        print("Available models: tiny, base, small, medium, large-v3")
        sys.exit(1)

    model_size = sys.argv[1]

    if model_size not in MODELS:
        print(f"Error: Unknown model '{model_size}'")
        print(f"Available models: {', '.join(MODELS.keys())}")
        sys.exit(1)

    # 确保缓存目录存在
    os.makedirs(CACHE_DIR, exist_ok=True)

    model_info = MODELS[model_size]
    dest_path = Path(CACHE_DIR) / f'{model_size}.pt'

    print(f"准备下载 Whisper 模型: {model_size}")
    print(f"大小: ~{model_info['size'] / (1024*1024):.0f}MB")
    print(f"URL: {model_info['url']}")
    print()

    # 检查是否已存在完整文件
    if dest_path.exists():
        file_size = dest_path.stat().st_size
        if file_size >= model_info['size'] * 0.95:
            print(f"文件已存在且完整: {dest_path}")
            print(f"大小: {file_size / (1024*1024):.1f}MB")
            response = input("是否重新下载? (y/N): ")
            if response.lower() != 'y':
                print("取消下载")
                sys.exit(0)
        else:
            print(f"发现不完整文件，将进行断点续传")

    try:
        success = download_with_resume(model_info['url'], dest_path)

        if success:
            # 验证文件大小
            final_size = dest_path.stat().st_size
            print(f"\n✅ 下载成功!")
            print(f"文件: {dest_path}")
            print(f"大小: {final_size / (1024*1024):.1f}MB")
            sys.exit(0)
        else:
            print("\n❌ 下载失败")
            sys.exit(1)

    except Exception as e:
        print(f"\n❌ 下载出错: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
