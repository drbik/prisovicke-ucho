# Feed vzkazů vedle ucha

*Zadal Tomáš 13. 11. 2026 (krok 8.17 v [plan-mvp.md](plan-mvp.md)). Je to rozšíření MVP pro zkušební provoz.*

## Co Tomáš chtěl

- Ukládat a ukazovat dotazy, hlavně ty nezodpovězené, v seznamu vedle ucha.
- Feed udělat mnohem jednodušší: minimalistický seznam s filtry na začátku. Filtrovat podle stavu (zodpovězené, nebo čekají) a podle typu (dotaz, návrh, stížnost, pochvala).
- Když se někdo zeptá na něco, co už má odpověď, má být vidět, že odpověď už je, a jít na ni skočit.

## Rozhodnutí (13. 11. 2026, odpovědi Tomáše)

| Otázka | Rozhodnutí |
|---|---|
| Kdy se vzkaz ve feedu ukáže | **Hned, bez schválení.** Tomáš věděl, že moderace ani zakrývání osobních údajů v MVP nejsou. |
| Co se ukládá | **Všechny potvrzené vzkazy:** zodpovězené i nezodpovězené dotazy, návrhy, stížnosti a pochvaly. |
| Stavy ve filtru | **Dva:** Zodpovězené a Čekají na odpověď. Čeká vše, na co ucho odpověď nenašlo, a návrhy, stížnosti a pochvaly. |
| Ukázky od týmu | **Zůstávají** ve feedu se štítkem Ukázka, za skutečnými vzkazy. |

## Jak to funguje

**Uložení.**

1. Autor namluví nebo napíše vzkaz a AI ho upraví. Server návrh úpravy podepíše (HMAC, klíč `KLIC_PODPISU`).
2. Autor vzkaz zkontroluje a potvrdí tlačítkem **Potvrdit a zveřejnit**. Nad tlačítkem je upozornění: „Po potvrzení se vzkaz hned zveřejní ve feedu vedle ucha, bez vašeho jména. Nepište do něj jména, adresy ani jiné osobní údaje.“
3. Stránka pošle potvrzený vzkaz s podepsaným návrhem na `POST /ucho/api/dotaz`.
4. Server ověří podpis a vzkaz uloží do tabulky `vzkaz` v D1. Ověřuje i text postavy, pokud ho autor viděl.
5. U dotazu server současně hledá odpověď a výsledek k vzkazu zapíše.

Podle pravidla F-14 se před potvrzením nic neukládá. Uložit jde jen vzkaz, který prošel AI úpravou na serveru. To brzdí zneužití, protože každý vzkaz stojí jedno volání AI a podléhá limitu 6 požadavků za minutu.

**Co se ukládá.** Potvrzené spisovné znění, název, typ, oblast a styl. K tomu text postavy, stav, odpověď z webu a odkaz na podobný dotaz. Neveřejně se ukládá i surový přepis nebo napsaný text a návrh AI úpravy (zásada „Ukládej surový přepis i upravený text“).

Neukládá se jméno, IP adresa ani nahrávka. U dotazu se ukládá embedding textu (bge-m3) pro hledání opakovaných dotazů.

Opakované potvrzení téhož návrhu (Zpět k úpravám, Hledat znovu) přepíše stejný vzkaz, podle podpisu návrhu.

**Feed.**
- Jeden jednoduchý seznam. Nahoře je hledání a dvě řady filtrů:
  - stav: Vše, Zodpovězené, Čekají na odpověď, s počty;
  - typ: Všechny typy, Dotazy, Návrhy, Stížnosti, Pochvaly.
- Položka ukazuje název a jeden řádek: barevnou tečku stavu, stav, typ a datum, nebo štítek Ukázka. Když autor poslal vzkaz postavou, je na řádku i její jméno.
- Po rozkliknutí položka ukáže:
  - text vzkazu;
  - text postavy (rozbalovací „Ve stylu: Marvin“);
  - odkaz na podobný zodpovězený dotaz;
  - odpověď se zdroji, nebo poznámku, že vzkaz čeká.
- Uložené vzkazy jsou od nejnovějšího, za nimi jsou ukázky. Stránka jich načte nejvýš 200.
- Nový vzkaz se po potvrzení objeví na začátku feedu hned, bez obnovení stránky.

**Opakovaný dotaz.**
- Server porovná embedding nového dotazu se zodpovězenými uloženými dotazy a se zodpovězenými ukázkami. Embeddingy ukázek se spočítají při prvním hledání a uloží do tabulky `vektor_ukazky`.
- Když je kosinová podobnost aspoň **0,85**, panel ještě během hledání ukáže „Na podobný dotaz už je odpověď: …“ s tlačítkem **Zobrazit odpověď**.
- Tlačítko zavře panel, ve feedu zruší filtry, odpověď rozbalí a krátce zvýrazní.
- Nový dotaz pak ve feedu nese odkaz „Podobný dotaz už má odpověď“.

**Nastavení prahu (13. 11. 2026, bge-m3, 12 dvojic):**

| Dvojice | Podobnost |
|---|---|
| stejná otázka jinými slovy (lékárna, sál Sokolovny, psi v Písečácích, úvěr na byty, cyklostezka) | 0,88 až 0,94 |
| „starosta a místostarosta“ proti „nový starosta“ | 0,58 |
| různé otázky na podobné téma (sál proti tělocvičně, psi proti koupališti, úvěr proti tomu, pro koho jsou byty) | 0,54 až 0,79 |

Práh 0,85 spojí stejné otázky a nejbližší různou dvojici (0,79) nechá být. Otázka na dvě věci proti otázce na jednu z nich se nespojí, to je v pořádku.

## Moderace

Vzkazy se zveřejňují bez schválení, takže tým potřebuje rychle skrýt nevhodný vzkaz. Jde to přes přihlášení Wranglerem, bez tokenu v souborech:

```bash
npx tsx nastroje/vzkazy.ts
```

Bez parametru vypíše posledních 30 vzkazů. Další příkazy:

- `npx tsx nastroje/vzkazy.ts ukazat ID` ukáže celý vzkaz včetně surového přepisu;
- `npx tsx nastroje/vzkazy.ts skryt ID` vzkaz z feedu skryje, v databázi zůstane;
- `npx tsx nastroje/vzkazy.ts vratit ID` skrytý vzkaz vrátí do feedu.

## Rizika, o kterých Tomáš ví

- Ve feedu se může objevit jméno, adresa, nadávka nebo spam. Upozornění před potvrzením a limit požadavků to jen zmírní. Proti tomu je skrytí příkazem.
- Kdo bude správce osobních údajů podle GDPR, je pořád otevřená otázka (`CLAUDE.md`). Uložené texty vzkazů jsou osobní údaje, pokud je v nich autor uvede.
- Přihlášení před nahráváním (rozhodnutí z 2. 11. 2026) zatím není. Vzkaz se ukládá bez přihlášení.

## Lokální vývoj

Lokální server ukládá vzkazy jen do paměti (`vytvorPametoveUloziste`), protože D1 je i lokálně vzdálená a zkušební vzkazy by šly do ostrého feedu. Po restartu serveru zmizí.

## Technika

- Tabulky: `migrations/0002_vzkazy.sql` (`vzkaz`, `vektor_ukazky`).
- Kód:
  - úložiště, feed a podobnost v `src/lib/vzkazy/`;
  - podpis v `src/lib/bezpecnost/podpis.ts`;
  - vazby pro stránku i API v `src/lib/prostredi.ts`;
  - feed v `src/components/Temata.astro` a `src/skripty/temata.ts`.
- Panel a feed si předávají vzkaz událostmi `ucho:novy-vzkaz` a `ucho:ukazat-tema`.
- Testy: `tests/vzkazy.test.ts`.
