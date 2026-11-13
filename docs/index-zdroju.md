# Index zdrojů pro odpovědi z webu

*Krok 8 z [plánu MVP](plan-mvp.md#krok-8-index-webu-a-odpověď-s-citací). Stav indexu k 13. 11. 2026 (okno 4 roky). Tabulka zdrojů níže je ze 13. 11. 2026.*

Index drží text webu obce prisovice.cz a veřejný obsah webu Nezávislých pro Příšovice (karty projektů, Tlampač a podklady). Z něj ucho hledá odpověď na potvrzený dotaz (F-70 až F-76). Index se aktualizuje jen ručně (F-71). Pravidelný běh do MVP nepatří.

## Co v indexu je

**Okno 4 roky (13. 11. 2026, zadal Tomáš):** okno pro aktuality, úřední desku a jejich PDF je od 9. 11. 2022 místo od 9. 11. 2024. Stahování poslalo 241 požadavků a stáhlo 225 souborů: 11 aktualit, 92 položek úřední desky a 122 příloh. Mezi nimi jsou i aktuality zveřejněné 12. 11. 2026. Word převedl 7 nových dokumentů, OCR přečetlo 65 nových stran. Mimo okno teď nezůstalo nic: nejstarší aktualita a položka desky v sitemapě jsou z 22. 11. 2022, takže 4 roky pokrývají vše, co obec ve WordPressu zveřejnila.

| | Před (12. 11. 2026) | Po (13. 11. 2026) |
|---|---|---|
| Dokumenty v D1 | 436 | 552 |
| Úseky v D1 | 3 070 | 5 069 |
| Vektory ve Vectorize | 3 070 | 5 069 |
| Embeddingy spočítané při nahrání | 1 043 | 2 004 |
| Odhad neuronů | asi 540 | asi 1 040 |

Odhad neuronů vychází z poměru předchozích nahrání (zhruba 0,52 neuronu na úsek). Opory všech typových otázek zůstaly v úsecích svých zdrojů (`kontrola-sady.ts`).

**Co okno 4 let nepřineslo:** pozvánky na vánoční jarmark 21. a 22. 11. 2026, rozsvícení vánočního stromečku 27. 11. 2026 a koncert My Gospel 5. 12. 2026 jsou aktuality z 12. 11. 2026, které mají jen nadpis a obrázek pozvánky (JPG a PNG). Bez vlastního textu jdou mezi obálky a do indexu se nedostanou, stejně jako starší aktuality Vánoční prodejní trhy 2023 a Rozsvícení vánočního stromečku (únor 2024). Hledání „Kdy budou vánoční trhy?“ proto najde jen zmínky v zápisech rady, ne pozvánku. Text obrázků by dodalo OCR obrázků v aktualitách, to je rozšíření MVP a čeká na rozhodnutí Tomáše.

**Kontrola ukázek po rozšíření:** dvě čekající ukázky teď v indexu něco najdou, protože do okna přibyly zápisy rady z roku 2024. „Výdejní box na balíky“ najde usnesení rady č. 199/2024 o rozšíření Z-boxu Zásilkovny (zápis 16/2024 z 9. 10. 2024). „Nabíječka na elektroauto v obci“ najde žádosti o nabíjecí stanice v zápisech rady 1/2024 a 3/2024. Ukázky se nezměnily, rozhodne Tomáš.

**Obnova 12. 11. 2026 večer:** web obce stažen znovu (5 nových souborů: 3 aktuality, 1 PDF a 1 položka úřední desky), zpracováno se sloupci tabulek v PDF a nahráno. V D1 je 436 dokumentů a 3 070 úseků, ve Vectorize 3 070 vektorů. Embeddingy se počítaly pro 1 043 nových nebo změněných úseků, odhadem asi 540 neuronů. Ostré ucho odpovídá z tohoto indexu.

**Rozšíření z 10. 11. 2026 (se souhlasem Tomáše):** do indexu jdou i dokumenty Word a ODT a text naskenovaných PDF rozpoznaný OCR. Nahráno večer 10. 11. 2026: v D1 bylo 428 dokumentů a 3 003 úseků, ve Vectorize 3 003 vektorů (24 starých vektorů smazáno).

| Zdroj | Dokumentů | Úseků | Znaků |
|---|---|---|---|
| Stálé stránky prisovice.cz | 55 | 115 | 95 333 |
| Aktuality | 39 | 56 | 38 566 |
| Přílohy: PDF, Word a ODT (úřední deska, aktuality, stálé stránky) a Tlampač a podklady webu Nezávislých | 434 | 4 873 | 4 528 543 |
| Karty projektů z webu Nezávislých | 24 | 25 | 12 945 |
| **Celkem** | **552** | **5 069** | **4 675 387** |

- Tlampač a podklady (7 dokumentů) skript počítá mezi přílohy. Do 12. 11. 2026 tabulka uváděla stav z 10. 11. 2026: 435 dokumentů a 3 021 úseků.
- Z příloh je 41 dokumentů Word a ODT a 67 PDF s textem z OCR (241 stran, 41 stran nečitelných). Do 12. 11. 2026 to bylo 30 dokumentů Word a ODT a 48 PDF s OCR (188 stran). Takový zdroj má v názvu „text rozpoznaný ze skenu“, nebo „část textu rozpoznaná ze skenu“, protože rozpoznání může obsahovat chyby. V odpovědi rozhoduje znění dokumentu.
- Nahrání spočítalo embeddingy jen pro 617 nových nebo změněných úseků, odhadem asi 320 neuronů. Vectorize hlásil plný počet vektorů zhruba 3 minuty po nahrání.
- Před rozšířením bylo v D1 357 dokumentů a 2 435 úseků, ve Vectorize 2 435 vektorů.
- Tlampač a podklady (rozšíření z 10. 11. 2026 večer, nahráno: D1 435 dokumentů a 3 021 úseků, Vectorize 3 021 vektorů, embeddingy jen pro 18 nových úseků):
  - **Tlampač:** tři příspěvky ze stránky nezavisli-prisovice.cz/tlampac. Každý je samostatný dokument s adresou své kotvy a s datem zveřejnění, takže odpověď odkáže přímo na příspěvek.
  - **Podklady:** čtyři soubory Markdown, které web zveřejňuje pro čtení strojem na nezavisli-prisovice.cz/podklady/ (projekty, hospodaření obce, komunální volby 2026, zdroje a ověřování). Mají označení „Podklady: …“ a datum „stav webu k“ datu stažení. Markdown se převede na prostý text, tabulky zůstanou po řádcích s buňkami oddělenými svislou čárou.
  - **Co se nebere:** rozcestník podkladů (`index.md`) a `vse.md`, ve kterých jsou pokyny pro chatboty a které jen opakují ostatní soubory, a `novinky.md`, které opakuje Tlampač. Soubory se hledají podle odkazů na stránce /podklady/, nový tematický soubor se tedy při dalším stahování přidá sám.
  - **Co se nečte nikdy:** `akce-prisovice-timeline.md` z projektu webu s neveřejnými záměry a neověřenými údaji, a vůbec žádný soubor ze složky projektu webu. Všechno se stahuje z veřejného webu stejně jako karty. Stránka Archiv voleb se neindexuje, protože uvádí profese soukromých osob.
  - **robots.txt:** web Nezávislých povoluje všem robotům vyhledávání a čtení (`Content-Signal: search=yes, ai-train=no`) a skript ho respektuje. Obsah slouží jen k hledání odpovědí, k žádnému učení modelů.
- Stránky úřední desky jsou samostatně v indexu 0krát. Na webu obce jsou jen obálkou s odkazem na PDF a jejich název a datum nese PDF.
- Okno: aktuality, úřední deska a jejich PDF zveřejněné od 9. 11. 2022 (4 roky, rozhodnuto 13. 11. 2026, do té doby 2 roky od 9. 11. 2024). Stálé stránky se berou celé, i se staršími PDF, na která odkazují (rozhodnuto 9. 11. 2026).
- Karty: všech 24 karet z titulní stránky nezavisli-prisovice.cz. Text se bere z ostrého webu. Skript kontroluje, že slugy karet souhlasí se soubory `src/content/projects/` v projektu webu, a ten projekt jen čte. `akce-prisovice-timeline.md` se nečte vůbec.

## Co v indexu není (známá omezení)

| Co | Počet | Proč |
|---|---|---|
| Aktuality a položky úřední desky zveřejněné před 9. 11. 2022 | 0 | Okno 4 let. Nejstarší položky v sitemapě jsou z 22. 11. 2022, okno tak zatím nic nevynechává. Při okně 2 let mimo zůstávalo 11 aktualit a 94 položek desky. |
| Aktuality, jejichž obsah je jen obrázek | 35 stránek bez textu, mezi nimi pozvánky na vánoční jarmark, rozsvícení stromečku a koncert | Text v obrázku index nečte, OCR obrázků čeká na rozhodnutí |
| Řízení soukromých osob na úřední desce | 15 položek a 15 PDF | Dražby, exekuce, stavební řízení o rodinných domech, přístavbách, tůních a dělení pozemků (rozhodnuto 9. 11. 2026). Názvy se sem kvůli osobním údajům nezapisují. |
| Výpisové stránky | 5 | Aktuality, Aktuálně, Úřední deska, Archiv úřední desky a Mapa stránek jen opakují texty položek |
| Stránky bez vlastního textu | 398 | Rozcestníky, galerie a obálky úřední desky. Kde odkazují na PDF, je v indexu PDF. |
| Skeny, ze kterých OCR nepřečte nic použitelného | 9 PDF | Mapy, ocenění, plánek směny pozemků a dvě oznámení o vstupu na pozemky se samými výkresy |
| Strany bez použitelného textu v jinak čitelných PDF | 41 stran nečitelných pro OCR, 21 PDF se stranami bez textu | Výkresy, mapy, grafy a přílohy havarijního plánu. OCR z nich dá jen útržky (do 25 slov), filtr je do indexu nepustí. |
| Dokumenty v jiném formátu | 32 | Excel a zip zůstávají mimo index (rozhodnuto 10. 11. 2026). Patří sem návrh rozpočtu v Excelu. |
| Odkazy na jiné weby | 22 | Stará úřední deska prisovice.e-obec.cz (nesleduje se, rozhodnuto 24. 10. 2026) a portál CENIA |
| PDF, které web vrací s chybou 404 | 1 | Informace o GDPR odkázaná z odpovědi podle zákona 106 z listopadu 2022 |
| Duplicitní PDF | 36 | Obec stejný dokument zveřejnila dvakrát pod jinou adresou. V indexu je jedna kopie. |

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
4. `npm run index:zpracovat`: vytáhne text z HTML a PDF (`pdfjs-dist`), přidá text z Wordu a z OCR, rozdělí ho na úseky (asi 1 200 znaků, překryv 150) a zapíše dokumenty, úseky a zprávu o vynechaném. Trvá asi 5 minut. Od 12. 11. 2026 odděluje v PDF sloupce tabulek znaky „ | “ (mezera větší než trojnásobek výšky písma), stejně jako u Wordu. Bez toho splýval ceník Sokolovny („Celá sokolovna 4.000 Kč + energie 8.000 Kč“) a nešlo poznat, že 8 000 Kč je kauce. Změnilo se tím 1 014 úseků ve 186 dokumentech, hlavně rozpočty, závěrečné účty, zápisy a ceníky.
5. `npx tsx nastroje/index/kontrola-sady.ts`: ověří, že doslovné opory typových otázek jsou v úsecích svých zdrojů. Při posledním zpracování prošly všechny.
6. `npm run index:nahrat`: spočítá embeddingy (`@cf/baai/bge-m3`) jen pro nové nebo změněné úseky a nahraje index do D1 a Vectorize. Index na chvíli zmizí a hned se nahraje znovu, smazané úseky odstraní i z Vectorize. První nahrání stálo asi 1 000 neuronů.
7. `npx tsx nastroje/index/kontrola-ukazek.ts`: ověří ukázková témata z přehledu na stránce ucha proti novému indexu. Citace zodpovězených ukázek musí být ve zdrojích doslova a k čekajícím dotazům index nesmí nic mít (rozhodnutí z 11. 11. 2026). Když kontrola selže, ukázku oprav nebo vyřaď dřív, než se stránka nasadí.

Stažené soubory, vytažený text a vektory leží mimo repozitář ve složce `%USERPROFILE%\.prisovicke-ucho\index` (lze změnit proměnnou `UCHO_DATA`).

`npx tsx nastroje/index/hledat.ts "dotaz"` ukáže, které úseky najde vektorové a které fulltextové hledání. Slouží k ladění.

## Cloudflare

- D1 `prisovicke-ucho` (region EEUR): tabulky `zdrojovy_dokument`, `usek` s fulltextem `usek_fts` (FTS5, bez diakritiky) a prázdná `citace` (vyplní se s ukládáním odpovědí, F-77). Migrace je v `migrations/`.
- Vectorize `prisovicke-ucho-zdroje`: 1 024 rozměrů, kosinová podobnost.
- Oba prostředky jsou vázané jen na Worker `prisovicke-ucho`.
