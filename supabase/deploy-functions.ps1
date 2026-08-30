# AutoInvest Edge Functions Deploy Script
# Execute: .\deploy-functions.ps1

Write-Host "🚀 AutoInvest Edge Functions Deployment" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green

# Check if supabase is installed
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseCmd) {
    Write-Host "❌ Supabase CLI not found." -ForegroundColor Red
    Write-Host "Please install: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Navigate to project root (a CLI espera ./supabase/functions relativo ao cwd)
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -Path $projectRoot

# Set Clerk secrets from root .env (Edge Functions need these for JWT verification)
Write-Host "`n🔐 Setting Clerk secrets for Edge Functions..." -ForegroundColor Cyan
$rootEnv = Get-Content "$projectRoot\.env" -Raw
$clerkJwksUrl = [regex]::Match($rootEnv, 'CLERK_JWKS_URL=(.+)').Groups[1].Value.Trim()
$clerkIssuer = [regex]::Match($rootEnv, 'CLERK_ISSUER=(.+)').Groups[1].Value.Trim()
$clerkSecretKey = [regex]::Match($rootEnv, 'CLERK_SECRET_KEY=(.+)').Groups[1].Value.Trim()

# Project ref derivado da URL publica (nao e segredo) — evita necessidade de supabase link/config.toml
$projectRef = [regex]::Match($rootEnv, 'VITE_SUPABASE_URL=https?://([a-z0-9]+)\.supabase\.co').Groups[1].Value.Trim()
$refFlag = @()
if ($projectRef) {
    $refFlag = @("--project-ref", $projectRef)
    Write-Host "🎯 Project ref: $projectRef" -ForegroundColor Cyan
} else {
    Write-Host "️ VITE_SUPABASE_URL nao encontrada — use 'supabase link' antes" -ForegroundColor Yellow
}

$secretsToSet = @()
if ($clerkJwksUrl) { $secretsToSet += "CLERK_JWKS_URL=`"$clerkJwksUrl`"" }
if ($clerkIssuer) { $secretsToSet += "CLERK_ISSUER=`"$clerkIssuer`"" }
if ($clerkSecretKey) { $secretsToSet += "CLERK_SECRET_KEY=`"$clerkSecretKey`"" }

if ($secretsToSet.Count -gt 0) {
    supabase secrets set @secretsToSet @refFlag
    Write-Host "✅ Clerk secrets set! ($($secretsToSet.Count) variables)" -ForegroundColor Green
} else {
    Write-Host "️ No Clerk secrets found in .env — skipping" -ForegroundColor Yellow
}

# Deploy app-proxy function
Write-Host "`n📦 Deploying app-proxy function..." -ForegroundColor Cyan
supabase functions deploy app-proxy --no-verify-jwt @refFlag

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ app-proxy deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to deploy app-proxy" -ForegroundColor Red
}

# Deploy refresh-prices function
Write-Host "`n📦 Deploying refresh-prices function..." -ForegroundColor Cyan
supabase functions deploy refresh-prices --no-verify-jwt @refFlag

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ refresh-prices deployed successfully!" -ForegroundColor Green
}

# Deploy check-licenses function
Write-Host "`n📦 Deploying check-licenses function..." -ForegroundColor Cyan
supabase functions deploy check-licenses --no-verify-jwt @refFlag

# Deploy stripe-webhook function  
Write-Host "`n📦 Deploying stripe-webhook function..." -ForegroundColor Cyan
supabase functions deploy stripe-webhook --no-verify-jwt @refFlag

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "✅ All functions deployed!" -ForegroundColor Green
Write-Host "`nNote: Remember to set environment variables in Supabase Dashboard:" -ForegroundColor Yellow
Write-Host "  - B3_API_URL, B3_API_KEY (optional)" -ForegroundColor Yellow
Write-Host "  - AWESOME_API_KEY (optional)" -ForegroundColor Yellow
Write-Host "  - CLERK_JWKS_URL, CLERK_ISSUER" -ForegroundColor Yellow