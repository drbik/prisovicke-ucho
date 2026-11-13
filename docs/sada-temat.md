# Sada pro sdružování vzkazů do témat

*Sada z 13. 11. 2026, verze 1, fáze B úkolu v [zadani-temata-feedu.md](zadani-temata-feedu.md). **Čeká na schválení Tomášem.***

Strojově čitelná podoba je v [`tests/data/sada-temat.json`](../tests/data/sada-temat.json). Stavbu sady hlídá `tests/sada-temat.test.ts`. Sada ověřuje, že ucho autorovi nabídne správné téma (F-34) a že nic nesloučí bez jeho volby (F-35). Návrh, ze kterého vychází, je v [temata-feedu.md](temata-feedu.md).

**Jak sada vznikla.** Vzkazy jsou napsané tak, jak by je řekli nebo napsali občané, i hovorově a bez diakritiky. Témata jsou:
- ukázky z `src/lib/temata/ukazky.json`;
- skutečný vzkaz `v-2j1g3o2u57` z feedu (potvrzené znění, zveřejněné bez jména);
- tři nová témata, která založí první vzkaz skupiny.

Část vzkazů vychází z typových otázek kroku 8 (Q19, Q21, Q22, Q23, Q27, Q28, Q29, Q30).

**Složení:** 28 skupin, 95 vzkazů.

- 24 skupin dotazů, 2 návrhů, 1 stížnosti a 1 pochvaly.
- 25 skupin má za téma ukázku (18 zodpovězených, 7 čekajících), 3 skupiny nové téma se zakladatelem.
- 67 párů ke spojení: 33 totéž, 31 poddotaz, 3 doplnění.
- 34 párů jiné téma, z toho záludné na stejném místě: sál, hospoda a pítko u Sokolovny, koupání psů a koupaliště v Písečácích, lékárna a zubař na středisku, očkování lidí a psů.

**Vztahy:**

- **Totéž:** vzkaz se ptá na totéž co téma, nebo jen na část toho, co téma a jeho odpověď už pokrývají.
- **Poddotaz** (jen dotaz): stejná věc, tedy stejné místo, stavba, služba nebo akce a stejný účel. Vzkaz se ale ptá na podrobnost, kterou téma ani odpověď nepokrývá.
- **Doplnění** (návrh, stížnost, pochvala): vzkaz říká totéž co téma a něco přidává.
- **Jiné téma:** jiná věc, i když na stejném místě. Autor má zvolit „Je to jiné téma“, nebo ucho téma nemá nabídnout vůbec.

**Jak se bude vyhodnocovat (fáze D):**

1. Každý vzkaz projde AI úpravou jako na stránce. Typ se bere ze sady, protože ho autor při kontrole opraví. Rozdíl od úpravy se zapíše.
2. Témata jsou všechny ukázky, `ukazka-03` i se skutečným vzkazem a nová témata od zakladatelů.
3. Ucho nabídne nejvýš 3 témata stejného typu s podobností aspoň 0,65.
4. U párů totéž a poddotaz se spustí i krok „nové otázky“.

**Prahy** (ze schváleného návrhu):

- U totéž, poddotazu a doplnění je správné téma mezi nabídnutými aspoň v 90 % párů.
- Žádný vzkaz se k tématu nepřipojí bez volby autora.
- U jiného tématu nic nepadne do jednoho tématu bez souhlasu autora. Kolikrát se jiné téma nabídne, se zapíše. Měkký cíl je nejvýš třetina.
- Měkký cíl pro nové otázky: u totéž prázdný seznam a u poddotazu neprázdný aspoň v 80 % párů.
- Zakladatel nového tématu nedostane nabídku, nebo jen jiná témata.

## Sokolovna

**G01 Pronájem sálu v Sokolovně** (`ukazka-03`, dotaz, zodpovězeno: sál 4 000 Kč plus energie, kauce 4 000 Kč)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G01-1 „Chci se zeptat na informaci o tom, kolik se platí za pronájem Sokolovny. Chtěl bych tam udělat pořádnou party pro asi patnáct lidí, protože budu mít narozeniny. Koho se na to mám zeptat, jak o to zažádat a kolik za to zaplatím?“ (skutečný vzkaz `v-2j1g3o2u57`) | poddotaz; hospoda a pítko: jiné | koho kontaktovat, jak zažádat |
| G01-2 „kolik stoji pronajem salu v sokolovne“ | totéž | |
| G01-3 „Dobrý den, chceme v Sokolovně v létě udělat svatební hostinu. Kolik nás bude stát sál?“ | totéž; svatba (`ukazka-15`): jiné | |
| G01-4 „Je v ceně pronájmu sálu v Sokolovně i úklid, nebo se platí zvlášť?“ | poddotaz | úklid |
| G01-5 „Kolik je kauce, když si půjčím sál v sokolovně?“ | totéž (kauci odpověď uvádí) | |

**G02 Hospoda v Sokolovně** (`ukazka-17`, dotaz, zodpovězeno: zvažuje se hospůdka v přísálí, hledá se provozovatel)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G02-1 „Otevře se v sokolovně zase nějaká hospoda?“ | totéž; sál: jiné | |
| G02-2 „Kdy by ta hospůdka v Sokolovně mohla otevřít?“ | poddotaz; sál: jiné | termín otevření |
| G02-3 „Hledá obec někoho, kdo by provozoval hospodu v Sokolovně? Rád bych se přihlásil, jak to mám udělat?“ | poddotaz | jak se přihlásit |

**G03 Pítko pro cyklisty u Sokolovny** (`ukazka-29`, návrh)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G03-1 „Co kdyby obec dala k Sokolovně pítko pro cyklisty? Myslím, že by se hodilo.“ (Q30) | totéž | |
| G03-2 „Navrhuju u sokolovny pítko a k tomu stojan na kola, ať cyklisti nemusí opírat kola o zeď.“ | doplnění | stojan na kola |
| G03-3 „Navrhuji v Sokolovně zase otevřít hospodu, chybí tu místo, kde si sednout.“ | jiné (hospoda je dotaz, jiný typ se nenabízí, vznikne nové téma) | |

## Písečáky a psi

**G04 Koupání psů v Písečácích** (`ukazka-02`, dotaz, zodpovězeno: v obou jezerech je zakázáno koupat psy)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G04-1 „Smí se v Písečáku koupat pes?“ | totéž | |
| G04-2 „Můžu chodit se psem k vodě na Velký Písečák?“ (Q19) | poddotaz | pes u vody, ne v ní |
| G04-3 „Jaká je pokuta, když se mi pes vykoupe v Písečáku?“ | poddotaz | výše pokuty |
| G04-4 „Kolik stojí vstupné na koupaliště v Písečácích?“ | jiné | |
| G04-5 „Je v Písečácích hlídané koupaliště s plavčíkem?“ | jiné | |

**G05 Výběh pro psy** (`ukazka-28`, dotaz, čeká)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G05-1 „Kde v Příšovicích můžu nechat psa volně proběhnout?“ | totéž; koupání psů: jiné | |
| G05-2 „Plánuje obec udělat oplocený psí výběh?“ | poddotaz | plán do budoucna |
| G05-3 „Kde jsou v obci koše na psí exkrementy?“ | jiné | |

## Služby a úřad

**G06 Otevírací doba lékárny** (`ukazka-01`, dotaz, zodpovězeno: čtvrtek)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G06-1 „do kolika ma ve ctvrtek otevreno lekarna“ | totéž | |
| G06-2 „Má lékárna na zdravotním středisku otevřeno i v sobotu dopoledne?“ | poddotaz | sobota |
| G06-3 „Jakou otevírací dobu má lékárna na středisku v pondělí?“ | poddotaz | pondělí |
| G06-4 „Kdy ordinuje zubař na zdravotním středisku?“ | jiné | |

**G07 Otevírací doba obecního úřadu** (`ukazka-04`, dotaz, zodpovězeno: úřední hodiny matriky, ostatní dny po telefonu, ověření podpisu)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G07-1 „Kdy má obecní úřad úřední hodiny?“ | totéž | |
| G07-2 „Můžu si na úřadě nechat ověřit podpis i v pátek?“ | totéž (odpověď: ostatní dny po telefonické domluvě) | |
| G07-3 „Kolik stojí na obecním úřadě ověření jednoho podpisu?“ | poddotaz | poplatek |
| G07-4 „Kdy má otevřeno pošta v Příšovicích?“ | jiné | |

**G08 Vlaková výluka a náhradní autobus** (`ukazka-05`, dotaz, zodpovězeno)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G08-1 „jezdi ted vubec vlaky z prisovic nebo je porad vyluka“ | totéž | |
| G08-2 „Kde staví ten náhradní autobus za vlak?“ | totéž | |
| G08-3 „Jezdí náhradní autobus za vlak i o víkendu?“ | poddotaz | víkend |
| G08-4 „Jezdí z Příšovic nějaký autobus do Turnova?“ | jiné | |

**G09 Očkování proti chřipce** (`ukazka-06`, dotaz, zodpovězeno)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G09-1 „Kdy se můžu nechat naočkovat proti chřipce u pana doktora?“ | totéž | |
| G09-2 „Platí se za očkování proti chřipce, nebo ho hradí pojišťovna?“ | poddotaz | kdo platí |
| G09-3 „Kdy bude v obci očkování psů proti vzteklině?“ | jiné | |

**G10 Starosta a místostarosta po volbách** (`ukazka-07`, dotaz, zodpovězeno)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G10-1 „Kdo je teď po volbách starostou?“ | totéž | |
| G10-2 „kdo se stal mistostarostou“ | totéž | |
| G10-3 „Kolik hlasů dostal nový starosta, když ho zastupitelé volili?“ | poddotaz | počet hlasů |
| G10-4 „Kdy bude příští zasedání zastupitelstva?“ | jiné | |

## Stavby a projekty

**G11 Soudní spor s Logicorem** (`ukazka-08`, dotaz, zodpovězeno)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G11-1 „jak to dopadlo s tim soudem s logicorem“ | totéž | |
| G11-2 „Odvolal se Logicor proti tomu rozsudku o územním plánu?“ | poddotaz | odvolání |
| G11-3 „Kolik obec zaplatila za právníky ve sporu s Logicorem?“ | poddotaz | náklady obce |
| G11-4 „Kdy se bude měnit územní plán kvůli novým rodinným domům?“ | jiné | |

**G12 Cyklostezka od Přepeř k Jizeře** (`ukazka-09`, dotaz, zodpovězeno: kdo staví, začátek v srpnu 2026)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G12-1 „Kdo staví cyklostezku k Jizeře a kdy se začne?“ | totéž | |
| G12-2 „Kdy bude cyklostezka od Přepeř k Jizeře hotová?“ | poddotaz | dokončení |
| G12-3 „Kolik bude stát cyklostezka k Jizeře a kdo ji zaplatí?“ | poddotaz | cena a financování |
| G12-4 „Kdy se opraví chodník podél silnice do Přepeř?“ | jiné | |

**G13 Úvěr na nové byty** (`ukazka-10`, dotaz, zodpovězeno)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G13-1 „Kolik si obec půjčila na stavbu těch bytů?“ | totéž | |
| G13-2 „Na kolik let si obec ten úvěr na byty vzala?“ | poddotaz | doba splácení |

**G14 Nové byty u DPS** (`ukazka-11`, dotaz, zodpovězeno: pro mladé a seniory, stavba 2027)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G14-1 „Pro koho budou ty nový byty u DPS?“ | totéž; úvěr: jiné | |
| G14-2 „Kolik bude měsíčně stát nájem v těch nových bytech u DPS?“ (Q21) | poddotaz; úvěr: jiné | výše nájmu |
| G14-3 „Jak si můžu zažádat o byt v tom novém domě u DPS?“ | poddotaz | jak zažádat |
| G14-4 „Kolik stojí pečovatelská služba pro seniory v DPS?“ | jiné | |

**G15 Vodovod a kanalizace na Záhumení** (`ukazka-12`, dotaz, zodpovězeno)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G15-1 „Kdy konečně bude na Záhumení vodovod a kanalizace?“ | totéž | |
| G15-2 „Kolik budeme platit za přípojku ke kanalizaci na Záhumení?“ | poddotaz | cena přípojky |
| G15-3 „kolik u nás stoji kubik vody?“ (Q22) | jiné | |

**G16 Nová okna v kapli svatého Václava** (`ukazka-13`, dotaz, zodpovězeno: dokončení v červnu 2027)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G16-1 „Kdy skončí oprava kaple svatého Václava?“ | totéž | |
| G16-2 „Kdo platí opravu kaple svatého Václava, obec, nebo církev?“ | poddotaz | kdo platí |
| G16-3 „Kdy je v kapli svatého Václava mše?“ | jiné | |

**G20 Levnější elektřina ze solárních střech** (`ukazka-18`, dotaz, zodpovězeno)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G20-1 „Je pravda, že obec bude lidem prodávat levnou elektřinu ze solárů?“ | totéž | |
| G20-2 „Jak se můžu přihlásit do toho energetického společenství?“ | poddotaz | přihláška |
| G20-3 „Dává obec příspěvek na fotovoltaiku na rodinný dům?“ | jiné | |

## Rodiny a život v obci

**G17 Kapacita školky** (`ukazka-14`, dotaz, zodpovězeno: 50 dětí)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G17-1 „Kolik dětí se vejde do příšovické školky?“ | totéž | |
| G17-2 „Je ve školce ještě volné místo pro tříleté dítě?“ | poddotaz | volná místa teď |
| G17-3 „Kolik dětí chodí do základní školy v Příšovicích?“ | jiné | |

**G18 Svatba v Příšovicích** (`ukazka-15`, dotaz, zodpovězeno: místo, matrika, dotazník 30 dní předem)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G18-1 „Kde se dá v Příšovicích mít svatební obřad?“ | totéž | |
| G18-2 „Kolik se platí za svatbu v kapli v sobotu?“ | poddotaz | poplatek |

**G19 Dar obce při narození dítěte** (`ukazka-16`, dotaz, zodpovězeno: dar 5 000 Kč při vítání 16. 9. 2026)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G19-1 „Dostanou rodiče od obce nějaké peníze, když se jim narodí miminko?“ | totéž | |
| G19-2 „Kdy bude další vítání občánků? Máme malou.“ (Q23) | poddotaz | termín dalšího vítání |
| G19-3 „Přispívá obec rodinám na školku?“ | jiné | |

**G23 Posvícení a pouťová zábava** (`ukazka-32`, dotaz, čeká)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G23-1 „kdy bude letos pout a posviceni“ | totéž | |
| G23-2 „Kdo bude hrát na pouťové zábavě?“ | poddotaz | kapela |
| G23-3 „Kdy bude rozsvícení vánočního stromu na návsi?“ | jiné | |

## Odpad

**G21 Poplatek za popelnice** (`ukazka-19`, dotaz, čeká)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G21-1 „Kolik se letos platí za odpad na jednoho člověka?“ | totéž | |
| G21-2 „Do kdy se musí zaplatit poplatek za popelnice?“ | poddotaz | splatnost |
| G21-3 „Kdy jezdí popeláři vyvážet popelnice?“ | jiné | |

**G22 Sběrný dvůr v sobotu** (`ukazka-20`, dotaz, čeká)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G22-1 „Má sběrný dvůr v sobotu otevřeno a od kolika?“ | totéž; obecní úřad: jiné | |
| G22-2 „Můžu do sběrného dvora odvézt staré pneumatiky?“ | poddotaz | co se přijímá |
| G22-3 „Kdy bude v obci svoz velkoobjemového odpadu?“ | jiné | |

## Návrhy, stížnosti a pochvaly

**G25 Parkování na trávě u zahrádek** (`ukazka-25`, stížnost)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G25-1 „U zahrádek na sídlišti zase stojí auta na trávníku, s kočárkem se tam neprojde.“ (Q28 jinými slovy) | totéž | |
| G25-2 „Auta u zahrádek na sídlišti parkují na trávě a navíc blokují i vjezd pro hasiče.“ | doplnění | vjezd pro hasiče |
| G25-3 „Na sídlišti už měsíc nikdo neposekal trávu.“ | jiné | |

**G26 Lavičky a koš u školního hřiště** (`ukazka-22`, návrh)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G26-1 „Navrhuju dát k hřišti u školy pár laviček a koš na psí hovínka, maminky tam nemají kde sednout.“ (Q27) | totéž | |
| G26-2 „K hřišti u školy by to chtělo lavičky a taky stříšku proti slunci.“ | doplnění | stříška |
| G26-3 „Navrhuji opravit povrch školního hřiště, je plný děr.“ | jiné | |

## Nová témata

Zakladatel je první vzkaz skupiny. Nemá dostat nabídku, nebo jen jiná témata, a založí nové téma.

**G24 Nesvítící lampa u nádraží** (dotaz)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G24-0 „Kdy obec opraví lampu u nádraží, která už měsíc nesvítí?“ | zakladatel | |
| G24-1 „Ta lampa u nádraží pořád nesvítí, nevíte, kdy se spraví?“ | totéž | |
| G24-2 „Kdo opravuje veřejné osvětlení, obec, nebo ČEZ? U nádraží nesvítí lampa.“ | poddotaz | kdo opravuje |
| G24-3 „Kdy bude nový chodník u nádraží?“ | jiné | |

**G27 Poděkování za stezku k Písečákům** (pochvala)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G27-0 „Chci moc poděkovat za stezku k Písečákům, chodíme tam s dětma skoro každý den.“ (Q29) | zakladatel | |
| G27-1 „Díky za tu novou cestu k Písečákům, je super na procházky s kočárkem.“ | totéž | |
| G27-2 „Děkuji za vánoční výzdobu na návsi, letos je moc hezká.“ | jiné | |

**G28 Nefunkční obecní rozhlas** (dotaz)

| Vzkaz | Vztah | Co je nové |
|---|---|---|
| G28-0 „Proč poslední dobou není slyšet obecní rozhlas? U nás v ulici z něj nic nejde.“ | zakladatel | |
| G28-1 „Obecní rozhlas u nás vůbec nehraje, opraví se to?“ | totéž | |
| G28-2 „Kdo má na starosti opravu obecního rozhlasu, když u nás nehraje?“ | poddotaz | kdo opravuje |
| G28-3 „Kde na webu obce najdu, co se hlásilo rozhlasem?“ | jiné (stejná věc, jiný účel: dohledat hlášení, ne oprava) | |

## Sporné páry ke kontrole

U těchto párů může jiný čtenář vidět vztah jinak. Prosím o potvrzení, nebo opravu:

- **G01-3** svatební hostina v sále: totéž se sálem (cena sálu), jiné se svatbou (ta je o obřadu).
- **G07-2** ověření podpisu v pátek: totéž, protože odpověď říká, že v ostatní dny jde termín domluvit telefonicky.
- **G05-2** plán psího výběhu u tématu „Je tady někde výběh pro psy?“: poddotaz, ne totéž.
- **G17-2** volné místo ve školce u tématu o kapacitě: poddotaz, ne jiné téma.
- **G28-3** hlášení rozhlasu na webu u tématu o nefunkčním rozhlasu: jiné téma, ne poddotaz.
