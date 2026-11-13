# Alternativní mluvčí

*Návrh z 12. 11. 2026, rozhodnutý a v kódu 13. 11. 2026 (krok 8.15 v [plan-mvp.md](plan-mvp.md)). Téhož dne přepracovaný podle Tomášovy představy „sluníčka“ kolem tlačítka. Je to rozšíření MVP pro zkušební a vývojový provoz, zadal ho Tomáš.*

## Proč

Aby z webu nečpěla úředničina a byl přívětivý a lehce humorný pro toho, kdo o to stojí. Tomáš 13. 11. 2026: „toto není politický a absolutně korektní prezentace“. Postavy proto mají ve zkušebním a vývojovém provozu skutečná jména a zadání stylu se drží postavy bez ohledu na web, jeho účel a obsah otázky.

Styl patří k přímému namlouvání vzkazu a dotazu, ne ke starým odpovědím. U ukázek v přehledu témat mluvčí nejsou.

## Jak to funguje

**Sluníčko kolem tlačítka.** Kolem velkého kulatého tlačítka „Namluvit vzkaz“ je osm malých kulatých ikon:

| Ikona | Styl |
|---|---|
| mikrofon | Spisovně (základ, výchozí) |
| skateboard | Bart Simpson |
| planetka s hvězdou | Malý princ |
| hrnec medu | Medvídek Pú |
| sloup | Sokrates |
| smutný robot | Marvin |
| razítko | Suchý úředník |
| brk | Staročeština |

- Ikony jsou vlastní jednoduché čárové kresby, ne obrázky postav.
- Ťuknutí na ikonu nahrávání nespustí. Velké tlačítko se promění v postavu: dostane její ikonu, oranžovou barvu a popisek „Namluvit jako Marvin“.
- Nahrávat se začne až ťuknutím na velké tlačítko. Stejně funguje „Raději napíšu“.
- Pod sluníčkem je nápověda „Ťukněte na postavu kolem tlačítka a vzkaz i odpověď převypráví svým hlasem.“ a rozbalovací „Jak to funguje?“ podle Tomášova popisu:
  - ucho vzkaz vždy převede do spisovné češtiny a postava ho pak převypráví;
  - odpověď může ucho najít na webu obce a v jejích dokumentech, pak ji postava převypráví a věcná odpověď se zdroji zůstane vidět, jinak odpoví člověk, třeba zastupitel nebo pracovník obecního úřadu;
  - kdo bude vzkaz číst, si ho bude moci přepnout do kteréhokoli stylu, styl, ve kterém ho autor pošle, mu ale napoví jeho náladu nebo roli;
  - nic vážného, jen pro zpestření všedního dne, na druhé straně jsou lidé jako vy.
- Kdo odpoví, popis neurčuje: může to být zastupitel, pracovník obecního úřadu, nebo odpověď najde ucho přímo v dokumentech (Tomáš 13. 11. 2026). Přepínání stylu pro čtenáře vzkazu přijde s ukládáním vzkazů a administrací, proto „bude moci“.
- Bez skriptu zůstane jen tlačítko.

**Kontrola vzkazu.** Nad textem vzkazu je řada „Kdo vzkaz řekne“ se stejnými styly (ikona a jméno):

- Se zvolenou postavou AI nejdřív upraví vzkaz do spisovné češtiny jako dosud a postava ho pak přepíše svým hlasem. Mezitím je vidět „Marvin si vzkaz přebírá…“.
- Styl jde přepnout zpět na Spisovně nebo na jinou postavu. Hotové texty postav se pamatují, dokud autor nezmění spisovné znění.
- Text postavy je jen k přečtení. Opravy se dělají ve spisovném znění, postava ho pak přepíše znovu.
- Potvrzení kontroluje a odpověď hledá podle spisovného znění. Přepis postavou by hledání zhoršil.
- Po potvrzení je vidět text postavy a poznámka „Vzkaz ve stylu: Marvin. Odpověď hledáme podle spisovného znění.“

**Odpověď.** Postava zvolená při potvrzení převypráví:

- odpověď z webu;
- zprávu, že odpověď na webu není („Odpověď na tento dotaz jsme na webu obce ani na webu Nezávislých pro Příšovice nenašli. Až bude ucho v ostrém provozu, odpoví na takový dotaz člověk, třeba zastupitel nebo pracovník obecního úřadu.“).

Převyprávění je v čárkovaném rámečku „Odpovídá Marvin · pro pobavení“ hned pod nadpisem odpovědi. Věcná odpověď, citace, zdroje a upozornění jsou pod ním beze změny. Při výpadku AI postava nemluví, autor má hledat znovu.

## Co se nemění

- Věcná odpověď, citace, zdroje a upozornění, že nejde o úřední vyjádření obce, zůstávají vždy vidět.
- Převypráví se jen odpověď, která prošla ověřením (F-75), nebo pevná zpráva serveru, že odpověď není.
- Výchozí styl je Spisovně, stránka si volbu mezi návštěvami nepamatuje.
- AI s autorem dál nevede dialog.

## Postavy

Zadání postav je v `src/lib/odpovedi/styl.ts` (`POSTAVY`). Každé popisuje postavu, její řeč a svět:

| Mluvčí | Styl |
|---|---|
| Bart Simpson | drzý rošťák ze Springfieldu, hovorově, tyká, „Ay caramba!“, Homer, Líza, Milhouse, Skinner, Vočko |
| Malý princ | poeticky, s dětským údivem nad dospělými a jejich čísly, růže, liška, baobaby |
| Medvídek Pú | medvídek s malým rozumem, med, svačinka, bručánky, Kryštůfek Robin, Prasátko, Ijáček |
| Sokrates | krátký dialog na agoře, „příteli“, otázky a odpovědi, „vím, že nic nevím“, daimonion |
| Marvin | depresivní android s mozkem velikosti planety, povzdechy, bolavé diody na levé straně |
| Suchý úředník | kancelářský sloh, „v návaznosti na Váš dotaz Vám sdělujeme“, „S pozdravem, referent“ |
| Staročeština | kronikář, „jest“, „vězte“, „pravím vám“, „léta Páně“, rychtář a konšelé |

Zadání nesmí obsahovat číslici, hlídá to test. Číslo by model mohl přenést do textu a kontrola by text zamítla.

Vzkaz přepisuje postava v první osobě za autora a obrací se na obec (od verze 4 zadání ne na zastupitele, odpovídat může i obecní úřad). Zachová, co autor navrhuje, na co se ptá a co mu vadí.

## Pojistky

Společná pravidla v zadání jsou jen technická:

- každé číslo, datum, čas a částku z textu napsat číslicemi;
- žádné jiné číslo číslicemi nepsat;
- fakta neměnit a nevymýšlet nová;
- stručnost;
- obyčejný text bez Markdownu a značek.

Kód pak kontroluje:

1. **Čísla.** Každé číslo z textu musí zůstat a žádné jiné nesmí přibýt. U odpovědi smí postava zopakovat čísla z dotazu a z otázek částí. „4 000“, „4.000“ a „4000“ jsou totéž, stejně jako „07.30“ a „7:30“.
2. **Číslovky.** Číslovku ze slov textu smí postava napsat číslicí („jedno procento“ → „1 procento“). Povinné číslo smí napsat slovy („15 bytů“ → „patnáct bytů“), kromě jedničky, protože „je mi to jedno“ není údaj.
3. **Délka.** Nejvýš 1 000 znaků, nebo čtyřnásobek textu, když je delší.
4. **Čištění.** Kód odstraní Markdown a zopakované nebo pokažené značky ze zadání. Scénické poznámky jako „\*povzdech\*“ dá do závorky.

Když kontrola neprojde, AI dostane druhý pokus. Když neprojde ani ten:

- u vzkazu: „Marvin to tentokrát nezvládl. Vzkaz zůstává spisovně.“;
- u odpovědi: „Marvin to tentokrát nezvládl. Platí věcný text níže.“

Ověřovací model se nepoužívá. Hlídal by tón a posměch, a to podle pokynu Tomáše nechceme. Fakta beze změny čísel kód nezkontroluje: postava občas věc zjednoduší nebo přibarví (viz níže).

## Technika

- **Kód:**
  - logika je v `src/lib/odpovedi/styl.ts`, který nezná Astro ani Hono;
  - klíče, jména a popisky tlačítka jsou v `src/lib/odpovedi/mluvci.ts`, ikony v `src/lib/odpovedi/ikony-stylu.ts`;
  - zadání postav do prohlížeče nejdou;
  - požadavky zpracuje `src/lib/odpovedi/zpracovani-stylu.ts`;
  - sluníčko a volba při kontrole jsou v `src/components/Podani.astro` a `src/skripty/podani.ts`, volání serveru a rámeček odpovědi v `src/skripty/mluvci.ts`.
- **Rozhraní:**
  - `POST /ucho/api/vzkaz/styl` s tělem `{ mluvci, text }` přepíše vzkaz. Text má 10 až 4 000 znaků jako u AI úpravy.
  - `POST /ucho/api/odpoved/styl` s tělem `{ mluvci, podklad, podpis }` převypráví odpověď.
  - Oba vrátí `prevypraveno` s textem, nebo `nezvladl` s důvodem.
- **Podpis odpovědi:**
  - Server k odpovědi a ke zprávě, že odpověď není, přidá podklad (dotaz a věty) s podpisem HMAC-SHA256.
  - Převypráví jen podepsaný podklad. Bez podpisu by z koncového bodu byla volná služba, která komukoli zdarma přepíše libovolný text.
  - Vzkaz podpis nemá. Je to stejný druh vstupu jako u AI úpravy (`/vzkaz/text`), proti zneužití chrání délka a limit požadavků.
  - Klíč je Workers Secret `KLIC_PODPISU`. Lokální vývoj má pevný klíč.
- **Limit:** postavy mají vlastní limiter `STYL_RATE_LIMITER`, 20 požadavků za minutu z jedné adresy. Přepínání postav při kontrole tak nezablokuje podání ani dotaz.
- **Ukládání:** nic se neukládá. Do logu jde jen co (vzkaz nebo odpověď), mluvčí, výsledek kontroly, počet pokusů, čas a verze zadání, nikdy text.
- **Model:** stejná Gemma 4 26B jako u odpovědi, teplota 0,9.
  - Odpověď: nejvýš 700 tokenů, limit 30 s.
  - Vzkaz: nejvýš 3 000 tokenů podle délky vzkazu, limit 45 s.
- **Lokální vývoj:** falešná AI vrátí vzkaz i odpověď beze změny s poznámkou, že styl se lokálně nezkouší.

## Zkouška se skutečnou AI (13. 11. 2026)

Nástroj `npx tsx nastroje/zkouska-mluvcich.ts [id ukázky …]` převypráví vybrané odpovědi všemi postavami. S přepínačem `--vzkazy` přepíše vzkazy autorů. Výsledky ukládá do složky dat mimo repozitář.

**Odpovědi** (ukázky 01, 03, 08, 10, 15 a dotaz na dvě věci):

| Běh | Zadání | Prošlo | Na první pokus | Čas (medián / nejdéle) | Co neprošlo |
|---|---|---|---|---|---|
| 1 | verze 1 | 32 ze 42 | 29 | 5,6 s / 20,0 s | Sokrates 6× příliš dlouhý, Medvídek Pú 2× příliš dlouhý, „jedno procento“ jako „1“ |
| 2 | verze 2: stručnost, krátký dialog Sokrata, čištění značek | 38 ze 42 | 37 | 3,2 s / 8,8 s | čtyřikrát „1 procento“ u ukázky o úvěru |
| 3 | verze 2 a číslovky slovy, ukázky 10, 04, 16 | 21 z 21 | 19 | 4,7 s / 10,6 s | nic |

**Vzkazy** (verze 3, dotaz na sál Sokolovny, návrh laviček, stížnost na parkování, dotaz na dar při narození dítěte): 28 z 28 na první pokus, medián 2,7 s. Jednou Medvídek Pú 34,7 s, při sedmi postavách souběžně.

Co je vidět při čtení:

- Styl postav sedí:
  - Bart je drzý a hovorový;
  - Marvin si povzdychne a stěžuje si na diody;
  - úředník píše „v předmětné věci“ a podepíše se „referent“;
  - Staročeština píše „vězte“ a „pravím vám“.
- U vzkazů postava zachová, co autor chce: lavičky a koš, parkování na trávě, cenu sálu.
- Čísla, data a částky zůstávají přesně, to hlídá kód.
- Postava občas věc zjednoduší nebo přibarví, a to kód nepozná:
  - Marvin napsal, že obec cenu sálu „zvýšila“, odpověď říká „upravila“;
  - Bart a Medvídek Pú napsali, že velké haly u Písečáků „se stavět nebudou“, odpověď říká, že omezení výstavby zůstává v platnosti.
- Gemma občas pokazí slovo nebo vloží cizí znak (azbuku nebo polské „ś“).

Proto je odpověď postavy vždy v rámečku „pro pobavení“ a věcná odpověď se zdroji hned pod ní.

## Nasazení

- Tajný klíč `KLIC_PODPISU` je náhodná hodnota nahraná 13. 11. 2026 přes `wrangler secret put`. Není v repozitáři ani ve výpisu. Když se změní, podpisy dříve vydaných odpovědí přestanou platit. Nové odpovědi fungují hned.
- První verze s tlačítky pod odpovědí a u ukázek: Worker 37baf02f z commitu 7f0efcd, nápověda u ukázek ve verzi b8a4fdd4. Na ostré adrese převyprávěl Marvin ukázku o lékárně a Bart novou odpověď na cenu sálu, podvržený podklad server odmítl (403).
- Sluníčko a vzkaz hlasem postavy: Worker 15f88715 z commitu 1c93812 s limiterem `STYL_RATE_LIMITER`. Ověření na ostré adrese:
  - sluníčko má 8 ikon a ťuknutí na Marvina promění tlačítko v „Namluvit jako Marvin“, panel se neotevře;
  - Staročeština přepsala návrh dvou laviček na první pokus za 2,0 s, číslo 2 zůstalo;
  - nový dotaz na lékárnu přišel s podpisem a Medvídek Pú ho převyprávěl na první pokus za 2,7 s;
  - převyprávění ukázky server odmítl (403) a v přehledu témat mluvčí nejsou.
- Zvuk (čtení nahlas) zatím ne. Kdyby přišel, tak jen obecným syntetickým hlasem, nikdy napodobením hlasu konkrétního herce z dabingu.
