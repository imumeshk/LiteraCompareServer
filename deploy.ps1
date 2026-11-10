param([switch]$AutoStart)
$ErrorActionPreference = "Continue"

$ProjectRoot = $PSScriptRoot

# --- UI/UX: Automatic Self-Elevation ---
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Requesting Administrator privileges..." -ForegroundColor Yellow
    $argsStr = if ($MyInvocation.BoundParameters) { ($MyInvocation.BoundParameters.Keys | ForEach-Object { "-$_ " + $MyInvocation.BoundParameters[$_] }) -join " " } else { "" }
    try {
        Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" $argsStr" -Verb RunAs -ErrorAction Stop
        exit
    } catch {
        Write-Host "Failed to elevate privileges. Continuing as standard user..." -ForegroundColor Red
        Start-Sleep -Seconds 2
    }
}

if (-not ([System.Management.Automation.PSTypeName]'SSLBypass').Type) {
    Add-Type -TypeDefinition @"
    using System;
    using System.Net;
    using System.Net.Security;
    using System.Security.Cryptography.X509Certificates;
    public static class SSLBypass {
        public static void Bypass() {
            ServicePointManager.ServerCertificateValidationCallback = 
                delegate (object s, X509Certificate certificate, X509Chain chain, SslPolicyErrors sslPolicyErrors) { return true; };
        }
    }
"@
}

function Invoke-Menu {
    param (
        [string]$Title,
        [scriptblock]$HeaderContent,
        [array]$Options,
        [string]$DefaultChoice = ""
    )
    
    while ($true) {
        Clear-Host
        
        if ($HeaderContent) {
            & $HeaderContent
        } else {
            Write-Host "======================================" -ForegroundColor Cyan
            Write-Host " $Title" -ForegroundColor Cyan
            Write-Host "======================================" -ForegroundColor Cyan
        }
        
        foreach ($opt in $Options) {
            Write-Host " $($opt.Key). $($opt.Label)"
        }
        
        Write-Host "======================================" -ForegroundColor Cyan
        
        $prompt = "Select an option"
        $choice = Read-Host $prompt
        
        if ($choice -match '^[qQ]$') { exit }
        if ($choice -match '^[mM]$') { throw "MAIN_MENU" }
        if ($choice -match '^[bcBC]$') { return $null }
        
        $selected = $Options | Where-Object { $_.Key -eq $choice }
        if ($selected) {
            return $selected.Key
        } else {
            Write-Host "Invalid input. Please select a valid option from the menu, or press 'b' to go back, 'm' for main menu, 'q' to quit." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    }
}

function Show-CurrentDeploymentConfiguration {
    Write-Host "Current Configuration:" -ForegroundColor Yellow
    Write-Host "App Name:       $($global:AppName)"
    Write-Host "Hosting Mode:   $($global:HostingMode)"
    Write-Host "Internal Port:  $($global:Port) (Node.js binds to this)"
    if ($global:HttpPort) { Write-Host "HTTP Port:      $($global:HttpPort) (Redirect)" }
    Write-Host "External URL:   $($global:AppUrl)"

    Write-Host (Get-SysCaStatusLine)
    Write-Host ""
}

function Confirm-DeploymentSettingsUpdate {
    Show-CurrentDeploymentConfiguration
    $cfgChoice = Read-Host "Update deployment settings before rebuilding? (y/N)"
    if ($cfgChoice -match "^[yY]") {
        Invoke-ConfigurationWizard
    }

    if ([string]::IsNullOrWhiteSpace($global:AppUrl) -or [string]::IsNullOrWhiteSpace($global:Port)) {
        Write-Host "Deployment cannot proceed without valid configuration." -ForegroundColor Red
        Pause
        return $false
    }

    return $true
}

function Write-DeploymentLog {
    param([string]$Message, [string]$Level = "INFO")

    $logFolder = Join-Path $ProjectRoot "logs"
    if (-not (Test-Path $logFolder)) { New-Item -ItemType Directory -Path $logFolder -Force | Out-Null }
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path (Join-Path $logFolder "deploy.log") -Value "[$timestamp] [$Level] $Message"
}

function Get-SysCaStatusLine {
    $sysCa = [System.Environment]::GetEnvironmentVariable('NODE_USE_SYSTEM_CA', 'Machine')
    if ($sysCa -eq '1') { return "Cert Store:     Enabled (NODE_USE_SYSTEM_CA=1)" }
    else { return "Cert Store:     Disabled" }
}

function Test-NodeSupportsSystemCa {
    # NODE_USE_SYSTEM_CA as an env var is only honored on Node v22.19.0+ / v24.6.0+
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCmd) { return $null }
    try {
        $verRaw = (node -v) -replace '^v', ''
        $parts = $verRaw.Split('.')
        $major = [int]$parts[0]; $minor = [int]$parts[1]
        if ($major -gt 24 -or ($major -eq 24 -and $minor -ge 6)) { return $true }
        if ($major -eq 22 -and $minor -ge 19) { return $true }
        if ($major -eq 23) { return $true }
        return $false
    } catch {
        return $null
    }
}

function Get-PortableNodeVersion {
    param([string]$NodeFolder = (Join-Path $ProjectRoot "portable\node"))
    $nodeExe = Join-Path $NodeFolder "node.exe"
    if (-not (Test-Path $nodeExe)) { return $null }
    try {
        $ver = & $nodeExe -v
        return $ver.Trim()
    } catch {
        return $null
    }
}

function Get-AppBuildInfo {
    $packagePath = Join-Path $ProjectRoot "package.json"
    $version = "Unknown"
    if (Test-Path $packagePath) {
        try { $version = (Get-Content $packagePath -Raw | ConvertFrom-Json).version } catch { }
    }

    $buildTime = "Not built"
    $distPath = Join-Path $ProjectRoot "dist"
    if (Test-Path $distPath) { $buildTime = (Get-Item $distPath).LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss") }
    return [PSCustomObject]@{ Version = $version; BuildTime = $buildTime }
}

function Test-ValidPort {
    param([string]$Port)
    $number = 0
    return [int]::TryParse($Port, [ref]$number) -and $number -ge 1 -and $number -le 65535
}

function New-ConfigurationBackup {
    param([string]$Reason = "manual")

    $backupRoot = Join-Path $ProjectRoot "backups"
    $backupFolder = Join-Path $backupRoot ((Get-Date -Format "yyyyMMdd-HHmmss") + "-$Reason")
    New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null

    foreach ($fileName in @(".env", "web.config")) {
        $source = Join-Path $ProjectRoot $fileName
        if (Test-Path $source) { Copy-Item -Path $source -Destination $backupFolder -Force }
    }

    try {
        Import-Module WebAdministration -ErrorAction Stop
        Get-Website | Select-Object Name, State, PhysicalPath, Bindings |
            ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $backupFolder "iis-sites.json")
    } catch { }

    Get-AppBuildInfo | ConvertTo-Json | Set-Content -Path (Join-Path $backupFolder "build-info.json")
    Write-DeploymentLog "Created configuration backup: $backupFolder"
    Write-Host "Configuration backup created: $backupFolder" -ForegroundColor Green
    return $backupFolder
}

function Get-IisSiteForCurrentConfiguration {
    try {
        Import-Module WebAdministration -ErrorAction Stop
        $hostName = (New-Object System.Uri($global:AppUrl)).Host
        return Get-Website | Where-Object {
            $_.Bindings.Collection.bindingInformation | Where-Object { $_ -like "*:$hostName" }
        } | Select-Object -First 1
    } catch {
        return $null
    }
}

function Test-DeploymentHealth {
    param([switch]$IncludeExternal)

    [SSLBypass]::Bypass()
    $targets = @("http://127.0.0.1:$($global:Port)/api/health")
    if ($IncludeExternal -and $global:AppUrl) { $targets += "$($global:AppUrl)/api/health" }
    $healthy = $true
    foreach ($target in $targets) {
        try {
            $response = Invoke-WebRequest -Uri $target -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            Write-Host "[OK] $target ($($response.StatusCode))" -ForegroundColor Green
        } catch {
            $healthy = $false
            Write-Host "[FAIL] $target - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    Write-DeploymentLog "Health check completed: $(if ($healthy) { 'passed' } else { 'failed' })"
    return $healthy
}

function Invoke-DryRun {
    Clear-Host
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host " Deployment Dry Run                   " -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    Show-CurrentDeploymentConfiguration
    $buildInfo = Get-AppBuildInfo
    Write-Host "Version:        $($buildInfo.Version)"
    Write-Host "Last Build:     $($buildInfo.BuildTime)"
    Write-Host "Build Output:   $(if (Test-Path (Join-Path $ProjectRoot 'dist')) { 'Present' } else { 'Missing - npm install and npm run build required' })"
    Write-Host "Node.js:        $(if (Get-Command node -ErrorAction SilentlyContinue) { node -v } else { 'Not installed' })"
    if ($global:HostingMode -eq "IIS Reverse Proxy") {
        $site = Get-IisSiteForCurrentConfiguration
        Write-Host "IIS Site:       $(if ($site) { "$($site.Name) ($($site.State))" } else { 'No matching binding found' })"
        Write-Host "Required:       IIS, URL Rewrite, ARR Proxy, certificate binding"
    }
    Write-Host "`nNo files, bindings, firewall rules, or processes were changed." -ForegroundColor Yellow
    Pause
}

function Invoke-RepairIisProxy {
    if ($global:HostingMode -ne "IIS Reverse Proxy") {
        Write-Host "IIS repair is only available in IIS Reverse Proxy mode." -ForegroundColor Yellow
        Pause
        return
    }

    try {
        Import-Module WebAdministration -ErrorAction Stop
        $site = Get-IisSiteForCurrentConfiguration
        if (-not $site) { throw "No IIS site binding matches $($global:AppUrl). Run the configuration wizard to create it." }
        Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter 'system.webServer/proxy' -Name enabled -Value $true
        $internalUrl = "http://127.0.0.1:$($global:Port)"
        $webConfig = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ProxyToNode" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="$internalUrl/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
"@
        Set-Content -Path (Join-Path $ProjectRoot "web.config") -Value $webConfig -Encoding UTF8
        $acl = Get-Acl $ProjectRoot
        $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule("BUILTIN\IIS_IUSRS", "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow")))
        $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule((New-Object System.Security.Principal.SecurityIdentifier("S-1-5-17")), "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow")))
        Set-Acl $ProjectRoot $acl
        $appUri = New-Object System.Uri($global:AppUrl)
        $httpsPort = if ($appUri.IsDefaultPort) { 443 } else { $appUri.Port }
        $httpsBinding = Get-WebBinding -Name $site.Name -Protocol https | Where-Object { $_.bindingInformation -eq "*:${httpsPort}:$($appUri.Host)" }
        if (-not $httpsBinding) {
            Write-Host "No matching HTTPS binding was found. Run the configuration wizard to bind a certificate." -ForegroundColor Yellow
        }
        $firewallName = "Litera IIS HTTPS Port $httpsPort"
        if (-not (Get-NetFirewallRule -DisplayName $firewallName -ErrorAction SilentlyContinue)) {
            New-NetFirewallRule -DisplayName $firewallName -Direction Inbound -LocalPort $httpsPort -Protocol TCP -Action Allow -ErrorAction Stop | Out-Null
        }
        Start-Website -Name $site.Name -ErrorAction SilentlyContinue
        Write-DeploymentLog "Repaired IIS proxy site '$($site.Name)'"
        Write-Host "IIS proxy repair completed for '$($site.Name)'. Refresh the Sites node in IIS Manager (F5)." -ForegroundColor Green
        Test-DeploymentHealth -IncludeExternal | Out-Null
    } catch {
        Write-DeploymentLog "IIS proxy repair failed: $($_.Exception.Message)" "ERROR"
        Write-Host "IIS proxy repair failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    Pause
}

function New-DiagnosticsBundle {
    $diagnosticRoot = Join-Path $ProjectRoot "diagnostics"
    $bundleFolder = Join-Path $diagnosticRoot (Get-Date -Format "yyyyMMdd-HHmmss")
    New-Item -ItemType Directory -Path $bundleFolder -Force | Out-Null

    foreach ($fileName in @("web.config", "logs\server.log", "logs\server.err.log", "logs\deploy.log")) {
        $source = Join-Path $ProjectRoot $fileName
        if (Test-Path $source) { Copy-Item $source -Destination $bundleFolder -Force }
    }
    if (Test-Path (Join-Path $ProjectRoot ".env")) {
        (Get-Content (Join-Path $ProjectRoot ".env")) -replace '(?i)(password|secret|token|key)=.*', '$1=***REDACTED***' |
            Set-Content (Join-Path $bundleFolder "env.redacted")
    }
    Get-AppBuildInfo | ConvertTo-Json | Set-Content (Join-Path $bundleFolder "build-info.json")
    try { Get-Website | Select-Object Name, State, PhysicalPath, Bindings | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $bundleFolder "iis-sites.json") } catch { }
    $zipPath = "$bundleFolder.zip"
    Compress-Archive -Path (Join-Path $bundleFolder '*') -DestinationPath $zipPath -Force
    Write-DeploymentLog "Created diagnostics bundle: $zipPath"
    Write-Host "Diagnostics bundle created: $zipPath" -ForegroundColor Green
    Pause
}

function Save-DeploymentRegistration {
    param($LogFolder, [string]$Type, [string]$Name)

    $statePath = Join-Path $LogFolder "registration.json"
    $state = @{}
    if (Test-Path $statePath) {
        try {
            $savedState = Get-Content $statePath -Raw | ConvertFrom-Json
            foreach ($property in $savedState.PSObject.Properties) { $state[$property.Name] = $property.Value }
        } catch { }
    }
    $state[$Type] = $Name
    $state.UpdatedAt = (Get-Date).ToString("o")
    $state | ConvertTo-Json | Set-Content $statePath
    Write-DeploymentLog "Registered $Type '$Name'."
}

function Show-DeploymentRegistrations {
    param($LogFolder, [string]$Label)

    $statePath = Join-Path $LogFolder "registration.json"
    if (-not (Test-Path $statePath)) { return }
    try {
        $state = Get-Content $statePath -Raw | ConvertFrom-Json
        if ($state.StartupTask) {
            $task = Get-ScheduledTask -TaskName $state.StartupTask -ErrorAction SilentlyContinue
            $taskStatus = if ($task) { $task.State } else { "Not found" }
            Write-Host "$Label startup task: $($state.StartupTask) ($taskStatus)" -ForegroundColor Cyan
        }
        if ($state.NssmService) {
            $service = Get-Service -Name $state.NssmService -ErrorAction SilentlyContinue
            $serviceStatus = if ($service) { $service.Status } else { "Not found" }
            Write-Host "$Label service: $($state.NssmService) ($serviceStatus)" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "Could not read $Label registration state." -ForegroundColor Yellow
    }
}

function Invoke-RegisterNssmService {
    param ($WorkingFolder, $LogFolder, $StartCommand, $EnvPath = $null)

    $taskName = Read-Host "Enter Windows Service Name (e.g., LiteraCompareServer) [Type 'c' to cancel]"
    if ($taskName -match '^[cC]$') { return }
    if ([string]::IsNullOrWhiteSpace($taskName)) { return }

    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Host "You must run as Administrator to create a Windows Service." -ForegroundColor Red
        Pause
        return
    }

    $nssmDir = Join-Path $ProjectRoot "tools\nssm"
    $nssmArchitecture = if ([Environment]::Is64BitOperatingSystem) { "win64" } else { "win32" }
    $nssmPath = Join-Path $nssmDir "$nssmArchitecture\nssm.exe"

    if (-not (Test-Path $nssmPath)) {
        $nssmChoice = Invoke-Menu -Title "NSSM Setup" -HeaderContent {
            Write-Host "NSSM is required to register a Windows service." -ForegroundColor Yellow
            Write-Host "Detected system architecture: $nssmArchitecture" -ForegroundColor Cyan
            Write-Host "Only $nssmArchitecture\nssm.exe will be kept locally." -ForegroundColor Cyan
        } -Options @(
            [PSCustomObject]@{ Key = '1'; Label = "Auto-download NSSM binary ($nssmArchitecture)" }
            [PSCustomObject]@{ Key = '2'; Label = 'Open NSSM download page for manual setup' }
        )
        if ($null -eq $nssmChoice) { return }
        if ($nssmChoice -eq '2') {
            Start-Process "https://nssm.cc/download"
            Write-Host "Place the matching nssm.exe at: $nssmPath" -ForegroundColor Yellow
            Pause
            return
        }

        $zipPath = Join-Path $env:TEMP "nssm-2.24.zip"
        $extractPath = Join-Path $env:TEMP "nssm-2.24-extract"
        try {
            Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile $zipPath -ErrorAction Stop
            Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force
            $downloadedBinary = Join-Path $extractPath "nssm-2.24\$nssmArchitecture\nssm.exe"
            if (-not (Test-Path $downloadedBinary)) { throw "The NSSM $nssmArchitecture binary was not found in the downloaded archive." }
            New-Item -ItemType Directory -Path (Split-Path $nssmPath) -Force | Out-Null
            Copy-Item -Path $downloadedBinary -Destination $nssmPath -Force
            Write-DeploymentLog "Downloaded NSSM $nssmArchitecture binary."
            Write-Host "NSSM binary installed: $nssmPath" -ForegroundColor Green
        } catch {
            Write-Host "Failed to download or extract NSSM: $($_.Exception.Message)" -ForegroundColor Red
            Pause
            return
        } finally {
            if (Test-Path $zipPath) { Remove-Item $zipPath -Force -ErrorAction SilentlyContinue }
            if (Test-Path $extractPath) { Remove-Item $extractPath -Recurse -Force -ErrorAction SilentlyContinue }
        }
    }

    $npmPath = ""
    if ($EnvPath) {
        $npmPath = Join-Path $EnvPath "npm.cmd"
    } else {
        $npmPath = (Get-Command npm -ErrorAction SilentlyContinue).Source
    }

    if (-not $npmPath) {
        Write-Host "npm.cmd not found." -ForegroundColor Red
        Pause
        return
    }

    Write-Host "Stopping any existing background process..." -ForegroundColor Yellow
    $pidFile = Join-Path $LogFolder "server.pid"
    if (Test-Path $pidFile) {
        $pidStr = Get-Content $pidFile
        taskkill /PID $pidStr /T /F 2>&1 | Out-Null
        Remove-Item $pidFile -ErrorAction SilentlyContinue
    }

    Write-Host "Stopping and removing service if it already exists..." -ForegroundColor Yellow
    & $nssmPath stop $taskName 2>&1 | Out-Null
    & $nssmPath remove $taskName confirm 2>&1 | Out-Null

    Write-Host "Registering service $taskName..." -ForegroundColor Cyan
    & $nssmPath install $taskName $npmPath run $StartCommand
    & $nssmPath set $taskName AppDirectory $WorkingFolder
    & $nssmPath set $taskName AppStdout "$LogFolder\server.log"
    & $nssmPath set $taskName AppStderr "$LogFolder\server.err.log"
    if ($EnvPath) {
        & $nssmPath set $taskName AppEnvironmentExtra "PATH=$EnvPath;%PATH%"
    }

    Write-Host "Starting service..." -ForegroundColor Cyan
    & $nssmPath start $taskName
    
    Save-DeploymentRegistration -LogFolder $LogFolder -Type "NssmService" -Name $taskName
    Write-Host "Service $taskName successfully registered and started!" -ForegroundColor Green
    Pause
}

function Get-PortUsageInfo {
    param ($PortToCheck)
    $connection = Get-NetTCPConnection -LocalPort $PortToCheck -State Listen -ErrorAction SilentlyContinue
    if ($connection) {
        $pidNum = $connection[0].OwningProcess
        $process = Get-Process -Id $pidNum -ErrorAction SilentlyContinue
        if ($process) {
            return "$($process.ProcessName) (PID: $pidNum)"
        }
        return "PID: $pidNum"
    }
    return "Unknown"
}

function Check-PortAvailable {
    param ($PortToCheck)
    $connection = Get-NetTCPConnection -LocalPort $PortToCheck -State Listen -ErrorAction SilentlyContinue
    if ($connection) {
        return $false
    }
    return $true
}

function Resolve-PortConflict {
    param ($PortToCheck)
    while (-not (Check-PortAvailable $PortToCheck)) {
        $connection = Get-NetTCPConnection -LocalPort $PortToCheck -State Listen -ErrorAction SilentlyContinue
        if ($connection) {
            $pidNum = $connection[0].OwningProcess
            $process = Get-Process -Id $pidNum -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "`n[!] Port Conflict Detected on $($PortToCheck):" -ForegroundColor Red
                
                $obj = [PSCustomObject]@{
                    ProcessName = $process.ProcessName
                    PID = $pidNum
                    State = "Listen"
                    Port = $PortToCheck
                }
                $obj | Format-Table -AutoSize | Out-String | Write-Host -ForegroundColor Yellow
                
                $ans = Read-Host "Would you like to forcefully stop this process to free the port? (y/N)"
                if ($ans -match "^[yY]") {
                    Write-Host "Stopping process..." -ForegroundColor Cyan
                    Stop-Process -Id $pidNum -Force -ErrorAction SilentlyContinue
                    Start-Sleep -Seconds 2
                    if (Check-PortAvailable $PortToCheck) {
                        Write-Host "Port $PortToCheck is now free.`n" -ForegroundColor Green
                        return $true
                    } else {
                        Write-Host "Failed to free the port or another process claimed it." -ForegroundColor Red
                    }
                } else {
                    return $false
                }
            } else {
                Write-Host "Error: Port $PortToCheck is in use by an unknown process (PID: $pidNum)." -ForegroundColor Red
                return $false
            }
        }
    }
    return $true
}

function Stop-ServerIfRunning {
    param ($LogFolder)
    $pidFile = Join-Path $LogFolder "server.pid"
    if (Test-Path $pidFile) {
        $pidStr = Get-Content $pidFile
        $process = Get-Process -Id $pidStr -ErrorAction SilentlyContinue
        if ($process -and !$process.HasExited) {
            Write-Host "Stopping running server..." -ForegroundColor Yellow
            taskkill /PID $pidStr /T /F 2>&1 | Out-Null
        }
        Remove-Item $pidFile -ErrorAction SilentlyContinue
    }
}

function Test-ServerRunning {
    param($LogFolder)
    $pidFile = Join-Path $LogFolder "server.pid"
    if (-not (Test-Path $pidFile)) { return $false }
    $process = Get-Process -Id (Get-Content $pidFile) -ErrorAction SilentlyContinue
    return ($null -ne $process -and -not $process.HasExited)
}

function Start-ManagedServer {
    param($WorkingFolder, $LogFolder, $StartCommand, $EnvPath = $null)

    if (-not (Resolve-PortConflict $global:Port)) { return $false }
    $oldPath = $env:PATH
    try {
        if ($EnvPath) { $env:PATH = $EnvPath + ";" + $env:PATH }
        $npmPath = if ($EnvPath) { Join-Path $EnvPath "npm.cmd" } else { (Get-Command npm -ErrorAction Stop).Source }
        $proc = Start-Process $npmPath -ArgumentList $StartCommand -WorkingDirectory $WorkingFolder -WindowStyle Hidden -PassThru -RedirectStandardOutput "$LogFolder\server.log" -RedirectStandardError "$LogFolder\server.err.log"
        $proc.Id | Out-File (Join-Path $LogFolder "server.pid")
        Write-DeploymentLog "Started server process $($proc.Id)"
        return $true
    } catch {
        Write-DeploymentLog "Failed to start server: $($_.Exception.Message)" "ERROR"
        Write-Host "Failed to start server: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    } finally {
        $env:PATH = $oldPath
    }
}

function Sync-PortableApplication {
    param($PortableAppFolder)

    New-Item -ItemType Directory -Path $PortableAppFolder -Force | Out-Null
    $files = @(".env", ".env.example", "index.html", "metadata.json", "package.json", "package-lock.json", "tsconfig.json", "tsconfig.base.json", "vite.config.ts")
    foreach ($fileName in $files) {
        $source = Join-Path $ProjectRoot $fileName
        if (Test-Path $source) { Copy-Item -Path $source -Destination $PortableAppFolder -Force }
    }
    # The root React entry point imports the admin application source.
    foreach ($directoryName in @("addin", "admin", "assets", "src", "viewer")) {
        $source = Join-Path $ProjectRoot $directoryName
        if (Test-Path $source) { Copy-Item -Path $source -Destination $PortableAppFolder -Recurse -Force }
    }
    $portableServerFolder = Join-Path $PortableAppFolder "server"
    New-Item -ItemType Directory -Path $portableServerFolder -Force | Out-Null
    foreach ($fileName in @("package.json", "package-lock.json")) {
        $source = Join-Path $ProjectRoot (Join-Path "server" $fileName)
        if (Test-Path $source) { Copy-Item -Path $source -Destination $portableServerFolder -Force }
    }
    $serverSourceFolder = Join-Path $ProjectRoot "server\src"
    if (Test-Path $serverSourceFolder) { Copy-Item -Path $serverSourceFolder -Destination $portableServerFolder -Recurse -Force }
    Write-DeploymentLog "Synchronized application files to portable installation."
}

function Show-ProcessMenu {
    param ($WorkingFolder, $LogFolder, $StartCommand, $EnvPath = $null)
    
    $pidFile = Join-Path $LogFolder "server.pid"
    
    $headerContent = {
        Write-Host "=============================" -ForegroundColor Cyan
        if ($global:AppName) {
            Write-Host " $($global:AppName) Control Menu" -ForegroundColor Cyan
        } else {
            Write-Host " Server Control Menu         " -ForegroundColor Cyan
        }
        Write-Host "=============================" -ForegroundColor Cyan
        
        $isRunning = $false
        if (Test-Path $pidFile) {
            $pidStr = Get-Content $pidFile
            $process = Get-Process -Id $pidStr -ErrorAction SilentlyContinue
            if ($process -and !$process.HasExited) { $isRunning = $true }
        }
        
        if ($isRunning) {
            $healthCheck = $false
            $retryCount = 0
            while ($retryCount -lt 3 -and -not $healthCheck) {
                try {
                    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
                    [SSLBypass]::Bypass()
                    $uriBuilder = New-Object System.UriBuilder($global:AppUrl)
                    $uriBuilder.Host = "127.0.0.1"
                    $uriBuilder.Path = "/api/health"
                    $localHealthUrl = $uriBuilder.ToString()
                    $response = Invoke-RestMethod -Uri $localHealthUrl -Method Get -TimeoutSec 2 -ErrorAction Stop
                    $healthCheck = $true
                } catch {
                    $retryCount++
                    if ($retryCount -lt 3) { 
                        Write-Progress -Activity "Server Health Check" -Status "Waiting for Node.js to bind port... (Attempt $retryCount/3)" -PercentComplete ($retryCount * 33)
                        Start-Sleep -Seconds 2 
                    }
                }
            }
            Write-Progress -Activity "Server Health Check" -Completed
            
            $pidStr = Get-Content $pidFile
            if ($healthCheck) {
                Write-Host " Status: ONLINE (PID: $pidStr)" -ForegroundColor Green
            } else {
                Write-Host " Status: STARTING / UNRESPONSIVE (PID: $pidStr)" -ForegroundColor Yellow
            }
            if (Test-Path "$WorkingFolder\server\data\app.db") {
                Write-Host " Admin Panel:   ${global:AppUrl}/" -ForegroundColor Yellow
            } else {
                Write-Host " Installer URL: ${global:AppUrl}/installer" -ForegroundColor Yellow
            }
            Write-Host " API Health:    ${global:AppUrl}/api/health" -ForegroundColor Yellow
            Write-Host "-----------------------------"
        } else {
            Write-Host " Status: STOPPED" -ForegroundColor Red
            Write-Host "-----------------------------"
        }
    }
    
    while ($true) {
        $isRunning = $false
        if (Test-Path $pidFile) {
            $pidStr = Get-Content $pidFile
            $process = Get-Process -Id $pidStr -ErrorAction SilentlyContinue
            if ($process -and !$process.HasExited) { $isRunning = $true }
        }
        
        $options = @()
        if ($isRunning) {
            $options += [PSCustomObject]@{ Key = '1'; Label = 'Stop Server' }
            $options += [PSCustomObject]@{ Key = '2'; Label = 'Restart Server' }
        } else {
            $options += [PSCustomObject]@{ Key = '1'; Label = 'Start Server' }
        }
        $options += [PSCustomObject]@{ Key = '3'; Label = 'View Logs' }
        $options += [PSCustomObject]@{ Key = '4'; Label = 'Clear Logs' }
        $options += [PSCustomObject]@{ Key = '5'; Label = 'Register as Windows Startup Task' }
        $options += [PSCustomObject]@{ Key = '6'; Label = 'Register as Windows Service (via NSSM, runs at boot)' }
        $options += [PSCustomObject]@{ Key = 'b'; Label = 'Back to Main Menu' }

        $choice = Invoke-Menu -Title "" -HeaderContent $headerContent -Options $options -DefaultChoice "1"
        if ($null -eq $choice -or $choice -eq 'b') { return }
        
        if ($choice -eq '1') {
            if ($isRunning) {
                Write-Host "Stopping server (PID: $pidStr)..."
                taskkill /PID $pidStr /T /F 2>&1 | Out-Null
                Remove-Item $pidFile -ErrorAction SilentlyContinue
                Write-Host "Server stopped." -ForegroundColor Green
            } else {
                if (-not (Resolve-PortConflict $global:Port)) {
                    Write-Host "Aborted. Port is still in use." -ForegroundColor Yellow
                    Pause
                    continue
                }
                Write-Host "Starting server..."
                $oldPath = $env:PATH
                if ($EnvPath) { $env:PATH = $EnvPath + ";" + $env:PATH }
                
                if ($EnvPath) {
                    $npmPath = Join-Path $EnvPath "npm.cmd"
                } else {
                    $npmPath = (Get-Command npm).Source
                }
                
                $proc = Start-Process $npmPath -ArgumentList $StartCommand -WorkingDirectory $WorkingFolder -WindowStyle Hidden -PassThru -RedirectStandardOutput "$LogFolder\server.log" -RedirectStandardError "$LogFolder\server.err.log"
                $proc.Id | Out-File $pidFile
                
                $env:PATH = $oldPath
                Write-Host "Server started in background." -ForegroundColor Green
            }
        } elseif ($choice -eq '2' -and $isRunning) {
            Write-Host "Stopping server (PID: $pidStr)..."
            taskkill /PID $pidStr /T /F 2>&1 | Out-Null
            Remove-Item $pidFile -ErrorAction SilentlyContinue
            if (-not (Resolve-PortConflict $global:Port)) {
                Write-Host "Aborted. Port is still in use." -ForegroundColor Yellow
                Pause
                continue
            }
            Write-Host "Starting server..."
            $oldPath = $env:PATH
            if ($EnvPath) { $env:PATH = $EnvPath + ";" + $env:PATH }
            
            if ($EnvPath) {
                $npmPath = Join-Path $EnvPath "npm.cmd"
            } else {
                $npmPath = (Get-Command npm).Source
            }
            
            $proc = Start-Process $npmPath -ArgumentList $StartCommand -WorkingDirectory $WorkingFolder -WindowStyle Hidden -PassThru -RedirectStandardOutput "$LogFolder\server.log" -RedirectStandardError "$LogFolder\server.err.log"
            $proc.Id | Out-File $pidFile
            
            $env:PATH = $oldPath
            Write-Host "Server restarted." -ForegroundColor Green
        } elseif ($choice -eq '3') {
            $logFile = Join-Path $LogFolder "server.log"
            $errLogFile = Join-Path $LogFolder "server.err.log"
            if (Test-Path $logFile) {
                Write-Host "`n--- Last 30 lines of server.log ---" -ForegroundColor Cyan
                Get-Content $logFile -Tail 30 | Write-Host
            }
            if (Test-Path $errLogFile) {
                Write-Host "`n--- Last 30 lines of server.err.log ---" -ForegroundColor Red
                Get-Content $errLogFile -Tail 30 | Write-Host
            }
            Write-Host "---------------------------------------"
            Pause
        } elseif ($choice -eq '4') {
            $logFile = Join-Path $LogFolder "server.log"
            $errLogFile = Join-Path $LogFolder "server.err.log"
            if (Test-Path $logFile) { Clear-Content $logFile -ErrorAction SilentlyContinue }
            if (Test-Path $errLogFile) { Clear-Content $errLogFile -ErrorAction SilentlyContinue }
            Write-Host "Logs cleared." -ForegroundColor Green
            Pause
        } elseif ($choice -eq '5') {
            Write-Host "Registering Windows Startup Task..." -ForegroundColor Cyan
            $taskName = Read-Host "Enter Scheduled Task Name (e.g., LiteraCompareServer) [Type 'c' to cancel]"
            if ($taskName -match '^[cC]$') { continue }
            if ([string]::IsNullOrWhiteSpace($taskName)) { continue }
            
            # Unregister existing task if it exists
            $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
            if ($existingTask) {
                Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
                Write-Host "Removed existing startup task." -ForegroundColor Yellow
            }
            
            $deployScript = Join-Path $ProjectRoot "deploy.ps1"
            $actionStr = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$deployScript`" -AutoStart"
            $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $actionStr
            
            $trigger = New-ScheduledTaskTrigger -AtStartup
            $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
            $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Days 3650)
            
            Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Auto-start $global:AppName via deploy.ps1" | Out-Null
            Save-DeploymentRegistration -LogFolder $LogFolder -Type "StartupTask" -Name $taskName
            Write-Host "Successfully registered '$taskName' to run at system startup." -ForegroundColor Green
            Pause
        } elseif ($choice -eq '6') {
            Invoke-RegisterNssmService -WorkingFolder $WorkingFolder -LogFolder $LogFolder -StartCommand $StartCommand -EnvPath $EnvPath
        }
    }
}

function Invoke-DockerDeploy {
    Clear-Host
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host " Docker Deploy                        " -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    
    Show-CurrentDeploymentConfiguration
    
    if ([string]::IsNullOrWhiteSpace($global:AppUrl) -or [string]::IsNullOrWhiteSpace($global:Port)) {
        Write-Host "WARNING: Essential configuration is missing (URL or Port)." -ForegroundColor Red
        Write-Host "Launching Configuration Wizard..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        Invoke-ConfigurationWizard
        
        if ([string]::IsNullOrWhiteSpace($global:AppUrl) -or [string]::IsNullOrWhiteSpace($global:Port)) {
            Write-Host "Deployment cannot proceed without valid configuration." -ForegroundColor Red
            Pause
            return
        }
    }
    
    try {
        $dockerCheck = Get-Command docker -ErrorAction Stop
    } catch {
        $dockerCheck = $null
    }

    if (-not $dockerCheck) {
        Write-Host "Docker is not installed." -ForegroundColor Red
        $ans = Read-Host "Would you like to open the Docker download page? (y/n)"
        if ($ans -eq 'y') { Start-Process "https://docs.docker.com/desktop/install/windows-install/" }
        return
    }
    
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Docker Engine is not running." -ForegroundColor Red
        $ans = Read-Host "Would you like to try starting Docker Desktop? (y/n)"
        if ($ans -eq 'y') {
            Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -ErrorAction SilentlyContinue
            Write-Host "Waiting for Docker to start..."
            
            $started = $false
            for ($i = 0; $i -lt 12; $i++) {
                Start-Sleep -Seconds 5
                docker info > $null 2>&1
                if ($LASTEXITCODE -eq 0) {
                    $started = $true
                    Write-Host "Docker is now running." -ForegroundColor Green
                    break
                }
            }
            if (-not $started) {
                Write-Host "Docker failed to start within the expected time. Please start it manually and try again." -ForegroundColor Red
                Pause
                return
            }
        } else {
            return
        }
    }
    
    $ContainerName = $global:AppName.ToLower() -replace '[^a-z0-9]', '-' -replace '-+', '-' -replace '^-|-$', ''
    $ImageName = $ContainerName
    
    $imageExists = docker images -q $ImageName
    $isContainerRunning = docker ps -a -q -f name="^/${ContainerName}$"
    
    if ($imageExists -or $isContainerRunning) {
        $headerContent = {
            Write-Host "An existing Docker installation was found." -ForegroundColor Yellow
        }
        
        $options = @(
            [PSCustomObject]@{ Key = '1'; Label = 'Update (rebuild) existing image and deploy' }
            [PSCustomObject]@{ Key = '2'; Label = 'Deploy (start/restart) without rebuilding' }
            [PSCustomObject]@{ Key = '3'; Label = 'Stop existing container' }
        )
        
        $imgChoice = Invoke-Menu -Title "" -HeaderContent $headerContent -Options $options
        if ($null -eq $imgChoice) { return }
        
        if ($imgChoice -eq '3') {
            Set-Location (Join-Path $ProjectRoot "docker")
            Write-Host "Stopping container..."
            docker compose down 2>&1 | Out-Null
            docker rm -f $ContainerName 2>&1 | Out-Null
            Write-Host "Container stopped." -ForegroundColor Green
            Pause
            return
        }

        if ($imgChoice -eq '1') {
            if (-not (Confirm-DeploymentSettingsUpdate)) { return }
            New-ConfigurationBackup -Reason "docker-rebuild" | Out-Null
        }
    } else {
        $imgChoice = '1'
    }

    # Build the Compose file after an optional settings update.
    $ContainerName = $global:AppName.ToLower() -replace '[^a-z0-9]', '-' -replace '-+', '-' -replace '^-|-$', ''
    $ImageName = $ContainerName
    $envPath = Join-Path $ProjectRoot ".env"
    $useSsl = $false
    $sslCertHost = ""
    $sslKeyHost = ""
    if (Test-Path $envPath) {
        $envLines = Get-Content $envPath
        if (($envLines -match "^USE_NATIVE_SSL=true$").Count -gt 0) {
            $useSsl = $true
            $certMatch = $envLines | Select-String "^SSL_CERT_PATH=(.*)$"
            if ($certMatch) { $sslCertHost = $certMatch.Matches.Groups[1].Value }
            $keyMatch = $envLines | Select-String "^SSL_KEY_PATH=(.*)$"
            if ($keyMatch) { $sslKeyHost = $keyMatch.Matches.Groups[1].Value }
        }
    }

    $composePath = Join-Path $ProjectRoot "docker\docker-compose.yml"
    $composeContent = "name: $ContainerName`nversion: '3.8'`nservices:`n  server:`n    build: `n      context: ../`n      dockerfile: docker/Dockerfile`n    image: $ImageName`n    container_name: $ContainerName`n"
    if ($useSsl) {
        $composeContent += "    environment:`n"
        $composeContent += "      - SSL_CERT_PATH=/certs/server.crt`n"
        $composeContent += "      - SSL_KEY_PATH=/certs/server.key`n"
    }
    $composeContent += "    ports:`n      - `"$($global:Port):$($global:Port)`"`n"
    $composeContent += "    volumes:`n      - litera-compare-data:/app/server/data`n"
    if ($useSsl -and $sslCertHost -and $sslKeyHost) {
        $composeContent += "      - '${sslCertHost}:/certs/server.crt:ro'`n"
        $composeContent += "      - '${sslKeyHost}:/certs/server.key:ro'`n"
    }
    $composeContent += "    restart: unless-stopped`n    logging:`n      driver: `"json-file`"`n      options:`n        max-size: `"10m`"`n        max-file: `"3`"`n`nvolumes:`n  litera-compare-data:`n"
    Set-Content -Path $composePath -Value $composeContent
    
    # Proceeding with deployment (Option 1 or 2)
    Set-Location (Join-Path $ProjectRoot "docker")
    Write-Host "Preparing deployment..."
    docker compose down 2>&1 | Out-Null
    docker compose -p docker down 2>&1 | Out-Null
    docker rm -f $ContainerName 2>&1 | Out-Null
    Start-Sleep -Seconds 2
    
    if (-not (Resolve-PortConflict $global:Port)) {
        Write-Host "Aborted. Port is still in use. Docker deployment cannot proceed." -ForegroundColor Yellow
        Pause
        return
    }
    
    if ($imgChoice -eq '2') {
        Write-Host "Deploying container via Docker Compose..."
        $runOutput = docker compose up -d 2>&1
    } else {
        Write-Host "Building image and deploying container via Docker Compose..."
        $runOutput = docker compose up -d --build 2>&1
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-DeploymentLog "Docker deployment failed: $runOutput" "ERROR"
        Write-Host "Failed to start container! Error:`n$runOutput" -ForegroundColor Red
        Pause
        return
    }
    
    Write-Host "`nDocker Deployment Complete!" -ForegroundColor Green
    Write-DeploymentLog "Docker deployment completed for '$ContainerName'."
    Write-Host "Installer URL: ${global:AppUrl}/installer"
    Write-Host "API Health:    ${global:AppUrl}/api/health"
    
    Write-Host "Docker container is running in the background. Use 'docker logs $ContainerName' to view logs."
    Pause
}

function Invoke-ServerDeploy {
    Clear-Host
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host " Server Deploy                        " -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    
    Show-CurrentDeploymentConfiguration
    
    if ([string]::IsNullOrWhiteSpace($global:AppUrl) -or [string]::IsNullOrWhiteSpace($global:Port)) {
        Write-Host "WARNING: Essential configuration is missing (URL or Port)." -ForegroundColor Red
        Write-Host "Launching Configuration Wizard..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        Invoke-ConfigurationWizard
        
        if ([string]::IsNullOrWhiteSpace($global:AppUrl) -or [string]::IsNullOrWhiteSpace($global:Port)) {
            Write-Host "Deployment cannot proceed without valid configuration." -ForegroundColor Red
            Pause
            return
        }
    }
    
    $nodeCheck = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCheck) {
        $headerContent = {
            Write-Host "Node.js is not installed." -ForegroundColor Red
        }
        $options = @(
            [PSCustomObject]@{ Key = '1'; Label = 'Open download page in browser' }
            [PSCustomObject]@{ Key = '2'; Label = 'Auto-install Node.js via winget' }
        )
        $ans = Invoke-Menu -Title "" -HeaderContent $headerContent -Options $options
        if ($null -eq $ans) { return }
        
        if ($ans -eq '1') {
            Start-Process "https://nodejs.org/"
            return
        } elseif ($ans -eq '2') {
            Write-Host "Installing Node.js..."
            winget install OpenJS.NodeJS -e --source winget
            Write-Host "Node.js installed. Please restart this script to reload environment variables." -ForegroundColor Yellow
            Pause
            exit
        }
    }
    
    Set-Location $ProjectRoot
    $LogFolder = Join-Path $ProjectRoot "logs"
    if (-not (Test-Path $LogFolder)) { New-Item -ItemType Directory -Path $LogFolder | Out-Null }
    
    if (-not (Test-Path "$ProjectRoot\dist\index.html")) {
        $npmPath = (Get-Command npm.cmd -ErrorAction Stop).Source
        Write-Host "Installing dependencies..."
        & $npmPath install
        if ($LASTEXITCODE -ne 0) {
            Write-DeploymentLog "Server dependency installation failed." "ERROR"
            Write-Host "Dependency installation failed. The server was not started." -ForegroundColor Red
            Pause
            return
        }

        Write-Host "Building project..."
        & $npmPath run build
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path "$ProjectRoot\dist\index.html")) {
            Write-DeploymentLog "Server build failed or did not produce dist\\index.html." "ERROR"
            Write-Host "Build failed. The server was not started." -ForegroundColor Red
            Pause
            return
        }
    } else {
        $headerContent = {
            Write-Host "Existing installation found in dist folder." -ForegroundColor Yellow
        }
        $options = @(
            [PSCustomObject]@{ Key = '1'; Label = 'Open Control Menu (Start / Stop / Restart / Logs)' }
            [PSCustomObject]@{ Key = '2'; Label = 'Rebuild and Update existing installation' }
            [PSCustomObject]@{ Key = '3'; Label = 'Uninstall (remove dist and node_modules)' }
        )
        $installChoice = Invoke-Menu -Title "" -HeaderContent $headerContent -Options $options
        if ($null -eq $installChoice) { return }

        if ($installChoice -eq '3') {
            $confirm = Read-Host "Are you sure you want to delete 'dist' and 'node_modules'? (y/N)"
            if ($confirm -match "^[yY]") {
                Write-Host "Uninstalling existing build..." -ForegroundColor Cyan
                Stop-ServerIfRunning -LogFolder $LogFolder
                if (Test-Path "$ProjectRoot\dist") { Remove-Item -Path "$ProjectRoot\dist" -Recurse -Force -ErrorAction SilentlyContinue }
                if (Test-Path "$ProjectRoot\node_modules") { Remove-Item -Path "$ProjectRoot\node_modules" -Recurse -Force -ErrorAction SilentlyContinue }
                Write-Host "Uninstallation complete. Returning to main menu..." -ForegroundColor Green
                Pause
                return
            } else {
                Write-Host "Uninstallation cancelled." -ForegroundColor Yellow
                return
            }
        } elseif ($installChoice -eq '2') {
            if (-not (Confirm-DeploymentSettingsUpdate)) { return }
            $wasRunning = Test-ServerRunning -LogFolder $LogFolder
            New-ConfigurationBackup -Reason "server-rebuild" | Out-Null
            Write-Host "Updating and rebuilding installation..." -ForegroundColor Cyan
            Stop-ServerIfRunning -LogFolder $LogFolder
            $npmPath = (Get-Command npm.cmd -ErrorAction Stop).Source
            & $npmPath install
            if ($LASTEXITCODE -ne 0) {
                Write-DeploymentLog "Server dependency installation failed." "ERROR"
                Write-Host "Dependency installation failed. The server was not restarted." -ForegroundColor Red
                Pause
                return
            }
            & $npmPath run build
            if ($LASTEXITCODE -ne 0 -or -not (Test-Path "$ProjectRoot\dist\index.html")) {
                Write-DeploymentLog "Server rebuild failed." "ERROR"
                Write-Host "Rebuild failed. The server was not restarted." -ForegroundColor Red
                Pause
                return
            }
            if ($wasRunning) {
                Write-Host "Restarting the previously running server..." -ForegroundColor Cyan
                Start-ManagedServer -WorkingFolder $ProjectRoot -LogFolder $LogFolder -StartCommand "start" | Out-Null
            }
            Write-DeploymentLog "Server rebuild completed."
            Write-Host "Rebuild complete!" -ForegroundColor Green
        }
    }
    
    $env:NODE_ENV = "production"
    Show-ProcessMenu -WorkingFolder $ProjectRoot -LogFolder $LogFolder -StartCommand "start"
}

function Invoke-PortableRun {
    Clear-Host
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host " Portable Run                         " -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    
    Show-CurrentDeploymentConfiguration
    $existingPortableVer = Get-PortableNodeVersion
    Write-Host "Portable Node.js: $(if ($existingPortableVer) { $existingPortableVer } else { 'Not downloaded yet' })"
    Write-Host ""
    
    if ([string]::IsNullOrWhiteSpace($global:AppUrl) -or [string]::IsNullOrWhiteSpace($global:Port)) {
        Write-Host "WARNING: Essential configuration is missing (URL or Port)." -ForegroundColor Red
        Write-Host "Launching Configuration Wizard..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        Invoke-ConfigurationWizard
        
        if ([string]::IsNullOrWhiteSpace($global:AppUrl) -or [string]::IsNullOrWhiteSpace($global:Port)) {
            Write-Host "Deployment cannot proceed without valid configuration." -ForegroundColor Red
            Pause
            return
        }
    }
    
    $DeployFolder = Join-Path $ProjectRoot "portable"
    if (-not (Test-Path $DeployFolder)) { New-Item -ItemType Directory -Path $DeployFolder | Out-Null }
    $PortableAppFolder = Join-Path $DeployFolder "app"
    
    $NodeFolder = Join-Path $DeployFolder "node"
    if (-not (Test-Path $NodeFolder)) {
        $headerContent = {
            Write-Host "Portable Node.js not found." -ForegroundColor Yellow
        }
        $options = @(
            [PSCustomObject]@{ Key = '1'; Label = 'Auto-download and setup Portable Node.js (v25.9.0)' }
        )
        $ans = Invoke-Menu -Title "" -HeaderContent $headerContent -Options $options
        if ($null -eq $ans) { return }
        
        if ($ans -eq '1') {
            $nodeUrl = "https://nodejs.org/dist/latest-v25.x/node-v25.9.0-win-x64.zip"
            $zipPath = Join-Path $DeployFolder "node.zip"
            Write-Host "Downloading Portable Node.js (this may take a minute, see progress above)..."
            Invoke-WebRequest -Uri $nodeUrl -OutFile $zipPath -UseBasicParsing
            Write-Host "Extracting..."
            Expand-Archive -Path $zipPath -DestinationPath $DeployFolder -Force
            Rename-Item -Path (Join-Path $DeployFolder "node-v25.9.0-win-x64") -NewName "node"
            Remove-Item $zipPath -Force
            Write-Host "Portable Node.js setup complete." -ForegroundColor Green
        }
    }

    $activePortableVer = Get-PortableNodeVersion -NodeFolder $NodeFolder
    Write-Host "Using Portable Node.js: $(if ($activePortableVer) { $activePortableVer } else { 'Unknown (node.exe not found or failed to run)' })" -ForegroundColor $(if ($activePortableVer) { 'Cyan' } else { 'Red' })

    Set-Location $ProjectRoot
    if (-not (Test-Path "$PortableAppFolder\dist\index.html")) {
        $EnvPath = $NodeFolder
        Sync-PortableApplication -PortableAppFolder $PortableAppFolder
        Set-Location $PortableAppFolder
        $oldPath = $env:PATH
        $env:PATH = $EnvPath + ";" + $env:PATH
        
        Write-Host "Installing dependencies using Portable Node..."
        & "$NodeFolder\npm.cmd" install
        if ($LASTEXITCODE -ne 0) {
            $env:PATH = $oldPath
            Write-DeploymentLog "Portable dependency installation failed." "ERROR"
            Write-Host "Dependency installation failed. The portable server was not started." -ForegroundColor Red
            Pause
            return
        }
        
        Write-Host "Building project..."
        & "$NodeFolder\npm.cmd" run build

        $env:PATH = $oldPath
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path "$PortableAppFolder\dist\index.html")) {
            Write-DeploymentLog "Portable build failed or did not produce dist\\index.html." "ERROR"
            Write-Host "Build failed. The portable server was not started." -ForegroundColor Red
            Pause
            return
        }
    } else {
        $EnvPath = $NodeFolder
        
        $headerContent = {
            Write-Host "Existing portable installation found in portable\app." -ForegroundColor Yellow
        }
        $options = @(
            [PSCustomObject]@{ Key = '1'; Label = 'Open Control Menu (Start / Stop / Restart / Logs)' }
            [PSCustomObject]@{ Key = '2'; Label = 'Rebuild and Update existing installation' }
            [PSCustomObject]@{ Key = '3'; Label = 'Uninstall portable app (remove portable\app)' }
        )
        $installChoice = Invoke-Menu -Title "" -HeaderContent $headerContent -Options $options
        if ($null -eq $installChoice) { return }

        if ($installChoice -eq '3') {
            $confirm = Read-Host "Are you sure you want to delete 'portable\app' and its dependencies? (y/N)"
            if ($confirm -match "^[yY]") {
                Write-Host "Uninstalling existing build..." -ForegroundColor Cyan
                Stop-ServerIfRunning -LogFolder $DeployFolder
                if (Test-Path $PortableAppFolder) { Remove-Item -Path $PortableAppFolder -Recurse -Force -ErrorAction SilentlyContinue }
                Write-Host "Uninstallation complete. Returning to main menu..." -ForegroundColor Green
                Pause
                return
            } else {
                Write-Host "Uninstallation cancelled." -ForegroundColor Yellow
                return
            }
        } elseif ($installChoice -eq '2') {
            if (-not (Confirm-DeploymentSettingsUpdate)) { return }
            $wasRunning = Test-ServerRunning -LogFolder $DeployFolder
            New-ConfigurationBackup -Reason "portable-rebuild" | Out-Null
            Write-Host "Updating and rebuilding installation..." -ForegroundColor Cyan
            Stop-ServerIfRunning -LogFolder $DeployFolder
            Sync-PortableApplication -PortableAppFolder $PortableAppFolder
            Set-Location $PortableAppFolder
            $oldPath = $env:PATH
            $env:PATH = $EnvPath + ";" + $env:PATH
            & "$NodeFolder\npm.cmd" install
            if ($LASTEXITCODE -ne 0) {
                $env:PATH = $oldPath
                Write-DeploymentLog "Portable dependency installation failed." "ERROR"
                Write-Host "Dependency installation failed. The portable server was not restarted." -ForegroundColor Red
                Pause
                return
            }
            & "$NodeFolder\npm.cmd" run build
            $env:PATH = $oldPath
            if ($LASTEXITCODE -ne 0 -or -not (Test-Path "$PortableAppFolder\dist\index.html")) {
                Write-DeploymentLog "Portable rebuild failed." "ERROR"
                Write-Host "Rebuild failed. The server was not restarted." -ForegroundColor Red
                Pause
                return
            }
            if ($wasRunning) {
                Write-Host "Restarting the previously running portable server..." -ForegroundColor Cyan
                Start-ManagedServer -WorkingFolder $PortableAppFolder -LogFolder $DeployFolder -StartCommand "start" -EnvPath $EnvPath | Out-Null
            }
            Write-DeploymentLog "Portable rebuild completed."
            Write-Host "Rebuild complete!" -ForegroundColor Green
        }
    }
    
    $env:NODE_ENV = "production"
    
    Show-ProcessMenu -WorkingFolder $PortableAppFolder -LogFolder $DeployFolder -StartCommand "start" -EnvPath $EnvPath
}

function Read-ValidInput {
    param(
        [string]$Prompt,
        [string]$Default = "",
        [switch]$AllowEmpty
    )
    while ($true) {
        $msg = if ($Default) { "$Prompt [$Default]" } else { "$Prompt [Type 'c' to cancel]" }
        $val = Read-Host $msg
        
        if ($val -eq 'm' -or $val -eq 'M') { throw "MAIN_MENU" }
        if ($val -eq 'b' -or $val -eq 'B' -or $val -eq 'c' -or $val -eq 'C') { return $null }
        if ($val -eq 'q' -or $val -eq 'Q') { exit }
        
        if ([string]::IsNullOrWhiteSpace($val)) {
            if (-not [string]::IsNullOrWhiteSpace($Default)) { return $Default }
            if ($AllowEmpty) { return "" }
            Write-Host "Value cannot be empty. Please enter a value or 'c' to cancel." -ForegroundColor Yellow
        } else {
            return $val.Trim()
        }
    }
}

function Read-YesNo {
    param(
        [string]$Prompt,
        [string]$Default = "N"
    )
    while ($true) {
        $val = Read-Host "$Prompt [Type 'c' to cancel]"

        if ($val -eq 'm' -or $val -eq 'M') { throw "MAIN_MENU" }
        if ($val -eq 'c' -or $val -eq 'C') { return $null }
        if ($val -eq 'q' -or $val -eq 'Q') { exit }

        if ([string]::IsNullOrWhiteSpace($val)) { return ($Default -match '^[yY]$') }
        if ($val -match '^[yY]$') { return $true }
        if ($val -match '^[nN]$') { return $false }

        Write-Host "Please enter 'y', 'n', or 'c' to cancel." -ForegroundColor Yellow
    }
}

function Invoke-ConfigurationWizard {
    Clear-Host
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host " Network & SSL Configuration Wizard   " -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    
    Load-Environment
    Write-Host "Current Configuration:" -ForegroundColor Yellow
    Write-Host "App Name:       $($global:AppName)"
    Write-Host "Hosting Mode:   $($global:HostingMode)"
    Write-Host "Internal Port:  $($global:Port) (Node.js binds to this)"
    if ($global:HttpPort) { Write-Host "HTTP Port:      $($global:HttpPort) (Redirect)" }
    Write-Host "External URL:   $($global:AppUrl)"
    
    Write-Host (Get-SysCaStatusLine)
    Write-Host ""
    
    $cfgChoice = Read-Host "Update these settings? (y/N)"
    if ($cfgChoice -notmatch "^[yY]") { return }
    
    Clear-Host

    $envPath = Join-Path $ProjectRoot ".env"
    $envPort = "3000"
    $envUrl = "http://localhost:3000"
    $envAppName = "Litera Compare Server"
    $currentFqdn = ""
    $currentCert = ""
    $currentKey = ""
    
    $envContent = if (Test-Path $envPath) { Get-Content $envPath } else { @() }
    foreach ($line in $envContent) {
        if ($line -match "^PORT=(.*)$") { $envPort = $matches[1].Trim() }
        if ($line -match "^APP_URL=(.*)$") { $envUrl = $matches[1].Trim() }
        if ($line -match "^APP_NAME=(.*)$") { $envAppName = $matches[1].Trim() }
        if ($line -match "^APP_URL=https?://([^:/]+)") { $currentFqdn = $matches[1].Trim() }
        if ($line -match "^SSL_CERT_PATH=(.*)$") { $currentCert = $matches[1].Trim() }
        if ($line -match "^SSL_KEY_PATH=(.*)$") { $currentKey = $matches[1].Trim() }
    }

    $global:AppName = Read-ValidInput -Prompt "Enter App Name" -Default $envAppName
    if ($null -eq $global:AppName) { return }
    Write-Host " -> App Name: $($global:AppName)`n" -ForegroundColor DarkGray

    $options = @(
        [PSCustomObject]@{ Key = '1'; Label = 'Standard / HTTP Only (No custom SSL)' }
        [PSCustomObject]@{ Key = '2'; Label = 'Native Node.js SSL' }
        [PSCustomObject]@{ Key = '3'; Label = 'IIS Reverse Proxy (with SSL)' }
    )
    
    $sslChoice = Invoke-Menu -Title "Select Hosting Topology" -HeaderContent $null -Options $options
    if ($null -eq $sslChoice) { return }

    if ($sslChoice -eq '3') {
        # IIS Reverse Proxy: verify prerequisites FIRST, before collecting FQDN/ports/cert-store choices,
        # so the user isn't asked to fill in details only to hit a missing-module error later.
        Write-Host "`nChecking IIS requirements..." -ForegroundColor Cyan
        $iisInstalled = (Get-ItemProperty HKLM:\SOFTWARE\Microsoft\InetStp -ErrorAction SilentlyContinue)
        if (-not $iisInstalled) {
            Write-Host "IIS is not installed on this system!" -ForegroundColor Red
            Write-Host "Please enable IIS via 'Turn Windows features on or off' (Windows 10/11) or Server Manager (Windows Server)." -ForegroundColor Yellow
            $ans = Read-ValidInput -Prompt "Would you like to try installing IIS automatically now? (y/N)" -AllowEmpty
            if ($ans -match "^[yY]") {
                $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
                if ($isAdmin) {
                    Write-Host "Installing IIS..." -ForegroundColor Cyan
                    Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole -All -NoRestart -ErrorAction SilentlyContinue | Out-Null
                    Write-Host "IIS Installed successfully. Please run this script again." -ForegroundColor Green
                    Pause
                    return
                } else {
                    Write-Host "You must be Administrator to install IIS." -ForegroundColor Red
                    return
                }
            } else {
                return
            }
        }

        $rewriteInstalled = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\IIS Extensions\URL Rewrite" -ErrorAction SilentlyContinue)
        $arrInstalled = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\IIS Extensions\Application Request Routing" -ErrorAction SilentlyContinue)

        if (-not $rewriteInstalled -or -not $arrInstalled) {
            Write-Host "Missing required IIS Modules: URL Rewrite and/or Application Request Routing (ARR)" -ForegroundColor Red
            Write-Host "Download URL Rewrite: https://www.iis.net/downloads/microsoft/url-rewrite" -ForegroundColor Yellow
            Write-Host "Download ARR: https://www.iis.net/downloads/microsoft/application-request-routing" -ForegroundColor Yellow
            Write-Host "Please download and install these MSI packages from Microsoft, then try again." -ForegroundColor Yellow
            Pause
            return
        }

        # Check ARR Proxy setting
        try {
            Import-Module WebAdministration -ErrorAction Stop
            $arrProxy = Get-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST' -filter "system.webServer/proxy" -name "enabled" -ErrorAction SilentlyContinue
            if ($null -eq $arrProxy -or $arrProxy.Value -eq $false) {
                Write-Host "`nWARNING: IIS Application Request Routing (ARR) Proxy is NOT enabled!" -ForegroundColor Red
                Write-Host "You must enable the proxy setting for the Reverse Proxy to work." -ForegroundColor Yellow
                Write-Host "1. Opening IIS Manager (inetmgr) now..." -ForegroundColor Cyan
                Write-Host "2. Double-click on 'Application Request Routing Cache' at the server level." -ForegroundColor Cyan
                Write-Host "3. Click 'Server Proxy Settings...' in the right Actions pane." -ForegroundColor Cyan
                Write-Host "4. Check the 'Enable proxy' box and click 'Apply'." -ForegroundColor Cyan

                Start-Process "inetmgr"

                $ans = Read-ValidInput -Prompt "Press Enter once you have enabled it, or 'c' to cancel deployment" -AllowEmpty
                if ($null -eq $ans) { return }
            }
        } catch {
            Write-Host "`nCould not verify ARR Proxy setting. Ensure it is enabled in IIS Manager." -ForegroundColor Yellow
        }

        Write-Host "IIS requirements verified.`n" -ForegroundColor Green
    }

    # -------------------------------------------------------------
    # OPTION 1: STANDARD / HTTP ONLY
    # -------------------------------------------------------------
    if ($sslChoice -eq '1') {
        while ($true) {
            $global:Port = Read-ValidInput -Prompt "Enter Internal Node.js Port" -Default $envPort
            if ($null -eq $global:Port) { return }
            
            if (-not (Check-PortAvailable $global:Port)) {
                $usageInfo = Get-PortUsageInfo $global:Port
                Write-Host "`nWARNING: Port $($global:Port) is already in use by: $usageInfo" -ForegroundColor Red
                $proceed = Read-ValidInput -Prompt "Do you want to proceed with this port anyway? (y/N)" -AllowEmpty
                if ($proceed -match "^[yY]") { break }
            } else {
                break
            }
        }
        Write-Host " -> Port: $($global:Port)`n" -ForegroundColor DarkGray

        $inputUrl = Read-ValidInput -Prompt "Enter External URL / FQDN" -Default $envUrl
        if ($null -eq $inputUrl) { return }
        
        $rawAppUrl = $inputUrl
        $isHttps = $rawAppUrl -match "^https"
        $rawAppUrl = $rawAppUrl -replace "^https?[^a-zA-Z0-9]+", ""
        if ($isHttps) { $rawAppUrl = "https://" + $rawAppUrl } else { $rawAppUrl = "http://" + $rawAppUrl }
        
        try {
            $uriBuilder = New-Object System.UriBuilder($rawAppUrl)
            $isLocalHostOrIp = ($uriBuilder.Host -match "^localhost$" -or $uriBuilder.Host -match "^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$")
            $hasExplicitPort = $rawAppUrl -match ":\d+/?$"
            
            if (-not $hasExplicitPort -or $isLocalHostOrIp) {
                if ($global:Port -eq "80" -or $global:Port -eq "443") {
                    $uriBuilder.Port = -1
                } else {
                    $uriBuilder.Port = [int]$global:Port
                }
            }
            $global:AppUrl = $uriBuilder.Uri.ToString().TrimEnd('/')
        } catch {
            $global:AppUrl = $rawAppUrl
        }
        
        $envContent = $envContent | Where-Object { $_ -notmatch "^USE_NATIVE_SSL" -and $_ -notmatch "^SSL_CERT_PATH" -and $_ -notmatch "^SSL_KEY_PATH" -and $_ -notmatch "^HTTP_PORT" -and $_ -notmatch "^PORT" -and $_ -notmatch "^APP_URL" -and $_ -notmatch "^APP_NAME" }
        $envContent += "APP_NAME=$($global:AppName)"
        $envContent += "PORT=$($global:Port)"
        $envContent += "APP_URL=$($global:AppUrl)"
        $envContent | Set-Content $envPath
        
        Write-Host "`nStandard configuration saved successfully." -ForegroundColor Green
        Load-Environment
        Pause
        return
    }

    # -------------------------------------------------------------
    # OPTION 2 or 3: SSL MODES
    # -------------------------------------------------------------
    $fqdn = Read-ValidInput -Prompt "Enter FQDN (e.g., api.yourdomain.com)" -Default $currentFqdn
    if ($null -eq $fqdn) { Write-Host "Cancelled."; return }
    if ($fqdn -notmatch '^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$') {
        Write-Host "The FQDN contains invalid characters." -ForegroundColor Red
        Pause
        return
    }
    
    while ($true) {
        $defPort = if ($envPort -and $envPort -ne "3000" -and $envPort -ne "80") { $envPort } else { "443" }
        $publicPort = Read-ValidInput -Prompt "Enter Public HTTPS Port" -Default $defPort
        if ($null -eq $publicPort) { Write-Host "Cancelled."; return }
        if (-not (Test-ValidPort $publicPort)) {
            Write-Host "Enter a port from 1 to 65535." -ForegroundColor Red
            continue
        }
        
        if (-not (Check-PortAvailable $publicPort)) {
            $usageInfo = Get-PortUsageInfo $publicPort
            Write-Host "`nWARNING: Port $publicPort is already in use by: $usageInfo" -ForegroundColor Red
            if ($sslChoice -eq '3' -and ($usageInfo -match "System" -or $usageInfo -match "PID: 4")) {
                Write-Host "NOTE: Since you are configuring IIS Reverse Proxy, Port $publicPort being in use by 'System' (IIS) is expected. SNI will allow sharing." -ForegroundColor Cyan
            }
            $proceed = Read-ValidInput -Prompt "Do you want to proceed with this port anyway? (y/N)" -AllowEmpty
            if ($proceed -match "^[yY]") { break }
        } else {
            break
        }
    }

    while ($true) {
        $httpPort = Read-ValidInput -Prompt "Enter HTTP Port (for redirect/binding)" -AllowEmpty
        if ($null -eq $httpPort) { Write-Host "Cancelled."; return }
        if ([string]::IsNullOrWhiteSpace($httpPort)) { break }
        if (-not (Test-ValidPort $httpPort)) {
            Write-Host "Enter a port from 1 to 65535." -ForegroundColor Red
            continue
        }
        
        if (-not (Check-PortAvailable $httpPort)) {
            $usageInfo = Get-PortUsageInfo $httpPort
            Write-Host "`nWARNING: Port $httpPort is already in use by: $usageInfo" -ForegroundColor Red
            if ($sslChoice -eq '3' -and ($usageInfo -match "System" -or $usageInfo -match "PID: 4")) {
                Write-Host "NOTE: Since you are configuring IIS Reverse Proxy, Port $httpPort being in use by 'System' (IIS) is expected." -ForegroundColor Cyan
            }
            $proceed = Read-ValidInput -Prompt "Do you want to proceed with this port anyway? (y/N)" -AllowEmpty
            if ($proceed -match "^[yY]") { break }
        } else {
            break
        }
    }

    if ($sslChoice -eq '2' -or $sslChoice -eq '3') {
        $isAdminForCa = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
        $sysCa = [System.Environment]::GetEnvironmentVariable('NODE_USE_SYSTEM_CA', 'Machine')

        if (-not $isAdminForCa) {
            Write-Host "`nSkipping Cert Store (NODE_USE_SYSTEM_CA) configuration - you must run as Administrator to change this setting." -ForegroundColor Yellow
            Write-Host (Get-SysCaStatusLine)
        } else {
            $nodeSupportsCa = Test-NodeSupportsSystemCa
            if ($nodeSupportsCa -eq $false) {
                Write-Host "`nNOTE: The installed Node.js version does not support NODE_USE_SYSTEM_CA (requires v22.19+ / v24.6+). Enabling it now will have no effect until Node.js is upgraded." -ForegroundColor Yellow
            }

            if ($sysCa -eq '1') {
                $sysCaChoice = Read-YesNo -Prompt "Windows Cert Store (NODE_USE_SYSTEM_CA) is currently ENABLED. Disable it? (y/N)"
                if ($sysCaChoice) {
                    [System.Environment]::SetEnvironmentVariable('NODE_USE_SYSTEM_CA', $null, 'Machine')
                    $sysCaVerify = [System.Environment]::GetEnvironmentVariable('NODE_USE_SYSTEM_CA', 'Machine')
                    if ([string]::IsNullOrEmpty($sysCaVerify)) {
                        Write-Host "Disabled NODE_USE_SYSTEM_CA globally." -ForegroundColor Green
                        Write-Host "A new shell (or logoff/logon) is needed for this change to be visible elsewhere." -ForegroundColor DarkGray
                        Write-DeploymentLog "NODE_USE_SYSTEM_CA changed: '1' -> disabled"
                    } else {
                        Write-Host "Attempted to disable NODE_USE_SYSTEM_CA, but it still reads '$sysCaVerify'. Please verify manually." -ForegroundColor Red
                    }
                }
            } else {
                if (-not [string]::IsNullOrWhiteSpace($sysCa)) {
                    Write-Host "NOTE: NODE_USE_SYSTEM_CA is currently set to a non-standard value ('$sysCa'). Node treats anything other than '1' as disabled." -ForegroundColor Yellow
                }
                $sysCaChoice = Read-YesNo -Prompt "Enable Windows Cert Store for self-signed SSLs? (NODE_USE_SYSTEM_CA) (y/N)"
                if ($sysCaChoice) {
                    $rootCertFound = $false
                    try {
                        $rootCertFound = [bool](Get-ChildItem Cert:\LocalMachine\Root -ErrorAction SilentlyContinue | Where-Object { $_.Subject -match [regex]::Escape($fqdn) })
                    } catch { }
                    if (-not $rootCertFound) {
                        Write-Host "WARNING: No certificate matching '$fqdn' was found in the Windows Trusted Root Certification Authorities store. NODE_USE_SYSTEM_CA will have no effect until the cert is imported there (not just bound in IIS)." -ForegroundColor Yellow
                    }

                    [System.Environment]::SetEnvironmentVariable('NODE_USE_SYSTEM_CA', '1', 'Machine')
                    $sysCaVerify = [System.Environment]::GetEnvironmentVariable('NODE_USE_SYSTEM_CA', 'Machine')
                    if ($sysCaVerify -eq '1') {
                        Write-Host "Set NODE_USE_SYSTEM_CA=1 globally." -ForegroundColor Green
                        Write-Host "A new shell (or logoff/logon) is needed for this change to be visible elsewhere." -ForegroundColor DarkGray
                        Write-DeploymentLog "NODE_USE_SYSTEM_CA changed: '$sysCa' -> '1'"
                    } else {
                        Write-Host "Attempted to set NODE_USE_SYSTEM_CA=1, but it reads '$sysCaVerify'. Please verify manually." -ForegroundColor Red
                    }
                }
            }
        }
    }

    if ($sslChoice -eq '2') {
        # Native SSL
        if ($publicPort -eq '443') {
            Write-Host "`nWARNING: You selected Native SSL on port 443." -ForegroundColor Yellow
            Write-Host "If IIS (or another web server) is already running on this machine, Node.js will fail" -ForegroundColor Yellow
            Write-Host "to start because port 443 is in use, unless the server has multiple IP addresses." -ForegroundColor Yellow
            Write-Host "If you only have one IP, you should either use a custom port (e.g., 8443) or use the" -ForegroundColor Yellow
            Write-Host "IIS Reverse Proxy mode instead.`n" -ForegroundColor Yellow
            $proceed = Read-ValidInput -Prompt "Do you want to proceed anyway? (y/N)" -AllowEmpty
            if ($proceed -notmatch "^[yY]") { return }
        }
        
        $certPath = Read-ValidInput -Prompt "Enter absolute path to SSL Certificate (.pem/.crt)" -Default $currentCert
        if ($null -eq $certPath) { Write-Host "Cancelled."; return }
        $certPath = $certPath.Trim('"').Trim("'")
        
        $keyPath = Read-ValidInput -Prompt "Enter absolute path to SSL Private Key (.pem/.key)" -Default $currentKey
        if ($null -eq $keyPath) { Write-Host "Cancelled."; return }
        $keyPath = $keyPath.Trim('"').Trim("'")
        
        $envContent = $envContent | Where-Object { $_ -notmatch "^USE_NATIVE_SSL" -and $_ -notmatch "^SSL_CERT_PATH" -and $_ -notmatch "^SSL_KEY_PATH" -and $_ -notmatch "^PORT" -and $_ -notmatch "^HTTP_PORT" -and $_ -notmatch "^APP_URL" -and $_ -notmatch "^APP_NAME" }
        $envContent += "APP_NAME=$($global:AppName)"
        $envContent += "USE_NATIVE_SSL=true"
        $envContent += "SSL_CERT_PATH=$certPath"
        $envContent += "SSL_KEY_PATH=$keyPath"
        $envContent += "PORT=$publicPort"
        if ($httpPort) { $envContent += "HTTP_PORT=$httpPort" }
        $envContent += "APP_URL=https://${fqdn}:${publicPort}"
        
        $envContent | Set-Content $envPath
        Write-Host "Updated .env for Native SSL." -ForegroundColor Green
        Write-Host (Get-SysCaStatusLine)
        
        $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
        if ($isAdmin) {
            Write-Host "Opening Windows Firewall for port $publicPort..."
            New-NetFirewallRule -DisplayName "Litera Server HTTPS Port $publicPort" -Direction Inbound -LocalPort $publicPort -Protocol TCP -Action Allow -ErrorAction Continue | Out-Null
            if ($httpPort) {
                Write-Host "Opening Windows Firewall for port $httpPort..."
                New-NetFirewallRule -DisplayName "Litera Server HTTP Port $httpPort" -Direction Inbound -LocalPort $httpPort -Protocol TCP -Action Allow -ErrorAction Continue | Out-Null
            }
        } else {
            Write-Host "`nWARNING: You are not running PowerShell as Administrator!" -ForegroundColor Yellow
            Write-Host "The firewall rule could not be created automatically." -ForegroundColor Yellow
            Write-Host "You must manually open port $publicPort in Windows Firewall for external access." -ForegroundColor Yellow
            Pause
        }
    } elseif ($sslChoice -eq '3') {
        # IIS Reverse Proxy (module/ARR/proxy-enabled checks already verified earlier, right after topology selection)
        if ($publicPort -eq '443') {
            Write-Host "`nNOTE: You are configuring IIS on port 443." -ForegroundColor Cyan
            Write-Host "Server Name Indication (SNI) will be enabled automatically to allow" -ForegroundColor Cyan
            Write-Host "sharing port 443 with other existing websites using the FQDN: $fqdn.`n" -ForegroundColor Cyan
        }

        while ($true) {
            $internalPort = Read-ValidInput -Prompt "Enter internal Node.js Port" -Default "3000"
            if ($null -eq $internalPort) { return }
            if (-not (Test-ValidPort $internalPort)) {
                Write-Host "Enter a port from 1 to 65535." -ForegroundColor Red
                continue
            }
            
            if (-not (Check-PortAvailable $internalPort)) {
                $usageInfo = Get-PortUsageInfo $internalPort
                Write-Host "`nWARNING: Internal Port $internalPort is already in use by: $usageInfo" -ForegroundColor Red
                $proceed = Read-ValidInput -Prompt "Do you want to proceed with this port anyway? (y/N)" -AllowEmpty
                if ($proceed -match "^[yY]") { break }
            } else {
                break
            }
        }
        
        $certThumb = Read-ValidInput -Prompt "Enter IIS Certificate Thumbprint (from Windows Certificate Store)"
        if ($null -eq $certThumb) { return }
        $certThumb = $certThumb -replace '\s', ''
        $certificate = Get-ChildItem "Cert:\LocalMachine\My\$certThumb" -ErrorAction SilentlyContinue
        if (-not $certificate) {
            Write-Host "Certificate '$certThumb' was not found in Cert:\LocalMachine\My." -ForegroundColor Red
            Pause
            return
        }
        if (-not $certificate.HasPrivateKey) {
            Write-Host "The selected certificate does not have a private key." -ForegroundColor Red
            Pause
            return
        }
        
        $envContent = $envContent | Where-Object { $_ -notmatch "^USE_NATIVE_SSL" -and $_ -notmatch "^PORT" -and $_ -notmatch "^APP_URL" -and $_ -notmatch "^APP_NAME" }
        $envContent += "APP_NAME=$($global:AppName)"
        $envContent += "USE_NATIVE_SSL=false"
        $envContent += "PORT=$internalPort"
        $envContent += "APP_URL=https://${fqdn}:${publicPort}"
        
        $envContent | Set-Content $envPath
        Write-Host "Updated .env for IIS Reverse Proxy." -ForegroundColor Green
        
        Write-Host "Configuring IIS (requires Administrator privileges)..."
        try {
            Import-Module WebAdministration -ErrorAction Stop
            
            $siteName = Read-ValidInput -Prompt "Enter IIS Site name" -Default "LiteraCompare"
            if ($null -eq $siteName) { return }
            $appDir = $ProjectRoot
            
            if (Get-Website -Name $siteName -ErrorAction SilentlyContinue) {
                $siteAction = Invoke-Menu -Title "Existing IIS Site" -HeaderContent {
                    Write-Host "IIS Site '$siteName' already exists." -ForegroundColor Yellow
                } -Options @(
                    [PSCustomObject]@{ Key = '1'; Label = 'Update this existing site' }
                    [PSCustomObject]@{ Key = '2'; Label = 'Choose a different site name' }
                    [PSCustomObject]@{ Key = '3'; Label = 'Cancel IIS configuration' }
                )
                if ($siteAction -eq '3' -or $null -eq $siteAction) { return }
                if ($siteAction -eq '2') {
                    $siteName = Read-ValidInput -Prompt "Enter a new IIS Site name"
                    if ($null -eq $siteName -or (Get-Website -Name $siteName -ErrorAction SilentlyContinue)) {
                        Write-Host "That IIS site name is unavailable." -ForegroundColor Red
                        return
                    }
                } else {
                    New-ConfigurationBackup -Reason "iis-update" | Out-Null
                    Write-Host "Removing existing IIS Site '$siteName'..."
                    Remove-Website -Name $siteName
                }
            }
            
            Write-Host "Creating IIS Site '$siteName'..."
            if ($httpPort) {
                New-WebSite -Name $siteName -PhysicalPath $appDir -HostHeader $fqdn -Port $httpPort -Force -ErrorAction Stop
            } else {
                $dummyPort = Get-Random -Minimum 10000 -Maximum 60000
                New-WebSite -Name $siteName -PhysicalPath $appDir -HostHeader $fqdn -Port $dummyPort -Force -ErrorAction Stop
                Remove-WebBinding -Name $siteName -Protocol http -Port $dummyPort -ErrorAction SilentlyContinue
            }
            
            if (-not [string]::IsNullOrWhiteSpace($certThumb)) {
                Write-Host "Binding SSL Certificate (with SNI)..."
                New-WebBinding -Name $siteName -Protocol https -Port $publicPort -HostHeader $fqdn -SslFlags 1 -ErrorAction Stop
                $binding = Get-WebBinding -Name $siteName -Protocol https -Port $publicPort -HostHeader $fqdn
                if ($binding) {
                    try {
                        $binding.AddSslCertificate($certThumb, "My")
                    } catch {
                        if ($_.Exception.Message -match "0x80070520" -or $_.Exception.Message -match "logon session does not exist") {
                            Write-Host "`nWARNING: PowerShell could not attach the SSL certificate to the binding due to private key access restrictions (0x80070520)." -ForegroundColor Yellow
                            Write-Host "This usually happens if the cert was not imported to the Local Machine store, or the private key is not marked as exportable." -ForegroundColor Yellow
                            Write-Host "The IIS site has been created and configured successfully, but you MUST manually select the SSL Certificate:" -ForegroundColor Cyan
                            Write-Host "1. Open IIS Manager (inetmgr)" -ForegroundColor Cyan
                            Write-Host "2. Select your site ('$siteName') -> Bindings..." -ForegroundColor Cyan
                            Write-Host "3. Edit the HTTPS binding and select your SSL certificate from the dropdown." -ForegroundColor Cyan
                            Write-Host "4. Click OK." -ForegroundColor Cyan
                            $ans = Read-ValidInput -Prompt "Press Enter once you have manually bound the certificate, or 'c' to cancel" -AllowEmpty
                            if ($null -eq $ans) { return }
                        } else {
                            Write-Host "`nWARNING: Failed to bind SSL Certificate: $($_.Exception.Message)" -ForegroundColor Red
                            Write-Host "You may need to manually bind the certificate in IIS Manager." -ForegroundColor Yellow
                        }
                    }
                }
            }
            
            Write-Host "Granting IIS_IUSRS and IUSR read permissions to folder..."
            try {
                $acl = Get-Acl $appDir
                $rule1 = New-Object System.Security.AccessControl.FileSystemAccessRule("BUILTIN\IIS_IUSRS", "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow")
                $acl.AddAccessRule($rule1)
                
                $iusrSid = New-Object System.Security.Principal.SecurityIdentifier("S-1-5-17")
                $rule2 = New-Object System.Security.AccessControl.FileSystemAccessRule($iusrSid, "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow")
                $acl.AddAccessRule($rule2)
                
                Set-Acl $appDir $acl
            } catch {
                Write-Host "Could not automatically set permissions. You may need to manually grant IIS_IUSRS and IUSR read access to $appDir" -ForegroundColor Yellow
            }

            $internalUrl = "http://127.0.0.1:$internalPort"
            Write-Host "Configuring URL Rewrite to $internalUrl..."
            
            $webConfigContent = @"
<?xml version=`"1.0`" encoding=`"UTF-8`"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name=`"ProxyToNode`" stopProcessing=`"true`">
                    <match url=`"(.*)`" />
                    <action type=`"Rewrite`" url=`"http://127.0.0.1:$internalPort/{R:1}`" />
                </rule>
            </rules>
        </rewrite>
    </system.webServer>
</configuration>
"@
            $webConfigContent | Out-File (Join-Path $appDir "web.config") -Encoding UTF8
            
            Write-Host "IIS Setup Complete!" -ForegroundColor Green
            Write-Host (Get-SysCaStatusLine)
            Write-DeploymentLog "Configured IIS reverse proxy site '$siteName' for $fqdn."
            Write-Host "Refresh the Sites node in IIS Manager (F5) to show the new site in the Connections tree." -ForegroundColor Yellow
            Write-Host "Waiting to start the server..." -ForegroundColor Cyan
            $openIis = Read-ValidInput -Prompt "Open IIS Manager now? (y/N)" -AllowEmpty
            if ($openIis -match "^[yY]") { Start-Process "inetmgr" }
        } catch {
            Write-DeploymentLog "IIS setup failed: $($_.Exception.Message)" "ERROR"
            Write-Host "Failed to configure IIS. Ensure you are running this script as Administrator and IIS is installed." -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor Red
        }
    }
    
    Load-Environment
    Pause
}


function Load-Environment {
    $envPath = Join-Path $ProjectRoot ".env"
    if (Test-Path $envPath) {
        $global:Port = "3000"
        $global:HttpPort = ""
        $global:AppUrl = "http://localhost:3000"
        $global:AppName = "Litera Compare Server"
        $global:HostingMode = "Standard (HTTP)"
        
        $envContent = Get-Content $envPath
        
        if (($envContent -match "^USE_NATIVE_SSL=true$").Count -gt 0) { $global:HostingMode = "Native Node.js SSL" }
        elseif (($envContent -match "^USE_NATIVE_SSL=false$").Count -gt 0) { $global:HostingMode = "IIS Reverse Proxy" }

        foreach ($line in $envContent) {
            if ($line -match "^PORT=(.*)$") { $global:Port = $matches[1].Trim() }
            if ($line -match "^HTTP_PORT=(.*)$") { $global:HttpPort = $matches[1].Trim() }
            if ($line -match "^APP_URL=(.*)$") { $global:AppUrl = $matches[1].Trim() }
            if ($line -match "^APP_NAME=(.*)$") { $global:AppName = $matches[1].Trim() }
        }
        
        try {
            $uriBuilder = New-Object System.UriBuilder($global:AppUrl)
            $isLocalHostOrIp = ($uriBuilder.Host -match "^localhost$" -or $uriBuilder.Host -match "^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$")
            
            if ($isLocalHostOrIp -and $uriBuilder.Port -ne [int]$global:Port) {
                if ($global:Port -eq "80" -or $global:Port -eq "443") {
                    $uriBuilder.Port = -1
                } else {
                    $uriBuilder.Port = [int]$global:Port
                }
                $global:AppUrl = $uriBuilder.Uri.ToString().TrimEnd('/')
            }
        } catch { }
    } else {
        $global:Port = "3000"
        $global:HttpPort = ""
        $global:AppUrl = "http://localhost:3000"
        $global:AppName = "Litera Compare Server"
        $global:HostingMode = "Standard (HTTP)"
    }
}

function Invoke-StatusCheck {
    Clear-Host
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host " Application Status Check             " -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "Global Port: $($global:Port)"
    Write-Host "Global URL: $($global:AppUrl)`n"
    $buildInfo = Get-AppBuildInfo
    Write-Host "App Version: $($buildInfo.Version)"
    Write-Host "Last Build:   $($buildInfo.BuildTime)"
    
    $ContainerName = $global:AppName.ToLower() -replace '[^a-z0-9]', '-' -replace '-+', '-' -replace '^-|-$', ''
    
    # 1. Docker Status
    Write-Host "--- Docker Status ---" -ForegroundColor Yellow
    try {
        $dockerCheck = Get-Command docker -ErrorAction Stop
        $dockerPs = docker ps -a -f name="^/${ContainerName}$" --format "{{.Status}}"
        if ($dockerPs) {
            Write-Host "Container '$ContainerName' found."
            Write-Host "Status: $dockerPs" -ForegroundColor Green
        } else {
            Write-Host "No Docker container '$ContainerName' found." -ForegroundColor DarkGray
        }
    } catch {
        Write-Host "Docker is not installed or not running." -ForegroundColor DarkGray
    }
    
    # 2. Server Status
    Write-Host "`n--- Server Status (Native Node) ---" -ForegroundColor Yellow
    $serverPidFile = Join-Path $ProjectRoot "logs\server.pid"
    if (Test-Path $serverPidFile) {
        $serverPid = Get-Content $serverPidFile
        $process = Get-Process -Id $serverPid -ErrorAction SilentlyContinue
        if ($process -and !$process.HasExited) {
            Write-Host "Server is RUNNING (PID: $serverPid)" -ForegroundColor Green
        } else {
            Write-Host "Server is STOPPED (PID file exists but process dead)" -ForegroundColor Red
        }
    } else {
        Write-Host "No native Server running." -ForegroundColor DarkGray
    }
    if (Test-Path (Join-Path $ProjectRoot "dist")) {
        Write-Host "Build exists in 'dist' folder." -ForegroundColor Cyan
    }
    Show-DeploymentRegistrations -LogFolder (Join-Path $ProjectRoot "logs") -Label "Server"
    
    # 3. Portable Status
    Write-Host "`n--- Portable Status ---" -ForegroundColor Yellow
    $portablePidFile = Join-Path $ProjectRoot "portable\server.pid"
    if (Test-Path $portablePidFile) {
        $portablePid = Get-Content $portablePidFile
        $process = Get-Process -Id $portablePid -ErrorAction SilentlyContinue
        if ($process -and !$process.HasExited) {
            Write-Host "Portable Server is RUNNING (PID: $portablePid)" -ForegroundColor Green
        } else {
            Write-Host "Portable Server is STOPPED (PID file exists but process dead)" -ForegroundColor Red
        }
    } else {
        Write-Host "No Portable Server running." -ForegroundColor DarkGray
    }
    $portableNodeVer = Get-PortableNodeVersion
    if ($portableNodeVer) {
        Write-Host "Portable Node.js is installed ($portableNodeVer)." -ForegroundColor Cyan
    } elseif (Test-Path (Join-Path $ProjectRoot "portable\node")) {
        Write-Host "Portable Node.js folder exists but version could not be determined." -ForegroundColor Yellow
    }
    if (Test-Path (Join-Path $ProjectRoot "portable\app\dist")) {
        Write-Host "Portable build exists in 'portable\app\dist'." -ForegroundColor Cyan
    } else {
        Write-Host "No isolated portable build found." -ForegroundColor DarkGray
    }
    Show-DeploymentRegistrations -LogFolder (Join-Path $ProjectRoot "portable") -Label "Portable"

    if ($global:HostingMode -eq "IIS Reverse Proxy") {
        Write-Host "`n--- IIS Reverse Proxy ---" -ForegroundColor Yellow
        $site = Get-IisSiteForCurrentConfiguration
        if ($site) {
            Write-Host "Site '$($site.Name)' is $($site.State)." -ForegroundColor $(if ($site.State -eq 'Started') { 'Green' } else { 'Red' })
            try {
                $httpsBinding = Get-WebBinding -Name $site.Name -Protocol https | Select-Object -First 1
                if ($httpsBinding -and $httpsBinding.certificateHash) {
                    $thumbprint = ([BitConverter]::ToString($httpsBinding.certificateHash)).Replace('-', '')
                    $cert = Get-ChildItem "Cert:\LocalMachine\My\$thumbprint" -ErrorAction SilentlyContinue
                    if ($cert) {
                        $daysRemaining = [math]::Floor(($cert.NotAfter - (Get-Date)).TotalDays)
                        $color = if ($daysRemaining -lt 0) { 'Red' } elseif ($daysRemaining -le 30) { 'Yellow' } else { 'Green' }
                        Write-Host "Certificate expires: $($cert.NotAfter.ToString('yyyy-MM-dd')) ($daysRemaining days)" -ForegroundColor $color
                    }
                } else { Write-Host "No HTTPS certificate binding found." -ForegroundColor Red }
            } catch { Write-Host "Could not inspect the IIS certificate binding." -ForegroundColor Yellow }
        } else {
            Write-Host "No IIS site matches the configured external URL." -ForegroundColor Red
        }
    }
    
    Write-Host "`n================================" -ForegroundColor Cyan
    Pause
}



Load-Environment

if ($AutoStart) {
    $NodeFolder = Join-Path $ProjectRoot "portable\node"
    $PortableAppFolder = Join-Path $ProjectRoot "portable\app"
    $WorkingFolder = $ProjectRoot
    $LogFolder = Join-Path $ProjectRoot "logs"
    if (Test-Path $NodeFolder) {
        $EnvPath = $NodeFolder
        $npmPath = Join-Path $EnvPath "npm.cmd"
        if (Test-Path $PortableAppFolder) {
            $WorkingFolder = $PortableAppFolder
            $LogFolder = Join-Path $ProjectRoot "portable"
        }
    } else {
        $npmPath = (Get-Command npm -ErrorAction SilentlyContinue).Source
    }

    if ($npmPath) {
        if (-not (Test-Path $LogFolder)) { New-Item -ItemType Directory -Path $LogFolder | Out-Null }
        $pidFile = Join-Path $LogFolder "server.pid"
        
        # Kill old if running
        if (Test-Path $pidFile) {
            $oldPid = Get-Content $pidFile
            taskkill /PID $oldPid /T /F 2>&1 | Out-Null
            Remove-Item $pidFile -ErrorAction SilentlyContinue
        }

        $env:NODE_ENV = "production"
        if ($EnvPath) { $env:PATH = $EnvPath + ";" + $env:PATH }

        $proc = Start-Process $npmPath -ArgumentList "start" -WorkingDirectory $WorkingFolder -WindowStyle Hidden -PassThru -RedirectStandardOutput "$LogFolder\server.log" -RedirectStandardError "$LogFolder\server.err.log"
        $proc.Id | Out-File $pidFile
    }
    exit
}

# --- UI/UX: Pre-Flight Diagnostics ---
Clear-Host
Write-Host "======================================" -ForegroundColor Cyan
Write-Host " System Diagnostics" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

if ($isAdmin) { Write-Host " [OK] Administrator Privileges (Yes)" -ForegroundColor Green }
else { Write-Host " [!] Administrator Privileges (No)" -ForegroundColor Yellow }

$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCheck) { 
    $nodeVer = node -v
    Write-Host " [OK] Node.js ($nodeVer)" -ForegroundColor Green 
} else { Write-Host " [!] Node.js (Not Installed)" -ForegroundColor Red }

$dockerCheck = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerCheck) {
    docker info > $null 2>&1
    if ($LASTEXITCODE -eq 0) { Write-Host " [OK] Docker Engine (Running)" -ForegroundColor Green }
    else { Write-Host " [!] Docker Engine (Not Running)" -ForegroundColor Yellow }
} else {
    Write-Host " [!] Docker (Not Installed)" -ForegroundColor Yellow
}
Write-Host ""
Start-Sleep -Seconds 1

while ($true) {
    $headerContent = {
        Set-Location $ProjectRoot
        Write-Host @"
  _____             _                               _     _____  ____   _____ 
 |  __ \           | |                             | |   / ____|/ __ \ / ____|
 | |  | | ___ _ __ | | ___  _   _ _ __ ___   ___ _ | |_ | |    | |  | | |     
 | |  | |/ _ \ '_ \| |/ _ \| | | | '_ ` _ \ / _ \ '_ \ || |    | |  | | |     
 | |__| |  __/ |_) | | (_) | |_| | | | | | |  __/ | | | | |____| |__| | |____ 
 |_____/ \___| .__/|_|\___/ \__, |_| |_| |_|\___|_| |_|  \_____|\____/ \_____|
             | |             __/ |                                            
             |_|            |___/                                             
"@ -ForegroundColor Cyan

        Write-Host "======================================" -ForegroundColor Cyan
        Write-Host " Deployment & Control Panel           " -ForegroundColor Cyan
        Write-Host "======================================" -ForegroundColor Cyan
        
        # --- UI/UX: Live Dashboard ---
        $status = "[STOPPED]"
        $statusColor = "DarkGray"
        if ($global:Port) {
            $pidFile = Join-Path $ProjectRoot "portable\server.pid"
            if (-not (Test-Path $pidFile)) { $pidFile = Join-Path $ProjectRoot "server\server.pid" }
            
            if (Test-Path $pidFile) {
                $pidStr = Get-Content $pidFile
                $process = Get-Process -Id $pidStr -ErrorAction SilentlyContinue
                if ($process -and !$process.HasExited) {
                    $status = "[ONLINE] (PID: $pidStr)"
                    $statusColor = "Green"
                }
            }
            
            # Check if Docker is running it
            $isContainerRunning = $false
            if ($dockerCheck) {
                $cName = $global:AppName.ToLower() -replace '[^a-z0-9]', '-' -replace '-+', '-' -replace '^-|-$', ''
                if ($cName) {
                    $isContainerRunning = docker ps -q -f name="^/${cName}$" 2>$null
                }
            }
            
            if ($isContainerRunning) {
                $status = "[DOCKER ONLINE]"
                $statusColor = "Green"
            }
            
            Write-Host -NoNewline " Status:   "
            Write-Host $status -ForegroundColor $statusColor
            Write-Host " URL:      $($global:AppUrl)" -ForegroundColor DarkGray
            Write-Host "--------------------------------------" -ForegroundColor Cyan
        }
    }

    $options = @(
        [PSCustomObject]@{ Key = '1'; Label = 'Docker Deploy' }
        [PSCustomObject]@{ Key = '2'; Label = 'Server Deploy' }
        [PSCustomObject]@{ Key = '3'; Label = 'Portable Run' }
        [PSCustomObject]@{ Key = '4'; Label = 'Status Check' }
        [PSCustomObject]@{ Key = '5'; Label = 'Network & SSL Configuration Wizard' }
        [PSCustomObject]@{ Key = '6'; Label = 'Deployment Dry Run' }
        [PSCustomObject]@{ Key = '7'; Label = 'Backup Current Configuration' }
        [PSCustomObject]@{ Key = '8'; Label = 'Repair IIS Reverse Proxy' }
        [PSCustomObject]@{ Key = '9'; Label = 'Create Diagnostics Bundle' }
        [PSCustomObject]@{ Key = '10'; Label = 'Exit' }
    )

    try {
        $choice = Invoke-Menu -Title "" -HeaderContent $headerContent -Options $options
        if ($null -eq $choice) { continue }
        
        switch ($choice) {
            '1' { Invoke-DockerDeploy }
            '2' { Invoke-ServerDeploy }
            '3' { Invoke-PortableRun }
            '4' { Invoke-StatusCheck }
            '5' { Invoke-ConfigurationWizard }
            '6' { Invoke-DryRun }
            '7' { New-ConfigurationBackup | Out-Null; Pause }
            '8' { Invoke-RepairIisProxy }
            '9' { New-DiagnosticsBundle }
            '10' { exit }
        }
    } catch {
        if ($_.Exception.Message -eq "MAIN_MENU") { continue }
        else { throw }
    }
}
