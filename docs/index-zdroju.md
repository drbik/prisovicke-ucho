# Index zdrojů pro odpovědi z webu

*Krok 8 z [plánu MVP](plan-mvp.md#krok-8-index-webu-a-odpověď-s-citací). Stav indexu k 10. 11. 2026, stahováno 10. 11. 2026 ráno.*

Index drží text webu obce prisovice.cz a karet projektů z webu Nezávislých pro Příšovice. Z něj ucho hledá odpověď na potvrzený dotaz (F-70 až F-76). Index se aktualizuje jen ručně (F-71). Pravidelný běh do MVP nepatří.

## Co v indexu je

| Zdroj | Dokumentů | Úseků | Znaků |
|---|---|---|---|
| Stálé stránky prisovice.cz | 51 | 101 | 82 309 |
| Aktuality | 33 | 48 | 33 739 |
| PDF (úřední deska, aktuality, stálé stránky) | 249 | 2 261 | 2 044 305 |
| Karty projektů z webu Nezávislých | 24 | 25 | 12 945 |
| **Celkem** | **357** | **2 435** | **2 173 298** |

- V D1 je 357 dokumentů a 2 435 úseků, ve Vectorize 2 435 vektorů. Počty souhlasí se zpracováním.
- Stránky úřední desky jsou samostatně v indexu 0krát. Na webu obce jsou jen obálkou s odkazem na PDF a jejich název a datum nese PDF.
- Okno: aktuality, úřední deska a jejich PDF zveřejněné od 9. 11. 2024. Stálé stránky se berou celé, i se staršími PDF, na která odkazují (rozhodnuto 9. 11. 2026).
- Karty: všech 24 karet z titulní stránky nezavisli-prisovice.cz. Text se bere z ostrého webu. Skript kontroluje, že slugy karet souhlasí se soubory `src/content/projects/` v projektu webu, a ten projekt jen čte. `akce-prisovice-timeline.md` se nečte vůbec.

## Co v indexu není (známá omezení)

| Co | Počet | Proč |
|---|---|---|
| Aktuality a položky úřední desky zveřejněné před 9. 11. 2024 | 11 aktualit, 94 položek desky | Okno 2 let |
| Řízení soukromých osob na úřední desce | 15 položek a 15 PDF | Dražby, exekuce, stavební řízení o rodinných domech, přístavbách, tůních a dělení pozemků (rozhodnuto 9. 11. 2026). Názvy se sem kvůli osobním údajům nezapisují. |
| Výpisové stránky | 5 | Aktuality, Aktuálně, Úřední deska, Archiv úřední desky a Mapa stránek jen opakují texty položek |
| Stránky bez vlastního textu | 292 | Rozcestníky, galerie a obálky úřední desky. Kde odkazují na PDF, je v indexu PDF. |
| PDF skeny bez textové vrstvy | 49 PDF, 167 stran | OCR v MVP není. Seznam je níže. |
| Strany bez textu v jinak čitelných PDF | 53 stran ve 12 PDF | Naskenované přílohy, výkresy a mapy |
| Dokumenty v jiném formátu | 61 (21 xlsx, 13 doc, 11 odt, 10 docx, 4 xls, 2 zip) | Indexuje se jen HTML a PDF. Patří sem i obecně závazná vyhláška o odpadech a výroční zprávy podle zákona 106 ve Wordu a návrh rozpočtu v Excelu. |
| Odkazy na jiné weby | 23 | Stará úřední deska prisovice.e-obec.cz (nesleduje se, rozhodnuto 24. 10. 2026) a portál CENIA |
| Duplicitní PDF | 24 | Obec stejný dokument zveřejnila dvakrát pod jinou adresou. V indexu je jedna kopie. |

**Skeny, které ucho nepřečte.** Odpovědi na tyto dokumenty skončí u zastupitelů, i když na webu jsou. Nejdůležitější z nich:

- Provozní řád rekreační oblasti Malý a Velký Písečák č. 1/2024 (6 stran),
- Kalkulace cen pro vodné a stočné za rok 2025 a porovnání kalkulací za rok 2024,
- Havarijní plán obce (23 stran),
- rozpočtová opatření č. 5/2024 a 1/2025,
- sběr nebezpečných složek komunálního odpadu (duben 2025),
- oznámení o záměrech obce (nájem fotbalového hřiště, stomatologické pracoviště, směna a pacht pozemků),
- informace o volebních okrscích a o době a místě konání voleb,
- stavební rozhodnutí o optických sítích a o pivovaru Svijany,
- odpovědi podle zákona 106 z srpna 2025 a srpna 2026.

Úplný seznam s adresami vypisuje `npm run index:zpracovat` do `zprava.json` ve složce dat.

## Jak index obnovit

Všechno běží ručně na počítači, ne ve Workeru. K Cloudflare se skripty připojí přes přihlášení Wranglerem (`npx wrangler login`), bez API tokenu.

1. `npm run index:stahnout`: stáhne robots.txt, sitemapy, data z REST API, stránky, PDF a titulní stránku webu Nezávislých. Posílá nejvýš zhruba jeden požadavek za sekundu s obecným User-Agentem. První běh trval asi 27 minut a poslal 728 požadavků. Druhý běh stáhl 0 souborů a poslal 8 požadavků, protože nic se nezměnilo (datum změny v sitemapě, uložené PDF a ETag titulní stránky).
2. `npm run index:zpracovat`: vytáhne text z HTML a PDF (`pdfjs-dist`), rozdělí ho na úseky (asi 1 200 znaků, překryv 150) a zapíše dokumenty, úseky a zprávu o vynechaném. Trvá asi 5 minut.
3. `npx tsx nastroje/index/kontrola-sady.ts`: ověří, že doslovné opory typových otázek jsou v úsecích svých zdrojů. Při posledním zpracování prošly všechny.
4. `npm run index:nahrat`: spočítá embeddingy (`@cf/baai/bge-m3`) jen pro nové nebo změněné úseky a nahraje index do D1 a Vectorize. Index na chvíli zmizí a hned se nahraje znovu, smazané úseky odstraní i z Vectorize. První nahrání stálo asi 1 000 neuronů.

Stažené soubory, vytažený text a vektory leží mimo repozitář ve složce `%USERPROFILE%\.prisovicke-ucho\index` (lze změnit proměnnou `UCHO_DATA`).

`npx tsx nastroje/index/hledat.ts "dotaz"` ukáže, které úseky najde vektorové a které fulltextové hledání. Slouží k ladění.

## Cloudflare

- D1 `prisovicke-ucho` (region EEUR): tabulky `zdrojovy_dokument`, `usek` s fulltextem `usek_fts` (FTS5, bez diakritiky) a prázdná `citace` (vyplní se s ukládáním odpovědí, F-77). Migrace je v `migrations/`.
- Vectorize `prisovicke-ucho-zdroje`: 1 024 rozměrů, kosinová podobnost.
- Oba prostředky jsou vázané jen na Worker `prisovicke-ucho`.
