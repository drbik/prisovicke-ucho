# Testy na zařízeních

*Stav k 6. 11. 2026. Krok 2.6 a testy 1 a 2 z [plánu MVP](plan-mvp.md#další-fáze-testování). Adresa: https://nezavisli-prisovice.cz/ucho, rám: https://nezavisli-prisovice.cz/ucho/test-ramu.*

**Stav: Windows je ověřený, Opera na Androidu chybí.** Hlavní riziko plánu (WebM z telefonu) je proto potvrzené jen nepřímo: stejný formát z Chromia na počítači Whisper přijal. Na telefonu to zatím nikdo nezkusil.

## Jak se ve Windows testovalo

Edge 158 a Opera 138 (Chromium 154) běžely bez okna a řídil je skript. Místo skutečného mikrofonu dostaly umělé zařízení, které přehrávalo českou řeč z převodu textu na hlas (16 s a 174 s). Prohlížeč přitom nahrával přes MediaRecorder, přes CSP a hlavičky ostré stránky a posílal nahrávku do skutečného Whisperu.

Co to neověří: skutečný mikrofon, dialog povolení mikrofonu, čtečku obrazovky a mluvčího v reálném prostředí. Syntetický hlas je čistší než člověk na ulici, takže kvalita přepisu níže je horní odhad.

## Test 1: Whisper a nahrávky

| Prohlížeč | Délka | Velikost | Formát | Přepis trval | Výsledek |
|---|---|---|---|---|---|
| Edge, Windows | 0:18 | 90 kB | `audio/webm;codecs=opus` | 2,3 s | Přepsáno celé |
| Opera, Windows | 0:20 | 95 kB | `audio/webm;codecs=opus` | 1,8 s | Přepsáno celé |
| Edge, Windows | 2:59 | 920 kB | `audio/webm;codecs=opus` | 21,6 s | Přepsáno celé, až do poslední věty |
| Opera, Windows | 2:59 | 922 kB | `audio/webm;codecs=opus` | 15,1 s | Přepsáno celé, až do poslední věty |
| Opera, Android | | | | | **Čeká na test** |

Zjištění:

- **Whisper přijímá WebM z Chromia.** `ffprobe` u nahrávky hlásí `duration=N/A`, hlavička tedy délku opravdu nemá, a modelu to nevadí. Délku určil správně (2:59). Přechod na WAV (krok 2.4) není potřeba.
- **Tři minuty zvládne vcelku.** Dělení nahrávky (krok 3.1) není potřeba.
- **Velikost:** tři minuty při 48 kb/s mají méně než 1 MB, limit serveru je 8 MB.
- **Rychlost:** obvykle zhruba desetina délky nahrávky. Jeden pokus s 18 s trval 5,6 s, doba tedy kolísá.
- **Čeština a místní názvy:** bez nápovědy `initial_prompt` je text velmi dobrý, chyby jsou hlavně u názvů a malých slov. Vlastní jména často ztrácejí velké písmeno.

| Řečeno | Přepsáno |
|---|---|
| Záhumení | záhumení, jednou „záhu mení“ |
| Příšovka | příšovka |
| Písečákům | písečákům |
| Sokolovna, Svijany, Příšovice | správně |
| u návsi | u návsy |
| kdo koryto pravidelně kontroluje | kdokoliv to pravidelně kontroluje |
| pro ni | pro ní |
| vyjíždět | výjíždět |

Záměna „kdo koryto“ za „kdokoliv to“ mění smysl věty. Přesně to má odhalit autor při kontrole textu v kroku 4. Otázky Whisper často zakončí tečkou, opravit to může AI úprava v kroku 3.2.

## Test 2: mikrofon v rámu

| Prohlížeč | Výsledek |
|---|---|
| Edge, Windows | Funguje, nahrávka se přepsala |
| Opera, Windows | Funguje, nahrávka se přepsala |
| Opera, Android | **Čeká na test** |

Testovací stránku obsluhuje Worker ucha, má tedy `microphone=(self)`. Na stránkách webu by to neplatilo, dokud web posílá `microphone=()` (viz [Oblasti a web](oblasti-a-web.md#rozhodnuto-6-11-2026-ucho-na-nezavisli-prisovicecz-ucho)).

## Scénáře v prohlížeči

Skript prošel 12 scénářů v Edge při běžné velikosti okna a v Opeře při velikosti telefonu (360 × 740). Odpovědi serveru byly podvržené, Whisper se nevolal. Vše prošlo.

| Scénář | Edge, Windows | Opera, Windows | Opera, Android |
|---|---|---|---|
| Jen klávesnice: Tab, Enter, Escape zruší, fokus se vrátí | OK | OK | nepoužije se |
| Povolení mikrofonu | OK (umělé) | OK (umělé) | **Čeká** |
| Zákaz mikrofonu ukáže textové pole s vysvětlením | OK | OK | **Čeká** |
| Upozornění ve 2:30 a konec ve 3:00 | OK | OK | **Čeká** |
| Nahrávka kratší než 2 s se neodešle | OK | OK | **Čeká** |
| Zrušit při nahrávání nic neodešle | OK | OK | **Čeká** |
| Zrušit při čekání na přepis | OK | OK | **Čeká** |
| Výpadek AI: Zkusit znovu pošle stejnou nahrávku | OK | OK | **Čeká** |
| Výpadek AI: přechod na text | OK | OK | **Čeká** |
| Výpadek sítě nechá napsaný text v poli | OK | OK | **Čeká** |
| Skrytí stránky ukončí nahrávání a kus se odešle | OK (simulováno) | OK (simulováno) | **Čeká**, skutečné zamčení telefonu |
| Bez vodorovného posuvníku | OK | OK (360 × 740) | **Čeká** |
| Bluetooth sluchátka | nezkoušeno | nezkoušeno | **Čeká** |
| Příchozí hovor | nepoužije se | nepoužije se | **Čeká** |
| Pomalá síť | nezkoušeno | nezkoušeno | **Čeká** |

## Co zbývá: Opera na Androidu

Stačí telefon a asi 15 minut. Po každém pokusu rozbalte na stránce „Technické údaje pro test“ a opište formát, velikost a dobu přepisu.

1. Na https://nezavisli-prisovice.cz/ucho namluvit krátký vzkaz s místními názvy.
2. Namluvit vzkaz na celé 3 minuty: upozornění ve 2:30, samo skončí ve 3:00.
3. Na https://nezavisli-prisovice.cz/ucho/test-ramu namluvit vzkaz v rámu. Na výsledku závisí krok 12.
4. Během nahrávání zamknout telefon. Po odemčení se má ukázat přepis nahraného kusu.
5. Zakázat mikrofon v nastavení stránky: má se ukázat textové pole.
6. Podle chuti: Bluetooth sluchátka, příchozí hovor, pomalá síť.

## Na ostré adrese ověřeno

- Route `nezavisli-prisovice.cz/ucho` a `/ucho/*` dostaly přednost před Custom Domain webu. Hlavní stránka webu, `/favicon.svg` a `/uchopit` se po nasazení nezměnily.
- `/ucho` posílá vlastní CSP a `microphone=(self)`, web dál `microphone=()`. HTML neobsahuje vložené skripty ani styly a prohlížeč nehlásí porušení CSP.
- Požadavek z cizího původu nebo bez hlavičky `Origin` server odmítne (403).
- Do Workers Logs jdou časy a velikosti, ne audio ani text vzkazu (viz níže).
- Limit požadavků je jen přibližný, viz [Otevřené body](#otevřené-body).

## Otevřené body

- **Limit požadavků nestačí jako tvrdá ochrana.** Nastavený limit je 6 požadavků za minutu na IP. Ve skutečnosti z 52 rychlých požadavků za sebou prošlo 49, protože Rate Limiting binding je podle dokumentace Cloudflare přibližný a čítače synchronizuje na pozadí. Přepis 3 minut stojí 0,15 centu, škoda je tedy malá, ale endpoint je do kroku 5 veřejný bez přihlášení. Pevnější ochranu dá až přihlášení, případně pravidlo WAF na zóně, to ale patří do nastavení domény.
- **F-05 pro Safari a Firefox** se v MVP neověřuje, viz rozhodnutí z 2. 11. 2026.
