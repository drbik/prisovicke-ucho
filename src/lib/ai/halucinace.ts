// Whisper si v tichu a v hluku vymýšlí věty z titulků a zakončení videí, protože se na takových textech učil
// („Titulky vytvořil JohnyX.“, „www.hradeckralove.org“). První ochrana je detekce řeči přímo ve Whisperu
// (vad_filter, viz cloudflare.ts). Tenhle filtr je druhá: odstraní věty, které autor jistě neřekl.

const KONEC_VETY = /(?<=[.!?…])\s+/;

// Věty, které se odstraní kdekoli v přepisu. Nikdo je do vzkazu pro obec neřekne.
const PODEZRELE_VETY: RegExp[] = [
  // „Titulky vytvořil JohnyX.“, „Titulky: Jan Novák“, „Přeložil Jan Novák.“, „Překlad: …“
  /^\W*(?:titulky|titulek|přeložil[a]?|překlad|překladatel|korekce|časování|subtitles?|subtitled|translated|captions?)\b/iu,
  /amara\.org|opensubtitles|titulky\.(?:com|cz)|subtitles\s+by|napisy\.info/iu,
  /^\W*(?:thanks|thank you)\s+for\s+watching\W*$/iu,
];

// Přepis, který se po odstranění ničím jiným nezbyl. Jde o věty, které mezi jinými slovy mohou být skutečné
// („Děkuji za pozornost.“ na konci vzkazu), a odstraní se proto jen tehdy, když je to celý přepis.
const CELY_PREPIS_JE_HALUCINACE: RegExp[] = [
  /^\W*(?:děkuji|děkujeme|díky)\s+(?:vám\s+)?(?:moc\s+)?za\s+(?:pozornost|sledování|zhlédnutí|shlédnutí)\W*$/iu,
  /^\W*(?:děkuji|děkujeme)[,.!\s]+že\s+jste\s+(?:se\s+)?(?:dívali|sledovali|byli\s+s\s+námi)\W*$/iu,
  /^\W*(?:na\s+shledanou|ahoj|čau)(?:\s+příště|\s+u\s+dalšího\s+dílu)?\W*$/iu,
  // Samotná adresa webu nebo e-mailu, třeba „www.hradeckralove.org“.
  /^\W*(?:https?:\/\/|www\.)\S+\W*$/iu,
  /^\W*(?:\[[^\]]*\]|\([^)]*\)|♪+|\*[^*]*\*)\W*$/u,
];

export interface OcistenyPrepis {
  text: string;
  // Kolik vět se odstranilo. Do logu jde jen tohle číslo, nikdy text.
  odstraneno: number;
}

export function odstranitHalucinace(prepis: string): OcistenyPrepis {
  const vety = prepis.split(KONEC_VETY).map((veta) => veta.trim()).filter(Boolean);
  const zbyvajici = vety.filter((veta) => !PODEZRELE_VETY.some((vzor) => vzor.test(veta)));
  let text = zbyvajici.join(' ');
  let odstraneno = vety.length - zbyvajici.length;
  if (text && CELY_PREPIS_JE_HALUCINACE.some((vzor) => vzor.test(text))) {
    odstraneno += zbyvajici.length;
    text = '';
  }
  return { text, odstraneno };
}
