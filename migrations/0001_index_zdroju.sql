-- Krok 8.5: index zdrojů pro odpovědi z webu (F-70 až F-76). Jen to, co krok 8 potřebuje.

-- Zdrojový dokument podle datového modelu PRD. Typ je rozdělený i na úřední desku a kartu.
CREATE TABLE zdrojovy_dokument (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  nazev TEXT NOT NULL,
  web TEXT NOT NULL CHECK (web IN ('prisovice.cz', 'nezavisli-prisovice.cz')),
  typ TEXT NOT NULL CHECK (typ IN ('stranka', 'aktualita', 'uredni-deska', 'pdf', 'karta')),
  zverejneno TEXT,
  zmeneno TEXT,
  mesic_nahrani TEXT,
  otisk TEXT NOT NULL,
  stazeno TEXT NOT NULL,
  nadrazeny_url TEXT
);

-- Úsek je technická tabulka indexu (v PRD jako entita není). Číselný klíč drží vazbu na fulltext stabilní.
CREATE TABLE usek (
  cislo INTEGER PRIMARY KEY,
  id TEXT NOT NULL UNIQUE,
  dokument_id TEXT NOT NULL REFERENCES zdrojovy_dokument (id) ON DELETE CASCADE,
  poradi INTEGER NOT NULL,
  strana INTEGER,
  hlavicka TEXT NOT NULL,
  text TEXT NOT NULL
);
CREATE INDEX usek_dokument ON usek (dokument_id);

-- Fulltext bez diakritiky najde přesné výrazy: čísla usnesení, jména firem, místní názvy.
CREATE VIRTUAL TABLE usek_fts USING fts5 (
  hlavicka,
  text,
  content = 'usek',
  content_rowid = 'cislo',
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TRIGGER usek_fts_vlozit AFTER INSERT ON usek BEGIN
  INSERT INTO usek_fts (rowid, hlavicka, text) VALUES (new.cislo, new.hlavicka, new.text);
END;
CREATE TRIGGER usek_fts_smazat AFTER DELETE ON usek BEGIN
  INSERT INTO usek_fts (usek_fts, rowid, hlavicka, text) VALUES ('delete', old.cislo, old.hlavicka, old.text);
END;
CREATE TRIGGER usek_fts_zmenit AFTER UPDATE ON usek BEGIN
  INSERT INTO usek_fts (usek_fts, rowid, hlavicka, text) VALUES ('delete', old.cislo, old.hlavicka, old.text);
  INSERT INTO usek_fts (rowid, hlavicka, text) VALUES (new.cislo, new.hlavicka, new.text);
END;

-- Citace patří k Odpovědi, která se zatím neukládá (4.3, F-77). Tabulka do té doby zůstane prázdná.
-- Úryvek je kopie, aby citace přežila změnu nebo smazání úseku při přeindexování.
CREATE TABLE citace (
  id TEXT PRIMARY KEY,
  odpoved_id TEXT NOT NULL,
  dokument_id TEXT NOT NULL REFERENCES zdrojovy_dokument (id),
  uryvek TEXT NOT NULL,
  strana INTEGER,
  vytvoreno TEXT NOT NULL
);
CREATE INDEX citace_odpoved ON citace (odpoved_id);
