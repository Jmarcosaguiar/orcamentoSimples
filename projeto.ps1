<#
.SYNOPSIS
    Script para iniciar e parar o servidor Vite do projeto Orçamento Simples.
.DESCRIPTION
    Permite iniciar o servidor em segundo plano (abrindo automaticamente no navegador padrão
    assim que o front-end responder), parar o servidor ou consultar seu status.
.PARAMETER Action
    Ação desejada: 'start', 'stop', 'restart', 'status' ou 'menu' (padrão).
.PARAMETER Port
    Porta do servidor Vite (padrão: 5173).
#>
param(
    [ValidateSet("start", "stop", "restart", "status", "menu")]
    [string]$Action = "menu",
    [int]$Port = 5173
)

$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ProjectDir

$PidFile = Join-Path $ProjectDir ".vite-server.pid"
$Url = "http://localhost:$Port"

function Get-RunningServerPid {
    # 1. Verifica pelo arquivo de PID salvo
    if (Test-Path $PidFile) {
        $savedPid = (Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
        if ($savedPid -match '^\d+$') {
            $proc = Get-Process -Id ([int]$savedPid) -ErrorAction SilentlyContinue
            if ($proc) {
                return [int]$savedPid
            }
        }
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    }

    # 2. Verifica se existe algum processo ouvindo na porta configurada
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn -and $conn.OwningProcess) {
            return [int]$conn.OwningProcess
        }
    } catch {}

    return $null
}

function Wait-AndOpenBrowser {
    param([string]$TargetUrl, [int]$TimeoutSeconds = 30)

    Write-Host "Aguardando o front-end carregar em $TargetUrl ..." -ForegroundColor Cyan
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

    while ($stopwatch.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $async = $tcp.BeginConnect("127.0.0.1", $Port, $null, $null)
            $wait = $async.AsyncWaitHandle.WaitOne(400, $false)
            if ($wait -and $tcp.Connected) {
                $tcp.Close()
                Write-Host "Front-end carregado! Abrindo no navegador padrao..." -ForegroundColor Green
                Start-Process $TargetUrl
                return $true
            }
            $tcp.Close()
        } catch {}
        Start-Sleep -Milliseconds 400
    }

    Write-Host "O servidor demorou mais que $TimeoutSeconds segundos para responder na porta $Port." -ForegroundColor Yellow
    return $false
}

function Start-Project {
    $existingPid = Get-RunningServerPid
    if ($existingPid) {
        Write-Host "O projeto ja esta em execucao (PID: $existingPid) em $Url" -ForegroundColor Yellow
        Write-Host "Abrindo no navegador padrao..." -ForegroundColor Cyan
        Start-Process $Url
        return
    }

    if (-not (Test-Path (Join-Path $ProjectDir "node_modules"))) {
        Write-Host "Instalando dependencias (npm.cmd install)..." -ForegroundColor Cyan
        & npm.cmd install
    }

    Write-Host "Iniciando servidor Vite na porta $Port..." -ForegroundColor Cyan

    # Inicia o Vite via cmd /c npm.cmd para evitar bloqueio de ExecutionPolicy no npm.ps1
    $vitePath = Join-Path $ProjectDir "node_modules\vite\bin\vite.js"
    if (Test-Path $vitePath) {
        $proc = Start-Process -FilePath "node" `
            -ArgumentList "`"$vitePath`" --port $Port --strictPort" `
            -WorkingDirectory $ProjectDir `
            -WindowStyle Minimized `
            -PassThru
    } else {
        $proc = Start-Process -FilePath "cmd.exe" `
            -ArgumentList "/c npm.cmd run dev -- --port $Port --strictPort" `
            -WorkingDirectory $ProjectDir `
            -WindowStyle Minimized `
            -PassThru
    }

    $proc.Id | Out-File -FilePath $PidFile -Encoding ascii -Force
    Write-Host "Processo iniciado (PID: $($proc.Id))." -ForegroundColor Green

    [void](Wait-AndOpenBrowser -TargetUrl $Url -TimeoutSeconds 30)
}

function Stop-Project {
    $stoppedAny = $false

    if (Test-Path $PidFile) {
        $savedPid = (Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
        if ($savedPid -match '^\d+$') {
            try {
                & taskkill.exe /PID $savedPid /T /F 2>&1 | Out-Null
                Write-Host "Servidor encerrado (PID: $savedPid)." -ForegroundColor Green
                $stoppedAny = $true
            } catch {}
        }
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    }

    # Garante que qualquer processo remanescente na porta também seja finalizado
    try {
        $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        foreach ($c in $conns) {
            if ($c.OwningProcess -and $c.OwningProcess -gt 0) {
                & taskkill.exe /PID $c.OwningProcess /T /F 2>&1 | Out-Null
                Write-Host "Processo na porta $Port encerrado (PID: $($c.OwningProcess))." -ForegroundColor Green
                $stoppedAny = $true
            }
        }
    } catch {}

    if (-not $stoppedAny) {
        Write-Host "Nenhum servidor ativo encontrado na porta $Port." -ForegroundColor Yellow
    }
}

function Show-Status {
    $runningPid = Get-RunningServerPid
    if ($runningPid) {
        Write-Host "STATUS: ONLINE (PID: $runningPid) -> $Url" -ForegroundColor Green
    } else {
        Write-Host "STATUS: PARADO" -ForegroundColor Red
    }
}

if ($Action -ne "menu") {
    switch ($Action) {
        "start"   { Start-Project }
        "stop"    { Stop-Project }
        "restart" { Stop-Project; Start-Sleep -Seconds 1; Start-Project }
        "status"  { Show-Status }
    }
    exit 0
}

# Menu interativo caso seja executado sem parâmetros
while ($true) {
    Write-Host ""
    Write-Host "==============================================" -ForegroundColor DarkCyan
    Write-Host "   ORCAMENTO SIMPLES - GERENCIADOR DO APP     " -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor DarkCyan
    Show-Status
    Write-Host "----------------------------------------------"
    Write-Host " [1] Iniciar Projeto (e abrir no navegador)"
    Write-Host " [2] Parar Projeto"
    Write-Host " [3] Reiniciar Projeto"
    Write-Host " [4] Abrir $Url no navegador"
    Write-Host " [0] Sair"
    Write-Host "----------------------------------------------"
    $choice = Read-Host "Escolha uma opcao"

    switch ($choice) {
        "1" { Start-Project }
        "2" { Stop-Project }
        "3" { Stop-Project; Start-Sleep -Seconds 1; Start-Project }
        "4" { Start-Process $Url }
        "0" { Write-Host "Saindo..." -ForegroundColor Gray; break }
        default { Write-Host "Opcao invalida!" -ForegroundColor Red }
    }
}
