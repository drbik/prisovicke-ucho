# Převede dokumenty Word a ODT na prostý text přes nainstalovaný Microsoft Word (volá ho npm run index:word).
# Vstup: JSON se seznamem { zdroj, cil }. Cíl je text v UTF-8, tabulky Word ukládá s buňkami oddělenými tabulátorem.
# Makra jsou vypnutá, soubory se otevírají jen ke čtení a Word se na konci zavře.
param([Parameter(Mandatory = $true)][string]$Seznam)

$ErrorActionPreference = 'Stop'
$polozky = Get-Content -LiteralPath $Seznam -Raw -Encoding UTF8 | ConvertFrom-Json
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
# msoAutomationSecurityForceDisable: makra v otevřených souborech se nespustí.
$word.AutomationSecurity = 3
$hotovo = 0
$chyby = 0
try {
  foreach ($polozka in $polozky) {
    $dokument = $null
    try {
      # Open(FileName, ConfirmConversions, ReadOnly, AddToRecentFiles, PasswordDocument): dokument s heslem skončí chybou, ne dotazem.
      try {
        $dokument = $word.Documents.Open($polozka.zdroj, $false, $true, $false, 'bez-hesla')
      } catch {
        # Soubor, který Word hlásí jako poškozený, zkusí otevřít s opravou (13. parametr OpenAndRepair).
        $m = [Type]::Missing
        $dokument = $word.Documents.Open($polozka.zdroj, $false, $true, $false, 'bez-hesla', $m, $m, $m, $m, $m, $m, $false, $true)
      }
      # SaveAs2(FileName, FileFormat, … 12. parametr Encoding): wdFormatText = 2, msoEncodingUTF8 = 65001.
      # Bez výslovného kódování Word uložil text v kódové stránce systému.
      $m = [Type]::Missing
      $dokument.SaveAs2($polozka.cil, 2, $m, $m, $m, $m, $m, $m, $m, $m, $m, 65001)
      $hotovo += 1
    } catch {
      $chyby += 1
      Write-Output ("CHYBA " + $polozka.zdroj + ": " + $_.Exception.Message)
    } finally {
      # wdDoNotSaveChanges = 0. COM argumenty typu ref bere PowerShell jen jako čísla, ne jako $false.
      if ($dokument) { $dokument.Close(0) | Out-Null }
    }
  }
} finally {
  $word.Quit() | Out-Null
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
Write-Output ("Prevedeno " + $hotovo + ", chyb " + $chyby + ".")
