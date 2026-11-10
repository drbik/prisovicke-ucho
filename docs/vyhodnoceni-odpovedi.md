# Vyhodnocení odpovědí z webu

*Krok 8.8 z [plánu MVP](plan-mvp.md#krok-8-index-webu-a-odpověď-s-citací). Sada: [30 typových otázek](typove-otazky.md), schválená Tomášem 10. 11. 2026. Index: stav k 10. 11. 2026, viz [Index zdrojů](index-zdroju.md).*

**Stav k 10. 11. 2026: předběžné.** Ladění proběhlo, závěrečný běh na jedné verzi promptů ještě ne. Celý běh sady stojí asi 2 000 neuronů a dnešní bezplatný limit Workers AI (10 000 denně) padl hlavně na nahrání indexu a ladění. Kdyby se limit vyčerpal, ostrá stránka by do 1:00 našeho času neuměla ani upravit vzkaz. Závěrečný běh proto poběží po obnovení limitu 11. 11. 2026. Výsledky níže jsou z ladicích běhů a mají různé verze promptů.

## Jak se vyhodnocuje

`npm run eval:odpovedi` pošle každou otázku stejnou cestou jako stránka:

1. AI úprava (prompt úpravy verze 3) navrhne text a typ. Typ se bere tak, jak ho AI navrhla, autor ho neopravuje. Je to přísnější než skutečnost, kde autor typ před potvrzením vidí a může změnit.
2. U typu dotaz proběhne hledání, odpověď a obě kontroly opory (prompt odpovědi verze 2).
3. Výsledek se zapíše do souboru ve složce dat a do tabulky níže. Konečné hodnocení odpovědí je ruční: jsou v ní klíčová fakta ze sady, nic navíc a každé tvrzení má oporu v citovaném úryvku?

Čas se měří od potvrzení po odpověď, tedy embedding, hledání, odpověď a ověření. Skript běží na počítači přes vzdálené vazby Wrangleru, takže čas zahrnuje i cestu do Cloudflare a zpět. Na ostré stránce bývá podobný (viz [Testy na zařízeních](test-zarizeni.md#krok-8-odpověď-z-webu-na-ostré-adrese)).

## Prahy (zadání kroku 8)

| Práh | Ladění 10. 11. 2026 | Závěrečný běh |
|---|---|---|
| Žádná zobrazená odpověď nemá tvrzení bez opory v citovaném úryvku | splněno u všech 15 zobrazených odpovědí, poznámka u Q12 | čeká |
| Každá zobrazená odpověď má citaci s adresou, názvem a datem, označení zdroje a upozornění | splněno | čeká |
| Aspoň 90 % otázek bez odpovědi ve zdrojích skončí u zastupitelů (9 z 10) | 10 z 10 ve všech bězích | čeká |
| Aspoň 70 % otázek s odpovědí dostane správnou odpověď (12 ze 16) | 15 ze 16 v posledních bězích, Q02 po poslední opravě neproběhla | čeká |
| Žádný návrh, stížnost ani pochvala nejde do hledání | 4 ze 4 od úpravy promptu úpravy na verzi 3, předtím 3 ze 4 | čeká |
| Aspoň 90 % odpovědí do 10 s | verze 1: 22 z 26 (85 %), verze 2: 11 z 11 (nejdéle 8,2 s) | čeká |

## Průběh ladění 10. 11. 2026

| Běh | Prompty (úprava, odpověď) | Otázek | S odpovědí | Zastupitelům | Nehledat | Do 10 s | Nejdéle |
|---|---|---|---|---|---|---|---|
| 1 | 2, 1 | 30 | 6 ze 16 | 10 z 10 | 3 ze 4 | 25 z 27 | 32,1 s |
| 2 | 3, 1 | 30 | 9 ze 16 | 10 z 10 | 4 ze 4 | 22 z 26 | 14,4 s |
| 3 | 3, 2 | 9 zamítnutých | 7 z 9 | – | – | 9 z 9 | 7,2 s |
| 4 | 3, 2 | Q02, Q07 | Q07 | – | – | 2 ze 2 | 8,2 s |

Co se mezi běhy změnilo a proč:

- **Model psal do vět datum zdroje** („podle údajů k 10. 11. 2026“), které v citaci není. Kontrola čísel takové věty správně zastavila. Prompt teď datum zdroje do vět zakazuje. Jako opora smí sloužit i čísla z názvu citovaného dokumentu, třeba datum zasedání v názvu zápisu. Datum zveřejnění ne.
- **Dlouhé PDF obsadilo všech šest míst** pro úseky a článek s odpovědí vypadl (Q07, soudy o územní plán). Z jednoho dokumentu teď jdou do modelu nejvýš 2 úseky.
- **Práh podobnosti** snížen z 0,50 na 0,45. Otázky s odpovědí i bez ní mají podobnost nejlepšího úseku 0,48 až 0,74, rozliší je až model. Q11 (starosta) měla 0,48.
- **Fulltext** u delších slov hledá podle kratšího začátku („soudem“ najde i „soudních“).
- **Návrh ve tvaru otázky** (Q30) AI úprava zařadila jako dotaz. Prompt úpravy (verze 3) teď vymezuje všechny čtyři typy.
- **Citace ze dvou míst úseku:** model občas spojí dvě nesousední věty. Kontrola teď hledá každou část zvlášť, každá musí být v úseku doslova a stránka je ukáže oddělené výpustkou. Když model uvede špatné číslo úseku a citace je v jiném nalezeném úseku, zdroj se opraví na ten správný.
- **Druhá kontrola modelem** dostala i název zdroje. Bez něj zamítla i správné věty, třeba „okna kaple budou hotová v červnu 2027“, protože citace sama kapli nezmiňuje.
- **Rychlost:** citace jsou zkrácené na nejvýš 150 znaků a odpověď na nejvýš 3 věty. S promptem verze 2 trvaly všechny odpovědi do 8,2 s.

## Ruční kontrola odpovědí z ladění

Poslední odpověď ke každé otázce s očekávanou odpovědí. Verze promptu odpovědi je v závorce.

| Otázka | Výsledek | Hodnocení |
|---|---|---|
| Q01 Sokolovna (1) | 4 000 Kč + energie, kauce 4 000 Kč, zápis rady č. 14/2025 | Správně |
| Q02 úřední hodiny (2) | Po zamítnutí za 4 věty se teď odpověď zkrátí na 3 věty, nový běh zatím neproběhl. V dřívější odpovědi model četl „7.00 – 11.00 oběd 12.00 – 17.00“ jako „v době oběda od 12 do 17“, kontrola modelem tu větu zamítla. | Čeká |
| Q03 svatba (2) | Kaple sv. Václava nebo jiné místo po dohodě, dotazník 30 dní předem, kontakt na matriku | Správně |
| Q04 lékárna (1) | Čt 7.30–12.00 a 12.30–16.00 | Správně |
| Q05 očkování (2) | Od 19. 10. 2026, po, út, st a pá 11.00–11.45, ordinace MUDr. Trněného | Správně |
| Q06 výluka (1) | Výluka 3. 10. – 27. 11., náhradní autobus na sídlišti | Správně |
| Q07 soudy (2) | Krajský soud 10. 6. 2026 obě žaloby zamítl, omezení u Písečáků platí, firmy platí náklady | Správně |
| Q08 Greenway (1) | M – SILNICE a.s., zahájení v srpnu 2026 | Správně, 3 měsíce jsou jen v citaci |
| Q09 úvěr na byty (1) | 34 852 049 Kč na 15 nájemních bytů | Správně, cituje zápis zastupitelstva z 3. 12. 2025 místo závěrečného účtu, oba zdroje uvádějí stejnou částku |
| Q10 dar při narození (2) | Dar 5 000 Kč na dítě při vítání občánků 16. 9. 2026 | Správně, první věta je těžkopádná |
| Q11 starosta (2) | František Drbohlav a Jan Košek | Správně |
| Q12 okna kaple (2) | Dokončení v červnu 2027 | Správně. Věta zmiňuje okna a vitráže kaple, citace jen „Dokončení prací se předpokládá v červnu roku 2027.“ Souvislost s kaplí je v citovaném úseku, ne v ukázané citaci. |
| Q13 Záhumení (2) | Podle webu Nezávislých se realizace připravuje na rok 2027 | Správně, stavební povolení obce odpověď nezmínila |
| Q14 byty u DPS (2) | Pro seniory a mladé lidi na startu, stavět v roce 2027 | Správně, počet 15 bytů chybí, otázka se na něj neptala |
| Q15 hospůdka (1) | Nezávislí chtějí prověřit hospůdku v přísálí Sokolovny | Správně, jen záměr |
| Q16 sdílená elektřina (1) | Nezávislí plánují od roku 2026 energetické společenství, přebytky levněji pro zapojené | Správně |

Otázky bez odpovědi (Q17 až Q26) skončily ve všech bězích u zastupitelů. Pasti fungovaly: u nájmu v nových bytech (Q21) model nepoužil sazbu pro stávající byty a u poplatku za odpad (Q17) nevzal velikost nádob jako cenu. Návrhy, stížnost a pochvala (Q27 až Q30) se od verze 3 promptu úpravy nehledají.
