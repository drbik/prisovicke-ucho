# Typové otázky kroku 8

*Sada z 9. 11. 2026, verze 1. Čeká na schválení Tomášem. Do té doby se nepoužije k vyhodnocení.*

Strojově čitelná podoba je v [`tests/data/typove-otazky.json`](../tests/data/typove-otazky.json). Do kroku 11 sada slouží jako testovací sada kroku 8. Potom z ní budou jasně označené ukázky od týmu na veřejném seznamu témat (rozhodnutí v `CLAUDE.md` z 9. 11. 2026).

**Jak sada vznikla.** Otázky jsou napsané tak, jak by je napsali nebo řekli občané: spisovně i hovorově, některé bez diakritiky a některé jako přepis mluvené řeči. Odpovědi jsem hledala jen ve zdrojích, které budou v indexu: prisovice.cz od 9. 11. 2024, všechny stálé stránky a 24 karet webu Nezávislých (stav k 9. 11. 2026). Kontrolní skript ověřil, že každý citovaný úryvek, název i datum v JSON doslova odpovídá zdroji. U otázek bez odpovědi jsem zdroje prohledala a zapsala, co jsem hledala.

**Složení:** 30 otázek.

- 16 s odpovědí: 10 jen z webu obce, 3 z webu obce i z karet a 3 jen z karet.
- 10 bez odpovědi ve zdrojích.
- 4 vzkazy, které nejsou dotaz.

**Prahy ze zadání:**

- správně aspoň 12 ze 16 otázek s odpovědí (70 %),
- u zastupitelů aspoň 9 z 10 otázek bez odpovědi (90 %),
- ani jeden ze 4 vzkazů nejde do hledání,
- žádná zobrazená odpověď nemá tvrzení bez opory.

Otázka, kterou úprava zařadí jako jiný typ než dotaz, se počítá jako neúspěch.

## S odpovědí jen z webu obce

Označení zdroje: „Odpověď z webu obce“.

**Q01** „Dobrý den, chtěla bych si na jaře pronajmout sál v sokolovně na oslavu padesátin. Kolik to stojí?“
Očekává se: sál 4 000 Kč plus energie, vratná kauce 4 000 Kč.
Zdroj: [Zápis č. 14/2025 ze schůze rady obce konané dne 04.09.2025](https://prisovice.cz/wp-content/uploads/2025/09/anonymiz-rada-2025-09-04-1.pdf), zveřejněno 24. 9. 2025. Cena je jen v zápisu rady, stránka o pronájmu ji neuvádí.

**Q02** „kdy ma otevreno obecni urad? potrebuju si nechat overit podpis“
Očekává se: pondělí a středa 7:00–11:00 a 12:00–17:00, jindy po telefonické dohodě.
Zdroj: [Organizační struktura obecního úřadu](https://prisovice.cz/obecni-urad-prisovice/organizacni-struktura-obecniho-uradu/), nebo [Povinně zveřejňované informace](https://prisovice.cz/samosprava/informace-podle-zakona-c-1061999-sb/).

**Q03** „Chceme se příští rok vzít v Příšovicích. Kde se tam dá mít obřad a co musíme zařídit předem?“
Očekává se: kaple sv. Václava, úředně stanovená doba pondělí a středa 7:00–15:00, jinde a jindy po dohodě s matrikou, ne v neděli a o svátcích, dotazník s doklady 30 dní předem na OÚ.
Zdroj: [Svatební obřady](https://prisovice.cz/obecni-urad-prisovice/svatebni-obrady/), změněno 7. 10. 2025.

**Q04** „do kolika má ve čtvrtek otevřeno lékárna na zdravotním středisku?“
Očekává se: ve čtvrtek 7:30–12:00 a 12:30–16:00.
Zdroj: [Zdravotní středisko](https://prisovice.cz/sluzby/zdravotni-stredisko/), změněno 17. 2. 2026.
Past: ostatní dny je otevřeno jen do 15:00.

**Q05** „No dobrý den, já bych se chtěl zeptat, kdy můžu přijít k doktorovi na očkování proti chřipce.“
Očekává se: od 19. 10. 2026 v pondělí, úterý, středu a pátek 11:00–11:45, ordinace MUDr. Trněného.
Zdroj: [Očkování proti chřipce](https://prisovice.cz/2026/09/ockovani-proti-chripce/), 24. 9. 2026.

**Q06** „jezdí teď vůbec vlak z příšovic? a kde staví ten náhradní autobus“
Očekává se: od 3. 10. do 27. 11. 2026 (do 12:00) nepřetržitá výluka, náhradní autobusy staví na zastávce na sídlišti.
Zdroj: [Vlaková výluka](https://prisovice.cz/2026/10/vlakova-vyluka/), 7. 10. 2026.
Platí do 27. 11. 2026, potom otázku upravit nebo vyřadit.

**Q07** „Jak to nakonec dopadlo s tím soudem, co vedla obec s Logicorem kvůli územnímu plánu?“
Očekává se:
- soud dal za pravdu obci a obě žaloby (Logicor a FKM) zamítl,
- omezení výstavby hal u Písečáků platí dál,
- firmy zaplatí obci náhradu nákladů,
- firmy mohly podat kasační stížnost.

Zdroj: [Výsledek soudních sporů o územní plán obce Příšovice](https://prisovice.cz/2026/07/vysledek-soudnich-sporu-o-uzemni-plan-obce-prisovice/), 3. 7. 2026.
Past: odpověď nesmí tvrdit, že je rozsudek pravomocný.

**Q08** „Kdy se začne stavět ta cyklostezka od Přepeř k Jizeře a kdo ji staví?“
Očekává se: zahájení v srpnu 2026, dokončení do 3 měsíců od předání staveniště, staví M – SILNICE a.s., polovinu platí Liberecký kraj.
Zdroj: [Informace o začátku realizace části cyklostezky Greenway Jizera](https://prisovice.cz/2026/08/informace-o-zacatku-realizace-casti-cyklostezky-greenway-jizera/), 14. 8. 2026.
Past: zdroj neříká, že je stezka hotová.

**Q09** „Kolik si obec půjčila na ty nové byty?“
Očekává se: úvěr od Státního fondu podpory investic s limitem 34 852 049 Kč na 15 nájemních bytů, smlouva z 14. 1. 2026.
Zdroj: [Závěrečný účet obce za rok 2025](https://prisovice.cz/wp-content/uploads/2026/07/zprava-o-hospodareni-za-r2025.pdf), zveřejněno 30. 6. 2026, str. 9.

**Q10** „Dává obec něco rodičům, když se jim narodí dítě?“
Očekává se: dar 5 000 Kč na dítě při vítání občánků.
Zdroj: [Zápis č. 13/2026 z jednání rady obce konaného dne 17.09.2026](https://prisovice.cz/wp-content/uploads/2026/09/anonymiz-rada-2026-09-17.pdf), zveřejněno 24. 9. 2026.

## S odpovědí z webu obce i z karet

Označení musí odpovídat zdroji, který odpověď cituje.

**Q11** „kdo je ted po volbach starosta a mistostarosta?“
Očekává se: starosta František Drbohlav a místostarosta Jan Košek, zvoleni 4. 11. 2026.
Zdroj: [Nové vedení obce](https://prisovice.cz/2026/11/nove-vedeni-obce-prisovice-pro-volebni-obdobi-2026-2030/) (6. 11. 2026), nebo [karta Volby](https://nezavisli-prisovice.cz/#volby).

**Q12** „Kdy budou hotová ta nová okna v kapli svatého Václava?“
Očekává se: obnova začala v říjnu 2026 a dokončení se předpokládá v červnu 2027.
Zdroj: [Hlášení ze dne 12.10.2026](https://prisovice.cz/2026/10/hlaseni-ze-dne-12-10-2026/) a [Kaple sv. Václava se dočká obnovy oken a vitráží](https://prisovice.cz/2026/10/kaple-sv-vaclava-se-docka-obnovy-oken-a-vitrazi/).
Karta [Příjemnější centrum obce](https://nezavisli-prisovice.cz/#verejna-prostranstvi) uvádí jen „v roce 2027“. Odpověď jen z karty se počítá jako částečná.

**Q13** „Kdy se bude dělat vodovod a kanalizace na Záhumení?“
Očekává se: stavba v roce 2027 a stavební povolení je vydané. Výběr zhotovitele se předpokládal v listopadu 2026.
Zdroj: [Zápis zastupitelstva z 22. 4. 2026](https://prisovice.cz/wp-content/uploads/2026/05/anonymiz-zastupitelstvo-2026-04-22-2.pdf), [rozhodnutí o povolení stavby](https://prisovice.cz/wp-content/uploads/2026/08/prisovice-vodovod-a-kanalizace-zahumeni.pdf) (25. 8. 2026), nebo [karta Vodovod a kanalizace na Záhumení](https://nezavisli-prisovice.cz/#kanalizace-zahumeni).

## S odpovědí jen z karet

Označení zdroje: „Podle webu Nezávislých pro Příšovice“. Karty nemají datum, citace uvede „stav webu k 9. 11. 2026“.

**Q14** „Pro koho budou ty nový byty u DPS a kdy se začnou stavět?“
Očekává se: 15 menších nájemních bytů pro seniory a mladé lidi na startu, stavět se má v roce 2027.
Zdroj: [karta Patnáct dostupných bytů](https://nezavisli-prisovice.cz/#dostupne-bydleni).

**Q15** „Bude zase v sokolovně nějaká hospoda?“
Očekává se: zatím jen záměr k prověření: obecní hospůdka v přísálí dva až tři dny v týdnu, nejdřív je potřeba najít provozovatele.
Zdroj: [závěrečná karta Záleží na vás](https://nezavisli-prisovice.cz/#zaver).
Past: odpověď nesmí slibovat otevření ani termín.

**Q16** „Slyšel jsem, že by obec mohla prodávat levnější elektřinu z těch solárů na střechách. Je to pravda?“
Očekává se: plán energetického společenství od roku 2026, elektřina ze střech školy, úřadu a prodejny a přebytky levněji pro zapojené občany.
Zdroj: [karta Elektřina zůstane v obci](https://nezavisli-prisovice.cz/#komunitni-energetika).
Past: zdroj neuvádí cenu ani termín spuštění.

## Bez odpovědi ve zdrojích: zastupitelům

Ucho nesmí odpovědět a má říct, že dotaz převezmou zastupitelé.

**Q17** „Kolik se letos platí za popelnice na jednoho člověka?“
Výše poplatku v indexu není. Vyhláška je ve Sbírce právních předpisů, mimo index.
Past: stránka o odpadech uvádí velikosti nádob podle počtu osob. Ty nejsou cenou.

**Q18** „V kolik otevírá sběrný dvůr v sobotu?“
Otevírací doba sběrného dvora ve zdrojích není.

**Q19** „Můžu chodit se psem k vodě na Velký Písečák?“
Provozní řád Písečáků je sken bez textu (známé omezení). Odpověď na webu je, v indexu ne.

**Q20** „Plánuje se v Příšovicích bankomat?“
Ve zdrojích nic.

**Q21** „Kolik bude měsíčně stát nájem v těch nových bytech u DPS?“
Výše nájemného v nových bytech ve zdrojích není.
Past: 51,06 Kč/m² ze zápisu z 18. 6. 2025 platí pro stávající byty v čp. 187 a 42, ne pro nové.

**Q22** „kolik u nás stoji kubik vody?“
Kalkulace a vyúčtování vodného jsou skeny bez textu (známé omezení).

**Q23** „Kdy bude další vítání občánků? Máme malou.“
Zdroje mají jen minulá vítání (2. 6. 2025, 16. 9. 2026).
Past: datum minulého vítání není odpověď.

**Q24** „Je v Příšovicích někde nabíječka na elektroauto?“
Ve zdrojích nic.

**Q25** „Je tady někde výběh pro psy?“
Ve zdrojích nic.
Past: pronájem hřiště na výcvik psů (zápis rady z 12. 3. 2025) není veřejný výběh.

**Q26** „Kdy bude letos posvícení a pouťová zábava?“
Ve zdrojích nic.

## Nejsou dotaz: nehledá se

**Q27** (návrh) „Navrhuju dát k hřišti u školy pár laviček a koš na psí hovínka, maminky tam nemají kde sednout.“

**Q28** (stížnost) „Na sídlišti u zahrádek zase někdo parkuje na trávě a s kočárkem se tam nedá projít. Je to pořád dokola.“

**Q29** (pochvala) „Chci moc poděkovat za stezku k Písečákům, chodíme tam s dětma skoro každý den.“

**Q30** (návrh ve tvaru otázky) „Co kdyby obec dala k Sokolovně pítko pro cyklisty? Myslím, že by se hodilo.“

## Co jsem při sestavování zjistila

- **Výpisové stránky webu obce** (Aktuality, Aktuálně, Úřední deska, Archiv úřední desky, Mapa stránek) opakují texty jednotlivých aktualit a položek desky. Do indexu je nedám, jinak by odpověď citovala výpis místo článku.
- **Některé odpovědi jsou jen v PDF**: cena pronájmu Sokolovny, úvěr na byty i dar pro novorozence. Bez PDF by na ně ucho neodpovědělo.
- **Karty a web obce se v termínech mírně liší**: kaple „2027“ proti „červen 2027“. Ucho proto nesmí slučovat tvrzení z různých zdrojů do jedné věty bez citace obou.
