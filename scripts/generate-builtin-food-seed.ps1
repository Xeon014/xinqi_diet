param(
    [switch]$Check,
    [switch]$Archive
)

$scriptPath = Join-Path $PSScriptRoot "generate-builtin-food-seed.js"
$args = @($scriptPath)

if ($Check) {
    $args += "--check"
}

if ($Archive) {
    $args += "--archive"
}

node @args
