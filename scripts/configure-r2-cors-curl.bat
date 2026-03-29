@echo off
REM Cloudflare R2 CORS 配置脚本
REM 使用 curl 直接调用 R2 API

setlocal enabledelayedexpansion

REM 从 .env 文件读取配置
for /f "tokens=1,2 delims==" %%a in ('type .env ^| findstr /C="CLOUDFLARE_R2_"') do (
    set %%a=%%b
    REM 移除引号
    set %%a=!%%b:"=!
)

set ACCOUNT_ID=%CLOUDFLARE_R2_ACCOUNT_ID%
set ACCESS_KEY=%CLOUDFLARE_R2_ACCESS_KEY_ID%
set SECRET_KEY=%CLOUDFLARE_R2_SECRET_ACCESS_KEY%
set BUCKET=%CLOUDFLARE_R2_BUCKET_NAME%

echo [R2 CORS] Account ID: %ACCOUNT_ID%
echo [R2 CORS] Bucket: %BUCKET%
echo [R2 CORS] Access Key: %ACCESS_KEY:~0,10%...

REM 当前日期时间
for /f "tokens=1-6 delims=/ " %%a in ('date /t') do set DATE=%%a-%%b-%%c
for /f "tokens=1-3 delims=:." %%a in ("%TIME%") do set TIME=%%a%%b%%c
set TIMESTAMP=%DATE%T%TIME%Z

echo [R2 CORS] Timestamp: %TIMESTAMP%
echo.
echo [R2 CORS] 正在配置 CORS...
echo.

REM CORS 策略 JSON
set "CORS_POLICY=[{\"AllowedOrigins\":[\"*\"],\"AllowedMethods\":[\"GET\",\"PUT\",\"POST\",\"DELETE\",\"HEAD\"],\"AllowedHeaders\":[\"*\"],\"MaxAgeSeconds\":3600,\"ExposeHeaders\":[\"ETag\"]}]"

echo [R2 CORS] CORS 策略: %CORS_POLICY%
echo.
echo [R2 CORS] 注意: Cloudflare R2 不支持通过 AWS SDK 配置 CORS
echo [R2 CORS] 请在 Cloudflare Dashboard 中手动配置:
echo [R2 CORS] 1. 访问 https://dash.cloudflare.com
echo [R2 CORS] 2. 进入 R2 -^> english-learning-videos -^> Settings
echo [R2 CORS] 3. 找到 CORS Policy 部分
echo [R2 CORS] 4. 添加以下 JSON:
echo.
echo %CORS_POLICY%
echo.

pause
