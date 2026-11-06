# Hlasové modely: zjištění z jiného projektu

*Stav k 1. 11. 2026, výběr modelu AI úpravy k 6. 11. 2026. Zdroj: `lessons-learned.md` z projektu Podcast Language Learning App (jen ke čtení). Poslední doložené pokusy jsou z 16. 10. 2026. Modely, ceny a termíny v části o tom projektu jsou údaje z té doby, ne nově ověřená nabídka.*

Projekt zkoušel hlasovou výuku angličtiny přes OpenAI Realtime, Speechmatics, agenta ElevenLabs a Gemini TTS. Testovalo se hlavně v Chromu na Androidu. Přepis české řeči v něm systematicky ověřený není.

## Co z toho plyne pro Příšovické ucho

1. **Testovat na skutečném telefonu.** Desktop, simulované zobrazení ani mock nestačí. U F-05 to znamená Chrome na Androidu i Safari na iOS. iOS se v tom projektu netestoval.
2. **Nahrát, odeslat, přepsat.** Na zpracování jednoho vzkazu stačí požadavek a odpověď. Realtime spojení otevírané při každém klepnutí (agent ElevenLabs) mělo na telefonu nepředvídatelnou latenci, až desítky sekund. Živý přepis (F-08) by realtime spojení potřeboval, proto dává smysl nechat ho ve stavu Zvážit.
3. **Měřit latenci po krocích.** Odeslání nahrávky, přepis, AI úpravu a hledání podobných témat měřit zvlášť a ukládat k požadavku.
4. **Počítat s chováním telefonu.** Po zamčení se zvuk v prohlížeči může uspat. Bluetooth sluchátka po zapnutí mikrofonu přepnou profil. Uživatel má vidět, že se čeká, a mít možnost zrušit.
5. **Konfiguraci držet v repozitáři.** Prompty, slovník místních názvů a limity patří do kódu a na server, ne do nastavení u poskytovatele.
6. **Klíče jen na serveru.** Do prohlížeče nanejvýš krátkodobý token.

## Výběr modelu přepisu

PRD počítá s `whisper-large-v3-turbo` na Workers AI a alternativou Deepgram Nova-3. Vybrat se má po testu na 20 až 30 reálných nahrávkách. Z lessons-learned k tomu:

- Měnit vždy jen jeden faktor a výstupy hodnotit naslepo.
- Malý vzorek neprokazuje stabilitu. U generativního hlasu dostaly dvě stejně zadané ukázky za češtinu 5/5 a 3/5.
- Speechmatics (Realtime STT) fungoval jen na desktopu, na telefonu se nezkoušel a druhý den byl revertován. Umí jeden jazyk na session, což tady nevadí, protože se mluví česky.
- Další kandidáti z katalogu, žádný z nich pro češtinu ověřený: AssemblyAI, Soniox, ElevenLabs (`scribe_v2`), Gemini, OpenAI.
- Druhého poskytovatele přidávat, až když měření ukáže problém s cenou nebo kvalitou prvního.

**První měření `whisper-large-v3-turbo` (6. 11. 2026):** model přijal WebM/Opus z Edge a Opery ve Windows a přepsal 2:59 vcelku za 21,6 s. Šlo o syntetický hlas bez nápovědy `initial_prompt`, takže to není vyhodnocení kvality. To přinese až testovací sada z kroku 3.5. Podrobnosti jsou v [test-zarizeni.md](test-zarizeni.md).

## Výběr modelu AI úpravy

**První porovnání (6. 11. 2026).** Není to slepý test z kroku 3.6, ale rychlé srovnání, aby šla úprava zkoušet na stránce. Vzorků bylo šest: přepis 3minutové a krátké nahrávky ze syntetického hlasu, hovorový text, text s chybami, pochvala a pokus o podstrčení pokynů. Všechny modely měly stejný prompt a teplotu 0,2. Hodnotil jsem je sám a ne naslepo. Skutečné vzkazy od lidí v porovnání nebyly.

| Model | Uvažování | 3 minuty řeči (2 100 znaků) | Krátký vzkaz | Výsledek |
|---|---|---|---|---|
| Gemma 4 26B | vypnuté | 7–15 s | 1–5 s | **Vybraný předběžně.** Nejlepší velká písmena, jména a otazníky |
| Gemma 4 26B | zapnuté | přes 150 s | 66–82 s | Text nejlepší, pro čekání na stránce nepoužitelné |
| Nemotron 3 Super | vypnuté | 7–9 s | 1–3 s | Nejvěrnější, ale opravuje málo: „k písečákům“, „pro ní“, „Mě by zajímalo ta kanalizace“, „Děkuju“ |
| Nemotron 3 Super | nízké | 11 s | 2–3 s | Přidá otazníky, zbytek chyb zůstává |
| Nemotron 3 Super | plné | 38 s | 14–22 s | Lepší věty, ale pomalé a „vyjíždět“ změnil na „vjíždět“ |
| Mistral Small 3.1 | – | 14 s | 1–6 s | Vypadl v prvním kole: přidal „dlaždic“ a „korun“, u dlouhého textu vrátil neplatný JSON |
| DeepSeek V4.1 Flash | – | – | – | Nezkoušeno, na Workers Free plan není dostupný (chyba 5035) |

**Co Gemmě zůstává** (bez uvažování, po úpravě promptu, ve dvou opakováních skoro stejné):

- Přidává slova: „zpomalovací zařízení, například retardér“ místo „retardér“ a někdy „rozbitých částí“. To porušuje práh „nepřidá nic, co autor neřekl“, takže v kroku 3.6 zatím neprojde.
- Mění odstín: „hrůzná“ místo „hrůza“.
- Neopraví všechno: „výjíždět“, „vyjde jednu domácnost“, někdy nechá „A taky“.
- Umí chybu i přidat: „auta ježdí“, i když přepis měl „jezdí“ správně.
- Slovo, které nezná, nahradí jiným. Než se „přísálí Sokolovny“ dostalo do seznamu názvů, psala „předsíň“ a v prvním kole „přilehlost“. Bez pádů v seznamu napsala i „ze Sviján“. Totéž se může stát u jiných místních výrazů.
- Obsahové chyby přepisu opravit nemůže. „Kdokoliv to“ místo „kdo koryto“ změnila na „kdo to“, takže věta dává smysl, ale jiný než autor řekl. Proto je nutné potvrzení autorem v kroku 4.

Pokus o podstrčení pokynů žádný model neposlechl. Všechny ale větu s pokynem z upraveného textu vypustily, zůstala jen v surovém přepisu. U skutečné stížnosti se to stát nesmí, patří to proto do testovací sady.

**Uhlazení jazyka (6. 11. 2026, prompt verze 2).** Po třech namluvených vzkazech chtěl Tomáš jazyk uhladit. Verze 1 opravuje pravopis, ale mluvené věty nechává skoro beze změny. Přibyly proto čtyři vzorky: vymyšlené mluvené vzkazy s vycpávkami, opravami v řeči a dlouhými souvětími. Ze skutečných vzkazů nevychází ani jeden, text se neukládá. Model i teplota zůstaly stejné, měnil se jen prompt. Hodnotil jsem sám a ne naslepo.

| Znění promptu | Výsledek |
|---|---|
| Verze 1 | Věrná, ale mluvená: „na tu kanalizaci“, „Jestli mi může někdo říct, kdy to bude, bylo by fajn“, „Minulý týden, tedy předminulý týden“ |
| Silné přeformulování (jen zkouška) | Hladké, ale úřední a s chybami: „Domnívám se“, „Automobily“, „stát cena za připojení“, „odjela nákladní auto“, „což se starší lidé bojí“. Mění i věc: „Stavíme tam dům“ místo „stavěli“, stížnost na rychlá auta se změnila na „špatný stav silnice“ |
| **Verze 2** (nasazená) | Mluvené věty přeformuluje co nejmenším zásahem, čisté nechává skoro beze změny. „Můžete mi prosím říct, kdy to bude?“ místo „to by bylo fajn“, u „minulý, teda předminulý“ jen „Předminulý týden“. Zakazuje úřední obraty, přidané úvodní věty a změnu času sloves |

Gemma prošla s verzí 2 šest vzorků dvakrát a další tři jednou, krátké vzkazy trvaly 1–4 s, 3 minuty řeči 14–15 s. Nemotron dostal stejných šest vzorků po jednom běhu. Bez uvažování nechává „k sokolovně“, „pro ní“ a otázky s tečkou, s nízkým uvažováním sklouzává k úřednímu tónu („jedná se přibližně o“). Gemma proto zůstává.

Co verze 2 u Gemmy neřeší:

- Dál přidává „nějaké zpomalovací zařízení, třeba retardér“, takže práh „nepřidá nic, co autor neřekl“ zatím nesplňuje.
- Umí vyrobit nesmysl: „dvacet metrů rozbitých metrů“ ve dvou ze tří běhů.
- Mění slova: „Zdravím“ na „Dobrý den“, „psí lejna“ na „psí exkrementy“, „hrůza“ na „hrůzná“.
- Občas vypadne drobnost: „aby bylo jasné, o co jde“, „hodně dětí“ jen jako „děti“.
- Místy nechá „zda“ nebo „tak jestli by se to dalo opravit“.
- Větu s podstrčeným pokynem dál vypouští.
- Neopraví, co Whisper špatně slyšel. Když přepis zamění slovo za jiné smysluplné, model to nepozná.

U návrhu na lavičky vyšel typ v obou bězích jako dotaz. Na hodnocení zařazení je vzorek malý, patří do kroku 3.6.

**Cena:** Gemma stojí 0,10 / 0,30 USD za milion tokenů, úprava 3minutového vzkazu vyjde s promptem verze 2 na 0,04 centu a 40 neuronů. Přepis 3 minut je 140 neuronů. Do bezplatných 10 000 neuronů denně se vejde asi 55 tříminutových vzkazů, potom na Workers Free každý další požadavek skončí chybou a autor uvidí Zkusit znovu.

## Čtení odpovědí nahlas (mimo MVP)

MVP hlas nepotřebuje, odpovědi jsou text. Kdyby se to později změnilo:

- Gemini `gemini-3.8-flash-lite-tts`, hlas Kore: v malém slepém testu vyšel celý WAV lépe než stream (čeština 5 a 3 proti 3 a 2). Generování trvalo asi 4,9–5,8 s.
- Cartesia a Qwen3-TTS: čeština neověřená.
- OpenAI podle rešerše z 13. 10. 2026 plánuje ukončit `gpt-4o-mini-tts` (6. 1. 2027) a `gpt-5.4-nano` (1. 4. 2027).
