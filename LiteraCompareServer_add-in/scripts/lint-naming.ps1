param(
  [string]$Root = "src"
)

$ErrorActionPreference = "Stop"

$camelPattern = '^[a-z][A-Za-z0-9$]*$'
$pascalPattern = '^[A-Z][A-Za-z0-9]*$'
$kebabPattern = '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$'

$errors = New-Object System.Collections.Generic.List[string]

function Add-Error {
  param(
    [string]$File,
    [int]$Line,
    [string]$Message
  )
  $errors.Add("$File:$Line $Message")
}

function Test-CamelCase {
  param([string]$Name)
  return $Name -match $camelPattern
}

function Test-PascalCase {
  param([string]$Name)
  return $Name -match $pascalPattern
}

function Test-KebabCase {
  param([string]$Name)
  return $Name -match $kebabPattern
}

function Check-JsFile {
  param([string]$Path)

  $lines = Get-Content -Path $Path
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $lineNumber = $i + 1

    if ($line -match '\bfunction\s+([A-Za-z_$][\w$]*)') {
      $name = $Matches[1]
      if (-not (Test-CamelCase $name)) {
        Add-Error $Path $lineNumber "Function '$name' should be camelCase."
      }
    }

    if ($line -match '\bclass\s+([A-Za-z_$][\w$]*)') {
      $name = $Matches[1]
      if (-not (Test-PascalCase $name)) {
        Add-Error $Path $lineNumber "Class '$name' should be PascalCase."
      }
    }

    if ($line -match '\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)') {
      $name = $Matches[1]
      if (-not (Test-CamelCase $name)) {
        Add-Error $Path $lineNumber "Variable '$name' should be camelCase."
      }
    }
  }
}

function Check-HtmlFile {
  param([string]$Path)

  $lines = Get-Content -Path $Path
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $lineNumber = $i + 1

    $idMatches = [regex]::Matches($line, 'id\s*=\s*["'']([^"''\s]+)["'']')
    foreach ($m in $idMatches) {
      $id = $m.Groups[1].Value
      if (-not (Test-KebabCase $id)) {
        Add-Error $Path $lineNumber "HTML id '$id' should be kebab-case."
      }
    }

    $classMatches = [regex]::Matches($line, 'class\s*=\s*["'']([^"'']+)["'']')
    foreach ($m in $classMatches) {
      $raw = $m.Groups[1].Value
      $classes = $raw -split '\s+'
      foreach ($cls in $classes) {
        if (-not $cls) { continue }
        if (-not (Test-KebabCase $cls)) {
          Add-Error $Path $lineNumber "HTML class '$cls' should be kebab-case."
        }
      }
    }
  }
}

function Check-CssFile {
  param([string]$Path)

  $lines = Get-Content -Path $Path
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $lineNumber = $i + 1

    if ($line -notmatch '\{') { continue }
    $selector = $line.Split('{')[0]
    if (-not $selector.Trim()) { continue }
    if ($selector -match '^\s*@') { continue }

    $matches = [regex]::Matches($selector, '[.#]([A-Za-z0-9_-]+)')
    foreach ($m in $matches) {
      $name = $m.Groups[1].Value
      if (-not (Test-KebabCase $name)) {
        Add-Error $Path $lineNumber "CSS selector '$name' should be kebab-case."
      }
    }
  }
}

$files = Get-ChildItem -Path $Root -Recurse -File -Include *.js, *.html, *.css

foreach ($file in $files) {
  switch ($file.Extension.ToLowerInvariant()) {
    '.js' { Check-JsFile $file.FullName }
    '.html' { Check-HtmlFile $file.FullName }
    '.css' { Check-CssFile $file.FullName }
  }
}

if ($errors.Count -gt 0) {
  Write-Host "Naming convention violations:" -ForegroundColor Red
  $errors | ForEach-Object { Write-Host $_ }
  exit 1
}

Write-Host "Naming convention check passed." -ForegroundColor Green
