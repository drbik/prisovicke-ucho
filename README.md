# Příšovické ucho

Aplikace pro hlasové podněty a dotazy občanů Příšovic, nadstavba webu nezavisli-prisovice.cz. Vstupem je grafika ucha na tomto webu. Namluvený vzkaz převede AI do spisovné češtiny a přiřadí ho k tématu. Odpověď hledá nejdřív na webu obce, jinak odpoví zastupitel.

Zkušební provoz běží na https://nezavisli-prisovice.cz/ucho (stav k 13. 11. 2026). Ucho přepíše a upraví vzkaz, na dotaz odpoví z webu obce s citací a potvrzené vzkazy ukazuje ve feedu. Jde přidat na plochu telefonu jako aplikace. Přihlášení, Telegram, fronta správce a hlasování zatím nejsou. Co je hotové a co zbývá, je v plánu MVP.

- [PRD](docs/PRD.md) – co aplikace má umět
- [Plán MVP](docs/plan-mvp.md) – MVP rozdělené na postupné kroky, stav a co zbývá
- [Testy na zařízeních](docs/test-zarizeni.md) – výsledky testů a co zbývá
- [Rešerše](docs/research-hlasove-podnety.md) – hotová řešení, hosting a zdroje
- [Oblasti a web](docs/oblasti-a-web.md) – projekty z nezavisli-prisovice.cz, znalosti z projektu webu a jak aplikaci do webu vložit
- [Hlasové modely](docs/hlasove-modely.md) – zkušenosti z jiného projektu pro výběr modelu přepisu
- [Zadání kroku 8](docs/zadani-krok-8.md) – index webu a odpověď s citací
- [Index zdrojů](docs/index-zdroju.md) – co index obsahuje a jak se obnovuje
- [Typové otázky](docs/typove-otazky.md) – testovací sada kroku 8
- [Vyhodnocení odpovědí](docs/vyhodnoceni-odpovedi.md) – výsledky běhů nad typovými otázkami
- [Alternativní mluvčí](docs/navrh-alternativni-mluvci.md) – převyprávění hlasem postav
- [Feed vzkazů](docs/feed-vzkazu.md) – ukládání vzkazů, feed a skrytí nevhodného vzkazu
- [Témata ve feedu](docs/temata-feedu.md) – jedna odpověď na téma, nabídka podobných témat, měření a nasazení
- [Sada pro sdružování](docs/sada-temat.md) – schválená testovací sada témat
- [Aplikace na ploše](docs/pwa.md) – manifest, service worker a ikony
- [CLAUDE.md](CLAUDE.md) – kontext a pravidla pro práci s Claude Code

## Spuštění

Aplikace je v Astru 7 s Hono na API a běží na Cloudflare Workers. Potřebuje Node 22.12 nebo novější.

```bash
npm install
```

Lokálně běží na http://localhost:4321/ucho. Bez přihlášení ke Cloudflare si zkopírujte `.dev.vars.example` jako `.dev.vars`, místo Whisperu a jazykového modelu se pak vrací pevný text.

```bash
npm run dev
```

Testy běží bez sítě a bez klíčů.

```bash
npm test
```

Nasazení jde do vlastního Workeru `prisovicke-ucho`, nikdy do Workeru webu.

```bash
npm run deploy
```
