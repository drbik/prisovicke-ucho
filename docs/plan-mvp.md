# Plán MVP po krocích

*Stav k 6. 11. 2026. Kroky vychází z diagramu toku v PRD (sekce Uživatelské scénáře), písmena odkazují na jeho uzly.*

**Plánování je uzavřené (6. 11. 2026).** Rozepsané jsou kroky 1 až 3, další kroky se rozepíšou, až na ně přijde řada. Další fáze je testování, viz [poslední oddíl](#další-fáze-testování).

## Kroky

| # | Krok | V diagramu | Požadavky |
|---|---|---|---|
| 1 | Základ: kostra v Astru a Hono, rozhraní k databázi, úložišti a AI, datový model, oblasti | – | F-30, Datový model |
| 2 | Namluvení: mikrofon a záložní textové pole | A | F-01, F-02, F-04, F-05 |
| 3 | Přepis a AI úprava: text, název, oblast a typ | B | F-10, F-12, F-13 |
| 4 | Potvrzení a oprava textu autorem, uložení surového i upraveného textu | C, D | F-14, F-15 |
| 5 | Přihlášení přes Telegram | chybí | Přihlášení a kontakt |
| 6 | Hledání podobných témat a rozhodnutí autora: totéž, poddotaz, nové | E, F, G, H | F-33 až F-36 |
| 7 | Ukázání existující odpovědi | I, K | F-37 |
| 8 | Index webu prisovice.cz a odpověď s citací | J, L, M | F-70 až F-77, F-79 |
| 9 | Fronta a odpověď správce | N, O | F-50 až F-52 |
| 10 | Doručení přes Telegram, autor potvrdí „stačí“ nebo se doptá | P, Q, R | F-53, F-81 |
| 11 | Veřejný seznam témat a hlasování palcem | chybí | F-40, F-42 až F-44 |
| 12 | Vložení do webu přes grafiku ucha | chybí | F-09 |

Diagram v PRD nezachycuje přihlášení, veřejný seznam s hlasováním ani vstup přes ucho. Kroky 5, 11 a 12 je doplňují.

**Doporučené pořadí stavby:** největší riziko nesou kroky 3 a 8, tedy kvalita přepisu a odpovědí z webu. Proto nejdřív propojit textové pole, AI úpravu a odpověď z webu (kroky 1, 3 a 8). Mikrofon, Telegram a vložení do webu přidat potom.

## Krok 1: základ aplikace

Cílem je prázdná, ale funkční aplikace, na kterou se dají nabalit další kroky. Uživatel z ní zatím nic neuvidí.

| # | Dílčí krok | Hotovo, když |
|---|---|---|
| 1.1 | Rozhodnout hosting | Hotovo: Cloudflare (1. 11. 2026). |
| 1.2 | Kostra: Astro 7 s adaptérem pro Cloudflare, Hono pro API pod `/api`, Wrangler, testy ve Vitestu, struktura složek | `npm test` projde a lokálně odpoví `GET /api/health`. |
| 1.3 | Vlastní rozhraní pro databázi, úložiště a AI (přepis, úprava textu, embeddingy). Implementace pro Cloudflare a falešná pro testy. | Testy běží bez sítě a bez API klíčů. |
| 1.4 | Datový model MVP v D1: migrace a výčty stavů tématu (F-52), typů podnětu (F-13) a vztahů podnětu k tématu | Migrace vytvoří prázdnou databázi a testy přístupu k datům projdou. |
| 1.5 | Oblasti: pět budoucích projektů a Ostatní (F-30) | `GET /api/oblasti` vrátí šest oblastí. |

**Rozhodnutí (1. 11. 2026):**

- Hosting je Cloudflare. Vlastní rozhraní zůstávají, aby šel hosting později vyměnit.
- Kostra je Astro 7 pro stránky a Hono pro API (rozhodnuto 6. 11. 2026). Astro je stejný framework jako web Nezávislých, takže jde sdílet vzhled a později rozhraní přesunout přímo do webu. Hono dostane požadavky pod `/api` přes zachytávací cestu Astra. Logika ucha je v modulech TypeScriptu, které neznají ani jeden z frameworků.
- Datový model má 11 entit z PRD: Uživatel, Kontakt, Oblast, Téma, Podnět, Hlas, Odpověď, Zdrojový dokument, Citace, Odeslání a Historie. Slovník chybí, protože F-11 je Později. Kontakt má v MVP jen Telegram.
- Nahrávky se v MVP neukládají a Podnět nemá odkaz na nahrávku. PRD to od verze 0.9 obsahuje také. Úložiště slouží jen pro dokumenty obce.
- Oblasti jsou v [oblasti-a-web.md](oblasti-a-web.md): pět budoucích projektů a Ostatní.

## Krok 2: namluvení a textové pole

Cílem je, aby člověk na telefonu i na počítači namluvil nebo napsal vzkaz a server ho přijal. Přepis a AI úprava přijdou v kroku 3. Do té doby server vrací falešný přepis přes rozhraní z kroku 1.3.

**Jak to uvidí uživatel (návrh):**

1. Velké tlačítko mikrofonu, pod ním odkaz „Raději napíšu“.
2. Po klepnutí se prohlížeč zeptá na mikrofon. Během nahrávání běží čas a ukazatel hlasitosti a jsou k dispozici tlačítka Hotovo a Zrušit.
3. Ve 2:30 přijde upozornění, že zbývá 30 sekund. Ve 3:00 se nahrávání samo ukončí a odešle.
4. Po odeslání uživatel vidí, že se čeká, a může zrušit.
5. Když mikrofon nejde (je zakázaný, chybí, nebo ho prohlížeč nepodporuje), ukáže se rovnou textové pole s krátkým vysvětlením.

| # | Dílčí krok | Hotovo, když |
|---|---|---|
| 2.1 | Stránka pro nahrání: rozvržení pro mobil, tlačítko mikrofonu, odkaz na textové pole. Ovládání klávesnicí, popisky a oznámení pro čtečky obrazovky (WCAG 2.1 AA). Aplikace povolí mikrofon sama sobě v hlavičce `Permissions-Policy`. | Stránka se otevře na počítači i na telefonu a dá se ovládat jen klávesnicí. |
| 2.2 | Nahrávání (F-01, F-02): MediaRecorder ve formátu, který prohlížeč umí. Čas, ukazatel hlasitosti, upozornění 30 s před koncem, automatické ukončení ve 3:00 a tlačítko Zrušit. Nahrávka kratší než 2 s se neodešle. | Testy časovače s falešným časem projdou a na počítači nahrávání funguje. |
| 2.3 | Odeslání: server přijme nahrávku jedním požadavkem, zkontroluje typ a velikost, nic neuloží a vrátí přepis. Čas nahrání a zpracování se zapisuje do logů. | Test ověří, že do úložiště ani do databáze nešlo žádné audio. Logy ukazují časy jednotlivých fází. |
| 2.4 | Formát pro Whisper: skutečné nahrávky z Opery na Androidu a z Edge a Opery na Windows poslat do `whisper-large-v3-turbo`. Všechny tři prohlížeče stojí na Chromiu a nahrávají WebM/Opus. Dokumentace Workers AI podporované formáty neuvádí a WebM z Chromia nemá v hlavičce délku nahrávky. | Víme, jestli model WebM přijme. Když ne, bude se nahrávat rovnou WAV 16 kHz mono (3 minuty mají asi 5,8 MB). |
| 2.5 | Textové pole (F-04): 10 až 3 000 znaků, dál pokračuje stejnou cestou jako přepis nahrávky. | Napsaný text dojde na server a vrátí se stejně jako přepis. |
| 2.6 | Telefony a prohlížeče (F-05): testovací adresa přes HTTPS, protože mimo localhost mikrofon bez HTTPS nefunguje. Stačí náhled na workers.dev nebo Cloudflare Tunnel. Projít matici níže. | Výsledky jsou zapsané v `docs/test-zarizeni.md` a vzkaz dojde na server ze všech tří prohlížečů. |

**Testovací matice:**

- Zařízení: Opera na Androidu, Edge a Opera na Windows.
- Scénáře: povolení i zákaz mikrofonu, limit 3 minut, zamčení telefonu během nahrávání, Bluetooth sluchátka, příchozí hovor, pomalá síť.
- Mikrofon v rámu z jiné domény na Opeře pro Android. Na výsledku závisí, jestli půjde aplikaci v kroku 12 vložit rámem. Stačí testovací stránka na druhé adrese workers.dev, web nezavisli-prisovice.cz se kvůli tomu nemění.

**Rozhodnutí (2. 11. 2026):**

- **Testuje se na Opeře pro Android a na Edge a Opeře ve Windows.** Safari na iOS a Firefox se v MVP netestují, takže F-05 je ověřený jen pro prohlížeče na Chromiu. Kód vybírá formát podle prohlížeče, ale MP4 ze Safari ani Ogg z Firefoxu nikdo neověří. Zůstává i riziko, že na iPhonu nepůjde mikrofon v rámu (krok 12).
- **Přihlášení před nahráváním.** Nahrávání bez přihlášení (F-06) je v PRD Později. Tabulka rolí sice u Návštěvníka uvádí „začít nahrávat“, ale bez F-06 by se vzkaz při přihlašování ztratil, protože se audio neukládá. Do kroku 5 poběží odesílání bez přihlášení jen lokálně a na testovací adrese.
- **3 minuty a upozornění 30 s před koncem**, jak předpokládá F-02.
- **Po ukončení se nahrávka rovnou odešle.** Přehrání a nové nahrání (F-03) jsou Později. Autor může nahrávání zrušit a v kroku 4 text upravit nebo zahodit.
- **Zamčení telefonu nebo přepnutí do jiné aplikace nahrávání ukončí** a nahraný kus se zpracuje. Autor text v kroku 4 potvrdí, nebo zahodí.
- **Textové pole má 10 až 3 000 znaků.** Tři minuty řeči jsou zhruba 2 500 znaků.
- **Podnět dostane pole `vstup` (hlas, nebo text).** Ukáže, kolik lidí používá mikrofon, a pomůže vyhodnotit přepis. Patří do migrace v kroku 1.4.

**Technické poznámky:**

- Stránku vykreslí Astro, nahrávání obslouží malý skript v TypeScriptu bez frameworku. Stejně jako na webu Nezávislých se skripty nevkládají přímo do stránky (nastavení `assetsInlineLimit: 0`), takže CSP nepotřebuje `unsafe-inline`. Stránka musí fungovat samostatně i v rámu, způsob vložení se volí až v kroku 12.
- Mikrofon se otevírá s potlačením ozvěny a šumu, jeden kanál.
- Časy fází jdou do Workers Logs. Datový model se kvůli měření nemění.
- Textové pole (2.5) jde postavit hned po kroku 1. Po něm vede nejkratší cesta ke krokům 3 a 8, které nesou největší riziko.

## Krok 3: přepis a AI úprava

Cílem je, aby z nahrávky nebo napsaného textu vznikl upravený vzkaz ve spisovné češtině s návrhem názvu, oblasti a typu. Autor ho uvidí a potvrdí v kroku 4. Teprve potvrzením se podnět uloží (F-14), takže v kroku 3 se nic neukládá.

| # | Dílčí krok | Hotovo, když |
|---|---|---|
| 3.1 | Přepis (F-10): rozhraní přepisu z kroku 1.3 dostane implementaci pro `whisper-large-v3-turbo` s pevným jazykem `cs`. Ověřit, jestli model zvládne 3minutovou nahrávku vcelku, nebo ji je potřeba dělit. | Tříminutová nahrávka z Opery na Androidu se přepíše celá. Testy s falešným AI projdou. |
| 3.2 | AI úprava (F-12, F-13): jeden požadavek na jazykový model, výstup v JSON: upravený text, název, oblast a typ. Kód výstup ověří podle schématu. Oblast smí být jen jedna ze šesti, typ jen návrh, stížnost, dotaz nebo pochvala, název nejvýš 80 znaků. Při neplatném výstupu se zkusí jeden nový požadavek. Prompt je v repozitáři a má číslo verze. | Testy s falešným modelem pokryjí platný i neplatný výstup a příliš dlouhý název. |
| 3.3 | Spojení: požadavek z kroku 2.3 vrátí surový přepis i úpravu. Napsaný text jde rovnou do úpravy. Server výsledek podepíše, aby se v kroku 4 uložil přesně surový přepis, který vznikl na serveru. Časy přepisu a úpravy jdou do logů. | Na testovací adrese uvidí autor upravený text 1minutové nahrávky do 20 s (požadavek na rychlost v PRD). Test ověří, že se nic neuložilo. |
| 3.4 | Chyby: když AI selže nebo neodpoví včas, autor dostane tlačítko Zkusit znovu. Nahrávka do té doby zůstává jen v prohlížeči. Druhá možnost je napsat vzkaz do textového pole. | Test s falešným AI, které selže, ukáže autorovi obě možnosti. |
| 3.5 | Testovací sada: 20 až 30 nahrávek od různých lidí, nahraných přes stránku z kroku 2 na Opeře pro Android a na počítači. Mají obsahovat místní názvy a vzniknout doma i venku. Ke každé nahrávce patří ruční přepis a ruční zařazení do oblasti a typu. Nahrávky leží mimo repozitář a mluvčí s nahráním souhlasí. Skript `npm run eval` pošle sadu do modelů a připraví výsledky k hodnocení naslepo. | Sada je hotová a skript z ní vytvoří tabulku k hodnocení. |
| 3.6 | Výběr modelů: u přepisu Whisper se seznamem místních názvů a bez něj. U úpravy čtyři kandidáti níže, se stejným promptem. Měnit vždy jen jeden faktor. | Vybraný přepis a model úpravy splní prahy níže. Výsledek je zapsaný v [hlasove-modely.md](hlasove-modely.md). |

**Kandidáti na AI úpravu** (ceny Workers AI k 2. 11. 2026, za milion tokenů vstup / výstup):

| Model | Cena | Proč |
|---|---|---|
| `@cf/google/gemma-4-26b-a4b-it` | 0,10 / 0,30 USD | Nejlevnější z vícejazyčných modelů střední velikosti |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | 0,35 / 0,56 USD | Evropský model |
| `@cf/deepseek-ai/deepseek-v4.1-flash-1017` | 0,30 / 1,20 USD | Nejsilnější z modelů do zhruba 1 USD za milion výstupních tokenů |
| `@cf/nvidia/nemotron-3-120b-a12b` (Nemotron 3 Super) | 0,50 / 1,50 USD | Nemotron se používá v lokálních skillech pro shrnutí podcastů |

Češtinu žádného z nich jsem neověřil, to je úkol testu. Při 2 500 tokenech na vstupu a 1 000 na výstupu stojí úprava jednoho vzkazu 0,06 až 0,3 centu. Přepis 3 minut stojí 0,15 centu. Celý vzkaz tak vyjde pod půl centu. Do bezplatných 10 000 neuronů denně se vejdou desítky vzkazů.

**Rozhodnutí (6. 11. 2026):**

- **Před potvrzením se nic neukládá.** Server výsledek jen podepíše a autor ho při potvrzení pošle zpět. Nevzniká tak rozpracovaný podnět, který by se musel mazat.
- **Pevný seznam místních názvů v kódu** jako nápověda pro Whisper (`initial_prompt`): Příšovice, Záhumení, Sokolovna, Příšovka, Svijany, Přepeře, Písečáky a další z [oblasti-a-web.md](oblasti-a-web.md). Slovník spravovaný administrátorem (F-11) zůstává Později. Nápověda může Whisper svádět k tomu, že názvy doplní i tam, kde nezazněly, proto se testuje s ní i bez ní.
- **Bez AI Gateway v MVP.** PRD s ní počítá kvůli logům a záložnímu poskytovateli. Brána ale ve výchozím stavu ukládá obsah požadavků, u Whisperu by mohla uložit i audio. Pro pozvané testery stačí volat Workers AI přímo a bránu přidat, až bude potřeba záložní poskytovatel.
- **Bez serverové fronty.** Podle PRD se při výpadku AI nahrávka uloží do fronty, to by ale znamenalo ukládat audio. V MVP stačí Zkusit znovu z prohlížeče.
- **Prahy pro výběr:**
  - úprava nepřidá nic, co autor neřekl, u všech vzorků,
  - oblast i typ jsou správně aspoň u 80 % vzorků,
  - upravený text 1minutové nahrávky je hotový do 20 s.
- **Deepgram Nova-3 až podle výsledku.** Druhého poskytovatele přepisu zkoušet, jen když Whisper na sadě neprojde. Na Workers AI stojí 0,0052 USD za minutu, desetkrát víc než Whisper.
- **Bez bezplatných modelů z OpenRouteru.** Skilly pro podcasty je používají, u vzkazů občanů ale vadí podmínky. Bezplatné verze od NVIDIA zaznamenávají vstupy kvůli zlepšování služeb a jsou určené jen na zkoušku. Limit je navíc 50 požadavků denně, po nákupu kreditů za 10 USD 1 000.

**Technické poznámky:**

- Dokumentace Workers AI uvádí JSON režim jen u starších modelů a ani tam ho nezaručuje. Výstup proto vždy ověřuje kód.
- Prompt úpravy výslovně zakazuje přidávat informace a měnit smysl. Automatickou kontrolu přidaných údajů, třeba čísel, přidat, jen když ji test ukáže jako potřebnou.
- Prompt úpravy nemá vzorové příklady. Nemotron v UctoMatu dvakrát převzal údaj z příkladu v promptu do výstupu.
- Nemotron 3 Super se volá s vypnutým uvažováním (`enable_thinking: false`), aby se vešel do 20 s.
- Klíče a ID účtu pro `npm run eval` jsou jen v proměnných prostředí, ne v repozitáři.
- **Je potřeba:** 20 až 30 lidí, kteří nahrají testovací vzkazy, a dva hodnotitelé pro hodnocení naslepo.

## Další fáze: testování

Testuje se od největšího rizika. Každý test může změnit plán, proto se další kroky rozepíšou až podle výsledků.

1. **Whisper a nahrávky z telefonu** (2.4, 3.1). Jednoduchá testovací stránka na workers.dev nahraje v Opeře na Androidu pár vzkazů, z toho jeden tříminutový, a pošle je do `whisper-large-v3-turbo`. Test ukáže, jestli model přijme WebM, zvládne 3 minuty vcelku a jak přepíše češtinu s místními názvy.
2. **Mikrofon v rámu** (2.6, krok 12). Testovací stránka na jiné adrese vloží stránku s mikrofonem do rámu. Ověří se na Opeře pro Android.
3. **Kostra a textové pole** (1.2 až 1.5, 2.5). Po nich jde AI úpravu zkoušet na napsaném textu, ještě bez mikrofonu.
4. **Testovací sada a výběr modelů** (3.5, 3.6).

K prvnímu testu je potřeba Cloudflare účet a API token s oprávněním pro Workers AI. Token patří jen do proměnné prostředí, ne do repozitáře.

Živé PRD v Claude Docs je od 6. 11. 2026 ve verzi 0.9 a rozhodnutí z 1. až 6. 11. 2026 obsahuje.

Vzhled stránek ucha se bere z webu Nezávislých (barvy, písma, dialog), viz [Oblasti a web](oblasti-a-web.md#vzhled).
