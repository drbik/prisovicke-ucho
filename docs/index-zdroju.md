# Index zdrojů pro odpovědi z webu

*Krok 8 z [plánu MVP](plan-mvp.md#krok-8-index-webu-a-odpověď-s-citací). Stav indexu k 10. 11. 2026, stahováno 10. 11. 2026 ráno, Word, ODT a OCR doplněné večer.*

Index drží text webu obce prisovice.cz a karet projektů z webu Nezávislých pro Příšovice. Z něj ucho hledá odpověď na potvrzený dotaz (F-70 až F-76). Index se aktualizuje jen ručně (F-71). Pravidelný běh do MVP nepatří.

## Co v indexu je

**Rozšíření z 10. 11. 2026 (se souhlasem Tomáše):** do indexu jdou i dokumenty Word a ODT a text naskenovaných PDF rozpoznaný OCR. Zpracování je hotové na počítači. Do D1 a Vectorize se nahraje až po obnovení denního limitu neuronů, do té doby ucho odpovídá z indexu bez rozšíření.

| Zdroj | Dokumentů | Úseků | Znaků |
|---|---|---|---|
| Stálé stránky prisovice.cz | 51 | 101 | 82 314 |
| Aktuality | 33 | 48 | 33 739 |
| Přílohy: PDF, Word a ODT (úřední deska, aktuality, stálé stránky) | 320 | 2 829 | 2 585 037 |
| Karty projektů z webu Nezávislých | 24 | 25 | 12 945 |
| **Celkem** | **428** | **3 003** | **2 714 035** |

- Z příloh je 30 dokumentů Word a ODT (34 stažených, 4 duplicitní) a 48 PDF s textem z OCR (188 stran). Takový zdroj má v názvu „text rozpoznaný ze skenu“, nebo „část textu rozpoznaná ze skenu“, protože rozpoznání může obsahovat chyby. V odpovědi rozhoduje znění dokumentu.
- Nahrání spočítá embeddingy jen pro 617 nových nebo změněných úseků, odhadem asi 320 neuronů.
- Před rozšířením bylo v D1 357 dokumentů a 2 435 úseků, ve Vectorize 2 435 vektorů.
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
| Skeny, ze kterých OCR nepřečte nic použitelného | 7 PDF po 1 straně | Mapy, ocenění, plánek směny pozemků a dvě oznámení o vstupu na pozemky se samými výkresy |
| Strany bez použitelného textu v jinak čitelných PDF | 34 stran v 16 PDF | Výkresy, mapy, grafy a přílohy havarijního plánu. OCR z nich dá jen útržky (do 25 slov), filtr je do indexu nepustí. |
| Dokumenty v jiném formátu | 27 (21 xlsx, 4 xls, 2 zip) | Excel a zip zůstávají mimo index (rozhodnuto 10. 11. 2026). Patří sem návrh rozpočtu v Excelu. |
| Odkazy na jiné weby | 23 | Stará úřední deska prisovice.e-obec.cz (nesleduje se, rozhodnuto 24. 10. 2026) a portál CENIA |
| Duplicitní PDF | 24 | Obec stejný dokument zveřejnila dvakrát pod jinou adresou. V indexu je jedna kopie. |

**Skeny, které ucho díky OCR nově přečte.** Před rozšířením byly mimo index, odpovědi na ně končily u zastupitelů. Nejdůležitější z nich:

- Provozní řád rekreační oblasti Malý a Velký Písečák č. 1/2024 (bez titulní strany),
- Kalkulace cen pro vodné a stočné za rok 2025 a porovnání kalkulací za rok 2024. Tabulky OCR převede jen na řádky čísel bez sloupců, ceny za m³ s popisky jsou ale čitelné.
- Havarijní plán obce (bez příloh s mapami),
- rozpočtová opatření č. 5/2024 a 1/2025,
- sběr nebezpečných složek komunálního odpadu (duben 2025),
- oznámení o záměrech obce (nájem fotbalového hřiště, stomatologické pracoviště, pacht pozemků),
- informace o volebních okrscích a o době a místě konání voleb,
- stavební rozhodnutí o optických sítích a o pivovaru Svijany,
- odpovědi podle zákona 106 z srpna 2025 a srpna 2026.

**Dokumenty Word a ODT, které ucho nově přečte:** obecně závazná vyhláška o stanovení obecního systému odpadového hospodářství a její příloha, požární řád obce, informace občanům o komunálních odpadech za rok 2025, výroční zprávy podle zákona 106, komentáře k závěrečnému účtu 2024 a 2025, rozpočtová opatření z let 2024 až 2026, místní program obnovy vesnice, informace o územním plánu a formuláře (žádosti o kácení dřevin a o uzavírku, prohlášení poplatníka k poplatku za odpad).

Úplný seznam s adresami vypisuje `npm run index:zpracovat` do `zprava.json` ve složce dat: `word`, `ocr`, `ocrNecitelne`, `skeny` a `castecneSkeny`.

## Jak index obnovit

Všechno běží ručně na počítači, ne ve Workeru. K Cloudflare se skripty připojí přes přihlášení Wranglerem (`npx wrangler login`), bez API tokenu.

1. `npm run index:stahnout`: stáhne robots.txt, sitemapy, data z REST API, stránky, PDF a titulní stránku webu Nezávislých. Posílá nejvýš zhruba jeden požadavek za sekundu s obecným User-Agentem. První běh trval asi 27 minut a poslal 728 požadavků. Druhý běh stáhl 0 souborů a poslal 8 požadavků, protože nic se nezměnilo (datum změny v sitemapě, uložené PDF a ETag titulní stránky).
2. `npm run index:word`: převede stažené dokumenty Word a ODT na prostý text v UTF-8. Převod dělá nainstalovaný Microsoft Word s vypnutými makry, soubory otevírá jen ke čtení a na konci se zavře. Soubor, který Word hlásí jako poškozený, zkusí otevřít s opravou. Už převedené dokumenty přeskočí.
3. `npm run index:ocr`: strany PDF bez textové vrstvy vykreslí do obrázku (asi 300 dpi) a přečte je OCR ve Windows v češtině. Nic se neinstaluje a nic neodchází mimo počítač. Rozpoznané strany přeskočí, obrázky po OCR smaže.
4. `npm run index:zpracovat`: vytáhne text z HTML a PDF (`pdfjs-dist`), přidá text z Wordu a z OCR, rozdělí ho na úseky (asi 1 200 znaků, překryv 150) a zapíše dokumenty, úseky a zprávu o vynechaném. Trvá asi 5 minut.
5. `npx tsx nastroje/index/kontrola-sady.ts`: ověří, že doslovné opory typových otázek jsou v úsecích svých zdrojů. Při posledním zpracování prošly všechny.
6. `npm run index:nahrat`: spočítá embeddingy (`@cf/baai/bge-m3`) jen pro nové nebo změněné úseky a nahraje index do D1 a Vectorize. Index na chvíli zmizí a hned se nahraje znovu, smazané úseky odstraní i z Vectorize. První nahrání stálo asi 1 000 neuronů.

Stažené soubory, vytažený text a vektory leží mimo repozitář ve složce `%USERPROFILE%\.prisovicke-ucho\index` (lze změnit proměnnou `UCHO_DATA`).

`npx tsx nastroje/index/hledat.ts "dotaz"` ukáže, které úseky najde vektorové a které fulltextové hledání. Slouží k ladění.

## Cloudflare

- D1 `prisovicke-ucho` (region EEUR): tabulky `zdrojovy_dokument`, `usek` s fulltextem `usek_fts` (FTS5, bez diakritiky) a prázdná `citace` (vyplní se s ukládáním odpovědí, F-77). Migrace je v `migrations/`.
- Vectorize `prisovicke-ucho-zdroje`: 1 024 rozměrů, kosinová podobnost.
- Oba prostředky jsou vázané jen na Worker `prisovicke-ucho`.
