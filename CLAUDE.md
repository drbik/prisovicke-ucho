# Příšovické ucho (prisovicke-ucho)

Webová aplikace, kde občané Příšovic namluví návrh nebo dotaz. AI ho přepíše do spisovné češtiny a přiřadí k existujícímu tématu. Pak hledá odpověď na webu obce, a když ji nenajde, odpoví zastupitel. Nejde o chatbota: AI s uživatelem nevede dialog, jen zpracuje jeden vzkaz.

Provozovatel je tým Nezávislí pro Příšovice. Na hlasovacím lístku voleb 2026 kandidoval jako Rozumná cesta (kandidátka č. 2) a získal 9 z 15 mandátů. Aplikace není úředním kanálem obce.

Ucho je nadstavba webu nezavisli-prisovice.cz. V tom, co patří webu, platí zdroje jeho projektu (oddíl Soulad s webem Nezávislých).

Vstupem bude grafika ucha na webu nezavisli-prisovice.cz. Po kliknutí se otevře rozhraní pro dotaz, přihlášení a odpovědi, aniž by člověk opustil web. Aplikaci proto stav tak, aby šla do webu vložit jedním skriptem nebo odkazem (F-09).

## Zdroje mimo repozitář: jen ke čtení

Na počítači Tomáše (Windows) jsou dvě složky, ze kterých se smí jen číst. **Nic v nich neměň, nevytvářej ani nemaž soubory a nespouštěj v nich příkazy, které něco zapisují.**

- `C:\Users\tomas\OneDrive\06_CODEX\WEB_Prisovice` – projekt webu nezavisli-prisovice.cz (vede se v Codexu). Odsud se berou projekty (oblasti dotazů), fakta o práci obce, vzhled a pravidla webu. Závazná pravidla webu jsou v jeho `AGENTS.md`, rozcestník v `README.md`. Co z kterého souboru plyne pro ucho, je v `docs/oblasti-a-web.md`. Úpravy webu, včetně grafiky ucha, se dělají v jeho vlastním projektu, ne tady.
- `C:\Users\tomas\OneDrive\06_Podcast Language Learning App\docs\history\lessons-learned.md` – zkušenosti s hlasovými modely (přepis řeči a TTS) z jiného projektu. Použij je při výběru modelů.

Cloudová session k nim nemá přístup. V lokální session je zpřístupni jen ke čtení, např. `/add-dir`.

## Dokumenty

- `docs/PRD.md` – požadavky, verze 0.9 (export). Živá verze je v Claude Docs: https://claude.ai/artifact/1uqzdxoYxj8jR45McMdo3Z. Při rozporu platí živá verze.
- `docs/research-hlasove-podnety.md` – rešerše hotových řešení, hostingu a všech zdrojů.
- `docs/oblasti-a-web.md` – projekty a témata z webu nezavisli-prisovice.cz, mapa znalostí v projektu webu, oblasti a technika webu pro F-09.
- `docs/hlasove-modely.md` – zjištění o hlasových modelech z jiného projektu a co z nich plyne pro výběr modelu přepisu.
- `docs/plan-mvp.md` – MVP rozdělené na postupné kroky, rozpis kroků 1 až 3 a pořadí testů.

Požadavky mají ID (F-01 až F-83) a prioritu MVP / Později / Zvážit. V commitech a kódu na ně odkazuj.

## Soulad s webem Nezávislých

Cesty jsou relativní ke složce `WEB_Prisovice`. Podrobná mapa je v `docs/oblasti-a-web.md`.

- **Název:** na webu „Nezávislí pro Příšovice“, na hlasovacím lístku „Rozumná cesta“, kandidátka č. 2. Nikdy netvrď, že se kandidátka jmenuje Nezávislí pro Příšovice. Zdroj: `src/content/akce-prisovice-timeline.md`, upřesnění z 1. 10. 2026.
- **Fakta o projektech:** faktický master je `src/content/akce-prisovice-timeline.md`, publikované karty jsou v `src/content/projects/`. Timeline obsahuje i neveřejné záměry a neověřené údaje (TBD), proto do ucha přebírej jen to, co je v publikované kartě.
- **Oblasti:** oblast se s kartou projektu páruje stabilním `slug` (např. `dostupne-bydleni`). Název karty se může změnit, slug ne.
- **Vzhled:** barvy a písma podle webu (`DESIGN_SPEC.md`, styly v `src/pages/index.astro`).
- **Hlas textů:** `SIMPLE_COPY_PROMPT.md` je politický hlas karet webu. Odpovědi ucha jsou věcné, s citací a upozorněním, že nejde o úřední vyjádření obce.
- **Hlavičky:** `src/lib/security-headers.ts` a `public/_headers` musí souhlasit, hlídá to `npm run test:security`. Mění se jen v projektu webu.
- **Nasazení:** ucho má vlastní Worker. Do Workeru webu `prisovice-nezavisli` se nikdy nenasazuje. Web se nasazuje jen v jeho projektu a jen na výslovný pokyn.
- Když se ucho a web v něčem, co patří webu, liší, platí web. Rozdíl zapiš do `docs/oblasti-a-web.md`, web neopravuj odsud.

## Rozhodnutí (24. 10. 2026)

- Zdrojem pravdy pro odpovědi je celý obsah webu prisovice.cz včetně PDF. Úřední deska na prisovice.e-obec.cz se nesleduje.
- Odpověď z webu se autorovi ukáže hned, bez schválení. Autor potvrdí „stačí“, nebo se doptá. Doptání je poddotaz ke stejnému tématu.
- Stejné dotazy se slučují do jednoho tématu. O shodě rozhoduje autor: totéž, poddotaz, nebo jiné téma.
- Web se zaindexuje jednou celý, pak se stahují jen změny (výchozí denně, lze týdně). Stahuje se bez spolupráce správce webu.
- Témata a odpovědi jsou veřejné bez přihlášení. Hlasovat smějí ověření občané; v MVP se pobyt neověřuje a hlasuje každý přihlášený.
- Věková hranice je 15 let.
- Oblasti vychází z aktuálních a budoucích projektů na nezavisli-prisovice.cz.
- U každé odpovědi musí být upozornění, že nejde o úřední vyjádření obce.

## Rozhodnutí (1. 11. 2026)

- Hosting je Cloudflare: Workers a Hono, D1, Vectorize, AI Search, Workers AI. Web nezavisli-prisovice.cz běží na stejné platformě.
- Oblasti v MVP: pět budoucích projektů z webu a Ostatní. Témata k prověření se mohou přidat později.
- Datový model MVP má 11 entit z PRD, bez Slovníku (F-11 je Později).
- V MVP se nahrávky neukládají, datový model nemá odkaz na nahrávku. Úložiště slouží jen pro dokumenty obce.

## Rozhodnutí (2. 11. 2026)

- Přihlášení je před nahráváním. Nahrávání bez přihlášení (F-06) zůstává Později.
- Testuje se na Opeře pro Android a na Edge a Opeře ve Windows. Safari na iOS a Firefox se v MVP netestují, F-05 je tak ověřený jen pro prohlížeče na Chromiu.
- Podrobnosti kroku 2 (limit nahrávky, textové pole, pole `vstup` u podnětu) jsou v `docs/plan-mvp.md`.

## Rozhodnutí (6. 11. 2026)

- Před potvrzením autorem se nic neukládá. Server výsledek přepisu a úpravy podepíše a uloží ho až po potvrzení (F-14).
- V MVP bez AI Gateway a bez serverové fronty. Obojí by mohlo uložit audio. Při výpadku AI autor pošle nahrávku znovu z prohlížeče.
- Pro vzkazy občanů se nepoužívají bezplatné modely z OpenRouteru: zaznamenávají vstupy a jsou jen na zkoušku.
- Kandidáti na AI úpravu a prahy pro výběr jsou v `docs/plan-mvp.md` (krok 3).
- Kostra aplikace: Astro 7 s adaptérem pro Cloudflare na stránky, stejně jako web Nezávislých. Hono na API pod `/api`.
- Plánování MVP je uzavřené. Další fáze je testování, pořadí testů je v `docs/plan-mvp.md`.

## MVP (prezentační verze)

1. Grafika ucha na webu nezavisli-prisovice.cz. Po kliknutí rozhraní s mikrofonem a záložním textovým polem.
2. Přihlášení a odpovědi přes Telegram.
3. Přepis řeči, AI úprava do spisovné češtiny, potvrzení textu autorem.
4. Hledání podobných témat: připojit se, poddotaz, nebo nové téma.
5. Odpověď z webu prisovice.cz s odkazem na zdroj; index se aktualizuje ručně.
6. Bez odpovědi ze zdroje převezme dotaz správce.
7. Veřejný seznam témat a odpovědí, hlasování palcem.
8. Jednoduchá administrace: fronta podle skóre a odpověď.

Do MVP nepatří e-mail, GDPR souhlasy a moderace, zakrytí osobních údajů, ověření pobytu ani pravidelný index. Nerozšiřuj MVP bez souhlasu.

## Otevřené otázky

- Vložení do webu (F-09): hlavičky webu dnes zakazují mikrofon i cizí skripty a rámy. Úprava se dělá v projektu webu, varianty jsou v `docs/oblasti-a-web.md`.
- Kdo bude správce osobních údajů podle GDPR.

## Zásady pro kód

- Piš v TypeScriptu pro Cloudflare Workers: Astro 7 na stránky, Hono na API pod `/api`. Logiku drž v modulech, které neznají ani jeden z frameworků. Přístup k databázi, úložišti a AI schovej za vlastní rozhraní, aby šel hosting později vyměnit.
- Automatická odpověď smí obsahovat jen informace z nalezených úryvků. Každé tvrzení má citaci (URL, název, datum). Bez opory ve zdroji jde dotaz ke správci, nikdy si AI nic nedomýšlí.
- Ukládej surový přepis i upravený text.
- Texty pro uživatele piš spisovnou češtinou.
- Osobní údaje sbírej v minimu. V MVP neukládej audio.
