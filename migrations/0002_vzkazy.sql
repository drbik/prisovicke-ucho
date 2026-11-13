-- Vzkazy občanů (13. 11. 2026, Tomáš): potvrzený vzkaz se uloží a hned zveřejní ve feedu vedle ucha, bez schválení.
-- Bez autora, bez IP adresy a bez nahrávky. Nevhodný vzkaz tým skryje příkazem (nastroje/vzkazy.ts).
CREATE TABLE vzkaz (
  id TEXT PRIMARY KEY,
  -- Podpis návrhu AI úpravy. Opakované potvrzení téhož vzkazu (Zpět k úpravám, Hledat znovu) přepíše stejný řádek.
  klic_navrhu TEXT NOT NULL UNIQUE,
  vytvoreno TEXT NOT NULL,
  zmeneno TEXT NOT NULL,
  vstup TEXT NOT NULL CHECK (vstup IN ('hlas', 'text')),
  -- Surový přepis nebo napsaný text a návrh AI úpravy. Ve feedu se neukazují.
  surovy_text TEXT NOT NULL,
  navrh_text TEXT NOT NULL,
  -- Potvrzené spisovné znění, název a zařazení.
  text TEXT NOT NULL,
  nazev TEXT NOT NULL,
  typ TEXT NOT NULL CHECK (typ IN ('dotaz', 'navrh', 'stiznost', 'pochvala')),
  oblast TEXT NOT NULL,
  -- Styl, ve kterém autor vzkaz poslal (alternativní mluvčí), a text postavy.
  styl TEXT NOT NULL DEFAULT 'spisovne',
  text_stylu TEXT,
  stav TEXT NOT NULL CHECK (stav IN ('zodpovezeno-z-webu', 'ceka')),
  -- Odpověď z webu, jak ji autor viděl (JSON: věty, části, zdroje, označení).
  odpoved TEXT,
  -- Dříve zodpovězený podobný dotaz: uložený vzkaz nebo ukázka.
  podobny_id TEXT,
  -- Embedding textu dotazu (bge-m3, Float32) pro hledání opakovaných dotazů.
  vektor BLOB,
  skryto INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX vzkaz_feed ON vzkaz (skryto, vytvoreno);

-- Embeddingy ukázek od týmu, spočítané při prvním hledání podobného dotazu. Otisk hlídá změnu textu ukázky.
CREATE TABLE vektor_ukazky (
  id TEXT PRIMARY KEY,
  otisk TEXT NOT NULL,
  vektor BLOB NOT NULL
);
