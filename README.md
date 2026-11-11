# Příšovické ucho

Aplikace pro hlasové podněty a dotazy občanů Příšovic, nadstavba webu nezavisli-prisovice.cz. Vstupem je grafika ucha na tomto webu. Namluvený vzkaz převede AI do spisovné češtiny a přiřadí ho k tématu. Odpověď hledá nejdřív na webu obce, jinak odpoví zastupitel.

Plánování MVP je uzavřené a projekt je ve fázi testování. Zkušební stránka běží na https://nezavisli-prisovice.cz/ucho.

- [PRD](docs/PRD.md) – co aplikace má umět
- [Rešerše](docs/research-hlasove-podnety.md) – hotová řešení, hosting a zdroje
- [Oblasti a web](docs/oblasti-a-web.md) – projekty z nezavisli-prisovice.cz, znalosti z projektu webu a jak aplikaci do webu vložit
- [Hlasové modely](docs/hlasove-modely.md) – zkušenosti z jiného projektu pro výběr modelu přepisu
- [Plán MVP](docs/plan-mvp.md) – MVP rozdělené na postupné kroky
- [Testy na zařízeních](docs/test-zarizeni.md) – výsledky testů a co zbývá
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
