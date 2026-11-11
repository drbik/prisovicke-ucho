// Text pro hledání v přehledu témat: bez diakritiky a velkých písmen, jen písmena a číslice oddělené mezerou.
// Stejnou funkci používá stránka při sestavení i skript v prohlížeči, aby se dotaz a text porovnávaly stejně.
export function proHledani(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// Čeština skloňuje, proto se z hledaných slov bere jen začátek: lékárna → lekar, voda → vod, sokolovně → sokolo.
// Slova do tří písmen a čísla zůstávají celá.
export function kmenyDotazu(dotaz: string) {
  return proHledani(dotaz).split(' ').filter(Boolean).map((slovo) => {
    if (/^\d+$/.test(slovo)) return slovo;
    const koncovka = slovo.length >= 9 ? 3 : slovo.length >= 6 ? 2 : slovo.length >= 4 ? 1 : 0;
    return slovo.slice(0, slovo.length - koncovka);
  });
}

// Text tématu je řada slov z proHledani. Téma odpovídá, když každý kmen začíná některé jeho slovo.
export function odpovidaHledani(text: string, kmeny: string[]) {
  const sMezerou = ` ${text}`;
  return kmeny.every((kmen) => sMezerou.includes(` ${kmen}`));
}
