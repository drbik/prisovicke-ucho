# Hlasové modely: zjištění z jiného projektu

*Stav k 1. 11. 2026. Zdroj: `lessons-learned.md` z projektu Podcast Language Learning App (jen ke čtení). Poslední doložené pokusy jsou z 16. 10. 2026. Modely, ceny a termíny jsou údaje z té doby, ne nově ověřená nabídka.*

Projekt zkoušel hlasovou výuku angličtiny přes OpenAI Realtime, Speechmatics, agenta ElevenLabs a Gemini TTS. Testovalo se hlavně v Chromu na Androidu. Přepis české řeči v něm systematicky ověřený není.

## Co z toho plyne pro Příšovické ucho

1. **Testovat na skutečném telefonu.** Desktop, simulované zobrazení ani mock nestačí. U F-05 to znamená Chrome na Androidu i Safari na iOS. iOS se v tom projektu netestoval.
2. **Nahrát, odeslat, přepsat.** Na zpracování jednoho vzkazu stačí požadavek a odpověď. Realtime spojení otevírané při každém klepnutí (agent ElevenLabs) mělo na telefonu nepředvídatelnou latenci, až desítky sekund. Živý přepis (F-08) by realtime spojení potřeboval, proto dává smysl nechat ho ve stavu Zvážit.
3. **Měřit latenci po krocích.** Odeslání nahrávky, přepis, AI úpravu a hledání podobných témat měřit zvlášť a ukládat k požadavku.
4. **Počítat s chováním telefonu.** Po zamčení se zvuk v prohlížeči může uspat. Bluetooth sluchátka po zapnutí mikrofonu přepnou profil. Uživatel má vidět, že se čeká, a mít možnost zrušit.
5. **Konfiguraci držet v repozitáři.** Prompty, slovník místních názvů a limity patří do kódu a na server, ne do nastavení u poskytovatele.
6. **Klíče jen na serveru.** Do prohlížeče nanejvýš krátkodobý token.

## Výběr modelu přepisu

PRD počítá s `whisper-large-v3-turbo` na Workers AI a alternativou Deepgram Nova-3. Vybrat se má po testu na 20 až 30 reálných nahrávkách. Z lessons-learned k tomu:

- Měnit vždy jen jeden faktor a výstupy hodnotit naslepo.
- Malý vzorek neprokazuje stabilitu. U generativního hlasu dostaly dvě stejně zadané ukázky za češtinu 5/5 a 3/5.
- Speechmatics (Realtime STT) fungoval jen na desktopu, na telefonu se nezkoušel a druhý den byl revertován. Umí jeden jazyk na session, což tady nevadí, protože se mluví česky.
- Další kandidáti z katalogu, žádný z nich pro češtinu ověřený: AssemblyAI, Soniox, ElevenLabs (`scribe_v2`), Gemini, OpenAI.
- Druhého poskytovatele přidávat, až když měření ukáže problém s cenou nebo kvalitou prvního.

**První měření `whisper-large-v3-turbo` (6. 11. 2026):** model přijal WebM/Opus z Edge a Opery ve Windows a přepsal 2:59 vcelku za 21,6 s. Šlo o syntetický hlas bez nápovědy `initial_prompt`, takže to není vyhodnocení kvality. To přinese až testovací sada z kroku 3.5. Podrobnosti jsou v [test-zarizeni.md](test-zarizeni.md).

## Čtení odpovědí nahlas (mimo MVP)

MVP hlas nepotřebuje, odpovědi jsou text. Kdyby se to později změnilo:

- Gemini `gemini-3.8-flash-lite-tts`, hlas Kore: v malém slepém testu vyšel celý WAV lépe než stream (čeština 5 a 3 proti 3 a 2). Generování trvalo asi 4,9–5,8 s.
- Cartesia a Qwen3-TTS: čeština neověřená.
- OpenAI podle rešerše z 13. 10. 2026 plánuje ukončit `gpt-4o-mini-tts` (6. 1. 2027) a `gpt-5.4-nano` (1. 4. 2027).
