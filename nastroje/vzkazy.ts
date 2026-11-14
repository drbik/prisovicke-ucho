// Vzkazy a témata ve feedu pro tým (13. 11. 2026, F-33 až F-37). Vzkazy se zveřejňují hned, bez schválení,
// tak tady jde nevhodný rychle skrýt. Tým tu i opravuje témata (úprava v rozhraní je Později, F-38).
//   npx tsx nastroje/vzkazy.ts                          posledních 30 vzkazů: id, datum, typ, vztah, téma, název, skrytý
//   npx tsx nastroje/vzkazy.ts ukazat ID                celý vzkaz včetně surového přepisu
//   npx tsx nastroje/vzkazy.ts skryt ID                 vzkaz zmizí z feedu (v databázi zůstane), zakladatel skryje celé téma
//   npx tsx nastroje/vzkazy.ts vratit ID                skrytý vzkaz se do feedu vrátí
//   npx tsx nastroje/vzkazy.ts temata                   témata: id, změna, typ, stav, počet vzkazů, název, skryté
//   npx tsx nastroje/vzkazy.ts tema ID                  vzkazy tématu se vztahem a části odpovědi se stavem
//   npx tsx nastroje/vzkazy.ts presunout ID TEMA [VZTAH] přesune vzkaz i s jeho částí odpovědi; TEMA „nove“ ho oddělí
//   npx tsx nastroje/vzkazy.ts sloucit Z DO             téma Z se sloučí do tématu DO
//   npx tsx nastroje/vzkazy.ts skryt-tema ID            téma zmizí z feedu
//   npx tsx nastroje/vzkazy.ts vratit-tema ID           skryté téma se do feedu vrátí
//   npx tsx nastroje/vzkazy.ts prevest [--provest]      převod vzkazů z doby před tématy (bez --provest jen výpis)
// Jde přes přihlášení Wranglerem do ostré databáze, bez tokenu v souborech. Přesun a sloučení volají Workers AI
// (embedding a posouzení vět), aby se odpověď tématu neopakovala.
import { vytvorCloudflareAi } from '../src/lib/ai/cloudflare';
import { prevestVzkazy, presunoutVzkaz, skrytTema, skrytVzkaz, sloucitTemata, temaDoFeedu, type ZavislostiTemat } from '../src/lib/vzkazy/temata';
import type { VztahVzkazu } from '../src/lib/vzkazy/typy';
import { vytvorUlozisteD1 } from '../src/lib/vzkazy/uloziste';
import { pripojitCloudflare } from './index/cloudflare';

const [prikaz = 'vypsat', ...parametry] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const provest = process.argv.includes('--provest');
const bezPredpony = (id?: string) => id?.replace(/^v-/, '');
const VZTAHY = new Set(['totez', 'poddotaz', 'doplneni']);

const { env, ukoncit } = await pripojitCloudflare();
const z: ZavislostiTemat = { uloziste: vytvorUlozisteD1(env.DB), ai: vytvorCloudflareAi(env.AI), log: () => {} };

async function vypsatTema(id: string) {
  const u = await z.uloziste.nacistTema(id);
  if (!u) {
    console.log(`Téma ${id} neexistuje (ukázka bez vzkazů v databázi není).`);
    return;
  }
  const { tema } = u;
  console.log(`${tema.id} · ${tema.typ} · ${tema.stav}${tema.skryto ? ' · SKRYTÉ' : ''}${tema.hlavniId ? ` · sloučeno do ${tema.hlavniId}` : ''}\n${tema.nazev}\n${tema.text}`);
  console.table(u.vzkazy.map((v) => ({ id: `v-${v.id}`, vytvoreno: v.vytvoreno.slice(0, 16), vztah: v.vztah, nazev: v.nazev, skryto: v.skryto })));
  console.table(u.casti.map((c) => ({
    id: c.id, vzkaz: c.vzkazId ? `v-${c.vzkazId}` : 'hlavní', stav: c.stav, duvod: c.duvod ?? '', puvod: c.puvod,
    vet: c.obsah.casti.reduce((s, p) => s + p.vety.length, 0), otazka: c.otazka ?? '',
  })));
  const feed = temaDoFeedu(u);
  console.log(`Ve feedu: ${feed.stav}, ${feed.pocet} vzkazů, ${feed.odpoved?.vety.length ?? 0} vět, ${feed.odpoved?.zdroje.length ?? 0} zdrojů, čeká ${feed.cekajici.length}.`);
}

try {
  const [a, b, c] = parametry;
  if (prikaz === 'vypsat') {
    const { results } = await env.DB.prepare(`
      SELECT id, vytvoreno, typ, vztah, tema_id, styl, nazev, skryto FROM vzkaz ORDER BY vytvoreno DESC LIMIT 30`).all();
    console.table(results);
  } else if (prikaz === 'ukazat' && a) {
    const { results } = await env.DB.prepare(`
      SELECT id, vytvoreno, zmeneno, vstup, typ, oblast, stav, styl, tema_id, vztah, potvrzeni, nazev, text, text_stylu, surovy_text, navrh_text, skryto
      FROM vzkaz WHERE id = ?`).bind(bezPredpony(a)).all();
    console.log(results[0] ?? `Vzkaz ${a} neexistuje.`);
  } else if ((prikaz === 'skryt' || prikaz === 'vratit') && a) {
    const { vzkaz, tema } = await skrytVzkaz(a, prikaz === 'skryt', z);
    if (!vzkaz) console.log(`Vzkaz ${a} neexistuje nebo nemá téma (převeďte ho příkazem prevest).`);
    else console.log(`${prikaz === 'skryt' ? 'Skryto' : 'Vráceno do feedu'}: v-${vzkaz.id} ${vzkaz.nazev}`
      + (tema ? `\nVzkaz zakládá téma ${tema.id}, proto je ${prikaz === 'skryt' ? 'skryté' : 'zpět ve feedu'} i celé téma. Ostatní vzkazy tématu jde přesunout příkazem presunout.` : ''));
  } else if (prikaz === 'temata') {
    console.table((await z.uloziste.seznamTemat()).map((t) => ({
      id: t.id, zmeneno: t.zmeneno.slice(0, 16), typ: t.typ, stav: t.stav, pocet: t.pocet, nazev: t.nazev, skryto: t.skryto, sloucenoDo: t.hlavniId ?? '',
    })));
  } else if (prikaz === 'tema' && a) {
    await vypsatTema(a);
  } else if (prikaz === 'presunout' && a && b && (!c || VZTAHY.has(c))) {
    const vysledek = await presunoutVzkaz(a, b, c as VztahVzkazu | undefined, z);
    console.log(`Přesunuto do ${vysledek?.tema.id}.`);
    if (vysledek) await vypsatTema(vysledek.tema.id);
  } else if (prikaz === 'sloucit' && a && b) {
    const vysledek = await sloucitTemata(a, b, z);
    console.log(`Téma ${a} je sloučené do ${b}.`);
    if (vysledek) await vypsatTema(b);
  } else if ((prikaz === 'skryt-tema' || prikaz === 'vratit-tema') && a) {
    const tema = await skrytTema(a, prikaz === 'skryt-tema', z);
    console.log(`${prikaz === 'skryt-tema' ? 'Skryto' : 'Vráceno do feedu'}: ${tema.id} ${tema.nazev}`);
  } else if (prikaz === 'prevest') {
    const zprava = await prevestVzkazy(z, provest);
    if (!zprava.length) console.log('Všechny vzkazy už mají téma.');
    for (const r of zprava) {
      console.log(`${r.id} (${r.typ}) ${r.nazev}\n  nejbližší témata: ${r.podobna.map((p) => `${p.id} ${p.podobnost}`).join(', ') || 'žádné nad prahem'}`
        + (r.tema ? `\n  založeno téma ${r.tema}` : ''));
    }
    if (!provest && zprava.length) console.log('\nNic se nezměnilo. Převod provede: npx tsx nastroje/vzkazy.ts prevest --provest');
  } else {
    console.log('Použití: npx tsx nastroje/vzkazy.ts [vypsat | ukazat ID | skryt ID | vratit ID | temata | tema ID | presunout ID TEMA [totez|poddotaz|doplneni] | sloucit Z DO | skryt-tema ID | vratit-tema ID | prevest [--provest]]');
  }
} catch (chyba) {
  console.error(chyba instanceof Error ? chyba.message : chyba);
  process.exitCode = 1;
} finally {
  await ukoncit();
}
