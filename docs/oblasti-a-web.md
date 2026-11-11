# Oblasti dotazů a web nezavisli-prisovice.cz

*Stav k 6. 11. 2026. Zdroj: projekt webu ve složce WEB_Prisovice (jen ke čtení), poslední commit webu z 11. 10. 2026.*

Ucho je nadstavba webu nezavisli-prisovice.cz. Web je jedna stránka s časovou osou: uskutečněné projekty, milník voleb 9. a 10. října 2026 a budoucí plány. Obsah vznikl pro volební kampaň. Po volbách web 11. 10. 2026 přidal povolební překryv s výsledky a dalším postupem. Karty projektů se od 1. 10. 2026 nezměnily. Oblasti před spuštěním přesto znovu porovnej s webem.

## Znalosti v projektu webu

Cesty jsou relativní ke složce `WEB_Prisovice`. Projekt webu má vlastní pravidla: `AGENTS.md` je závazný, `README.md` je rozcestník a `CLAUDE.md` jen odkazuje na oba. V tom, co patří webu, mají jeho zdroje přednost před tímto repozitářem.

| Soubor | Co obsahuje | Co z toho plyne pro ucho |
|---|---|---|
| `AGENTS.md` | Postup úkolu, zdroje pravdy, ověření a nasazení webu | Řídí každou úpravu webu, i grafiku ucha a hlavičky pro F-09 |
| `README.md` | Struktura příběhu, galerie, analytika, nasazení | První čtení před prací s webem |
| `src/content/akce-prisovice-timeline.md` | Faktický master: ověřená fakta, částky, dotace, zdroje, TBD, neveřejné záměry, povolební informace | Kontrola faktů o projektech a o provozovateli. Neveřejné a neověřené části se do ucha nepřebírají |
| `src/content/projects/*.md` | Publikované karty: `kind` (minulost, milník, budoucnost, závěr), stabilní `slug`, veřejný text, mapa | Oblasti MVP (pět karet `kind: future`) a jejich klíč `slug` |
| `SIMPLE_COPY_PROMPT.md` | Politický hlas veřejných textů karet | Pro odpovědi ucha neplatí, ty jsou věcné a s citací |
| `DESIGN_SPEC.md` | Produktová a vizuální specifikace webu | Vzhled ucha, viz níže |
| `src/components/ElectionOverlay.astro` | Povolební překryv v nativním `<dialog>` | Vzor pro rozhraní, které se otevře po kliknutí na ucho |
| `src/lib/security-headers.ts`, `public/_headers`, `src/middleware.ts` | Bezpečnostní hlavičky a CSP | Dnes brání vložení ucha, viz Co brání vložení aplikace |
| `SECURITY_MAINTENANCE.md` | Nastavení Cloudflare, hlavičky, ochrana analytiky, DNS pro e-mail | Vzor ochrany endpointu a příprava e-mailu |

### Fakta, která ucho přebírá

- **Název provozovatele:** na webu „Nezávislí pro Příšovice“, na hlasovacím lístku „Rozumná cesta“, kandidátka č. 2. Web nesmí tvrdit, že se kandidátka jmenuje Nezávislí pro Příšovice. Totéž platí pro ucho. Zdroj: timeline, upřesnění z 1. 10. 2026.
- **Výsledek voleb 2026:** Rozumná cesta 3 659 hlasů (56,30 %) a 9 mandátů, Spolek Hasičů a Občanů Příšovic 2 840 hlasů (43,70 %) a 6 mandátů. Přišlo 510 z 1 020 voličů. Zdroj: timeline, oddíl Povolební informace, data ČSÚ.
- **Oblasti:** ucho páruje oblast s kartou stabilním `slug`. Název karty se může změnit, slug zůstává.
- **Neveřejné záměry:** timeline vede i záměry, které se na web nemají dostat, a údaje označené TBD. Ucho z timeline nebere nic, co není v publikované kartě.

### Vzhled

Barvy jsou proměnné v `src/pages/index.astro`: `--ink` #18332e (text a tmavé plochy), `--ink-soft` #536861, `--past` #236b60 (zelená), `--future` #2f6ca6 (modrá budoucích plánů) a `--accent` #d35b3f (cihlový akcent). Nadpisy jsou patkové (Georgia), text bezpatkový (Inter nebo systémové písmo). Podle `DESIGN_SPEC.md` mají plochy jen mírné zaoblení 6–10 px, bez silných rámečků a stínů, a kontrast běžného textu je nejméně 4,5 : 1.

**Rozdíl od webu (rozhodl Tomáš 10. 11. 2026):** text vzkazu má v uchu neproporcionální písmo Roboto Mono, které připomíná psací stroj. Týká se psaného vzkazu, upraveného textu, původního přepisu a potvrzeného vzkazu. Nadpisy, popisky, tlačítka a odpovědi zůstávají v písmech webu. Písmo je uložené u ucha ve složce `src/fonty/` i s licencí SIL OFL 1.1, protože CSP ucha povoluje písma jen z vlastní domény.

## Návrh oblastí pro MVP

Podle F-30 vychází oblasti z aktuálních a budoucích projektů na webu, plus oblast Ostatní. **Rozhodnuto 1. 11. 2026:**

- pět budoucích projektů níže,
- Ostatní.

Témata k prověření se mohou přidat později jako další oblasti. Oblasti spravuje administrátor.

## Budoucí projekty (5)

| Projekt | Slug na webu | Období | Stav na webu |
|---|---|---|---|
| Patnáct dostupných bytů | `dostupne-bydleni` | 2026–2027, plán | Připravujeme výstavbu |
| Bezpečně pěšky i na kole | `bezpecne-trasy` | od roku 2026, plán | V přípravě |
| Vodovod a kanalizace na Záhumení | `kanalizace-zahumeni` | 2027, plán | Připravujeme realizaci |
| Příjemnější centrum obce | `verejna-prostranstvi` | okna a vitráže kostela 2027, další úpravy po etapách | Projektová příprava |
| Elektřina zůstane v obci (komunitní energetika) | `komunitni-energetika` | od roku 2026, plán | Připravujeme sdílení |

## Témata k prověření (7)

Závěr webu („Záleží na vás“) jmenuje témata, o kterých uskupení přemýšlí. Nejsou to projekty, ale lidé se na ně nejspíš budou ptát.

- **Otevřené posezení v Sokolovně** – obecní hospůdka v přísálí dva až tři dny v týdnu. Nejdřív je potřeba najít provozovatele.
- **Pronájem obecních prostor** – jednodušší pronájem hřiště, parku nebo Sokolovny s veřejnými pravidly.
- **Mobilní signál** – prověřit kvalitu signálu všech operátorů a jednat o zlepšení.
- **Hluk z dálnice** – měření hluku jako podklad pro jednání s ŘSD o protihlukové stěně.
- **Parkování na sídlišti** – zmapovat stav a hledat další místa.
- **Prostor u garáží** – zjistit zájem a podmínky využití prostoru za Příšovkou, třeba pro další garáže, pokud to dovolí záplavové území.
- **Bezpečnost na Záhumení** – bezpečnější pohyb pěších a rodičů s kočárky, mimo jiné taktickým urbanismem.

## Hotové projekty (17)

Nejsou to aktivní oblasti. Hodí se jako podklad pro odpovědi a pro dotazy na to, co už obec udělala.

| Projekt | Slug na webu | Období |
|---|---|---|
| Zateplení a fotovoltaika na obecní prodejně | `zatepleni-prodejny` | dokončeno 2017 |
| Nové LED osvětlení po celé obci | `verejne-osvetleni` | v několika etapách |
| Revitalizace Příšovky | `prisovka-ii` | 2017–2019 |
| Cyklostezka do Přepeř | `cyklostezka-prepere` | 2016–2020 |
| II/610: nová silnice i zastávky | `silnice-ii-610` | 2019–2020 |
| Péče o památky (socha sv. Agáty, Formanův kříž, Bičíkův statek) | `pece-o-pamatky` | 2019–2023 |
| Do Svijan pěšky i na kole | `bezpecna-cesta-svijany` | dokončeno 2020 |
| Nové kondenzační kotle ve škole | `kotelna-zs` | 2020 |
| K zóně Sever pěšky i na kole | `stezka-sever` | 2021–2022 |
| Příšovická náves | `prisovicka-naves` | etapy 2022 a 2024 |
| Oprava Sokolovny | `sokolovna` | 2015–2024 |
| Nové hřiště u školy | `hriste-zs` | 2023–2025 |
| Z centra až k Písečákům (greenway) | `greenway-pisecaky` | 2023–2025 |
| Zázemí pro hasiče (zbrojnice) | `zbrojnice` | 2024–2025 |
| Opravy místních cest | `komunikace-zavodi` | v několika etapách |
| Zubařská péče zůstala v obci | `zubni-ordinace` | neuvedeno |
| Elektřina ze slunce pro školu | `fve-zs` | dokončeno 2026 |

## Web po technické stránce

Důležité pro hosting a pro vložení aplikace do webu (F-09).

- Astro 7 s adaptérem `@astrojs/cloudflare`. Web běží jako Cloudflare Worker na vlastní doméně nezavisli-prisovice.cz, statické soubory jsou ve Workers Assets.
- Návštěvnost měří vlastní analytika v Analytics Engine. Její přehled chrání Cloudflare Access.
- Hlavičky se nastavují v `src/lib/security-headers.ts` a musí souhlasit s `public/_headers`, protože statické soubory middleware obchází. Shodu hlídá `npm run test:security`.
- Skripty se nevkládají do stránky (`vite.build.assetsInlineLimit: 0`), takže CSP vystačí se `script-src 'self'`. Ucho to dělá stejně (`docs/plan-mvp.md`, krok 2).
- Analytický endpoint je vzor ochrany pro endpoint nahrávky: Rate Limiting binding (120 požadavků za 60 s na hash IP), limit se kontroluje před čtením těla a tělo se čte jako stream s pevným limitem velikosti.
- Doména dnes poštu odmítá (SPF `-all`, DMARC `reject`). Než ucho začne posílat e-maily (Později), je potřeba upravit DNS podle `SECURITY_MAINTENANCE.md`.
- Web se nasazuje jen na Worker `prisovice-nezavisli` příkazem `npm run deploy` a jen na výslovný pokyn. Ucho má vlastní Worker a do Workeru webu se nenasazuje.

### Co brání vložení aplikace

Současné hlavičky webu vložení aplikace nedovolí:

| Hlavička | Současná hodnota | Důsledek |
|---|---|---|
| `Permissions-Policy` | `microphone=()` | Mikrofon je zakázaný na webu i ve všech vložených rámech. |
| `Content-Security-Policy` | `script-src 'self'`, `connect-src 'self'`, `frame-src 'self'` | Skript ani rám z jiné domény se nenačte a nespojí se s API. |

Možnosti:

1. **Rám s aplikací na vlastní doméně.** Web povolí doménu aplikace ve `frame-src` a mikrofon přes `microphone=(self "https://<doména aplikace>")`. Rám dostane `allow="microphone"`. Aplikace ve svém CSP povolí `frame-ancestors https://nezavisli-prisovice.cz`.
2. **Skript, který vykreslí rozhraní přímo na webu.** Web povolí doménu aplikace ve `script-src` a `connect-src` a mikrofon pro sebe: `microphone=(self)`.
3. **Odkaz na samostatnou stránku aplikace.** Hlavičky webu se měnit nemusí, ale člověk web opustí. To F-09 nechce.

Každá varianta znamená úpravu webu. Ta se dělá v jeho vlastním projektu, ne tady.

### Rozhodnuto 6. 11. 2026: ucho na nezavisli-prisovice.cz/ucho

Ucho poběží na doméně webu pod cestou `/ucho` a testuje se rovnou tam. Co z toho plyne:

- **Stejný původ.** Rám i skript z `/ucho` projdou dnešním `frame-src 'self'` a `script-src 'self'`, CSP webu se kvůli tomu měnit nemusí.
- **Mikrofon na stránce `/ucho`.** Když stránku obslouží Worker ucha, nastaví si vlastní hlavičky a mikrofon si povolí (`microphone=(self)`). Hlavičky webu platí jen pro jeho odpovědi.
- **Mikrofon v rámu na stránce webu.** Stránky webu posílají `microphone=()`, takže rám s uchem by mikrofon nedostal. Otevření ucha v rámu by vyžadovalo úpravu hlaviček v projektu webu.
- **Směrování je ověřené (6. 11. 2026).** Worker webu obsluhuje celou doménu jako Custom Domain, Worker ucha má vlastní route. Podle [dokumentace Cloudflare](https://developers.cloudflare.com/workers/configuration/routing/routes/) má route na stejném hostname přednost a na ostré adrese to platí. Úprava webu ani service binding nejsou potřeba. Ucho má dva přesné vzory, `/ucho` a `/ucho/*`, místo `/ucho*`, aby nezachytilo cizí cesty.
