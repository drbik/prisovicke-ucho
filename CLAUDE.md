# Příšovické ucho (prisovicke-ucho)

Webová aplikace, kde občané Příšovic namluví návrh nebo dotaz. AI ho přepíše do spisovné češtiny a přiřadí k existujícímu tématu. Pak hledá odpověď na webu obce, a když ji nenajde, odpoví zastupitel. Nejde o chatbota: AI s uživatelem nevede dialog, jen zpracuje jeden vzkaz.

Provozovatel je tým Nezávislí pro Příšovice. Na hlasovacím lístku voleb 2026 kandidoval jako Rozumná cesta (kandidátka č. 2) a získal 9 z 15 mandátů. Aplikace není úředním kanálem obce.

Ucho je nadstavba webu nezavisli-prisovice.cz. V tom, co patří webu, platí zdroje jeho projektu (oddíl Soulad s webem Nezávislých).

Vstupem bude grafika ucha na webu nezavisli-prisovice.cz. Po kliknutí se otevře rozhraní pro dotaz, přihlášení a odpovědi, aniž by člověk opustil web. Aplikaci proto stav tak, aby šla do webu vložit jedním skriptem nebo odkazem (F-09).

## Zdroje mimo repozitář: jen ke čtení

Na počítači Tomáše (Windows) jsou dvě složky, ze kterých se smí jen číst. **Nic v nich neměň, nevytvářej ani nemaž soubory a nespouštěj v nich příkazy, které něco zapisují.**

- `C:\Users\tomas\OneDrive\06_CODEX\WEB_Prisovice` – projekt webu nezavisli-prisovice.cz (vede se v Codexu). Odsud se berou projekty (oblasti dotazů), fakta o práci obce, vzhled a pravidla webu. Závazná pravidla webu jsou v jeho `AGENTS.md`, rozcestník v `README.md`. Co z kterého souboru plyne pro ucho, je v `docs/oblasti-a-web.md`. Úpravy webu, včetně grafiky ucha, se dělají v jeho vlastním projektu, ne tady.
- `C:\Users\tomas\OneDrive\06_Podcast Language Learning App\docs\history\lessons-learned.md` – zkušenosti s hlasovými modely (přepis řeči a TTS) z jiného projektu. Použij je při výběru modelů.

Cloudová session k nim nemá přístup. V lokální session je zpřístupni jen ke čtení, např. `/add-dir`.

## Dokumenty

- `docs/PRD.md` – požadavky, verze 0.9 (export). Živá verze je v Claude Docs: https://claude.ai/artifact/1uqzdxoYxj8jR45McMdo3Z. Při rozporu platí živá verze.
- `docs/research-hlasove-podnety.md` – rešerše hotových řešení, hostingu a všech zdrojů.
- `docs/oblasti-a-web.md` – projekty a témata z webu nezavisli-prisovice.cz, mapa znalostí v projektu webu, oblasti a technika webu pro F-09.
- `docs/hlasove-modely.md` – zjištění o hlasových modelech z jiného projektu a co z nich plyne pro výběr modelu přepisu.
- `docs/plan-mvp.md` – MVP rozdělené na postupné kroky, rozpis kroků 1 až 4 a 8, stav a co zbývá.
- `docs/test-zarizeni.md` – výsledky testů na zařízeních a co zbývá ověřit.
- `docs/zadani-krok-8.md` – zadání kroku 8 (index webu a odpověď s citací) pro samostatnou session, včetně pravidla, kdy je hotový.
- `docs/index-zdroju.md` – co index zdrojů obsahuje, jak se stahuje, zpracuje a nahraje.
- `docs/typove-otazky.md` – sada typových otázek kroku 8 (strojově v `tests/data/typove-otazky.json`).
- `docs/vyhodnoceni-odpovedi.md` – výsledky běhů vyhodnocení odpovědí nad typovými otázkami.
- `docs/navrh-alternativni-mluvci.md` – alternativní mluvčí: jak převyprávění funguje, pojistky a výsledky zkoušky se skutečnou AI.
- `docs/feed-vzkazu.md` – ukládání potvrzených vzkazů, feed vedle ucha, opakovaný dotaz a skrytí nevhodného vzkazu.
- `docs/temata-feedu.md` – témata ve feedu: návrh, měření, vyhodnocení na sadě a nasazení.
- `docs/sada-temat.md` – schválená sada pro sdružování vzkazů do témat (strojově v `tests/data/sada-temat.json`).
- `docs/pwa.md` – ucho jako aplikace na ploše telefonu: manifest, service worker, ikony.

Požadavky mají ID (F-01 až F-83) a prioritu MVP / Později / Zvážit. V commitech a kódu na ně odkazuj.

## Soulad s webem Nezávislých

Cesty jsou relativní ke složce `WEB_Prisovice`. Podrobná mapa je v `docs/oblasti-a-web.md`.

- **Název:** na webu „Nezávislí pro Příšovice“, na hlasovacím lístku „Rozumná cesta“, kandidátka č. 2. Nikdy netvrď, že se kandidátka jmenuje Nezávislí pro Příšovice. Zdroj: `src/content/akce-prisovice-timeline.md`, upřesnění z 1. 10. 2026.
- **Fakta o projektech:** faktický master je `src/content/akce-prisovice-timeline.md`, publikované karty jsou v `src/content/projects/`. Timeline obsahuje i neveřejné záměry a neověřené údaje (TBD), proto do ucha přebírej jen to, co je v publikované kartě.
- **Oblasti:** oblast se s kartou projektu páruje stabilním `slug` (např. `dostupne-bydleni`). Název karty se může změnit, slug ne.
- **Vzhled:** barvy a písma podle webu (`DESIGN_SPEC.md`, styly v `src/pages/index.astro`).
- **Hlas textů:** `SIMPLE_COPY_PROMPT.md` je politický hlas karet webu. Odpovědi ucha jsou věcné, s citací a upozorněním, že nejde o úřední vyjádření obce. Výjimkou je převyprávění alternativním mluvčím (rozhodnutí z 13. 11. 2026).
- **Hlavičky:** `src/lib/security-headers.ts` a `public/_headers` musí souhlasit, hlídá to `npm run test:security`. Mění se jen v projektu webu.
- **Nasazení:** ucho má vlastní Worker pro cestu `/ucho`. Do Workeru webu `prisovice-nezavisli` se nikdy nenasazuje. Web se nasazuje jen v jeho projektu a jen na výslovný pokyn.
- Když se ucho a web v něčem, co patří webu, liší, platí web. Rozdíl zapiš do `docs/oblasti-a-web.md`, web neopravuj odsud.

## Rozhodnutí (24. 10. 2026)

- Zdrojem pravdy pro odpovědi je celý obsah webu prisovice.cz včetně PDF. Úřední deska na prisovice.e-obec.cz se nesleduje.
- Odpověď z webu se autorovi ukáže hned, bez schválení. Autor potvrdí „stačí“, nebo se doptá. Doptání je poddotaz ke stejnému tématu.
- Stejné dotazy se slučují do jednoho tématu. O shodě rozhoduje autor: totéž, poddotaz, nebo jiné téma.
- Web se zaindexuje jednou celý, pak se stahují jen změny (výchozí denně, lze týdně). Stahuje se bez spolupráce správce webu.
- Témata a odpovědi jsou veřejné bez přihlášení. Hlasovat smějí ověření občané; v MVP se pobyt neověřuje a hlasuje každý přihlášený.
- Věková hranice je 15 let.
- Oblasti vychází z aktuálních a budoucích projektů na nezavisli-prisovice.cz.
- U každé odpovědi musí být upozornění, že nejde o úřední vyjádření obce.

## Rozhodnutí (1. 11. 2026)

- Hosting je Cloudflare: Workers a Hono, D1, Vectorize, AI Search, Workers AI. Web nezavisli-prisovice.cz běží na stejné platformě.
- Oblasti v MVP: pět budoucích projektů z webu a Ostatní. Témata k prověření se mohou přidat později.
- Datový model MVP má 11 entit z PRD, bez Slovníku (F-11 je Později).
- V MVP se nahrávky neukládají, datový model nemá odkaz na nahrávku. Úložiště slouží jen pro dokumenty obce.

## Rozhodnutí (2. 11. 2026)

- Přihlášení je před nahráváním. Nahrávání bez přihlášení (F-06) zůstává Později.
- Testuje se na Opeře pro Android a na Edge a Opeře ve Windows. Safari na iOS a Firefox se v MVP netestují, F-05 je tak ověřený jen pro prohlížeče na Chromiu.
- Podrobnosti kroku 2 (limit nahrávky, textové pole, pole `vstup` u podnětu) jsou v `docs/plan-mvp.md`.

## Rozhodnutí (6. 11. 2026)

- Před potvrzením autorem se nic neukládá. Server výsledek přepisu a úpravy podepíše a uloží ho až po potvrzení (F-14).
- V MVP bez AI Gateway a bez serverové fronty. Obojí by mohlo uložit audio. Při výpadku AI autor pošle nahrávku znovu z prohlížeče.
- Pro vzkazy občanů se nepoužívají bezplatné modely z OpenRouteru: zaznamenávají vstupy a jsou jen na zkoušku.
- Kandidáti na AI úpravu a prahy pro výběr jsou v `docs/plan-mvp.md` (krok 3). Stránka zatím používá Gemmu 4 26B bez uvažování, definitivně rozhodne krok 3.6.
- Kostra aplikace: Astro 7 s adaptérem pro Cloudflare na stránky, stejně jako web Nezávislých. Hono na API pod `/api`.
- Plánování MVP je uzavřené. Další fáze je testování, pořadí testů je v `docs/plan-mvp.md`.
- Ucho poběží na doméně webu pod cestou nezavisli-prisovice.cz/ucho. Testuje se lokálně a rovnou na této ostré adrese, bez neveřejných náhledů (workers.dev, preview). Web má malou návštěvnost, proto se rozdíl mezi veřejnou a neveřejnou verzí neřeší.

## Rozhodnutí (9. 11. 2026)

- Další je krok 8: index webu a odpověď s citací. Běží v samostatné session podle `docs/zadani-krok-8.md`. (Hotový a sloučený do hlavní větve 13. 11. 2026, PR #1 a #2.)
- Zdroje odpovědí: prisovice.cz včetně PDF a publikované karty projektů z webu Nezávislých. `akce-prisovice-timeline.md` se do indexu nikdy nedostane. Odpověď z webu Nezávislých se označí „Podle webu Nezávislých pro Příšovice“, ne „Odpověď z webu obce“.
- Ukázkové dotazy: jen jasně označené ukázky od týmu, bez vymyšlených autorů a hlasů, s odpověďmi ze skutečných zdrojů. Do té doby, než bude veřejný seznam témat (krok 11), slouží jako testovací sada kroku 8. Je to rozšíření MVP se souhlasem Tomáše.
- Stahování i index prisovice.cz zatím jen za poslední 2 roky, od 9. 11. 2024. Platí to pro aktuality, úřední desku a PDF. Jak okno platí pro stálé stránky, řeší rozpis kroku 8 v `docs/plan-mvp.md`.

## Rozhodnutí (10. 11. 2026)

- Index zdrojů se rozšiřuje o dokumenty Word a ODT a o text naskenovaných PDF rozpoznaný OCR. Je to rozšíření MVP se souhlasem Tomáše. Excel a zip zůstávají mimo index.
- Převod Wordu i OCR běží jen na počítači (Microsoft Word s vypnutými makry, OCR ve Windows v češtině). Neurony Workers AI stojí až embeddingy při nahrání indexu.
- Zdroj, jehož text pochází z OCR, má v názvu „text rozpoznaný ze skenu“, protože rozpoznání může obsahovat chyby.
- Text vzkazu má písmo Roboto Mono. Je to rozdíl od webu Nezávislých, zapsaný v `docs/oblasti-a-web.md`.
- Index se rozšiřuje o veřejný obsah webu Nezávislých: Tlampač a podklady (soubory Markdown na nezavisli-prisovice.cz/podklady/, které web zveřejňuje pro čtení strojem). Tomáš to schválil 10. 11. 2026 večer s podmínkou „ověřené Markdown soubory“. Berou se z veřejného webu, nikdy ze složky projektu webu. `akce-prisovice-timeline.md` zůstává mimo index, stejně jako rozcestník podkladů a vse.md s pokyny pro chatboty a stránka Archiv voleb.
- Účet Cloudflare přešel na Workers Paid (5 USD měsíčně, platí pro celý účet včetně webu). Denních 10 000 neuronů zůstává zdarma, nad ně se platí 0,011 USD za tisíc. Ucho se tak při vyčerpání limitu nezastaví. Limit už nefunguje jako strop výdajů, proti zneužití chrání omezení počtu požadavků.

## Rozhodnutí (11. 11. 2026)

- Stránka ucha ukazuje na jedné obrazovce ucho, zodpovězené dotazy a témata čekající na zastupitele. Dokud se vzkazy neukládají, jsou to ukázky od týmu podle rozhodnutí z 9. 11. 2026: každá má štítek „Ukázka“, bez vymyšlených autorů, hlasů a dat podání, odpovědi jsou skutečný výstup ucha se zdroji. Data jsou v `src/lib/temata/ukazky.json`. (Od 13. 11. 2026 se potvrzené vzkazy ukládají a ukázky jsou ve feedu za nimi, viz rozhodnutí 13. 11. 2026, feed.)
- Mezi čekající ukázky smí jen dotaz, ke kterému index zdrojů opravdu nic nemá. Dotaz, ke kterému index má aspoň související údaj (cena vody za loňský rok, nájem ve stávajících bytech, minulý termín akce), mezi čekající nepatří. Každý čekající dotaz má v datech hlídané vzory a `npx tsx nastroje/index/kontrola-ukazek.ts` selže, když některý v indexu něco najde. Spouští se po každé změně ukázek a po každé obnově indexu.

## Rozhodnutí (12. 11. 2026)

- Dotaz se vždy dělí na samostatné otázky, nejvýš 4. Dělí ho AI a každá otázka se ptá na jednu věc. Každá část má vlastní hledání, odpověď a ověření. Dotaz na jednu věc se hledá v autorově znění a jeho hledání běží souběžně s rozdělením (rozdělení má limit 3 s), protože přeformulovaná otázka hledala hůř a čekání zdržovalo. Důvod: u dotazu na sportoviště a ceny pronájmu vytlačily úseky o sportu ceník Sokolovny a jedna čárka navíc v citaci zahodila celou odpověď.
- Autor průběžně vidí, na jaké otázky AI dotaz rozdělila a co se u které děje: hledáme, odpověď jsme našli, nebo ve zdrojích není. Části běží souběžně. Server posílá průběh po řádcích JSON (`application/x-ndjson`).
- Pravidlo F-75 platí pro každou část zvlášť: když v části cokoli neprojde, převezmou ji zastupitelé a ostatní části odpověď ukážou. Tomáš schválil návrh opravy 12. 11. 2026.
- Prompt odpovědi verze 5: až 4 věty na část, u řádku tabulky citace se záhlavím sloupců, při rozporu zdrojů novější údaj. Model i ověření znají dnešní datum, takže termín, který už minul, nevydají za příští. Údaje o jiném místě nebo budově se nepoužijí. Ověření navíc zamítne větu se jménem soukromé osoby (žadatel, nájemce), které model jinak ze zápisů rady přebíral.
- Text z PDF odděluje sloupce tabulky znaky „ | “, stejně jako u Wordu. Bez toho nešlo poznat, že v ceníku Sokolovny je 8 000 Kč vratná kauce, a ne cena energie.
- Kontrola citace toleruje změněnou koncovku slova, protože model při opisu „opravuje“ pády („vratné kauce“ místo „vratná kauce“) a kód tím zahazoval celé části. Čísla a krátká slova musí sedět přesně, nejvýš jedna odchylka na 8 slov. Pod odpovědí je vždy přesné znění zdroje, ne opis modelu, a ověření i kontrola čísel běží proti němu. Tomáš schválil 12. 11. 2026 večer.

## Rozhodnutí (13. 11. 2026)

- Ucho má alternativní mluvčí: Bart Simpson, Malý princ, Medvídek Pú, Sokrates, Marvin, Suchý úředník a Staročeština. Cílem je, aby z webu nečpěla úředničina a byl přívětivý a lehce humorný pro toho, kdo o to stojí. Je to rozšíření MVP a výjimka z hlasu textů, Tomáš ho zadal 13. 11. 2026.
- Styl patří k přímému namlouvání, ne ke starým odpovědím (pokyn Tomáše): u ukázek v přehledu témat mluvčí nejsou. Kolem velkého tlačítka je sluníčko malých kulatých ikon. Základ je Spisovně, kolem jsou postavy. Ťuknutí na ikonu nahrávání nespustí, jen promění velké tlačítko v postavu (ikona, barva, „Namluvit jako Marvin“). Nahrávat se začne až velkým tlačítkem. Stejně funguje „Raději napíšu“.
- Při kontrole vzkazu postava přepíše autorův vzkaz svým hlasem a styl jde přepnout zpět na Spisovně nebo na jinou postavu. Text postavy je jen k přečtení, opravuje se spisovné znění. Podle spisovného znění se hledá i odpověď a kontroluje potvrzení. Zvolená postava pak převypráví odpověď na dotaz, i zprávu, že odpověď na webu není.
- Ve zkušebním a vývojovém provozu mají postavy skutečná jména a zadání stylu se drží postavy bez ohledu na web, jeho účel a obsah otázky (pokyn Tomáše: „toto není politický a absolutně korektní prezentace“). Ikony jsou vlastní čárové kresby (skateboard, planetka, hrnec medu, sloup, robot, razítko, brk), ne obrázky postav. Ověřovací model posměch ani tón nehlídá.
- Věcná odpověď, citace, zdroje a upozornění zůstávají vždy vidět. Odpověď postavy je v rámečku „pro pobavení“ nad nimi. Kód hlídá jen čísla: všechna z textu zůstanou a žádné nepřibude. Číslovku smí postava napsat číslicí a naopak, jedničku jen číslicí.
- Odpověď postava převypráví, jen když ji server sám vydal a podepsal (HMAC, klíč `KLIC_PODPISU` ve Workers Secrets). Vzkaz přepisuje z textu od autora, stejně jako AI úprava. Postavy mají vlastní limit požadavků (`STYL_RATE_LIMITER`, 20 za minutu) a nic se neukládá.
- Podrobnosti a výsledky zkoušky jsou v `docs/navrh-alternativni-mluvci.md`.

## Rozhodnutí (13. 11. 2026, feed)

- Potvrzený vzkaz se uloží do D1 a hned zveřejní ve feedu vedle ucha, bez schválení (Tomáš to zvolil s vědomím, že moderace ani zakrývání osobních údajů v MVP nejsou). Ukládají se všechny potvrzené vzkazy: dotazy, návrhy, stížnosti a pochvaly. Bez jména autora, bez IP adresy a bez nahrávky. Neveřejně i surový přepis a návrh AI úpravy. Je to rozšíření MVP a odchylka od rozhodnutí z 2. 11. 2026, že přihlášení je před nahráváním.
- Uložit jde jen vzkaz, jehož návrh AI úpravy server podepsal (F-14). Před potvrzením je upozornění, že se vzkaz zveřejní, a tlačítko „Potvrdit a zveřejnit“. Nevhodný vzkaz tým skryje příkazem `npx tsx nastroje/vzkazy.ts skryt ID`.
- Feed je jeden jednoduchý seznam s hledáním a filtry stavu (Zodpovězené, Čekají na odpověď) a typu. Ukázky od týmu v něm zůstávají se štítkem Ukázka, za skutečnými vzkazy.
- Opakovaný dotaz: když je embedding nového dotazu podobný zodpovězenému dotazu nebo ukázce aspoň na 0,85, panel ukáže odkaz na odpověď a ve feedu na ni jde skočit.
- Lokální vývoj ukládá vzkazy jen do paměti, ne do ostré databáze.
- Nahoře ve feedu je heslovitě „Zkušební provoz · ukázkové dotazy a odpovědi · vzkazy se zveřejňují bez jména · nejde o úřední vyjádření obce“. Feed netvrdí, že ukázky připravil tým (Tomáš: to není pravda).
- Podrobnosti jsou v `docs/feed-vzkazu.md`.
## Rozhodnutí (13. 11. 2026, témata)

- Feed ukazuje témata, ne jednotlivé vzkazy (F-33 až F-37, F-81). Téma má hlavní dotaz, jednu odpověď složenou z ověřených vět, poddotazy a připojené vzkazy. Je to rozšíření MVP pro zkušební provoz, zadal ho Tomáš.
- Bez mezikroku (Tomáš 13. 11. 2026 po zkoušce na ostré adrese): tlačítko „Vyhledat odpověď“ je hned pod vzkazem, vzkaz se uloží jako vlastní téma a rovnou se hledá odpověď. Opravdu podobné téma (práh 0,75, nejvýš 2) se ukáže jen jako tichý odkaz pod odpovědí. Nic se nesloučí samo, témata spojuje tým příkazem. Je to odchylka od F-35 a od rozhodnutí z 24. 10. 2026, že o shodě rozhoduje autor.
- Odpověď tématu se skládá z částí, AI ji nepřepisuje. Kód nepustí opakovanou větu, rozpor zdrojů posoudí model a novější zdroj vyhraje. Starší část jde ke kontrole, nic se nemaže. Ukázky jsou témata. Tým témata opravuje příkazy v `nastroje/vzkazy.ts` (úprava v rozhraní je Později, F-38).
- Podrobnosti, měření a výsledky jsou v `docs/temata-feedu.md`.

- Ucho jde přidat na plochu telefonu jako aplikace (PWA). Manifest a service worker leží pod `/ucho`, web Nezávislých se nemění. Service worker nic neukládá do mezipaměti. Podrobnosti v `docs/pwa.md`.

## MVP (prezentační verze)

1. Grafika ucha na webu nezavisli-prisovice.cz. Po kliknutí rozhraní s mikrofonem a záložním textovým polem.
2. Přihlášení a odpovědi přes Telegram.
3. Přepis řeči, AI úprava do spisovné češtiny, potvrzení textu autorem.
4. Hledání podobných témat: připojit se, poddotaz, nebo nové téma.
5. Odpověď z webu prisovice.cz s odkazem na zdroj; index se aktualizuje ručně.
6. Bez odpovědi ze zdroje převezme dotaz správce.
7. Veřejný seznam témat a odpovědí, hlasování palcem.
8. Jednoduchá administrace: fronta podle skóre a odpověď.

Do MVP nepatří e-mail, GDPR souhlasy a moderace, zakrytí osobních údajů, ověření pobytu ani pravidelný index. Nerozšiřuj MVP bez souhlasu.

## Otevřené otázky

- Vložení do webu (F-09): ucho běží na nezavisli-prisovice.cz/ucho, vlastní route má přednost před Custom Domain webu (ověřeno 6. 11. 2026). Zbývá rozhodnout, jak ucho otevře grafika na webu. Závisí to na testu mikrofonu v rámu na Opeře pro Android. Rozbor je v `docs/oblasti-a-web.md`.
- Kdo bude správce osobních údajů podle GDPR.

## Pravidlo: zkouška z telefonu přes domácí síť

Když Tomáš chce ucho zkoušet na telefonu nebo na jiném zařízení v domácí síti, postupuj takhle. Platí jen pro lokální vývoj. Ostrý Worker se tím nemění a nic z toho se nenasazuje.

1. **Proč https:** mikrofon prohlížeč povolí jen na https nebo na localhost. Po http přes IP adresu stránka sama nabídne psaní. Lokální server proto běží přes https s vlastním certifikátem.
2. **Adresa počítače:** `Get-NetIPAddress -AddressFamily IPv4`, vezmi adresu rozhraní Wi-Fi (10.20.30.44 dne 10. 11. 2026). Adaptéry VPN (NordLynx, OpenVPN) ignoruj. Síť Wi-Fi musí mít profil Private (`Get-NetConnectionProfile`). Příchozí provoz pro Node.js je ve firewallu povolený.
3. **Certifikát:** `klic.pem` a `certifikat.pem` ve `%USERPROFILE%\.prisovicke-ucho\https`, mimo repozitář. Platí do 10. 12. 2026 a jen pro adresy 10.20.30.44, localhost a 127.0.0.1. Když chybí, vypršel, nebo se změnila adresa počítače, vytvoř nový v Git Bash:
   ```bash
   mkdir -p "$USERPROFILE/.prisovicke-ucho/https" && cd "$USERPROFILE/.prisovicke-ucho/https" && MSYS_NO_PATHCONV=1 openssl req -x509 -newkey rsa:2048 -nodes -days 30 -keyout klic.pem -out certifikat.pem -subj "/CN=prisovicke-ucho-dev" -addext "subjectAltName=IP:<adresa>,DNS:localhost,IP:127.0.0.1"
   ```
4. **Server:** `UCHO_HTTPS=1 npm run dev -- --host 0.0.0.0 --port 4321`. V aplikaci Claude přes `preview_start` s konfigurací `ucho-wifi` z `.claude/launch.json`. Ten git ignoruje, takže když chybí, vytvoř ho s položkou `runtimeExecutable: npm`, `runtimeArgs: ["run", "dev", "--", "--host", "0.0.0.0", "--port", "4321"]`, `env: {"UCHO_HTTPS": "1"}`, `url: "https://localhost:4321"` a `port: 4321`. Když je port 4321 obsazený jinou session, vyber jiný.
5. **AI:** lokální server používá falešnou AI (`.dev.vars` s `FALESNE_AI=1`, git ho ignoruje). Napsaný text vrací beze změny, nahrávka dá pevnou větu a dotaz skončí u zastupitelů. Nestojí to žádné neurony. Skutečná AI v lokálním serveru není nastavená, skutečné odpovědi se zkoušejí na ostré adrese.
6. **Ověření před předáním adresy:** server se rozjíždí asi 15 s. `curl -sk -o /dev/null -w "%{http_code}" https://<adresa>:4321/ucho/` musí vrátit 200. Prohlížeč v aplikaci vlastní certifikát odmítne (`ERR_CERT_AUTHORITY_INVALID`). Kontrolu certifikátu nevypínej a API zkoušej přes `curl -k` s hlavičkami `Origin: https://<adresa>:4321` a `Sec-Fetch-Site: same-origin`.
7. **Co říct Tomášovi:** adresa `https://<adresa>:4321/ucho/` (s „s“, přes http to nepůjde), telefon musí být ve stejné Wi-Fi, Opera ukáže varování o certifikátu (Rozšířené, Pokračovat), potom povolit mikrofon. Server běží, dokud je session otevřená. Po zkoušení ho zastav přes `preview_stop`.
8. **Kde to je v kódu:** `astro.config.mjs` spustí https jen při `UCHO_HTTPS`, `src/lib/podani/ochrana.ts` pustí adresy 10.x, 192.168.x a 172.16 až 31.x jen při `import.meta.env.DEV` a falešná AI vrací napsaný text (`ozvena` v `src/lib/ai/falesna.ts`).
9. **Co neměnit:** firewall, nastavení sítě ani certifikáty v systému. Když telefon na server nedosáhne, řekni to Tomášovi a popiš, co jsi ověřila.

## Zásady pro kód

- Piš v TypeScriptu pro Cloudflare Workers: Astro 7 na stránky, Hono na API pod `/api`. Logiku drž v modulech, které neznají ani jeden z frameworků. Přístup k databázi, úložišti a AI schovej za vlastní rozhraní, aby šel hosting později vyměnit.
- Automatická odpověď smí obsahovat jen informace z nalezených úryvků. Každé tvrzení má citaci (URL, název, datum). Bez opory ve zdroji jde dotaz ke správci, nikdy si AI nic nedomýšlí.
- Ukládej surový přepis i upravený text.
- Texty pro uživatele piš spisovnou češtinou.
- Osobní údaje sbírej v minimu. V MVP neukládej audio.
