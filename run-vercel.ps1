$ErrorActionPreference = 'Stop'
$env:PATH = "$PWD\node-dev\node-v20.11.1-win-x64;$env:PATH"

Write-Host "====================================="
Write-Host "Please log into Vercel. A browser window will open."
Write-Host "====================================="
vercel login

Write-Host "====================================="
Write-Host "Deploying Fixed API to Production..."
Write-Host "====================================="
vercel --prod
