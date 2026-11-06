# Oblasti dotazů a web nezavisli-prisovice.cz

*Stav k 1. 11. 2026. Zdroj: `src/content/projects/` ve složce WEB_Prisovice (jen ke čtení).*

Web je jedna stránka s časovou osou projektů. Obsah vznikl pro volební kampaň a závěr zve k volbám 9. a 10. října 2026. Po volbách se může měnit, proto oblasti před spuštěním znovu porovnej s webem.

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
- Hlavičky se nastavují v `src/lib/security-headers.ts` a musí souhlasit s `public/_headers`, protože statické soubory middleware obchází.

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
