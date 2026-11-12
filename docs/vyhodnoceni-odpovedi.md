# Vyhodnocení odpovědí z webu

*Krok 8.8 z [plánu MVP](plan-mvp.md#krok-8-index-webu-a-odpověď-s-citací). Sada: [30 typových otázek](typove-otazky.md), schválená Tomášem 10. 11. 2026. Index: stav k 10. 11. 2026 včetně dokumentů Word a ODT a textu skenů z OCR, viz [Index zdrojů](index-zdroju.md).*

**Stav k 10. 11. 2026 večer: závěrečný běh hotový.** Běžel na rozšířeném indexu (428 dokumentů, 3 003 úseků) s promptem úpravy verze 3 a promptem odpovědi verze 3. Všechny prahy platí. Účet Cloudflare přešel ten večer na Workers Paid, takže běh nemusel čekat na obnovení denního limitu neuronů. Ostré ucho běží od večera 10. 11. 2026 s rozšířeným indexem a promptem odpovědi verze 3 (Worker verze b0893619). Kontrola po nasazení: dotaz na úřední hodiny skončil u zastupitelů jako v běhu 6, dotaz na lékárnu dostal správnou odpověď za 4,8 s.

## Jak se vyhodnocuje

`npm run eval:odpovedi` pošle každou otázku stejnou cestou jako stránka:

1. AI úprava (prompt úpravy verze 3) navrhne text a typ. Typ se bere tak, jak ho AI navrhla, autor ho neopravuje. Je to přísnější než skutečnost, kde autor typ před potvrzením vidí a může změnit.
2. U typu dotaz proběhne hledání, odpověď a obě kontroly opory.
3. Výsledek se zapíše do souboru ve složce dat a do tabulky níže. Konečné hodnocení odpovědí je ruční: jsou v ní klíčová fakta ze sady, nic navíc a každé tvrzení má oporu v citovaném úryvku?

Čas se měří od potvrzení po odpověď, tedy embedding, hledání, odpověď a ověření. Skript běží na počítači přes vzdálené vazby Wrangleru, takže čas zahrnuje i cestu do Cloudflare a zpět. Na ostré stránce bývá podobný (viz [Testy na zařízeních](test-zarizeni.md#krok-8-odpověď-z-webu-na-ostré-adrese)).

## Prahy (zadání kroku 8)

| Práh | Ladění 10. 11. 2026 | Závěrečný běh (běh 6) |
|---|---|---|
| Žádná zobrazená odpověď nemá tvrzení bez opory v citovaném úryvku | splněno u všech 15 zobrazených odpovědí, poznámka u Q12 | **splněno** u všech 14 zobrazených odpovědí, poznámka u Q14 |
| Každá zobrazená odpověď má citaci s adresou, názvem a datem, označení zdroje a upozornění | splněno | **splněno** |
| Aspoň 90 % otázek bez odpovědi ve zdrojích skončí u zastupitelů (9 z 10) | 10 z 10 ve všech bězích | **10 z 10** |
| Aspoň 70 % otázek s odpovědí dostane správnou odpověď (12 ze 16) | 15 ze 16 v posledních bězích | **14 ze 16** (88 %). Q02 a Q06 skončily u zastupitelů. |
| Žádný návrh, stížnost ani pochvala nejde do hledání | 4 ze 4 od verze 3 promptu úpravy | **4 ze 4** |
| Aspoň 90 % odpovědí do 10 s | verze 2: 11 z 11 (nejdéle 8,2 s) | **13 ze 14** (93 %), ostatní do 7,5 s. Q13 trvala 69,8 s, z toho 67,2 s jedno volání druhé kontroly. |

## Průběh ladění a závěrečného běhu 10. 11. 2026

| Běh | Index | Prompty (úprava, odpověď) | Otázek | S odpovědí | Zastupitelům | Nehledat | Do 10 s | Nejdéle |
|---|---|---|---|---|---|---|---|---|
| 1 | 357 dokumentů | 2, 1 | 30 | 6 ze 16 | 10 z 10 | 3 ze 4 | 25 z 27 | 32,1 s |
| 2 | 357 dokumentů | 3, 1 | 30 | 9 ze 16 | 10 z 10 | 4 ze 4 | 22 z 26 | 14,4 s |
| 3 | 357 dokumentů | 3, 2 | 9 zamítnutých | 7 z 9 | – | – | 9 z 9 | 7,2 s |
| 4 | 357 dokumentů | 3, 2 | Q02, Q07 | Q07 | – | – | 2 ze 2 | 8,2 s |
| 5 | 428 dokumentů | 3, 2 | 30 | 14 ze 16, z toho Q02 chybně | 10 z 10 | 4 ze 4 | 14 ze 14 | 9,7 s |
| 6 | 428 dokumentů | 3, 3 | 30 | **14 ze 16** | **10 z 10** | **4 ze 4** | 13 ze 14 | 69,8 s |
| 7 | 428 dokumentů, s přeřazením | 3, 3 | 30 | 14 ze 16 | 10 z 10 | 4 ze 4 | 12 ze 14 | 12,3 s |
| 8 | 428 dokumentů, s přeřazením | 3, 3 | 30 | 14 ze 16 | 10 z 10 | 4 ze 4 | 12 ze 14 | 40,5 s |
| 9–11 | s přeřazením, 8 úseků, 3 z dokumentu | 3, 4 (první znění) | 30 | 14, 13 a 12 ze 16 | 10 z 10 | 4 ze 4 | 9 z 15, 9 z 13, 11 z 13 | 64,7 s |
| 12 | s přeřazením, 6 úseků, 3 z dokumentu, s opravným pokusem | 3, 4 | 30 | 13 ze 16 | 10 z 10 | 4 ze 4 | 7 ze 14 | 71,2 s |
| 13 (nasazeno) | s přeřazením, 6 úseků, 3 z dokumentu, bez opravného pokusu | 3, 4 | 30 | 13 ze 16 | 10 z 10 | 4 ze 4 | 11 ze 14 (79 %) | 59,8 s |
| 14 (Tlampač a podklady) | 435 dokumentů, 3 021 úseků, jinak jako běh 13 | 3, 4 | 30 | 13 ze 16 | 10 z 10 | 4 ze 4 | 10 ze 13 (77 %) | 11,3 s |

**Běh 14: Tlampač a podklady webu Nezávislých (10. 11. 2026 večer).** Do indexu přibylo 7 dokumentů a 18 úseků ze stránky Tlampač a ze souborů Markdown na nezavisli-prisovice.cz/podklady/ (viz [Index zdrojů](index-zdroju.md)). Výsledky sady zůstaly na úrovni běhu 13: odpověď dostalo 13 ze 16 otázek, zastupitelům skončilo 10 z 10 a 4 návrhy se nehledaly. Rozdíly proti běhu 13:

- **Q07 (soudy) a Q16 (sdílená elektřina)** skončily u zastupitelů, i když hledání našlo úplně stejné zdroje jako předtím. Druhá kontrola zamítla jednu větu. Takhle kolísaly už dřív Q02, Q06 a Q14, nesouvisí to tedy s novými zdroji.
- **Q14 (byty u DPS)** má mezi nalezenými úryvky nově i `podklady/projekty.md`. Model z něj napsal třetí větu o roce 2027, kterou druhá kontrola zamítla, a odpověď šla zastupitelům. Q14 kolísala mezi odpovědí a předáním i v dřívějších bězích.
- **Q11 (starosta)** se odpověď opírá o „Podklady: Komunální volby v Příšovicích 2026“ místo oznámení obce. Fakta souhlasí, ale odpověď je označená „Podle webu Nezávislých“ a ne „Odpověď z webu obce“.
- **Rychlost:** 10 ze 13 odpovědí do 10 s (77 %), nejdéle 11,3 s. Nové zdroje hledání nezpomalily, o úrovni času rozhoduje hlavně volání Workers AI.
- **Dotazy na nové zdroje (živé volání, mimo sadu):** volební účast, finanční výbor a Záhumení dostaly odpověď a citují Tlampač nebo podklady. Dotaz na investice v roce 2024 a na cenu stezky k Písečákům skončil u zastupitelů, protože kontrola zamítla věty (u investic hledání tabulku v podkladech `finance.md` vůbec nenašlo). Dotaz „Jaká je kandidátka č. 2 na hlasovacím lístku?“ model špatně pochopil jako číslo kandidáta a kontrola ho zachytila.

Co se mezi běhy změnilo a proč:

- **Model psal do vět datum zdroje** („podle údajů k 10. 11. 2026“), které v citaci není. Kontrola čísel takové věty správně zastavila. Prompt teď datum zdroje do vět zakazuje. Jako opora smí sloužit i čísla z názvu citovaného dokumentu, třeba datum zasedání v názvu zápisu. Datum zveřejnění ne.
- **Dlouhé PDF obsadilo všech šest míst** pro úseky a článek s odpovědí vypadl (Q07, soudy o územní plán). Z jednoho dokumentu teď jdou do modelu nejvýš 2 úseky.
- **Práh podobnosti** snížen z 0,50 na 0,45. Otázky s odpovědí i bez ní mají podobnost nejlepšího úseku 0,48 až 0,74, rozliší je až model. Q11 (starosta) měla 0,48.
- **Fulltext** u delších slov hledá podle kratšího začátku („soudem“ najde i „soudních“).
- **Návrh ve tvaru otázky** (Q30) AI úprava zařadila jako dotaz. Prompt úpravy (verze 3) teď vymezuje všechny čtyři typy.
- **Citace ze dvou míst úseku:** model občas spojí dvě nesousední věty. Kontrola teď hledá každou část zvlášť, každá musí být v úseku doslova a stránka je ukáže oddělené výpustkou. Když model uvede špatné číslo úseku a citace je v jiném nalezeném úseku, zdroj se opraví na ten správný.
- **Druhá kontrola modelem** dostala i název zdroje. Bez něj zamítla i správné věty, třeba „okna kaple budou hotová v červnu 2027“, protože citace sama kapli nezmiňuje.
- **Rychlost:** citace jsou zkrácené na nejvýš 150 znaků a odpověď na nejvýš 3 věty.
- **Rozšířený index (běh 5):** do indexu přibyly dokumenty Word a ODT a text skenů z OCR. Opory všech otázek sady zůstaly ve svých úsecích, žádná otázka bez odpovědi nezačala dostávat odpověď.
- **Úřední hodiny (běh 5 → prompt odpovědi verze 3):** zdroj píše „Po a St: 7.00 – 11.00 oběd 12.00 – 17.00“. Model z toho v běhu 5 udělal „v době oběda od 12.00 do 17.00“ a obě kontroly větu pustily. Prompt odpovědi teď říká, že slovo mezi dvěma časovými úseky znamená přestávku, a druhá kontrola zamítá věty, které časy nebo jejich pořadí popisují jinak než citace. V běhu 6 model napsal časy správně, ale druhá kontrola větu zamítla, takže Q02 skončila u zastupitelů. Nepravdivá věta se tak už neukáže, cenou je jedna nezodpovězená otázka.
- **Částečné odpovědi a místo v dokumentu (běhy 9 až 13, večer 10. 11. 2026):** Tomáš zkusil dotaz „…jestli se psi můžou koupat v Písečácích, nebo jestli za to hrozí nějaká pokuta? Vynucuje někdo toto pravidlo?“ a odpověď byla částečná a bez místa v PDF. Zákaz koupání psů je v provozním řádu na straně 5 (čl. 9), postih podle zákonů o přestupcích na straně 6 a kdo pravidlo vynucuje, v řádu není. Pokuta se do modelu nedostala, protože z jednoho dokumentu šly nejvýš dva úseky, teď tři. Prompt odpovědi (verze 4) říká, aby model odpověděl na každou část dotazu, uvedl obecnější odpověď tak, jak ji zdroj říká, a části bez odpovědi vypsal v poli `nezodpovezeno`. Stránka je ukáže jako „Tohle jsme ve zdrojích nenašli“ s poznámkou, že zbytek převezmou zastupitelé. U každého zdroje je „strana 5, čl. 9“. Oddíl vybírá kód jako poslední nadpis (`čl.`, `článek`, `§`) na začátku řádku před citací, takže se model nemůže splést. Když OCR nadpis zkomolí, ukáže se jen strana. Tvůj dotaz teď vyšel ve všech zkouškách stejně: zákaz, postih podle zákona č. 250/2016 Sb. a 251/2016 Sb. a nezodpovězená část „kdo vynucuje pravidla“. První znění promptu s více pravidly (běhy 9 až 11) zhoršilo spolehlivost a rychlost, protože model psal delší odpovědi a spojoval údaje do vět, jejichž čísla nebyla v citaci. Zůstaly jen tři nutné změny. Opravný pokus po zamítnuté odpovědi (běh 12) zachránil jedinou otázku a u otázek, které stejně skončily u zastupitelů, stál 10 až 15 s, proto je pryč. **Rychlost zůstává slabé místo:** 11 ze 14 odpovědí do 10 s (79 %) při prahu 90 %. Dvě pomalé odpovědi (Q02 a Q09, 13 až 14 s) a výkyv Workers AI (Q03, 59,8 s, odpověď psalo jedno volání modelu přes minutu) tvoří celý rozdíl. Stejné kódy ve dřívějších bězích dávaly 12 až 13 ze 14.
- **Přeřazení úseků (běhy 7 a 8, po závěrečném běhu):** Tomáš se zeptal, jestli se psi smějí koupat v Písečácích, a dotaz skončil u zastupitelů. Odpověď v provozním řádu je, ale úsek s pravidlem byl v dokumentu až čtvrtý a z jednoho dokumentu jdou do modelu nejvýš dva. Hledání teď nechá kandidáty ohodnotit přeřazovacím modelem `@cf/baai/bge-reranker-base`. Česky si je jistý jen zřídka (u soudu, úředních hodin a Sokolovny dával skóre kolem nuly a správné úseky odsouval dolů), proto dopředu jdou jen úseky se skóre aspoň 0,5. Ostatní drží dosavadní pořadí a když přeřazení selže, hledání pokračuje bez něj. Pravidlu o psech dal model 0,92 a dotaz dostal odpověď „Koupání psů v obou jezerech je zakázáno.“. Ve dvou bězích sady se přeřazení uplatnilo u 0 až 1 otázky z 26. Výsledky jsou stejné jako v běhu 6, jen Q02 a Q14 se mezi běhy střídají mezi správnou odpovědí a předáním zastupitelům. Hledání trvá průměrně o 0,4 až 0,55 s déle (1,2 až 1,3 s místo 0,75 s). Práh rychlosti vyšel v obou bězích 12 ze 14 (86 %), hlavně kvůli výkyvům Workers AI: psaní odpovědi 10,1 s a 21,6 s, celé odpovědi 12,4 s a 40,5 s. Jen u Q03 (10,3 s) rozhodlo přeřazení. Nasazeno večer 10. 11. 2026 (Worker verze 44beed92). Kontrola na ostré adrese: dotaz na psy dostal odpověď s citací provozního řádu, ale trval 14,3 s, protože jedno volání modelu na psaní odpovědi mělo výkyv 11 s. Dotaz na lékárnu dostal správnou odpověď za 4,0 s a dotaz na bankomat skončil u zastupitelů za 2,4 s.

## Ruční kontrola odpovědí v závěrečném běhu

Běh 6, prompt odpovědi verze 3. Každá zobrazená odpověď měla označení zdroje, odkaz s názvem a datem, citace a upozornění, že nejde o úřední vyjádření obce.

| Otázka | Výsledek | Hodnocení |
|---|---|---|
| Q01 Sokolovna | 4 000 Kč plus energie, vratná kauce 4 000 Kč, zápis rady č. 14/2025 | Správně |
| Q02 úřední hodiny | U zastupitelů. Model napsal časy správně, druhá kontrola první větu zamítla. | Chybí odpověď, žádné tvrzení bez opory |
| Q03 svatba | Kaple sv. Václava nebo jiné místo po dohodě, kontakt na matriku, dotazník 30 dní předem | Správně |
| Q04 lékárna | Čt 7.30–12.00 a 12.30–16.00 | Správně |
| Q05 očkování | Od 19. 10. 2026, po, út, st a pá 11.00–11.45, ordinace MUDr. Trněného | Správně |
| Q06 výluka | U zastupitelů. Druhá kontrola zamítla větu „od 3. 10. do 27. 11. do 12. 00 probíhá nepřetržitá výluka“, věta o náhradním autobusu prošla. | Chybí odpověď, žádné tvrzení bez opory |
| Q07 soudy | Krajský soud 10. 6. 2026 rozhodl ve prospěch obce a obě žaloby zamítl | Správně, kratší než v ladění |
| Q08 Greenway | M – SILNICE a.s., zahájení v průběhu srpna 2026 | Správně |
| Q09 úvěr na byty | 34 852 049 Kč na 15 nájemních bytů | Správně. Cituje zápis zastupitelstva z 3. 12. 2025 místo závěrečného účtu, oba uvádějí stejnou částku. |
| Q10 dar při narození | Dar 5 000 Kč na dítě při vítání občánků 16. 9. 2026 | Správně, druhá věta je těžkopádná |
| Q11 starosta | František Drbohlav a Jan Košek | Správně |
| Q12 okna kaple | Dokončení v červnu 2027 | Správně |
| Q13 Záhumení | Podle webu Nezávislých se realizace připravuje na rok 2027 | Správně. Trvala 69,8 s kvůli jednomu pomalému volání Workers AI. Na ostré stránce by po 25 s skončila u zastupitelů. |
| Q14 byty u DPS | Pro seniory a mladé lidi na startu, stavět v roce 2027 | Správně s výhradou: druhá věta píše „Obec plánuje“, karta říká „Stavět chceme v roce 2027“. Označení odpovědi i první věta uvádějí web Nezávislých. |
| Q15 hospůdka | Web Nezávislých uvádí, že zvažuje hospůdku v přísálí Sokolovny dva až tři dny v týdnu | Správně, jen záměr |
| Q16 sdílená elektřina | Podle webu Nezávislých od roku 2026 energetické společenství, přebytky levněji pro zapojené | Správně |

**Otázky bez odpovědi (Q17 až Q26)** skončily u zastupitelů, všechny proto, že model odpověď v úryvcích nenašel. Pasti fungovaly:
- U nájmu v nových bytech (Q21) model nepoužil sazbu pro stávající byty.
- U poplatku za odpad (Q17) nevzal velikost nádob ani nový skládkový poplatek 500 Kč za tunu z informace o odpadech za rok 2025.

**Q19 a Q22 po rozšíření indexu.** Hledání našlo provozní řád Písečáků i vyúčtování vodného za rok 2025, oba z OCR. Model přesto odpověď nedal:
- U Q19 zdroj říká jen „V obou jezerech je zakázáno koupat psy.“. Na to, jestli se smí se psem k vodě chodit, neodpovídá.
- U Q22 jsou ve zdroji ceny za rok 2025, ne současná cena.

Obě otázky tedy podle schválené sady prošly. Přeřazení na odpověď zatím nenavrhuji.

**Návrhy, stížnost a pochvala (Q27 až Q30)** se nehledají.

**Známé slabiny k dalšímu ladění:** druhá kontrola je u časových údajů přísná (Q02, Q06) a jednotlivé volání Workers AI může výjimečně trvat přes minutu (Q13).

## Dotaz po částech (12. 11. 2026)

Podnět: dotaz „jaké zázemí Příšovice poskytují pro sportovní vyžití a jaké jsou ceny za nájem hřiště, tělocvičny nebo Sokolovny“ skončil u zastupitelů, i když ceník Sokolovny v indexu je. Úseky o sportu ho vytlačily z šesti úseků pro model a čárka navíc v jedné citaci zahodila celou částečnou odpověď. Oprava (krok 8.13 v [plánu](plan-mvp.md)):

- AI dotaz rozdělí na nejvýš 4 samostatné otázky. Každá má vlastní hledání, odpověď a ověření a stránka průběžně ukazuje stav každé části. Dotaz na jednu věc se hledá v autorově znění a jeho hledání běží souběžně s rozdělením.
- Prompt odpovědi verze 5: až 4 věty na část, řádek tabulky se záhlavím sloupců, při rozporu novější zdroj, dnešní datum (termín, který minul, není „příští“), údaje o jiném místě se nepoužijí. Ověření navíc zamítne větu se jménem soukromé osoby (žadatel, nájemce).
- Kontrola citace přijme záhlaví tabulky a pozdější řádek, které model napíše za sebou, a ukáže mezi nimi výpustku.
- Text PDF odděluje sloupce tabulek znaky „ | “. Bez toho ověřovací model ceník Sokolovny zamítal: ze „4.000 Kč + energie 8.000 Kč“ nešlo poznat, že 8 000 Kč je kauce. Se sloupci ho pustil ve 4 ze 4 pokusů. Nový text úseků se do D1 a Vectorize nahraje s nasazením, běhy níže proto běžely ještě na indexu bez sloupců.

| Běh | Co se měnilo | S odpovědí (automaticky) | Zastupitelům | Do 10 s |
|---|---|---|---|---|
| A | první znění verze 5, každý dotaz přeformulovaný | 10 ze 16 | 8 z 10 | 8 z 15 |
| B | dotaz na jednu věc v autorově znění, dnešní datum, rozdělení zachová „teď“, „příští“ | 12 ze 16 | **10 z 10** | 9 ze 13 |
| C | navíc hledání celku souběžně s rozdělením | 11 ze 16 | **10 z 10** | 4 ze 12 |
| srovnání | původní kód (verze 4) týž večer | 10 ze 16 | 10 z 10 | 9 ze 12 |

- **Běh A** ukázal, že přeformulovaná otázka hledá hůř (Q10, Q15 nenašly zdroj), jednou do ní model vložil cizí slovo a na „další vítání občánků“ odpověděl termínem, který už minul (Q23). Proto běh B.
- **Ruční kontrola běhu B:** správně 12 ze 16 (75 %, práh 70 %). Q03 a Q13 jsou částečné: na jednu část odpověď, druhá jde zastupitelům. Q06 a Q11 teď zodpoví obě části (výluka a náhradní autobus, starosta i místostarosta). Q09 cituje správnou částku, ale druhou větu uvádí slovy „v jiném zápisu“, ačkoli jde o tentýž dokument. Q15 skončila na výpadku Workers AI (25 s), Q16 zamítlo ověření.
- **Rychlost:** Workers AI byla 12. 11. večer pomalejší. Původní kód měl do 10 s jen 9 ze 12 odpovědí (10. 11. 13 ze 14). V běhu C trvalo samotné rozdělení až 5 s, proto má rozdělení limit 3 s: když nestihne, platí celý dotaz, jehož hledání už běží. Dotaz na více věcí trvá déle (Q03, Q14 9 až 25 s), autor ale vidí, která část se hledá a která je hotová. Práh 90 % do 10 s se tento večer nesplnil ani s původním kódem.
- **Výsledky:** `vyhodnoceni-2026-11-12-17-35-54.json` (A), `-17-42-53.json` (B), `-17-49-31.json` (C), `-17-52-58.json` (srovnání) ve složce dat.

### Ověření na ostré adrese (12. 11. 2026 večer)

Worker verze d2dd83f1, index se sloupci tabulek (436 dokumentů, 3 070 úseků).

- **Průběh:** Cloudflare řádky NDJSON nezdržuje. U Tomášova dotazu přišlo rozdělení za 1,6 s a hotové části za 3,2 s, 6,9 s, 16,5 s a 19,6 s.
- **Tomášův dotaz** se rozdělil na 4 části (zázemí pro sport, hřiště, tělocvična, Sokolovna).
  - Sokolovna má odpověď s ceníkem z formuláře Dohoda o pronájmu sokolovny. Cenu sálu ale uvádí 2 000 Kč z formuláře z ledna 2024. Rada usnesením UR č. 179/2025 ze 4. 9. 2025 zvýšila cenu samotného sálu na 4 000 Kč plus energie a úsek s usnesením byl mezi šesti úseky pro model.
  - Hřiště zamítlo ověření kvůli jménu soukromé osoby. U tělocvičny model odpověď nenašel. Zázemí pro sport zamítla kontrola citace.
- **Krátký dotaz „Jaké jsou ceny za nájem Sokolovny?“** šel na ostré adrese 3 ze 3 zastupitelům, protože citace nebyla v úseku.
  - V rozboru tří odpovědí modelu bere model cenu sálu z novějšího usnesení rady.
  - Ve 2 ze 3 ale citaci usnesení opíše s jedním změněným slovem: „vratné kauce“ místo „vratná kauce“, jak stojí ve zdroji.
  - Kontrola citace pak zamítne celou část, ačkoli ostatní tři řádky ceníku prošly.

## Citace s odchylkou (12. 11. 2026 večer)

Oprava (krok 8.14 v [plánu](plan-mvp.md)): když citace v úseku doslova není, kód ji hledá po slovech.

- **Co se toleruje:** stejný počet slov za sebou, interpunkce se nepočítá a číslo se od písmen odděluje („4987m2“ = „4987 m2“). Delší slovo se smí lišit jen koncovkou: společný začátek aspoň 3 znaky, koncovka nejvýš 3 znaky. Takové slovo smí být nejvýš jedno na 8 slov citace, nejvýš 3 v jedné citaci.
- **Co musí sedět přesně:** čísla, slova kratší než 4 znaky a citace kratší než 4 slova.
- **Co uvidí občan:** pod odpovědí je přesné znění zdroje. Ověřovací model i kontrola čísel věty dostanou totéž znění, ne opis modelu.
- **Výpustka v závorce:** výpustku „[...]“ bere kontrola jako hranici mezi částmi citace, stejně jako „…“.

Zkoušky se skutečnou AI na indexu se sloupci tabulek:

- **„Jaké jsou ceny za nájem Sokolovny?“:** 3 ze 3 s odpovědí (na ostré adrese před opravou 3 ze 3 zastupitelům). Cenu sálu bere model pokaždé z usnesení rady z 4. 9. 2025. Ve 2 ze 3 běhů opravil kód citaci usnesení na znění zdroje.
- **„Jaké prostory nebo venkovní prostory je možno pronajmout v Příšovicích?“** (dotaz Tomáše na ostré adrese, před opravou bez odpovědi): 3 ze 3 s odpovědí, pokaždé ale jen na jednu ze dvou částí.
  - Druhá část jednou neprošla kvůli číslu popisnému, které v citaci nebylo, a dvakrát kvůli citaci seznamu pozemků. Citace byla delší než 300 znaků, nebo měla výpustku „[...]“ (ta teď prochází).
  - Odpovědi tvrdí víc, než zdroje říkají: vydávají oznámení záměru pronájmu za nabídku, která platí teď, a pronájem hřiště na jeden konkrétní účel za obecnou cenu hřiště. Ověření je pustilo.
- **Tomášův dotaz na sport a Sokolovnu:** 3 ze 4 částí s odpovědí, hřiště zamítnuto kvůli jménu soukromé osoby.
  - Na cenu tělocvičny ale model odpověděl ceníkem Sokolovny a ověření to nezastavilo.
  - V části o Sokolovně uvedl starou cenu sálu z formuláře, ačkoli usnesení rady s novou cenou bylo mezi úseky.
  - Obojí s citacemi nesouvisí a zbývá vyřešit.

| Běh | S odpovědí (automaticky) | Správně (ručně) | Zastupitelům | Do 10 s |
|---|---|---|---|---|
| D (citace s odchylkou) | 14 ze 16 | 12 ze 16 | **10 z 10** | 10 ze 14 |
| B (pro srovnání) | 12 ze 16 | 12 ze 16 | **10 z 10** | 9 ze 13 |

- **Ruční kontrola běhu D:**
  - Lepší než v B: Q03 a Q13 jsou celé, Q15 má odpověď a Q01 uvádí novou cenu sálu 4 000 Kč.
  - Částečné: Q06 (na „jede teď vlak“ odpovídá obecným spojením, ne výlukou, náhradní autobus správně) a Q14 (pro koho ano, kdy se začne stavět ne).
  - Q07 zamítlo ověření, protože věta jmenovala firmy, které v citaci nebyly. Q16 zamítlo ověření jako v B.
- **Oprava citace se v sadě nepoužila ani jednou** (`opravenoCitaci` 0 u všech otázek). Rozdíly proti běhu B jsou rozptyl modelu.
- **Q22 (cena vody):** model zkusil odpověď z řádku kalkulace, citace ale neodpovídala zdroji ani s tolerancí, takže dotaz správně převzali zastupitelé.
- **Výsledky:** `vyhodnoceni-2026-11-12-20-45-31.json` ve složce dat.
