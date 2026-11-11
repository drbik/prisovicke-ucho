# Zadání: krok 8, index webu a odpověď s citací

*Připraveno 9. 11. 2026 pro samostatnou session. Zadavatel je Tomáš, komunikuje česky, často z telefonu. Každá závěrečná zpráva proto musí dávat smysl sama o sobě.*

## Kontext

Příšovické ucho je webová aplikace na nezavisli-prisovice.cz/ucho. Občan namluví nebo napíše vzkaz, AI ho převede do spisovné češtiny a autor ho opraví a potvrdí. Tím teď stránka končí, nic se neukládá.

Hotové a nasazené (větev `worktree-ui-podani`, jen lokálně, nepushnutá): kostra (Astro 7 a Hono), nahrávání, přepis Whisperem, AI úprava (Gemma 4 26B), formulář k opravě a potvrzení (krok 4.1). Přihlášení, databáze podnětů a fronta správce zatím nejsou.

Přečti si nejdřív:

- `CLAUDE.md`: pravidla projektu a všechna rozhodnutí, hlavně z 9. 11. 2026.
- `docs/plan-mvp.md`: kroky, rozpisy kroků 1 až 4 a stav.
- `docs/PRD.md`: F-70 až F-79, F-72, požadavek Rychlost a datový model (entity Zdrojový dokument a Citace).
- `docs/research-hlasove-podnety.md`, oddíl „Doplnění 24. 10. 2026: odpovědi z webu obce Příšovice“: WordPress, Browser Rendering `/crawl`, AI Search nad R2.
- `docs/oblasti-a-web.md`: mapa projektu webu Nezávislých a co z něj ucho smí převzít.
- Kód: `src/lib/podani/potvrzeni.ts`, `src/skripty/podani.ts`, `src/lib/ai/` (rozhraní k AI a falešná AI pro testy), `src/lib/api/` (Hono) a `src/pages/api/[...cesta].ts`.

## Cíl

Když autor potvrdí vzkaz typu dotaz, ucho prohledá připravený index a ukáže odpověď s citací zdroje. Když odpověď ve zdrojích není, nebo si jí není jisté, řekne, že dotaz předá zastupitelům. Návrhy, stížnosti a pochvaly se nehledají (F-72).

Vedle toho vznikne sada typových otázek. Do kroku 11 slouží jako testovací sada, potom jako označené ukázky na veřejném seznamu témat.

## Zdroje

- **prisovice.cz**: stránky, aktuality a zveřejněné dokumenty (PDF). Úřední deska na prisovice.e-obec.cz se nesleduje.
- **Web Nezávislých**: jen publikované karty projektů ze `src/content/projects/` ve složce `C:\Users\tomas\OneDrive\06_CODEX\WEB_Prisovice`. Z pravidel webu (`AGENTS.md`, `README.md`) a z frontmatteru zjisti, co je publikované. Cituj adresu karty na nezavisli-prisovice.cz a ověř, že na ostrém webu existuje. Soubor na disku necituj.
- **Nikdy:** `src/content/akce-prisovice-timeline.md` ani jiný neveřejný obsah webu Nezávislých.
- Složka `WEB_Prisovice` je jen ke čtení. Zpřístupni ji jen ke čtení (`/add-dir`), nebo čti absolutní cestou. Nic v ní neměň a nespouštěj v ní zapisující příkazy.

## Postup a kontrolní body

### A. Průzkum a rozpis (jen čtení, nic nestav)

1. **Rozsah prisovice.cz:** mapa webu, počet stránek, aktualit a PDF, celková velikost a kolik PDF jsou skeny bez textové vrstvy. Zjisti, jestli běží WordPress REST API, co říká robots.txt a jestli podmínky webu stahování nebrání.
2. **Cloudflare na Workers Free** (účet je na bezplatném plánu): limity a ceny Vectorize, AI Search nad R2, R2, D1, embeddingů ve Workers AI (např. `@cf/baai/bge-m3`) a Browser Rendering `/crawl`. Bezplatných 10 000 neuronů denně sdílí index s přepisem a úpravou. Vyber architekturu a zdůvodni ji. Přístup k úložišti, indexu a AI drž za vlastním rozhraním (zásady v `CLAUDE.md`).
3. **Rozpis kroku 8** zapiš do `docs/plan-mvp.md` ve stejné podobě jako kroky 1 až 4: tabulka „# | Dílčí krok | Hotovo, když“, rozhodnutí, technické poznámky, cena a rizika. Mezi riziky nesmí chybět osobní údaje v PDF obce (zakrytí F-17 je Později).
4. **Zastav se** a předlož Tomášovi rozpis, architekturu, cenu a prahy z oddílu „Kdy je hotovo“. Bez jeho souhlasu nestav.

### B. Typové otázky

1. Napiš 20 až 30 otázek tak, jak by je řekli občané: různý styl, hovorová čeština i místní názvy (seznam je v `src/lib/ai/prompt-upravy.ts`). Namíchej:
   - otázky s odpovědí na prisovice.cz,
   - otázky s odpovědí v kartách projektů,
   - otázky, na které zdroje odpověď nemají a mají skončit u zastupitelů,
   - aspoň tři návrhy nebo stížnosti, které se nemají hledat.
2. Ke každé otázce zapiš očekávaný výsledek: odpověď s adresou, názvem a datem zdroje, nebo „zastupitelům“. Očekávanou odpověď ber jen z ověřeného zdroje, nic si nedomýšlej.
3. Sadu ulož do repozitáře ve strojově čitelné podobě a k ní čitelný přehled pro Tomáše.
4. **Zastav se** a dej sadu Tomášovi ke schválení. Do jeho souhlasu ji nepoužívej k vyhodnocení.

### C. Stavba (po schválení rozpisu)

- **Stahování:** ruční skript, žádný pravidelný běh (do MVP nepatří). Řiď se robots.txt, posílej nejvýš zhruba jeden požadavek za sekundu a použij obecný User-Agent bez osobních údajů. Stažený obsah nepatří do repozitáře.
- **Zpracování:** text z HTML i PDF, dělení na úseky a metadata podle entity Zdrojový dokument (URL, název, web, typ, datum zveřejnění a změny, otisk obsahu, datum stažení). Migrace D1 jen pro to, co krok 8 potřebuje (Zdrojový dokument, Citace), podle datového modelu v PRD.
- **Odpověď:** model smí použít jen nalezené úryvky (F-73). Každé tvrzení má citaci s adresou, názvem a datem (F-74). Odpověď se ověří proti úryvkům (F-75) a bez opory se nepoužije, dotaz pak jde zastupitelům (F-76). Prompt je v repozitáři a má číslo verze.
- **Stránka:** po Potvrdit (4.1) se u typu dotaz zavolá nový endpoint pod `/ucho/api` se stejnou ochranou jako dosavadní endpointy (kontrola původu, limit požadavků). Odpověď z prisovice.cz má označení „Odpověď z webu obce“, z karet „Podle webu Nezávislých pro Příšovice“. U každé odpovědi je upozornění, že nejde o úřední vyjádření obce. Bez odpovědi stránka řekne, že dotaz převezmou zastupitelé. Fronta správce zatím není, nic se neukládá, a stránka nesmí tvrdit, že dotaz někam odešel. Texty pro uživatele piš spisovnou češtinou.
- **Logy:** jen časy, počty, model a verze promptu, nikdy text dotazu ani odpovědi.
- **Vyhodnocení:** skript pošle schválenou sadu otázek přes celé hledání a vytvoří tabulku k ruční kontrole. Výsledek zapiš do `docs/`.

### D. Nasazení

Nasazuj jen Worker ucha (`npm run deploy`, Worker `prisovicke-ucho`). Do Workeru webu `prisovice-nezavisli` nikdy. Ověř stránku na ostré adrese.

## Co do kroku nepatří

- Fronta a odpověď správce (krok 9), přihlášení (krok 5), ukládání podnětů a odpovědí (4.3, F-77), slučování témat (krok 6).
- Pravidelná aktualizace indexu a hlídání změn zdrojů (F-78).
- Zveřejnění ukázkových otázek. To přijde s veřejným seznamem témat (krok 11).
- Jakákoli úprava webu Nezávislých. Když se ucho a web liší, zapiš to do `docs/oblasti-a-web.md`.

## Kdy se zastavit a zeptat

- Po fázi A a po sadě otázek v B (viz výše).
- Když by krok potřeboval placený plán nebo službu mimo rozhodnutý hosting (Cloudflare).
- Když robots.txt nebo podmínky prisovice.cz stahování nedovolují, nebo je o tom pochyba.
- Když by bylo potřeba změnit rozhodnutí v `CLAUDE.md` nebo rozšířit MVP.
- Když nejde rozhodnout, jestli je karta webu Nezávislých publikovaná.

## Kdy je hotovo

Krok 8 je hotový, až platí všechno níže. Co neplatí, se v závěrečné zprávě vyjmenuje a krok se nevydává za hotový.

1. Rozpis kroku 8 je schválený Tomášem a zapsaný v `docs/plan-mvp.md`.
2. Sada typových otázek je schválená Tomášem a uložená v repozitáři: aspoň 20 otázek, každá s očekávaným výsledkem.
3. Index obsahuje celý prisovice.cz (stránky, aktuality, PDF s textem) a publikované karty projektů. Počty dokumentů a úseků jsou zapsané. Co se do indexu nedostalo (např. skeny bez OCR), je zapsané jako známé omezení.
4. Na schválené sadě, ručně zkontrolováno a zapsáno v `docs/`:
   - žádná zobrazená odpověď nemá tvrzení bez opory v citovaném úryvku,
   - každá zobrazená odpověď má citaci s adresou, názvem a datem, správné označení zdroje a upozornění, že nejde o úřední vyjádření obce,
   - aspoň 90 % otázek bez odpovědi ve zdrojích skončí u zastupitelů,
   - aspoň 70 % otázek s odpovědí ve zdrojích dostane správnou odpověď (práh může Tomáš při schválení rozpisu změnit),
   - žádný návrh, stížnost ani pochvala nejde do hledání,
   - aspoň 90 % odpovědí přijde do 10 s od potvrzení (PRD, Rychlost).
5. `npm test` i `npm run check` projdou bez chyb. Testy s falešnou AI pokryjí: odpověď s citací, žádný úryvek (zastupitelům), tvrzení bez opory (zastupitelům), návrh bez hledání, upozornění v odpovědi a log bez textu dotazu.
6. Na nezavisli-prisovice.cz/ucho prošel napsaný dotaz v Edge a v Opeře při šířce telefonu (360 × 740): odpověď s citací i odpověď „zastupitelům“, bez chyb v konzoli a bez vodorovného posunu. Opera na Androidu je v `docs/test-zarizeni.md` zapsaná jako ověřená, nebo jako čekající.
7. `docs/plan-mvp.md` (stav), `docs/test-zarizeni.md` a `CLAUDE.md` (jen při změně rozhodnutí) odpovídají skutečnosti.
8. Vše je commitnuté ve větvi této session. Push, PR a sloučení jen na pokyn Tomáše.

## Pravidla, která platí vždy

- Ucho má vlastní Worker. Nikdy nenasazuj do Workeru webu `prisovice-nezavisli`.
- `WEB_Prisovice` a `C:\Users\tomas\OneDrive\06_Podcast Language Learning App\docs\history\lessons-learned.md` jsou jen ke čtení.
- Token ani klíč nikdy do repozitáře ani do výpisu. Nasazuj přes přihlášení Wranglerem.
- Bez bezplatných modelů z OpenRouteru, bez AI Gateway a bez serverové fronty.
- Automatická odpověď smí obsahovat jen informace z nalezených úryvků, nikdy si nic nedomýšlí.
- Nikdy netvrď, že se kandidátka jmenuje Nezávislí pro Příšovice (na lístku Rozumná cesta, č. 2).
- Osobní údaje v minimu, audio se neukládá.
- Nerozšiřuj MVP bez souhlasu Tomáše.
- Commity končí řádkem `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Odkazuj v nich na ID požadavků (F-70 až F-79).

## Nástroje k testování

Na počítači jsou Edge (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`) a Opera (`C:\Users\tomas\AppData\Local\Programs\Opera\opera.exe`). Skripty v prohlížeči se dají psát s `playwright-core` a těmito prohlížeči. Dosavadní scénáře podání v repozitáři nejsou, ležely v dočasné složce předchozí session.
