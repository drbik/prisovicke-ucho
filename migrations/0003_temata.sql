-- Témata ve feedu (13. 11. 2026, F-33 až F-37, F-81). Návrh schválil Tomáš, podrobnosti v docs/temata-feedu.md.
-- Feed ukazuje témata. Vzkaz (Podnět z PRD) patří k tématu a odpověď tématu se skládá z ověřených částí.

-- Téma. Ukázka se stane řádkem až při prvním připojeném vzkazu, do té doby žije jen v ukazky.json.
CREATE TABLE tema (
  id TEXT PRIMARY KEY,
  ukazka INTEGER NOT NULL DEFAULT 0,
  vytvoreno TEXT NOT NULL,
  -- Poslední změna: nový vzkaz nebo nová část odpovědi. Podle ní se řadí feed.
  zmeneno TEXT NOT NULL,
  nazev TEXT NOT NULL,
  -- Hlavní dotaz: kopie textu zakladatele nebo ukázky.
  text TEXT NOT NULL,
  typ TEXT NOT NULL CHECK (typ IN ('dotaz', 'navrh', 'stiznost', 'pochvala')),
  oblast TEXT NOT NULL,
  stav TEXT NOT NULL CHECK (stav IN ('zodpovezeno-z-webu', 'ceka-na-spravce', 'sloucene')),
  -- Sloučené téma odkazuje na hlavní (PRD).
  hlavni_id TEXT REFERENCES tema (id),
  skryto INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX tema_feed ON tema (skryto, zmeneno);

-- Vzkaz patří k tématu se vztahem z PRD. Název má vlastní embedding: nabídka podobných témat bere vyšší
-- z podobností text proti textu a název proti názvu (měření 13. 11. 2026).
ALTER TABLE vzkaz ADD COLUMN tema_id TEXT REFERENCES tema (id);
ALTER TABLE vzkaz ADD COLUMN vztah TEXT CHECK (vztah IN ('zakladatel', 'totez', 'poddotaz', 'doplneni'));
ALTER TABLE vzkaz ADD COLUMN vektor_nazvu BLOB;
-- F-81: „Odpověď mi stačí“, nebo „Chci se doptat“. Zatím se nikde neukazuje.
ALTER TABLE vzkaz ADD COLUMN potvrzeni TEXT CHECK (potvrzeni IN ('staci', 'doptani'));
CREATE INDEX vzkaz_tema ON vzkaz (tema_id);
ALTER TABLE vektor_ukazky ADD COLUMN vektor_nazvu BLOB;

-- Odpověď k tématu (vzkaz_id NULL = hlavní dotaz) nebo k poddotazu. Každá věta prošla ověřením (F-73 až F-76),
-- složení odpovědi tématu nic nepřepisuje. Citace jsou kopie v JSON: tabulka citace má cizí klíč na dokumenty,
-- které obnova indexu maže a nahrává znovu.
CREATE TABLE odpoved (
  id TEXT PRIMARY KEY,
  tema_id TEXT NOT NULL REFERENCES tema (id),
  vzkaz_id TEXT REFERENCES vzkaz (id),
  vytvoreno TEXT NOT NULL,
  puvod TEXT NOT NULL CHECK (puvod IN ('web', 'ukazka')),
  stav TEXT NOT NULL CHECK (stav IN ('platna', 'ke-kontrole', 'stazena')),
  -- U ke-kontrole a stažené: novejsi-zdroj, autor-upravil, presunuto, slouceno, tym.
  duvod TEXT,
  nahrazena_id TEXT REFERENCES odpoved (id),
  -- Otázka části u poddotazu (nové otázky), u hlavní odpovědi prázdná.
  otazka TEXT,
  -- JSON: části s větami (text, url zdroje), zdroje (url, název, datum, web, označení, úryvek, místo), nezodpovězeno.
  obsah TEXT NOT NULL
);
CREATE INDEX odpoved_tema ON odpoved (tema_id, stav);
-- Nejvýš jedna platná odpověď na hlavní dotaz a na každý poddotaz.
CREATE UNIQUE INDEX odpoved_platna ON odpoved (tema_id, ifnull(vzkaz_id, '')) WHERE stav = 'platna';
