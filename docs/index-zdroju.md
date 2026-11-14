# Index zdrojů pro odpovědi z webu

*Krok 8 z [plánu MVP](plan-mvp.md#krok-8-index-webu-a-odpověď-s-citací). Stav indexu k 14. 11. 2026 (okno 4 roky, OCR obrázků, stará úřední deska). Tabulka zdrojů níže je ze 13. 11. 2026.*

Index drží text webu obce prisovice.cz a veřejný obsah webu Nezávislých pro Příšovice (karty projektů, Tlampač a podklady). Z něj ucho hledá odpověď na potvrzený dotaz (F-70 až F-76). Index se aktualizuje jen ručně (F-71). Pravidelný běh do MVP nepatří.

## Co v indexu je

**Okno 4 roky (13. 11. 2026, zadal Tomáš):** okno pro aktuality, úřední desku a jejich PDF je od 9. 11. 2022 místo od 9. 11. 2024. Stahování poslalo 241 požadavků a stáhlo 225 souborů: 11 aktualit, 92 položek úřední desky a 122 příloh. Mezi nimi jsou i aktuality zveřejněné 12. 11. 2026. Tabulka zdrojů výše je ze zpracování bez OCR obrázků. Word převedl 7 nových dokumentů, OCR přečetlo 65 nových stran. Mimo okno teď nezůstalo nic: nejstarší aktualita a položka desky v sitemapě jsou z 22. 11. 2022, takže 4 roky pokrývají vše, co obec ve WordPressu zveřejnila.

| | Před (12. 11. 2026) | Po (13. 11. 2026) |
|---|---|---|
| Dokumenty v D1 | 436 | 552, s OCR obrázků 560 |
| Úseky v D1 | 3 070 | 5 069, s OCR obrázků 5 077 |
| Vektory ve Vectorize | 3 070 | 5 069, s OCR obrázků 5 077 |
| Embeddingy spočítané při nahrání | 1 043 | 2 004 a 9 (OCR obrázků) |
| Odhad neuronů | asi 540 | asi 1 040 a pod 10 |

Odhad neuronů vychází z poměru předchozích nahrání (zhruba 0,52 neuronu na úsek). Opory všech typových otázek zůstaly v úsecích svých zdrojů (`kontrola-sady.ts`).

**OCR obrázků v aktualitách (13. 11. 2026, schválil Tomáš):** pozvánky na vánoční jarmark 21. a 22. 11. 2026, rozsvícení vánočního stromečku 27. 11. 2026 a koncert My Gospel 5. 12. 2026 jsou aktuality, které mají jen nadpis a obrázek pozvánky. Okno 4 let je samo do indexu nedostalo. Proto `index:stahnout` stahuje i obrázky (JPG a PNG) z obsahu aktualit a položek úřední desky v okně, které mají nejvýš 3 obrázky. Fotogalerie (vítání občánků, masopust) se nestahují. `index:ocr` je přečte stejným OCR ve Windows jako skeny PDF a `index:zpracovat` přidá čitelný text k aktualitě. Obrázek je čitelný, když má aspoň 10 slov a slova tvoří aspoň 40 % útržků, protože plakát má málo slov (jarmark 20, koncert 15). Mapa objízdné trasy, fotografie a ocenění tímto prahem neprojdou. Snímky výsledků voleb se nečtou, protože obsahují jména a věk kandidátů. Aktualita s takovým textem má v názvu „text rozpoznaný z obrázku“, nebo „část textu rozpoznaná z obrázku“.

- Staženo 17 obrázků (33 požadavků). Text z obrázku má 8 aktualit: jarmark, rozsvícení stromečku, koncert My Gospel, beseda s Marií Formáčkovou, Panova flétna, Čistá řeka Jizera, divadlo v Pěnčíně a platební portál.
- Index po nahrání: D1 560 dokumentů a 5 077 úseků, Vectorize 5 077 vektorů. Embeddingy se počítaly pro 9 úseků.
- `hledat.ts "Kdy budou vánoční trhy?"` najde aktualitu s jarmarkem vektorově i fulltextem. Pozvánka zní: sobota 21. a neděle 22. listopadu 2026, Sokolovna čp. 145, vždy od 10:00 do 15:00 hodin.

**Archiv úřední desky a stará deska na e-obec.cz (14. 11. 2026, pokyn Tomáše):**

- **Archiv na prisovice.cz** (`obecni-urad-prisovice/archiv-ud/`) je výpis, který odkazuje na stejné položky úřední desky jako sitemapa. Všech 312 položek archivu je od 11. 1. 2024 (od ledna 2024 vede obec desku ve WordPressu) a všech 312 už v seznamu stahování bylo: 298 zpracovaných, 14 vynechaných jako řízení soukromých osob. Archiv sám nepřidal nic. Mezi zpracovanými je všech 55 zápisů rady od 10. 1. 2024 a všechny zápisy zastupitelstva.
- **Stará úřední deska na prisovice.e-obec.cz** (`urednideska.php` a `urednideska.php?akce=archive`) se od 14. 11. 2026 sleduje. Rozhodnutí z 24. 10. 2026, že se nesleduje, tím Tomáš mění. Deska má 20 dokumentů: 6 dosud vyvěšených (střednědobé výhledy rozpočtu, dotace Mikroregionu Jizera, trvale vyvěšené nařízení č. 1/2013) a 14 z archivu (leden 2024: pozvánky, oznámení, záměry, rozpočtové opatření, zápis rady z 10. 1. 2024). Odkaz `urednideska.php?soubor=ID` přesměruje na PDF v `/storage/uredni_deska/`. Bere se, co bylo vyvěšeno v okně nebo co visí dosud. Dokument, který je i na novém webu obce, se v indexu objeví jednou a zůstane kopie z prisovice.cz (stejný text). Přibylo 5 dokumentů (D1 565 dokumentů, 5 106 úseků, Vectorize 5 106 vektorů, embeddingy jen pro 29 úseků). Soubor `robots.txt` na e-obec.cz neexistuje (404), skript bere všechno povolené s rozestupem jedné sekundy.

**Hledání detailů v zápisech rady (14. 11. 2026, hlášení Tomáše „ucho nenachází detaily“):**

Zápisy rady jsou v indexu úplně (54 zápisů, 600 úseků, text je čitelný). Změřeno na 15 dotazech s jistou odpovědí v usnesení (`tests/data/dotazy-zapisy.json`, `npx tsx nastroje/index/mereni-zapisu.ts` a `mereni-zapisu-odpovedi.ts`): správný úsek najde hledání u 14 z 15 dotazů už dnes. Selhávalo něco jiného, až odpověď a ověření: celou cestu přežilo jen 7 z 15 dotazů. Příčiny a opravy:

| Příčina | Dotazů z 15 | Oprava |
|---|---|---|
| Model za uzavřenou citaci připsal cizí slovo, JSON byl neplatný | 3 | Věty se přečtou i z poškozeného JSONu (`zachranitVety`). Citace se pak stejně ověřuje doslova ve zdroji. |
| Model opsal celé usnesení (420 znaků), limit 300 znaků ho odmítl | 2 | Limit přijaté citace je 500 znaků, doslovnost se kontroluje dál. |
| Ověření označilo dodavatele s IČ (třeba „Arboristika Jakub Kněbort“) za soukromou osobu | 2 | Prompt ověření: podnikatel s IČ, kterého obec uvádí jako dodavatele, soukromá osoba není. Žadatel, nájemce, kupující, stavebník a občan v řízení jí dál jsou. Změkčení pravidla z 12. 11. 2026 potvrdil Tomáš 14. 11. 2026 a rozšířil ho na účinkující na veřejných akcích obce (hudebník, umělec, přednášející). Ověření k tomu dostalo dva příklady, bez nich model kolísal. |
| Kolísání modelu při jediném pokusu | | Technické chyby (neplatný JSON, špatně opsaná citace, špatné číslo úseku, číslo ve větě mimo citaci, falešná soukromá osoba) se zkusí jednou znovu s teplotou 0,3. Každý pokus prochází celým ověřením. Rozpor se zdrojem (`neplyne-z-citace`) se neopakuje. |

Výsledek: odpověď dostane 12 až 13 ze 15 dotazů (před úpravami 7 z 15). Prompt verze 8 (účinkující) už zodpoví i Z09. Ověření je přísné a u jednoho až dvou dotazů kolísá mezi během (Z10, Z14: `neplyne-z-citace`). Stav dotazů, které dřív neprošly:

- **Z09 (kdo vystoupil na masopustu a kolik to stálo):** od verze 8 promptu odpoví (účinkující na akci obce není soukromá osoba), 3 ze 3 pokusů.
- **Z15 (smlouva na cyklostezku „Cecilka k Jizeře“):** usnesení rady č. 126/2026 ze 3. 7. 2026 schvaluje výběr M-SILNICE na „Greenway Jizera v úseku Turnov – Svijany, SO E.102“ a aktualita ze 14. 8. 2026 píše o stezce „od Přepeř k břehové části řeky Jizery“. Slovo Cecilka není v žádném z nich. Tomáš 14. 11. 2026 potvrdil, že SO E.102 je cyklostezka přes Cecilku, a je to v seznamu místních názvů (`src/lib/odpovedi/mistopis.ts`) včetně slov pro hledání (Greenway, E102). Hledání teď vrací úseky o E.102, ale usnesení č. 126/2026 mezi šesti úseky pro model dál není a model odpoví „nevím“. Deset úseků a padesát kandidátů ho do výběru dostane, celkově to ale vyšlo hůř (12 z 15, pomalejší odpovědi), proto zůstává šest.

**Místní názvy (14. 11. 2026, pokyn Tomáše):** `src/lib/odpovedi/mistopis.ts` má seznam míst, která občané říkají po svém (zatím Cecilka a Písečáky). Výklad („Cecilka je nejnovější zástavba na východním okraji Příšovic u silnice na Přepeře, ne jméno osoby“) dostane model v odpovědi i v ověření jen tehdy, když se název objeví v dotazu nebo v úryvcích. Slouží jen k porozumění, tvrzení musí mít oporu v úryvku. Do fulltextového hledání se k dotazu s Cecilkou přidá slovo Přepeře. Seznam doplňuje tým, popis u každého místa musí být ověřený.

**Dotaz na poslední zasedání (14. 11. 2026, pokyn Tomáše):** „Co se řešilo na posledním zasedání Rady a zastupitelstva?“ se hledáním podobnosti řešit nedá, rozhoduje datum. `src/lib/odpovedi/zapisy.ts` pozná dotaz (poslední, nejnovější, naposledy, minulé + zasedání, jednání, schůze, zápis) a orgán (rada, zastupitelstvo, jinak oba). Z indexu se vezmou první úseky nejnovějšího zápisu každého orgánu podle data v názvu a model z nich podle zvláštního zadání napíše nejvýš tři věty „Na zasedání rady obce dne … se projednávala …“ s krátkou doslovnou citací z programu. Body se jmény osob se vynechají. Ověření a ostatní pojistky platí jako jindy. Na ostrém indexu se zasedání zastupitelstva 4. 11. 2026 shrnuje stabilně, zasedání rady 21. 10. 2026 v samostatném dotazu 3 ze 3 za 6 až 15 s. Ve společném dotazu na oba orgány se rada občas nevejde do časového limitu a část se podle pravidla F-75 vynechá.

**Souhrn zasedání z usnesení (14. 11. 2026, Tomáš: odpověď je zkrácená, „tam se probíralo víc věcí“):** první verze dávala modelu jen začátek zápisu, a ten u ustavujícího zasedání obsahuje samé formality (zahájení, slib, ověřovatelé). Teď model dostane začátek zápisu s programem a úsek se všemi usneseními zápisu (`vybratProSouhrn` v `src/lib/odpovedi/zapisy.ts`). Usnesení jsou doslovné výňatky ze zápisu, citace tedy prochází stejnou kontrolou. Souhrn má až 7 krátkých bodů, formality vynechá a datum zasedání uvede v první větě (prompt verze 9). Protože je to výčet nezávislých bodů, neověřený bod se vynechá a ostatní zůstanou (aspoň 2). U běžné odpovědi platí dál F-75 pro celou část. Souhrn má vlastní časový limit 40 s (`LIMIT_SOUHRNU_MS`), běžná část 25 s. Na ostrém indexu 6 ze 6 pokusů s odpovědí za 10 až 24 s: rada 21. 10. 2026 (příkazní smlouva na bytový dům pro seniory, platový výměr ředitelky, spolupráce se Spokojeným domovem, dotace na okna a vitráže kaple) a zastupitelstvo 4. 11. 2026 (volba starosty a místostarosty, pětičlenná rada, výbory, kupní smlouva, dotace na chodník Na Cecilce, plán zasedání).

**Čekající dotazy po obnově (13. 11. 2026, pokyn Tomáše):** `npx tsx nastroje/zodpovedet-cekajici.ts` projde čekající témata ve feedu a čekající ukázky stejným hledáním, odpovědí a ověřením jako stránka. Bez přepínače nic nezapisuje. S přepínačem `--zapsat t-ID` (od 14. 11. 2026) zapíše odpověď k jednomu tématu, které pořád čeká a nemá platnou odpověď: jako platnou část odpovědi z webu a téma přepne na zodpovězené. Tak dostalo 14. 11. 2026 odpověď téma „Dotaz na obsah posledního zasedání Rady a zastupitelstva“ (6 usnesení rady z 21. 10. a 6 usnesení zastupitelstva ze 4. 11. 2026). Ucho odpovědělo na téma „Dotaz na termín rozsvícení vánočního stromku“: pátek 27. listopadu 2026 od 17:00 hodin na návsi, zdrojem je pozvánka obce. Odpověď je zapsaná v ostré D1 jako platná část odpovědi z webu (tabulka `odpoved`, `puvod` web) a téma má stav `zodpovezeno-z-webu`. Je to odpověď z webu obce se zdrojem, ne odpověď úřadu. Druhý vzkaz téhož tématu („rozlicení“ s překlepem) hledání samo nenašlo, patří ale ke stejnému tématu, a tak dostal stejnou odpověď. Na žádnou ze 12 čekajících ukázek ucho neodpovědělo, ani na Výdejní box a Nabíječku.

**Kontrola ukázek po rozšíření:** dvě čekající ukázky teď v indexu něco najdou, protože do okna přibyly zápisy rady z roku 2024. „Výdejní box na balíky“ najde usnesení rady č. 199/2024 o rozšíření Z-boxu Zásilkovny (zápis 16/2024 z 9. 10. 2024). „Nabíječka na elektroauto v obci“ najde žádosti o nabíjecí stanice v zápisech rady 1/2024 a 3/2024. Tomáš je 13. 11. 2026 chtěl převést na zodpovězené. Ucho na ně ale ani po třech bězích neodpoví (model-nevi): hledání k dotazům „Je v Příšovicích nějaký výdejní box na balíky?“ a „Je v Příšovicích někde nabíječka na elektroauto?“ zápisy rady nevrátí, protože v dotazu nejsou slova Zásilkovna, Z-box ani nabíjecí stanice. Ukázky proto zůstaly čekající, odpověď sestavená ručně by nebyla výstupem ucha.

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
| Obrázky ve fotogaleriích a nečitelné obrázky | aktuality s více než 3 obrázky, 9 obrázků pod prahem čitelnosti, 2 snímky výsledků voleb | Fotografie nemají text. Mapy a loga dají jen útržky. Výsledky voleb obsahují jména a věk kandidátů. |
| Řízení soukromých osob na úřední desce | 15 položek a 15 PDF | Dražby, exekuce, stavební řízení o rodinných domech, přístavbách, tůních a dělení pozemků (rozhodnuto 9. 11. 2026). Názvy se sem kvůli osobním údajům nezapisují. |
| Výpisové stránky | 5 | Aktuality, Aktuálně, Úřední deska, Archiv úřední desky a Mapa stránek jen opakují texty položek |
| Stránky bez vlastního textu | 391 | Rozcestníky, galerie a obálky úřední desky. Kde odkazují na PDF, je v indexu PDF. |
| Skeny, ze kterých OCR nepřečte nic použitelného | 9 PDF | Mapy, ocenění, plánek směny pozemků a dvě oznámení o vstupu na pozemky se samými výkresy |
| Strany bez použitelného textu v jinak čitelných PDF | 41 stran nečitelných pro OCR, 21 PDF se stranami bez textu | Výkresy, mapy, grafy a přílohy havarijního plánu. OCR z nich dá jen útržky (do 25 slov), filtr je do indexu nepustí. |
| Dokumenty v jiném formátu | 32 | Excel a zip zůstávají mimo index (rozhodnuto 10. 11. 2026). Patří sem návrh rozpočtu v Excelu. |
| Odkazy na jiné weby | 22 | Portál CENIA a další cizí domény. Stará úřední deska prisovice.e-obec.cz se od 14. 11. 2026 sleduje (viz výše). |
| PDF, které web vrací s chybou 404 | 1 | Informace o GDPR odkázaná z odpovědi podle zákona 106 z listopadu 2022 |
| Duplicitní PDF | 35 | Obec stejný dokument zveřejnila dvakrát pod jinou adresou. V indexu je jedna kopie. |

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
3. `npm run index:ocr`: strany PDF bez textové vrstvy vykreslí do obrázku (asi 300 dpi) a přečte je OCR ve Windows v češtině. Od 13. 11. 2026 stejně přečte i stažené obrázky pozvánek z aktualit a úřední desky. Nic se neinstaluje a nic neodchází mimo počítač. Rozpoznané strany přeskočí, obrázky po OCR smaže.
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
