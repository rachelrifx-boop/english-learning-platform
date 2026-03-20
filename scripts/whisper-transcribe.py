import whisper
import sys
import os
import warnings
import torch
import time
import urllib.request
from pathlib import Path

# 设置 UTF-8 编码输出（解决 Windows GBK 编码问题）
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 禁用警告
warnings.filterwarnings("ignore")

# 定义安全打印函数（在使用前定义）
def safe_print(msg, file=sys.stderr):
    """安全打印函数，处理编码错误"""
    try:
        print(msg, file=file)
    except UnicodeEncodeError:
        # 如果无法编码，使用 replace 策略
        print(msg.encode('utf-8', errors='replace').decode('utf-8', errors='replace'), file=file)

# 设置模型缓存目录到 D 盘
cache_dir = 'D:\\WhisperModels'
os.environ['WHISPER_CACHE_DIR'] = cache_dir

# 将 ffmpeg 路径添加到 PATH（Whisper 需要 ffmpeg）
ffmpeg_path = r'C:\ffmpeg\bin'
if os.path.exists(ffmpeg_path):
    os.environ['PATH'] = ffmpeg_path + os.pathsep + os.environ.get('PATH', '')
    safe_print(f"已添加 ffmpeg 到 PATH: {ffmpeg_path}")

# 使用多个镜像源以提高下载成功率
MIRROR_ENDPOINTS = [
    'https://hf-mirror.com',
    'https://huggingface.co',
]

# 确保缓存目录存在
os.makedirs(cache_dir, exist_ok=True)

def download_model_with_retry(model_size, max_retries=3):
    """使用重试机制下载模型"""
    model_path = os.path.join(cache_dir, f'{model_size}.pt')

    for attempt in range(max_retries):
        try:
            # 尝试不同的镜像源
            for endpoint in MIRROR_ENDPOINTS:
                try:
                    safe_print(f"尝试使用镜像源: {endpoint} (第 {attempt + 1}/{max_retries} 次)")
                    os.environ['HF_ENDPOINT'] = endpoint

                    # 设置更长的超时时间
                    model = whisper.load_model(model_size, download_root=cache_dir)

                    # 验证文件完整性
                    if os.path.exists(model_path):
                        file_size = os.path.getsize(model_path)
                        safe_print(f"模型下载完成，文件大小: {file_size / (1024*1024):.1f}MB")
                        return model

                except Exception as e:
                    safe_print(f"使用 {endpoint} 下载失败: {str(e)}")
                    if os.path.exists(model_path):
                        # 删除损坏的部分下载文件
                        os.remove(model_path)
                        safe_print(f"已删除损坏的文件: {model_path}")
                    continue

        except Exception as e:
            safe_print(f"下载尝试 {attempt + 1} 失败: {str(e)}")
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 5
                safe_print(f"等待 {wait_time} 秒后重试...")
                time.sleep(wait_time)

    raise Exception(f"模型下载失败，已重试 {max_retries} 次。请检查网络连接或手动下载模型文件到 {cache_dir}")

def transcribe_audio(audio_path, model_size='small'):
    """
    使用 Whisper 转录音频并生成 SRT 格式字幕

    Args:
        audio_path: 音频文件路径
        model_size: 模型大小 (tiny, base, small, medium, large-v3)

    Returns:
        SRT 格式字幕内容
    """
    try:
        # 验证音频文件是否存在
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"音频文件不存在: {audio_path}")

        # 加载模型（优先使用 D 盘的模型）
        safe_print(f"Loading Whisper model: {model_size}...")

        # 检查 D 盘是否有模型文件
        model_path = os.path.join(cache_dir, f'{model_size}.pt')

        if os.path.exists(model_path):
            # 验证文件是否完整（检查文件大小）
            file_size = os.path.getsize(model_path)
            safe_print(f"Found cached model: {model_path} ({file_size / (1024*1024):.1f}MB)")

            # 根据模型大小验证文件是否完整
            expected_sizes = {
                'tiny': 75 * 1024 * 1024,    # ~75MB
                'base': 145 * 1024 * 1024,   # ~145MB
                'small': 461 * 1024 * 1024,  # ~461MB
                'medium': 1.5 * 1024 * 1024 * 1024,  # ~1.5GB
                'large-v3': 3.0 * 1024 * 1024 * 1024,  # ~3GB
            }

            expected_min = expected_sizes.get(model_size, 0) * 0.95  # 允许5%误差
            if file_size < expected_min:
                safe_print(f"警告：缓存文件可能损坏（大小: {file_size / (1024*1024):.1f}MB），将重新下载")
                os.remove(model_path)
                model = download_model_with_retry(model_size)
            else:
                safe_print(f"使用缓存模型")
                model = whisper.load_model(model_size, download_root=cache_dir)
        else:
            safe_print(f"Downloading model to {cache_dir}...")
            model = download_model_with_retry(model_size)

        # 转录音频
        safe_print("Transcribing audio...")
        result = model.transcribe(
            audio_path,
            language='english',
            task='transcribe',
            word_timestamps=True
        )

        # 生成 SRT 格式
        safe_print("Generating SRT...")
        srt_content = generate_srt(result)

        return srt_content

    except Exception as e:
        safe_print(f"Error: {str(e)}")
        raise

def generate_srt(result):
    """将 Whisper 结果转换为 SRT 格式"""
    srt_content = ""
    subtitle_index = 1

    # 按段落分组
    segments = result.get('segments', [])

    for segment in segments:
        start_time = segment['start']
        end_time = segment['end']
        text = segment['text'].strip()

        if not text:
            continue

        srt_content += f"{subtitle_index}\n"
        srt_content += f"{format_srt_time(start_time)} --> {format_srt_time(end_time)}\n"
        srt_content += f"{text}\n\n"

        subtitle_index += 1

    return srt_content

def format_srt_time(seconds):
    """格式化时间为 SRT 格式 (HH:MM:SS,mmm)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)

    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        safe_print("Usage: python whisper-transcribe.py <audio_path> [model_size]")
        sys.exit(1)

    audio_path = sys.argv[1]
    # 处理 Windows 路径
    audio_path = audio_path.replace('/', '\\')
    model_size = sys.argv[2] if len(sys.argv) > 2 else 'small'

    # 调试信息
    safe_print(f"接收到的音频路径: {audio_path}")
    safe_print(f"文件是否存在: {os.path.exists(audio_path)}")

    # 验证模型大小
    valid_models = ['tiny', 'base', 'small', 'medium', 'large', 'large-v2', 'large-v3']
    if model_size not in valid_models:
        safe_print(f"Invalid model size. Valid options: {', '.join(valid_models)}")
        sys.exit(1)

    try:
        srt = transcribe_audio(audio_path, model_size)
        # 输出 SRT 到 stdout（使用 UTF-8）
        sys.stdout.write(srt)
    except Exception as e:
        safe_print(f"Error: {str(e)}")
        sys.exit(1)
