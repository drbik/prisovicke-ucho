# Zadání: témata ve feedu (jedna odpověď na téma)

*Zadal Tomáš 13. 11. 2026. Zadání je pro samostatnou session, která úkol provede celý, od návrhu po nasazení. Na konci je oddíl [Stav úkolu](#stav-úkolu), který session průběžně vyplňuje.*

## Kontext

Feed vedle ucha (krok 8.17, [feed-vzkazu.md](feed-vzkazu.md)) dnes ukazuje každý potvrzený vzkaz jako samostatnou položku a za nimi 32 ukázek. Opakovaný dotaz se pozná podle embeddingu celého textu (bge-m3, práh 0,85). Nový dotaz pak dostane jen odkaz „Podobný dotaz už má odpověď“, ve feedu ale zůstane jako další položka s vlastní odpovědí.

**Problém na ostré adrese 13. 11. 2026:** ve feedu je skutečný dotaz `v-2j1g3o2u57` „Dotaz na pronájem Sokolovny pro oslavu narozenin“ (odpověď o 3 větách) vedle ukázky `ukazka-03` „Pronájem sálu v Sokolovně“ (odpověď o 1 větě). Je to stejné téma se dvěma různými odpověďmi. Podobnost je nespojila: dlouhý dotaz s okolnostmi (oslava, 15 lidí) nedosáhl prahu 0,85. Ukázky `ukazka-17` „Hospoda v Sokolovně“ a `ukazka-29` „Pítko pro cyklisty u Sokolovny“ jsou jiná témata a mají zůstat zvlášť.

**Co Tomáš chce:**

- Feed se řadí do skupin, tedy témat. Když je otázka zodpovězená, má téma jen jednu odpověď, i když se na ni ptalo víc lidí.
- Když se někdo doptá na detail, který odpověď ještě nemá, odpověď tématu se o něj doplní a tím zpřesní.
- Odpovědi se neduplikují a feed není dlouhý.

**Vazba na PRD a plán:** úkol odpovídá krokům 6 a 7 plánu MVP ([plan-mvp.md](plan-mvp.md)) a požadavkům F-33 až F-37 a F-81, upraveným pro feed bez přihlášení:

- F-33: téma má hlavní dotaz, poddotazy a odpovědi.
- F-34: podobná témata se hledají podle významu, autorovi se ukážou nejvýš 3 i s odpovědí.
- F-35: autor zvolí „Je to totéž“, „Ptám se na víc“, nebo „Je to jiné téma“.
- F-37: existující odpověď uvidí hned.
- F-81: „Odpověď mi stačí“, nebo „Chci se doptat“.
- Rozhodnutí z 24. 10. 2026 v `CLAUDE.md`: stejné dotazy se slučují do jednoho tématu a o shodě rozhoduje autor.
- Datový model PRD (oddíl Datový model v [PRD.md](PRD.md)) má entity Téma, Podnět (vztah k tématu: zakladatel, totéž, poddotaz, doplnění) a Odpověď (k tématu nebo poddotazu, stav platná, ke kontrole, stažená). Drž se jich.

Je to rozšíření MVP pro zkušební provoz, které Tomáš zadal 13. 11. 2026.

## Cíl

1. **Feed ukazuje témata, ne jednotlivé vzkazy.**
   - Položka tématu má název, stav, typ, počet vzkazů, které k němu patří (bez přihlášení se počítají vzkazy, ne lidé), a datum poslední změny.
   - Po rozkliknutí ukáže hlavní dotaz, odpověď tématu, poddotazy s jejich částí odpovědi a sbalené texty připojených vzkazů.
2. **Nový vzkaz se zařadí k tématu.**
   - Po potvrzení (F-14) ucho najde nejvýš 3 podobná témata i s odpovědí (F-34) a autor zvolí jednu ze tří možností (F-35):
     - **totéž:** vzkaz se připojí k tématu a autor hned vidí jeho odpověď (F-37);
     - **ptám se na víc:** vzkaz je poddotaz a hledá se odpověď jen na nový detail;
     - **jiné téma:** vznikne nové téma.
   - Když podobné téma není, vznikne nové téma bez ptaní.
3. **Odpověď tématu se zpřesňuje, neduplikuje.**
   - Nalezená odpověď na poddotaz doplní odpověď tématu.
   - Věta ani zdroj, které už odpověď tématu má, se znovu nepřidají.
   - Při rozporu zdrojů platí novější údaj (stejně jako v promptu odpovědi verze 5). Starší část se nesmaže potichu, dostane stav podle datového modelu (stažená nebo ke kontrole).
4. **Ukázky jsou témata.** Skutečný dotaz se smí připojit k ukázce. Ukázka pak zůstane se štítkem Ukázka, ale počítá i připojené vzkazy.
5. **Stávající uložené vzkazy se převedou do témat.** Nic se neztratí. `v-2j1g3o2u57` patří k tématu `ukazka-03`.
6. **Tým umí témata opravit.** Příkaz v `nastroje/vzkazy.ts` vypíše témata, přesune vzkaz do jiného tématu, sloučí dvě témata a skryje téma. Úprava v rozhraní pro správce (F-38) je Později.

## Pravidla, která platí vždy

- **F-14:** před potvrzením autorem se nic neukládá.
- **F-73 až F-76:** odpověď tématu obsahuje jen věty s citací z nalezených úryvků, které prošly ověřením. Když se odpověď tématu skládá nebo přepisuje AI, projde stejným ověřením a kontrolou čísel jako dnes. Bez opory jde část zastupitelům, AI si nic nedomýšlí.
- U každé odpovědi je upozornění, že nejde o úřední vyjádření obce.
- **Alternativní mluvčí:** zůstávají u přímého namlouvání. Odpověď tématu ve feedu je spisovně. Text postavy u vzkazu zůstává jako dnes („Ve stylu: …“).
- Logy obsahují jen časy, počty, podobnosti a verze promptů, nikdy text vzkazu ani odpovědi.
- Úložiště a AI jsou za vlastním rozhraním (`UlozisteVzkazu`, `SluzbaAi`). Logika v modulech, které neznají Astro ani Hono. Lokální vývoj ukládá jen do paměti.
- Texty pro uživatele piš spisovnou češtinou. Ovládání klávesnicí a oznámení pro čtečky obrazovky musí fungovat.
- V commitech a kódu odkazuj na F-33 až F-37 a F-81.
- Do složky webu Nezávislých (`WEB_Prisovice`) nic nepiš. Nasazuj jen Worker `prisovicke-ucho`.
- Souběžně běží session „PRD 1.0“. Ta upravuje `docs/PRD.md`, seznam dokumentů v `CLAUDE.md` a jednu větu o PRD v `docs/plan-mvp.md`. Před PR si sluč aktuální hlavní větev `ccr-0bd17529-03aszn` a konflikty vyřeš ve prospěch obou změn.

## Postup a kontrolní body

### A. Průzkum a návrh (jen čtení a měření, nic nestav)

1. Přečti `CLAUDE.md`, [feed-vzkazu.md](feed-vzkazu.md), oddíly F-33 až F-44 a Datový model v [PRD.md](PRD.md), kroky 6 a 7 v [plan-mvp.md](plan-mvp.md) a kód:
   - `src/lib/vzkazy/` (typy, úložiště, feed, podobnost);
   - `src/lib/odpovedi/zpracovani.ts` (uložení a hledání podobného dotazu);
   - `src/lib/odpovedi/casti.ts` (dělení dotazu na části);
   - `src/lib/temata/` (ukázky);
   - `src/components/Temata.astro` a `src/skripty/temata.ts` (feed na stránce);
   - `migrations/0002_vzkazy.sql`, `nastroje/vzkazy.ts`, `tests/vzkazy.test.ts`.
2. Změř, proč Sokolovna neprošla. Porovnej aspoň tyto způsoby hledání podobného tématu:
   - embedding celého textu (dnešní stav);
   - embedding názvu nebo jádra otázky;
   - embedding částí dotazu z `casti.ts`;
   - reranker `@cf/baai/bge-reranker-base`;
   - rozhodnutí jazykovým modelem nad nejbližšími kandidáty.

   U každého zapiš podobnosti na páru Sokolovna a na dvojicích z `docs/feed-vzkazu.md`, cenu v neuronech a čas.
3. Napiš návrh do nového dokumentu `docs/temata-feedu.md`:
   - datový model a migraci `0003`;
   - tok obrazovek od potvrzení po zařazení, slovně nebo jako náčrt;
   - pravidlo pro skládání odpovědi tématu (připojit části, nebo souhrn od AI s ověřením);
   - jak se zachází s návrhy, stížnostmi a pochvalami (sdružovat jako dotazy, jen bez hledání odpovědi?);
   - převod stávajících vzkazů;
   - prahy pro „Kdy je hotovo“, cenu a rizika.

   Ke každé otevřené otázce dej doporučení.
4. **Zastav se** a předlož návrh Tomášovi. Bez jeho souhlasu nestav.

### B. Sada pro sdružování

1. Sestav 20 až 30 skupin otázek, jak by je řekli občané. U každé dvojice zapiš očekávaný vztah: totéž, poddotaz, nebo jiné téma. Ber je z ukázek (`src/lib/temata/ukazky.json`), z typových otázek (`tests/data/typove-otazky.json`) a ze skutečného dotazu na Sokolovnu. Přidej záludné páry na stejném místě, ale s jiným tématem (sál, hospoda a pítko u Sokolovny, psi a koupaliště v Písečácích).
2. Ulož sadu strojově do `tests/data/` a čitelně do `docs/`.
3. **Zastav se** a dej sadu Tomášovi ke schválení.

### C. Stavba (po schválení návrhu a sady)

Postav podle schváleného návrhu:
- migraci;
- úložiště s pamětí i D1;
- zařazení k tématu a volbu autora;
- skládání odpovědi tématu;
- feed po tématech s filtry stavu a typu;
- převod stávajících vzkazů;
- příkazy v `nastroje/vzkazy.ts`.

Ke každé větvi toku napiš testy bez sítě: totéž, poddotaz, jiné téma, žádné podobné téma, rozpor zdrojů, duplicitní věta, skrytí vzkazu i tématu.

### D. Ověření

1. Spusť `npm test` a `npm run check`.
2. Spusť vyhodnocení na schválené sadě a výsledek zapiš do `docs/temata-feedu.md`.
3. Lokálně ověř v prohlížeči na počítači i na šířce telefonu:
   - feed po tématech;
   - všechny tři volby autora;
   - doplnění odpovědi poddotazem;
   - filtry a počty;
   - ovládání klávesnicí;
   - konzoli bez chyb.

### E. Nasazení (jen se souhlasem Tomáše)

1. **Zastav se** a požádej Tomáše o souhlas s migrací ostré D1 a s nasazením.
2. Po souhlasu proveď migraci, převeď stávající vzkazy a nasaď (`npm run deploy`, jen Worker `prisovicke-ucho`).
3. Na ostré adrese ověř:
   - feed se načte po tématech;
   - Sokolovna je jedno téma s jednou odpovědí;
   - Hospoda a Pítko zůstaly zvlášť;
   - konzole je bez chyb.
4. Zkušební vzkaz na ostré adrese pošli jen se souhlasem Tomáše. Zveřejní se, takže ho po zkoušce skryj.
5. Verzi Workeru zapiš do dokumentace.

### F. Dokumentace a předání

- `docs/temata-feedu.md`: návrh, výsledky a nasazení.
- `docs/feed-vzkazu.md`: aktualizovat, nebo odkázat na nový dokument.
- Nový řádek v tabulce kroku 8 v [plan-mvp.md](plan-mvp.md), nebo stav kroků 6 a 7.
- Rozhodnutí do `CLAUDE.md` s datem.
- Testy na telefonu do [test-zarizeni.md](test-zarizeni.md).
- Nový dokument do seznamu v `README.md` a `CLAUDE.md`.
- Vše commitnuté ve větvi session. Push a PR proti `ccr-0bd17529-03aszn` udělej, sloučení jen na pokyn Tomáše.

## Co do úkolu nepatří

- Přihlášení, Telegram a doručení nové odpovědi připojeným autorům (zbytek F-36, F-53).
- Hlasování palcem a skóre (F-40 až F-43).
- Fronta a odpověď správce (krok 9) a úprava témat v rozhraní (F-38). Tým témata opravuje jen příkazem.
- Pravidelná obnova indexu a změny indexu zdrojů.
- Změny webu Nezávislých.

## Kdy se zastavit a zeptat

- Po návrhu (A) a po sadě (B). Bez souhlasu nestav.
- Když by řešení šlo proti rozhodnutí v `CLAUDE.md` nebo proti PRD, třeba automatické sloučení bez volby autora.
- Když skládání odpovědi tématu nejde udělat tak, aby platilo F-73 až F-76.
- Když by zařazení jednoho vzkazu stálo víc než dvojnásobek dnešních neuronů na vzkaz.
- Před migrací ostré D1, před nasazením a před každým zkušebním vzkazem na ostré adrese.

## Kdy je hotovo

Úkol je hotový, až platí všechno níže. Co neplatí, se v závěrečné zprávě vyjmenuje a úkol se nevydává za hotový. Session každý bod ověří sama a výsledek zapíše do [Stavu úkolu](#stav-úkolu).

1. Návrh je schválený Tomášem a zapsaný v `docs/temata-feedu.md`.
2. Sada pro sdružování je schválená Tomášem a uložená v `tests/data/` i v `docs/`.
3. Na schválené sadě, ručně zkontrolováno a zapsáno:
   - u párů „totéž“ a „poddotaz“ je správné téma mezi nabídnutými aspoň v 90 % případů;
   - žádné téma se nesloučí samo, bez volby autora, pokud Tomáš v návrhu neschválil jinak;
   - u párů „jiné téma“ nepadne do jednoho tématu nic, co autor neodsouhlasil.

   Prahy může Tomáš při schválení návrhu změnit.
4. Feed ukazuje jednu položku na téma. Každé téma má nejvýš jednu platnou odpověď, ve které se žádná věta ani zdroj neopakují. Každá věta má citaci a prošla ověřením. U odpovědi je upozornění, že nejde o úřední vyjádření obce.
5. Všechny tři volby autora fungují a mají testy:
   - totéž ukáže existující odpověď bez nového hledání;
   - poddotaz doplní odpověď tématu;
   - jiné téma založí nové téma.
6. Stávající vzkazy jsou převedené do témat, žádný nechybí. `v-2j1g3o2u57` je v tématu `ukazka-03`. Hospoda a Pítko u Sokolovny jsou samostatná témata.
7. Příkazy v `nastroje/vzkazy.ts` umí témata vypsat, přesunout vzkaz, sloučit témata a skrýt vzkaz i téma.
8. `npm test` a `npm run check` projdou. Lokálně je ověřený prohlížeč na počítači i na šířce telefonu a konzole je bez chyb.
9. Se souhlasem Tomáše proběhla migrace ostré D1 a nasazení. Na ostré adrese je ověřený bod 6 a zapsaná verze Workeru.
10. Dokumentace podle oddílu F je aktuální.
11. Vše je commitnuté a PR je otevřený. Sloučení jen na pokyn Tomáše.

## Stav úkolu

*Session tabulku aktualizuje po každé fázi a po každém rozhodnutí Tomáše. Stavy: Nezačato, Probíhá, Čeká na Tomáše, Hotovo.*

| Fáze | Stav | Datum | Poznámka |
|---|---|---|---|
| A. Průzkum a návrh | Čeká na Tomáše | 13. 11. 2026 | Návrh a měření v [temata-feedu.md](temata-feedu.md), 13 otevřených otázek s doporučením. Měřicí skript `nastroje/mereni-temat.ts`, měření stálo asi 390 neuronů. Sokolovna má podobnost 0,80 (práh byl 0,85), správné téma je ale u všech 18 dvojic mezi 3 nejbližšími. |
| B. Sada pro sdružování | Nezačato | | |
| C. Stavba | Nezačato | | |
| D. Ověření | Nezačato | | |
| E. Nasazení | Nezačato | | |
| F. Dokumentace a předání | Nezačato | | |

**Body „Kdy je hotovo“:**

- [ ] 1. Návrh schválený
- [ ] 2. Sada schválená
- [ ] 3. Prahy na sadě splněné
- [ ] 4. Jedna odpověď na téma, bez duplicit, s citacemi
- [ ] 5. Tři volby autora s testy
- [ ] 6. Převod vzkazů, Sokolovna v jednom tématu
- [ ] 7. Příkazy pro tým
- [ ] 8. Testy, kontrola typů a ověření v prohlížeči
- [ ] 9. Migrace a nasazení se souhlasem, ověřeno na ostré adrese
- [ ] 10. Dokumentace
- [ ] 11. Commit a PR
