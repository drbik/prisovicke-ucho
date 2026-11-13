# Ucho jako aplikace na ploše telefonu (PWA)

*Zadal Tomáš 13. 11. 2026 (krok 8.18 v [plan-mvp.md](plan-mvp.md)). Týká se jen cesty nezavisli-prisovice.cz/ucho, web Nezávislých se nemění.*

## Jak si ucho přidat na plochu

- **Android (Chrome, Opera, Edge):** otevřít `https://nezavisli-prisovice.cz/ucho/`, v nabídce prohlížeče zvolit „Přidat na plochu“ nebo „Instalovat aplikaci“. Chrome někdy nabídne instalaci sám.
- **iPhone (Safari):** otevřít stejnou adresu, tlačítko Sdílet, „Přidat na plochu“.

Na ploše je ikona „Ucho“: bílý mikrofon na zelené barvě webu s oranžovou tečkou. Ucho se otevře jako samostatná aplikace, bez adresního řádku.

## Co k tomu patří

| Soubor | K čemu |
|---|---|
| `src/pages/manifest.webmanifest.ts` | Manifest: název „Příšovické ucho“, krátký název „Ucho“, start a rozsah `/ucho/`, zobrazení na celou obrazovku, barvy webu, ikony 192 a 512 px (i maskable). |
| `src/pages/sw.js.ts` | Service worker. Nic neukládá do mezipaměti, takže vzkazy ani odpovědi v telefonu nezůstávají a stránka je vždy čerstvá. Bez připojení ukáže krátkou zprávu „Bez připojení“. |
| `src/skripty/pwa.ts` | Registrace service workeru, jen na ostré adrese (lokální vývoj ho neregistruje). |
| `src/layouts/Zaklad.astro` | Odkaz na manifest, barva lišty a ikona a název pro iPhone. |
| `src/ikony/ucho.svg` | Zdroj ikony. PNG 512, 192 a 180 px jsou vedle něj. |

Manifest a service worker jsou endpointy Astra, ne soubory v `public`. Soubory z `public` se při sestavení kopírují do kořene domény, a ten patří webu Nezávislých, ne Workeru ucha.

## Jak ikony znovu vytvořit

Po změně `src/ikony/ucho.svg` je vykreslí Edge v Git Bash, bez dalších balíčků:

```bash
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"; for r in 512 192 180; do "$EDGE" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=$(node -e "console.log($r/512)") --window-size=512,512 --screenshot="$(cygpath -w "$PWD/src/ikony")\\ucho-$r.png" "file:///$(cygpath -m "$PWD/src/ikony/ucho.svg")"; done
```

## Nasazení

Worker verze c144cde9 z 13. 11. 2026. Na ostré adrese se manifest načte jako `application/manifest+json`, ikony jako PNG a service worker je aktivní s rozsahem `/ucho/`.

## Co zbývá ověřit

- Instalaci na Opeře pro Android a na Edge ve Windows, podle testovacích zařízení projektu. Safari na iOS se v MVP netestuje (rozhodnutí z 2. 11. 2026).
- Mikrofon v aplikaci na ploše: oprávnění se ptá stejně jako v prohlížeči.
