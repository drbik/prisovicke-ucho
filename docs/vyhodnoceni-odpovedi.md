# Vyhodnocení odpovědí z webu

*Krok 8.8 z [plánu MVP](plan-mvp.md#krok-8-index-webu-a-odpověď-s-citací). Sada: [30 typových otázek](typove-otazky.md), schválená Tomášem 10. 11. 2026. Index: stav k 10. 11. 2026 včetně dokumentů Word a ODT a textu skenů z OCR, viz [Index zdrojů](index-zdroju.md).*

**Stav k 10. 11. 2026 večer: závěrečný běh hotový.** Běžel na rozšířeném indexu (428 dokumentů, 3 003 úseků) s promptem úpravy verze 3 a promptem odpovědi verze 3. Všechny prahy platí. Účet Cloudflare přešel ten večer na Workers Paid, takže běh nemusel čekat na obnovení denního limitu neuronů. Ostré ucho čte už rozšířený index, ale do nasazení Workeru odpovídá s promptem odpovědi verze 2. Ten v běhu 5 ukázal chybu u úředních hodin (Q02).

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
