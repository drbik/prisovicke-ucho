# Plán MVP po krocích

*Stav k 9. 11. 2026. Kroky vychází z diagramu toku v PRD (sekce Uživatelské scénáře), písmena odkazují na jeho uzly.*

**Plánování je uzavřené (6. 11. 2026).** Rozepsané jsou kroky 1 až 4 a krok 8 (rozpis schválený 9. 11. 2026). Další kroky se rozepíšou, až na ně přijde řada. Další fáze je testování, viz [poslední oddíl](#další-fáze-testování).

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
| 2.6 | Telefony a prohlížeče (F-05): testovací adresa přes HTTPS, protože mimo localhost mikrofon bez HTTPS nefunguje. Testuje se rovnou na ostré adrese nezavisli-prisovice.cz/ucho, bez náhledů na workers.dev (rozhodnuto 6. 11. 2026). Projít matici níže. | Výsledky jsou zapsané v `docs/test-zarizeni.md` a vzkaz dojde na server ze všech tří prohlížečů. |

**Testovací matice:**

- Zařízení: Opera na Androidu, Edge a Opera na Windows.
- Scénáře: povolení i zákaz mikrofonu, limit 3 minut, zamčení telefonu během nahrávání, Bluetooth sluchátka, příchozí hovor, pomalá síť.
- Mikrofon v rámu na Opeře pro Android. Ucho je na stejné doméně jako web, takže rám je ze stejného původu. Na výsledku závisí, jestli se ucho v kroku 12 otevře na webu v rámu, nebo jako samostatná stránka `/ucho`. Testovací stránku s rámem obslouží Worker ucha pod `/ucho`, web se kvůli tomu nemění.

**Rozhodnutí (2. 11. 2026):**

- **Testuje se na Opeře pro Android a na Edge a Opeře ve Windows.** Safari na iOS a Firefox se v MVP netestují, takže F-05 je ověřený jen pro prohlížeče na Chromiu. Kód vybírá formát podle prohlížeče, ale MP4 ze Safari ani Ogg z Firefoxu nikdo neověří. Zůstává i riziko, že na iPhonu nepůjde mikrofon v rámu (krok 12).
- **Přihlášení před nahráváním.** Nahrávání bez přihlášení (F-06) je v PRD Později. Tabulka rolí sice u Návštěvníka uvádí „začít nahrávat“, ale bez F-06 by se vzkaz při přihlašování ztratil, protože se audio neukládá. Do kroku 5 poběží odesílání bez přihlášení jen lokálně a na testovací adrese.
- **3 minuty a upozornění 30 s před koncem**, jak předpokládá F-02.
- **Po ukončení se nahrávka rovnou odešle.** Přehrání a nové nahrání (F-03) jsou Později. Autor může nahrávání zrušit a v kroku 4 text upravit nebo zahodit.
- **Zamčení telefonu nebo přepnutí do jiné aplikace nahrávání ukončí** a nahraný kus se zpracuje. Autor text v kroku 4 potvrdí, nebo zahodí.
- **Textové pole má 10 až 3 000 znaků.** Tři minuty řeči jsou zhruba 2 500 znaků.
- **Podnět dostane pole `vstup` (hlas, nebo text).** Ukáže, kolik lidí používá mikrofon, a pomůže vyhodnotit přepis. Patří do migrace v kroku 1.4.

**Technické poznámky:**

- **Doplněno při stavbě (10. 11. 2026):** do modelu jde 6 úseků, z jednoho dokumentu nejvýš 2. Práh podobnosti je 0,45. Fulltext u slov od 6 znaků odřízne 2 až 3 znaky konce. Odpověď má nejvýš 3 věty a citace nejvýš 150 znaků. Citaci složenou ze dvou míst téhož úseku kontrola přijme, když je každá část v úseku doslova. Druhá kontrola modelem dostává i název zdroje. Prompt úpravy je ve verzi 3 a vymezuje čtyři typy vzkazu, prompt odpovědi je ve verzi 2. Podrobnosti a důvody jsou ve [vyhodnocení](vyhodnoceni-odpovedi.md#průběh-ladění-10-11-2026).

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

První porovnání z 6. 11. 2026 je v [hlasove-modely.md](hlasove-modely.md#výběr-modelu-ai-úpravy): DeepSeek není na Workers Free plan dostupný a Mistral přidával slova, zbývají Gemma a Nemotron. Stránka zatím používá Gemmu bez uvažování.

Češtinu žádného z nich jsem před prvním porovnáním neověřil, to je úkol testu. Při 2 500 tokenech na vstupu a 1 000 na výstupu stojí úprava jednoho vzkazu 0,06 až 0,3 centu. Přepis 3 minut stojí 0,15 centu. Celý vzkaz tak vyjde pod půl centu. Do bezplatných 10 000 neuronů denně se vejdou desítky vzkazů.

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
- Nemotron 3 Super i Gemma se volají s vypnutým uvažováním (`enable_thinking: false`), aby se vešly do 20 s.
- Prompt obsahuje seznam místních názvů se správnými pády. Bez něj model neví, že „příšovka“ a „písečáky“ jsou místní názvy.
- Klíče a ID účtu pro `npm run eval` jsou jen v proměnných prostředí, ne v repozitáři.
- **Je potřeba:** 20 až 30 lidí, kteří nahrají testovací vzkazy, a dva hodnotitelé pro hodnocení naslepo.

## Krok 4: potvrzení a oprava textu autorem

Cílem je, aby autor návrh AI zkontroloval, opravil a potvrdil (F-14). Teprve potvrzený vzkaz se uloží, a to se surovým přepisem i upraveným textem (F-15).

| # | Dílčí krok | Hotovo, když |
|---|---|---|
| 4.1 | Formulář: upravený text, název, typ a oblast jdou opravit, pod formulářem je původní přepis k porovnání. Potvrdit ověří pole a ukáže souhrn, Zahodit se před zahozením zeptá. | Hotovo 9. 11. 2026 na ostré adrese. Potvrzení zatím nic neodesílá. |
| 4.2 | Podpis (3.3): server podepíše surový přepis a návrh AI a při potvrzení podpis ověří. | Test ověří, že server podvržený surový přepis odmítne. |
| 4.3 | Uložení: potvrzený podnět s polem `vstup`, surovým přepisem a textem autora do D1 (datový model z 1.4). Jestli se uloží i návrh AI, rozhodne se tady. | Podnět potřebuje autora, proto 4.2 a 4.3 přijdou s přihlášením z kroku 5. |

**Jak je postavený 4.1:**

- Formulář se ukáže hned po úpravě. Opravit jde text, název, typ i oblast.
- Upravený text smí mít až 4 000 znaků, napsaný vzkaz 3 000. Úprava rychlé řeči může limit pro psaní přesáhnout a autor by ji jinak musel zkracovat.
- Zahodit, Zavřít, Escape i gesto zpět se před zahozením neuloženého vzkazu zeptají. U Escape a gesta zpět to prohlížeč dovolí jen po nedávné aktivitě uživatele, jinak se panel zavře bez otázky.
- Po potvrzení stránka ukáže, která pole autor oproti návrhu AI změnil. Hodí se to pro testy a později k vyhodnocení úpravy (3.6).
- Kontroly polí jsou v modulu `src/lib/podani/potvrzeni.ts`, který nezná prohlížeč. S uložením je použije i server.

## Krok 8: index webu a odpověď s citací

*Rozpis z 9. 11. 2026 podle [zadání](zadani-krok-8.md). Tomáš ho schválil 9. 11. 2026 bez výhrad, včetně všech návrhů v oddílu Rozhodnutí a prahu 70 %.*

Cílem je, aby autor po potvrzení dotazu hned viděl odpověď z webu obce nebo z karet webu Nezávislých, s citací zdroje. Když odpověď ve zdrojích není, nebo jí ucho nemá dost opory, stránka řekne, že dotaz převezmou zastupitelé. Návrhy, stížnosti a pochvaly se nehledají (F-72).

**Jak to uvidí uživatel (návrh):**

1. Autor u typu dotaz klepne na Potvrdit (4.1). Pod souhrnem se objeví „Hledáme odpověď na webu obce…“.
2. Do 10 s se ukáže odpověď po větách. Za každou větou je číslo zdroje, pod odpovědí seznam zdrojů s názvem, datem a odkazem. Zdroj z prisovice.cz má označení „Odpověď z webu obce“, karta z webu Nezávislých „Podle webu Nezávislých pro Příšovice“.
3. Pod každou odpovědí je upozornění, že nejde o úřední vyjádření obce Příšovice.
4. Když odpověď není, stránka napíše, že ji ve zdrojích nenašla a že dotaz mají převzít zastupitelé. Dokud nejsou hotové fronta správce a ukládání (kroky 4.3 a 9), dodá, že dotaz zatím nikam neodešel.
5. U návrhu, stížnosti a pochvaly zůstane jen souhrn z 4.1, nic se nehledá.

**Rozsah zdrojů (průzkum 9. 11. 2026, okno 2 let od 9. 11. 2024):**

| Zdroj | Celkem | V okně | Text v okně | Poznámka |
|---|---|---|---|---|
| Stálé stránky prisovice.cz | 80 | 3 zveřejněné, 17 změněné | 117 tis. znaků všech 80 stránek | Kontakty, služby, odpady, pronájem Sokolovny |
| Aktuality | 57 | 46 | 32 tis. znaků | Z toho 4 hlášení rozhlasu |
| Úřední deska na prisovice.cz | 366 | 272 | 10 tis. znaků | Stránka je jen obálka (medián 29 znaků), obsah je v PDF |
| PDF odkázaná z obsahu webu | 338 | 327: 246 MB, 1 313 stran | 2,47 mil. znaků | 54 skenů bez textu (161 stran, 54 MB), dalších 49 stran bez textu v 10 PDF |
| Starší PDF ze stálých stránek | 10 | – | 6,1 MB | Jednací řád ZO, sazebník úhrad, dohoda o pronájmu Sokolovny, formuláře |
| Karty webu Nezávislých | 24 | 24 | krátké | Jedna karta = jeden úsek |

Celkem asi 2,6 mil. znaků, tedy asi 2 600 až 3 000 úseků a 0,9 mil. tokenů pro embeddingy. Bez okna by se index do Vectorize zdarma nejspíš nevešel: knihovna médií má 610 PDF, v okně je jich 327, a zdarma se vejde asi 4 880 úseků (viz Cena). Odhad, neověřeno.

| # | Dílčí krok | Hotovo, když |
|---|---|---|
| 8.1 | Průzkum a rozpis (fáze A zadání): rozsah prisovice.cz, robots.txt, REST API, limity Cloudflare na Workers Free, architektura, cena, rizika | Hotovo 9. 11. 2026, rozpis schválil Tomáš. |
| 8.2 | Typové otázky (fáze B): 20 až 30 otázek, jak by je řekli občané, s očekávaným výsledkem ze skutečného zdroje. Strojově čitelně v `tests/data/` a přehled pro Tomáše v `docs/`. | Sadu schválil Tomáš. Do té doby se k vyhodnocení nepoužije. Hotovo: 30 otázek v [typove-otazky.md](typove-otazky.md), Tomáš je schválil 10. 11. 2026. |
| 8.3 | Stahování: ruční skript `npm run index:stahnout`. Řídí se robots.txt, posílá nejvýš 1 požadavek za sekundu s obecným User-Agentem, bere jen okno 2 let (viz rozhodnutí). Seznam adres ze sitemapy, data zveřejnění a změny z REST API a ze stránky. Karty se čtou z ostrého webu nezavisli-prisovice.cz. Stažené soubory leží mimo git. | Skript stáhne celé okno a druhý běh nestahuje nic, co se nezměnilo. Seznam staženého a vynechaného je zapsaný. Hotovo 10. 11. 2026: první běh 728 požadavků za 27 minut, druhý 0 stažených souborů a 8 požadavků. Přehled je v [index-zdroju.md](index-zdroju.md). |
| 8.4 | Zpracování: text z HTML (jen obsah článku, bez menu a patičky) a z PDF, dělení na úseky, metadata Zdrojového dokumentu (URL, název, web, typ, datum zveřejnění a změny, otisk obsahu, datum stažení). PDF bez textové vrstvy jdou na seznam známých omezení. | Testy vytažení textu a dělení na úseky projdou. Počty dokumentů a úseků a seznam vynechaných PDF jsou zapsané. Hotovo 10. 11. 2026: 357 dokumentů a 2 435 úseků, 49 skenů a 61 dokumentů v jiném formátu mimo index. Opory všech typových otázek jsou v úsecích svých zdrojů. |
| 8.5 | Index: migrace D1 (Zdrojový dokument, Úsek s fulltextem FTS5, Citace), index ve Vectorize, embeddingy `@cf/baai/bge-m3`, nahrání. Přístup k indexu je za vlastním rozhraním s implementací pro Cloudflare a falešnou pro testy. | Počty v D1 a ve Vectorize souhlasí se zpracováním. Hotovo 10. 11. 2026: D1 `prisovicke-ucho` má 357 dokumentů a 2 435 úseků, Vectorize `prisovicke-ucho-zdroje` 2 435 vektorů. Vzdálené vazby Wrangleru fungují, záložní příkazy nebyly potřeba. |
| 8.6 | Hledání a odpověď: kombinace vektorového a fulltextového hledání, prompt odpovědi s číslem verze, ověření každé věty proti úryvku (F-73 až F-76). Endpoint `POST /ucho/api/dotaz` se stejnou ochranou jako dosavadní (kontrola původu, limit požadavků, limit velikosti). Logy jen s časy, počty, modelem a verzí promptu. | Testy s falešnou AI pokryjí: odpověď s citací, žádný úryvek, tvrzení bez opory, návrh bez hledání, upozornění v odpovědi a log bez textu dotazu. Hotovo 10. 11. 2026, `tests/odpovedi.test.ts` a `tests/index.test.ts`, celkem 145 testů. |
| 8.7 | Stránka: po Potvrdit u typu dotaz zavolá endpoint a ukáže odpověď, nebo „zastupitelům“. Texty spisovnou češtinou, ovládání klávesnicí, oznámení pro čtečky obrazovky. | `npm test` a `npm run check` projdou. Na ostré adrese prošel napsaný dotaz v Edge a v Opeře při šířce 360 × 740 s odpovědí i bez ní, bez chyb v konzoli a bez vodorovného posunu. Hotovo 10. 11. 2026 ve Windows, viz [test-zarizeni.md](test-zarizeni.md#krok-8-odpověď-z-webu-na-ostré-adrese). Opera na Androidu čeká. |
| 8.8 | Vyhodnocení: `npm run eval:odpovedi` pošle schválenou sadu přes celé hledání a vytvoří tabulku k ruční kontrole. | Prahy níže platí a výsledek je zapsaný v `docs/vyhodnoceni-odpovedi.md`. **Hotovo 10. 11. 2026:** závěrečný běh na rozšířeném indexu splnil všechny prahy (odpovědi 14 ze 16, zastupitelům 10 z 10, nehledat 4 ze 4, do 10 s 13 ze 14, žádné tvrzení bez opory). Podrobnosti v [vyhodnoceni-odpovedi.md](vyhodnoceni-odpovedi.md). |
| 8.9 | Nasazení a dokumentace: jen Worker `prisovicke-ucho`. Stav v tomto plánu, `docs/test-zarizeni.md`, Opera na Androidu ověřená, nebo zapsaná jako čekající. | Vše je commitnuté ve větvi kroku. Push, PR a sloučení jen na pokyn Tomáše. Worker `prisovicke-ucho` nasazen 10. 11. 2026, večer znovu s promptem odpovědi verze 3, písmem Roboto Mono a nadpisem „Naslouchám“ (verze b0893619) a potom s přeřazením úseků a větou „Teď můžete namluvit svůj vzkaz, dotaz nebo připomínku.“ (verze 44beed92) a nakonec s ochranou proti halucinacím Whisperu v tichu, třemi úseky z dokumentu, částečnými odpověďmi a místem v dokumentu (verze 65a5dbc4). |
| 8.10 | Rozšíření MVP se souhlasem Tomáše (10. 11. 2026): do indexu i dokumenty Word a ODT a text skenů z OCR. Převod Wordem (`npm run index:word`) a OCR ve Windows (`npm run index:ocr`) běží jen na počítači. | **Hotovo 10. 11. 2026:** index s 428 dokumenty a 3 003 úseky je nahraný v D1 a Vectorize, viz [Index zdrojů](index-zdroju.md). Opory všech otázek sady zůstaly, výsledky sady se rozšířením nezměnily. |
| 8.11 | Rozšíření MVP se souhlasem Tomáše (10. 11. 2026 večer): do indexu i Tlampač a veřejné podklady webu Nezávislých (`npm run index:stahnout` je stáhne, `npm run index:zpracovat` zpracuje). | Hotovo: index má 435 dokumentů a 3 021 úseků v D1 i ve Vectorize, viz [Index zdrojů](index-zdroju.md). Timeline z projektu webu je dál mimo index. |

**Rozhodnutí (9. 11. 2026):** Tomáš omezil stahování i databázi zatím na poslední 2 roky a schválil všechny body níže.

- **Okno 2 let** (rozhodnuto 9. 11. 2026). Aktuality, úřední deska a jejich PDF jdou do indexu jen se zveřejněním od 9. 11. 2024. PDF se posuzuje podle měsíce nahrání v adrese (`/uploads/RRRR/MM/`), a když ho adresa nemá, podle data stránky, která na PDF odkazuje.
- **Stálé stránky celé.** Jen 3 z 80 stálých stránek vznikly v okně, přitom popisují platný stav (kontakty, úřední hodiny, odpady, pronájem Sokolovny). Mají dohromady 117 tis. znaků. Berou se celé i s 10 staršími PDF, na která odkazují (6,1 MB): jednací řád zastupitelstva, sazebník úhrad, dohodu o pronájmu Sokolovny, formuláře a výroční zprávu o informacích za rok 2023. Bez nich skončí dotazy na pronájem Sokolovny nebo jednací řád u zastupitelů, i když odpověď na webu je.
- **Úřední deska na prisovice.cz patří do indexu.** Obec ji od ledna 2024 vede přímo ve WordPressu (typ `urednideska`), nezávisle na staré desce na prisovice.e-obec.cz, která se nesleduje. Jsou na ní zápisy zastupitelstva a rady, rozpočty, vyhlášky a oznámení, tedy většina zveřejněných dokumentů.
- **Z úřední desky se vynechají řízení soukromých osob.** Jde o dražební vyhlášky a usnesení exekutorů (5 v okně), řízení stavebního úřadu o rodinných domech, přístavbách, tůních a dělení pozemků včetně odstranění staveb (zhruba 10). Obsahují jména, adresy a majetkové poměry a pro dotazy občanů nemají význam. Pozná se to podle kategorie `stavebni-urad` a podle slov v názvu. Seznam vynechaných dokumentů se zapíše. Více v rizicích.
- **Karty webu Nezávislých: všech 24 souborů ze `src/content/projects/`.** Na webu nemají příznak konceptu, vykreslí se každý soubor. Všech 24 je 9. 11. 2026 na ostrém webu s kotvou `https://nezavisli-prisovice.cz/#<slug>` a texty souhlasí se soubory. Jde o 22 projektů, kartu Volby se složením zastupitelstva a závěrečnou kartu s tématy k prověření. Text se bere z ostrého webu, soubor na disku slouží jen ke kontrole. Karty nemají datum zveřejnění, citace proto uvede „stav webu k <datum stažení>“. Tlampač a `/podklady/` webu Nezávislých do indexu nejdou, protože je zadání neuvádí.
- **Vlastní index ve Vectorize a D1, ne AI Search.** Zdůvodnění je v oddílu Architektura.
- **Bez R2.** Stažené HTML a PDF zůstávají jen na počítači, kde běží skript. Do Cloudflare jde jen vytažený text úseků a citace odkazuje na původní adresu na prisovice.cz.
- **Model odpovědi:** `@cf/google/gemma-4-26b-a4b-it` bez uvažování, stejný jako u úpravy. Když na sadě neprojde, zkusí se Nemotron 3 Super.
- **Citace v D1 vznikne, ale zůstane prázdná.** Patří k Odpovědi a ta se zatím neukládá (4.3, F-77). Do té doby se použité úryvky jen zobrazí.
- **Datový model:** Zdrojový dokument podle PRD, typ ale bude stránka, aktualita, úřední deska, PDF nebo karta. Úsek je technická tabulka indexu. V PRD jako entita není a nebude.

**Architektura:**

- **Stahování a zpracování běží ručně na počítači**, ne ve Workeru. Worker na Workers Free má jen 10 ms procesoru na požadavek a na čtení PDF to nestačí. Ruční běh odpovídá F-71 pro MVP (jednorázové zaindexování a ruční aktualizace). PDF čte `pdfjs-dist` (čistý JavaScript, bez instalace dalších programů). HTML se čte bez prohlížeče, protože web obce je statický WordPress.
- **Nahrání do Cloudflare přes přihlášení Wranglerem**, bez API tokenu v souborech. Nejdřív zkusím vzdálené vazby Wrangleru (`remote: true`), aby skript použil stejné rozhraní jako Worker. Záloha jsou příkazy `wrangler d1 execute --remote` a `wrangler vectorize insert`.
- **Vytažení textu:** ke každému kusu textu z PDF zůstane číslo strany, takže citace může vést rovnou na stranu (`…pdf#page=3`). Spojí se slova rozdělená na konci řádku a odstraní se záhlaví a zápatí, která se opakují na každé straně. Ze stránek webu se bere jen obsah článku. Patička se jmény vedení obce, která je na každé stránce, do indexu nejde. Strana s méně než 50 znaky se počítá jako sken.
- **Úseky** mají asi 1 200 znaků. Dokument se nejdřív dělí podle své stavby (body jednání, usnesení, nadpisy, odstavce), teprve dlouhé části dál, nikdy uprostřed věty a s překryvem 150 znaků. Každý úsek dostane hlavičku s názvem dokumentu, datem a stranou, třeba „Zápis z jednání rady obce 21. 10. 2026, str. 3“. Název se bere ze stránky úřední desky, ne z názvu souboru PDF.
- **Hledání kombinuje dvě metody.** Vektory z `bge-m3` (vícejazyčný model, 1 024 rozměrů) ve Vectorize najdou úsek podle významu, i když používá jiná slova. Fulltext FTS5 v D1 bez diakritiky najde přesné výrazy: čísla zápisů a usnesení, jména firem a ulic, místní názvy. FTS5 nezná české skloňování, proto se slova z dotazu hledají podle začátku (`popelnic*`). Výsledky se spojí reciproční fúzí pořadí (RRF) a do modelu jde 6 nejlepších úseků. Když žádný nepřekročí práh podobnosti, dotaz jde zastupitelům bez volání jazykového modelu. Práh se nastaví na typových otázkách.
- **Odpověď** model vrací v JSON po větách. U každé věty je číslo úseku a doslovná opora z něj. Když odpověď v úsecích není, vrátí jen „nevím“. Prompt zakazuje obecné znalosti a domněnky (F-73) a je v repozitáři s číslem verze.
- **Ověření (F-75) má dvě vrstvy.** Kód zkontroluje, že každá věta má citaci, že doslovná opora v citovaném úseku opravdu je a že každé číslo a datum z věty je i v úseku. Potom druhý dotaz na model posoudí, jestli věta z opory plyne. Když neprojde jediná věta, nepoužije se celá odpověď a dotaz jde zastupitelům (F-76).
- **Rozhraní:** `IndexZdroju` (hledat, nahrát) s implementací pro Vectorize a D1 a falešnou pro testy. `SluzbaAi` dostane embedding a odpověď. Hledání, ověření a skládání odpovědi jsou v `src/lib/odpovedi/` a neznají Astro ani Hono. Skripty indexu jsou v `nastroje/index/`.

**Proč ne AI Search:** spravované hledání by ušetřilo vlastní dělení a hledání a umí číst i skeny. Procházení webu ale funguje jen pro domény ve stejném účtu Cloudflare, takže prisovice.cz by se stejně stahoval vlastním skriptem. AI Search se od 1. 12. 2026 účtuje a na bezplatném účtu má v ceně 1 000 dotazů měsíčně. Metadata úseků jsou omezená na 5 polí a hledání se hůř testuje s falešnou AI. Zůstává jako záloha, kdyby vlastní hledání na sadě neprošlo.

**Proč ne Browser Rendering `/crawl`:** na Workers Free má 10 minut prohlížeče denně a web obce prohlížeč nepotřebuje.

**Technické poznámky:**

- `robots.txt` prisovice.cz zakazuje jen `/wp-admin/`. Podmínky užití web nemá, stahování nic nebrání. Úřední dokumenty obce nejsou podle § 3 autorského zákona chráněné. Aktuality chráněné být můžou, ucho z nich ale ukazuje jen krátké úryvky s odkazem.
- REST API `/wp-json/wp/v2/` je zapnuté pro stránky a aktuality a dává přesná data zveřejnění a změny. Úřední deska v něm není a knihovna médií vrací jen 116 z 610 PDF. Seznam adres se proto bere ze sitemapy (`wp-sitemap.xml`), PDF z odkazů ve stránkách a datum položky úřední desky ze stránky.
- Web obce odpovídá zhruba za 2 s na stránku. Celé stažení okna trvalo při průzkumu asi půl hodiny: HTML 19 minut, PDF 10 minut. Opakovaný běh přeskočí položky, jejichž datum změny v sitemapě se nezměnilo.
- Výpisové stránky (Aktuality, Aktuálně, Úřední deska, Archiv úřední desky, Mapa stránek) do indexu nejdou, protože opakují texty jednotlivých položek. Odpověď má citovat článek nebo dokument, ne výpis.
- Zápisy rady a část odpovědí podle zákona 106 zveřejňuje obec anonymizované (`anonymiz-rada-…pdf`, `anonymizovana-odpoved-…pdf`).
- Stavební úřad v Příšovicích vede řízení i pro okolní obce (Svijanský Újezd, Soběslavice, Všeň), proto jsou na desce i jejich stavby.
- Odpověď nemá paměť, stejný dotaz se hledá znovu. Ukládání odpovědí k tématu je F-77 a přijde s krokem 4.3.
- User-Agent skriptu je obecný název ucha bez osobních údajů. Průzkum použil `prisovicke-ucho-pruzkum/0.1`.

**Cena (Workers Free, 10 000 neuronů denně sdílí přepis, úprava i odpovědi):**

| Položka | Spotřeba | Na Workers Free |
|---|---|---|
| Embeddingy indexu, jednorázově | asi 1 mil. tokenů × 1 075 neuronů za milion | asi 1 100 neuronů, vejde se do jednoho dne |
| Vectorize, uložené | asi 3 000 úseků × 1 024 rozměrů = 3,1 mil. | v ceně je 5 mil. uložených rozměrů, tedy asi 4 880 úseků |
| Vectorize, dotazy | (dotazy + 3 000) × 1 024 měsíčně | v ceně je 30 mil., tedy asi 26 000 dotazů měsíčně |
| D1 | text a fulltext do 20 MB, desítky čtených řádků na dotaz | v ceně je 5 GB a 5 mil. čtených řádků denně |
| Odpověď na jeden dotaz | Gemma asi 4 000 tokenů vstup a 600 výstup, ověření asi 1 500 a 200, embedding dotazu zanedbatelný | asi 70 až 90 neuronů |
| Celý namluvený dotaz | přepis 3 min, úprava a odpověď | asi 280 neuronů, tedy asi 35 dotazů denně zdarma |

Na Workers Paid by odpověď stála asi 0,1 centu. Vyhodnocení sady (30 otázek, i opakovaně) se vejde do jednoho dne. Na testování bezplatný plán stačí, na ostrý provoz s kampaní ne.

**Prahy (oddíl „Kdy je hotovo“ v zadání)**, na schválené sadě a ručně zkontrolováno:

- žádná zobrazená odpověď nemá tvrzení bez opory v citovaném úryvku,
- každá zobrazená odpověď má citaci s adresou, názvem a datem, správné označení zdroje a upozornění, že nejde o úřední vyjádření obce,
- aspoň 90 % otázek bez odpovědi ve zdrojích skončí u zastupitelů,
- aspoň 70 % otázek s odpovědí ve zdrojích dostane správnou odpověď (práh může Tomáš při schválení změnit),
- žádný návrh, stížnost ani pochvala nejde do hledání,
- aspoň 90 % odpovědí přijde do 10 s od potvrzení.

**Rizika:**

- **Osobní údaje v PDF obce.** Úřední deska obsahuje i dokumenty se jmény, adresami a majetkem občanů: dražební vyhlášky, stavební řízení, záměry pronájmu a směny pozemků a oznámení o vstupu na pozemky. Zakrytí osobních údajů (F-17) je Později. Text s osobními údaji se tak dostane do D1 v Cloudflare a odpověď ho může ocitovat. Obec dokumenty zveřejnila, po sejmutí z desky ale účel zveřejnění skončil. Zmírnění v MVP: vynechat řízení soukromých osob (viz rozhodnutí), zakázat v promptu jména soukromých osob a ukazovat jen krátké úryvky s odkazem na originál. Úplné to není: jména můžou zůstat i v zápisech, smlouvách a záměrech. Kdo bude správce osobních údajů, je stále otevřené.
- **Skeny bez textové vrstvy** se do indexu nedostanou. Jde o 54 PDF celých (161 stran) a 49 stran v dalších 10 PDF. Jsou to hlavně stavební rozhodnutí, vyúčtování vodného a stočného a naskenované přílohy aktualit. OCR v MVP není.
- **Tabulky** (rozpočty, kalkulace vodného) ztratí při vytažení textu sloupce. Čísla zůstanou, ale model je může přiřadit ke špatnému řádku. Kontrola čísel v ověření pozná jen číslo, které v úseku vůbec není, ne číslo ze špatného řádku.
- **Okno 2 let** vynechá starší, ale platné dokumenty, třeba starší vyhlášky, územní plán a ceníky. Dotaz na ně skončí u zastupitelů, i když odpověď na webu je.
- **Zastaralý index.** Aktualizace je ruční. Odpověď proto vždy ukazuje datum zdroje.
- **Kvalita češtiny Gemmy u odpovědí se zdroji** není ověřená. Záloha je Nemotron 3 Super, stojí ale asi pětkrát víc neuronů za token.
- **10 s na odpověď.** Dvě volání modelu za sebou můžou limit přesáhnout. Měří se ve vyhodnocení. Při překročení se zkrátí ověření modelem, kontrola kódem zůstane.
- **Denní limit neuronů.** Po vyčerpání Workers AI požadavky odmítá. Stránka pak řekne, že odpověď teď nejde najít, a dotaz nechá zastupitelům.
- **10 ms procesoru na Workers Free.** Spojení výsledků a kontrola opory jsou malé výpočty. Čas procesoru se přesto ověří ve Workers Logs.
- **Vzdálené vazby Wrangleru pro skript** fungují (ověřeno 10. 11. 2026). Záložní příkazy Wrangleru nebyly potřeba.
- **Denní limit neuronů při ladění.** Nahrání indexu stojí asi 1 000 neuronů a celý běh sady asi 2 000. Ladění a ostrý provoz sdílí 10 000 neuronů denně, proto se sada nesmí pouštět opakovaně v jednom dni.
- **Web obce se může změnit**, třeba šablona stránek nebo struktura úřední desky. Vytažení textu je pak potřeba upravit. Skript proto hlásí stránky, ze kterých nevytáhl žádný text.

## Další fáze: testování

Testuje se od největšího rizika. Každý test může změnit plán, proto se další kroky rozepíšou až podle výsledků.

1. **Whisper a nahrávky z telefonu** (2.4, 3.1). Jednoduchá testovací stránka na nezavisli-prisovice.cz/ucho nahraje v Opeře na Androidu pár vzkazů, z toho jeden tříminutový, a pošle je do `whisper-large-v3-turbo`. Test ukáže, jestli model přijme WebM, zvládne 3 minuty vcelku a jak přepíše češtinu s místními názvy.
2. **Mikrofon v rámu** (2.6, krok 12). Testovací stránka pod `/ucho` vloží stránku s mikrofonem do rámu ze stejné domény. Ověří se na Opeře pro Android.
3. **Kostra a textové pole** (1.2 až 1.5, 2.5). Po nich jde AI úpravu zkoušet na napsaném textu, ještě bez mikrofonu.
4. **Testovací sada a výběr modelů** (3.5, 3.6).

Testuje se lokálně a rovnou na ostré adrese nezavisli-prisovice.cz/ucho, bez neveřejných náhledů (rozhodnuto 6. 11. 2026). Web má malou návštěvnost, rozpracovaná stránka tam proto nevadí.

**Stav k 9. 11. 2026:** kostra (1.2, z 1.3 zatím jen rozhraní AI), stránka podání (2.1 až 2.5), přepis (3.1), AI úprava (3.2, 3.4, z 3.3 vše kromě podpisu) a formulář k opravě a potvrzení (4.1) běží na ostré adrese. Testy 1 a 2 jsou hotové ve Windows. Na Opeře pro Android prošly tři namluvené vzkazy a jeden na 3 minuty, rám tam ještě čeká. Whisper přijal nahrávky z Chromia na počítači i z Androidu a tři minuty vcelku, takže WAV ani dělení nahrávky nejsou potřeba. Výsledky jsou v [test-zarizeni.md](test-zarizeni.md).

**Další na řadě (9. 11. 2026):** krok 8, index webu a odpověď s citací, v samostatné session. Zadání i pravidlo, kdy je krok hotový, jsou v [zadani-krok-8.md](zadani-krok-8.md). Součástí jsou ukázkové dotazy, které do kroku 11 slouží jako testovací sada (rozhodnutí v `CLAUDE.md`). Průzkum (8.1) je hotový a [rozpis kroku 8](#krok-8-index-webu-a-odpověď-s-citací) Tomáš schválil 9. 11. 2026. Sadu typových otázek (8.2) Tomáš schválil 10. 11. 2026. Index, odpověď a stránka (8.3 až 8.7) jsou hotové a od 10. 11. 2026 běží na ostré adrese. Zbývá závěrečný běh vyhodnocení (8.8) a test na Opeře pro Android.

Podpis výsledku (3.3, 4.2) a uložení (4.3) přijdou s přihlášením: dokud se nic neukládá, nikdo by podpis neověřoval. Autor teď návrh AI opraví a potvrdí, potvrzený vzkaz se ale nikam neuloží. Model úpravy je vybraný předběžně, krok 3.6 stále čeká na testovací sadu.

K nasazení stačí přihlášení Wranglerem (`wrangler login`), nebo API token s oprávněním pro Workers AI a pro nasazení Workeru na doménu nezavisli-prisovice.cz. Token patří jen do proměnné prostředí, ne do repozitáře.

Živé PRD v Claude Docs je od 6. 11. 2026 ve verzi 0.9 a rozhodnutí z 1. až 6. 11. 2026 obsahuje.

Vzhled stránek ucha se bere z webu Nezávislých (barvy, písma, dialog), viz [Oblasti a web](oblasti-a-web.md#vzhled).
