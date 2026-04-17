$ErrorActionPreference = 'Stop'

$nodeVer = "v20.11.1"
$nodeZip = "node-$nodeVer-win-x64.zip"
$nodeUrl = "https://nodejs.org/dist/$nodeVer/$nodeZip"
$extractPath = "$PWD\node-dev"
$nodeDir = "$extractPath\node-$nodeVer-win-x64"

if (-not (Test-Path "$nodeDir\node.exe")) {
    Write-Host "Downloading Node.js $nodeVer... (This may take a minute)"
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeZip
    Write-Host "Extracting Node.js..."
    Expand-Archive -Path $nodeZip -DestinationPath $extractPath -Force
    Remove-Item $nodeZip
} else {
    Write-Host "Node.js already downloaded."
}

Write-Host "Setting up temporary environment variables..."
$env:PATH = "$nodeDir;$env:PATH"

Write-Host "Testing Node installation..."
node -v

Write-Host "Installing Vercel CLI..."
npm install -g vercel@latest

Write-Host "=================================="
Write-Host "Triggering Vercel Deployment..."
Write-Host "If you are not logged in, it will prompt you. Please follow any instructions."
Write-Host "=================================="
vercel --prod
