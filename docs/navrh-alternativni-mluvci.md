# Alternativní mluvčí odpovědi

*Návrh z 12. 11. 2026, rozhodnutý a v kódu 13. 11. 2026 (krok 8.15 v [plan-mvp.md](plan-mvp.md)). Je to rozšíření MVP pro zkušební a vývojový provoz, zadal ho Tomáš.*

## Proč

Aby z webu nečpěla úředničina a byl přívětivý a lehce humorný pro toho, kdo o to stojí. Tomáš 13. 11. 2026: „toto není politický a absolutně korektní prezentace“. Postavy proto mají ve zkušebním a vývojovém provozu skutečná jména a zadání stylu se drží postavy bez ohledu na web, jeho účel a obsah otázky.

## Co to je

Pod odpovědí z webu je řada tlačítek **Převyprávět jako**:

1. Bart Simpson
2. Malý princ
3. Medvídek Pú
4. Sokrates
5. Marvin
6. Suchý úředník
7. Staročeština

Po kliknutí AI převypráví odpověď hlasem zvolené postavy. Převyprávění se ukáže v čárkovaném rámečku pod tlačítky se štítkem „Pro pobavení · jméno“ a poznámkou „Převyprávěla AI pro pobavení. Platí věcná odpověď a zdroje.“ Druhé kliknutí na stejné tlačítko rámeček zavře. Hotové převyprávění si stránka pamatuje, dokud se nezavře panel nebo neobnoví stránka.

Tlačítka jsou u zodpovězeného dotazu v panelu ucha a u zodpovězených ukázek v přehledu témat.

## Co se nemění

- Věcná odpověď, citace, zdroje a upozornění, že nejde o úřední vyjádření obce, zůstávají vždy vidět a beze změny.
- Převypráví se jen odpověď, která prošla ověřením (F-75). Dotaz u zastupitelů, nezodpovězené části dotazu, citace ani upozornění se nepřevyprávějí.
- Výchozí je vždy věcná odpověď.
- AI s autorem dál nevede dialog. Převyprávění je jedna odpověď na jedno kliknutí.

## Mluvčí

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

Zadání nesmí obsahovat číslici, hlídá to test. Číslo by model mohl přenést do textu a kontrola by převyprávění zamítla.

## Pojistky

Společná pravidla v zadání jsou jen technická:

- každé číslo, datum, čas a částku z odpovědi napsat číslicemi;
- žádné jiné číslo číslicemi nepsat;
- fakta z odpovědi neměnit a nevymýšlet k nim nová;
- stručnost: k odpovědi o jedné nebo dvou větách nejvýš pět vět, jinak nejvýš dvakrát tolik vět;
- obyčejný text bez Markdownu a značek.

Kód pak kontroluje:

1. **Čísla.** Každé číslo z vět odpovědi musí v převyprávění zůstat a žádné jiné nesmí přibýt. Čísla z dotazu a z otázek částí zopakovat smí. „4 000“, „4.000“ a „4000“ jsou totéž, stejně jako „07.30“ a „7:30“.
2. **Číslovky.** Číslovku ze slov odpovědi smí mluvčí napsat číslicí („jedno procento“ → „1 procento“). Povinné číslo smí napsat slovy („15 bytů“ → „patnáct bytů“), kromě jedničky, protože „je mi to jedno“ není údaj.
3. **Délka.** Nejvýš 1 000 znaků, nebo čtyřnásobek odpovědi, když je delší.
4. **Čištění.** Kód odstraní Markdown a zopakované značky ze zadání. Scénické poznámky jako „\*povzdech\*“ dá do závorky.

Když kontrola neprojde, AI dostane druhý pokus. Když neprojde ani ten, rámeček ukáže: „Tenhle mluvčí to tentokrát nezvládl. Platí věcná odpověď.“

Ověřovací model se oproti návrhu nepoužívá. Hlídal by tón a posměch, a to podle pokynu Tomáše nechceme. Fakta beze změny čísel kód nezkontroluje: mluvčí občas věc zjednoduší nebo přibarví (viz níže).

## Technika

- **Kód:**
  - logika je v `src/lib/odpovedi/styl.ts`, který nezná Astro ani Hono;
  - jména pro stránku jsou v `src/lib/odpovedi/mluvci.ts`, zadání postav do prohlížeče nejdou;
  - požadavek zpracuje `src/lib/odpovedi/zpracovani-stylu.ts`;
  - tlačítka a rámeček staví `src/skripty/mluvci.ts`.
- **Rozhraní:** `POST /ucho/api/odpoved/styl` s tělem `{ mluvci, ukazka }` nebo `{ mluvci, podklad, podpis }`. Vrátí `prevypraveno` s textem, nebo `nezvladl` s důvodem.
- **Podpis:**
  - Server ke každé zodpovězené odpovědi přidá podklad (dotaz a věty odpovědi) s podpisem HMAC-SHA256.
  - Převypráví jen podepsaný podklad, nebo ukázku, kterou sám najde podle id.
  - Bez podpisu by z koncového bodu byla volná služba, která komukoli zdarma přepíše libovolný text.
  - Klíč je Workers Secret `KLIC_PODPISU`. Lokální vývoj má pevný klíč.
  - Bez klíče na ostré adrese fungují jen ukázky, odpověď na dotaz tlačítka nemá.
- **Limit:** převyprávění má v limiteru vlastní počítadlo (6 za minutu z jedné adresy), aby proklikání mluvčích nezablokovalo další dotaz.
- **Ukládání:** nic se neukládá. Do logu jde jen mluvčí, zdroj (ukázka nebo odpověď), výsledek kontroly, počet pokusů, čas a verze zadání, nikdy text.
- **Model:** stejná Gemma 4 26B jako u odpovědi, teplota 0,9, nejvýš 700 tokenů, limit 30 s.
- **Lokální vývoj:** falešná AI vrátí odpověď beze změny s poznámkou, že styl se lokálně nezkouší.

## Zkouška se skutečnou AI (13. 11. 2026)

Nástroj `npx tsx nastroje/zkouska-mluvcich.ts [id ukázky …]` převypráví vybrané odpovědi všemi mluvčími. Výsledky ukládá do složky dat mimo repozitář. Bez id vezme ukázky 01, 03, 08, 10, 15 a dotaz na dvě věci (vlak a náhradní autobus).

| Běh | Zadání | Prošlo | Na první pokus | Čas (medián / nejdéle) | Co neprošlo |
|---|---|---|---|---|---|
| 1 | verze 1 | 32 ze 42 | 29 | 5,6 s / 20,0 s | Sokrates 6× příliš dlouhý, Medvídek Pú 2× příliš dlouhý, „jedno procento“ jako „1“ |
| 2 | verze 2: stručnost, krátký dialog Sokrata, čištění značek | 38 ze 42 | 37 | 3,2 s / 8,8 s | čtyřikrát „1 procento“ u ukázky o úvěru |
| 3 | verze 2 a číslovky slovy, ukázky 10, 04, 16 | 21 z 21 | 19 | 4,7 s / 10,6 s | nic |

Co je vidět při čtení:

- Styl postav sedí. Bart je drzý a hovorový, Marvin si povzdychne a stěžuje si na diody, úředník píše „v předmětné věci“ a podepíše se „referent“, Staročeština píše „vězte“ a „léta Páně“.
- Čísla, data a částky zůstávají přesně, to hlídá kód.
- Mluvčí občas věc zjednoduší nebo přibarví, a to kód nepozná:
  - Marvin napsal, že obec cenu sálu „zvýšila“, odpověď říká „upravila“;
  - Bart a Medvídek Pú napsali, že velké haly u Písečáků „se stavět nebudou“, odpověď říká, že omezení výstavby zůstává v platnosti.
- Gemma občas pokazí slovo nebo vloží cizí znak (azbuku nebo polské „ś“).

Proto je u převyprávění vždy štítek „Pro pobavení“ a věcná odpověď se zdroji hned nad ním.

## Než se nasadí

1. Vytvořit tajný klíč na ostré adrese: náhodná hodnota přes `wrangler secret put KLIC_PODPISU`, nikdy do repozitáře ani do výpisu.
2. `npm run deploy` a vyzkoušet na ostré adrese ukázku i nový dotaz.
3. Zvuk (čtení nahlas) zatím ne. Kdyby přišel, tak jen obecným syntetickým hlasem, nikdy napodobením hlasu konkrétního herce z dabingu.
