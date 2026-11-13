# Rozpozná text v obrázcích stran přes OCR ve Windows (Windows.Media.Ocr, čeština). Volá ho npm run index:ocr.
# Vstup: složka s PNG a JPG. Ke každému obrázku bez textu zapíše vedle něj .txt v UTF-8, jeden řádek textu na řádek.
param([Parameter(Mandatory = $true)][string]$Slozka)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[void][Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
[void][Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
[void][Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
[void][Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]

$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
  })[0]
function Pockat($operace, [Type]$typ) {
  $uloha = $asTask.MakeGenericMethod($typ).Invoke($null, @($operace))
  $uloha.Wait(-1) | Out-Null
  $uloha.Result
}

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new('cs'))
# Windows PowerShell 5.1 čte skript bez BOM v kódování systému, proto jsou hlášky bez diakritiky.
if (-not $engine) { throw 'OCR pro cestinu neni ve Windows k dispozici.' }
$utf8 = New-Object System.Text.UTF8Encoding($false)
$hotovo = 0
$chyby = 0
# PNG jsou vykreslené strany PDF, JPG a PNG s -obrazek v názvu jsou obrázky z článků (od 13. 11. 2026).
foreach ($obrazek in (Get-ChildItem -LiteralPath $Slozka -File | Where-Object { $_.Extension -in '.png', '.jpg', '.jpeg' })) {
  $cil = [System.IO.Path]::ChangeExtension($obrazek.FullName, '.txt')
  if (Test-Path -LiteralPath $cil) { continue }
  $proud = $null
  try {
    $soubor = Pockat ([Windows.Storage.StorageFile]::GetFileFromPathAsync($obrazek.FullName)) ([Windows.Storage.StorageFile])
    $proud = Pockat ($soubor.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $dekoder = Pockat ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($proud)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmapa = Pockat ($dekoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $vysledek = Pockat ($engine.RecognizeAsync($bitmapa)) ([Windows.Media.Ocr.OcrResult])
    $radky = @($vysledek.Lines | ForEach-Object { $_.Text })
    [System.IO.File]::WriteAllText($cil, ($radky -join "`n"), $utf8)
    $hotovo += 1
  } catch {
    $chyby += 1
    Write-Output ("CHYBA " + $obrazek.Name + ": " + $_.Exception.Message)
  } finally {
    if ($proud) { $proud.Dispose() }
  }
}
Write-Output ("Rozpoznano " + $hotovo + ", chyb " + $chyby + ".")
