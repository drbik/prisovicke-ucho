// Vzkazy ve feedu pro tým (13. 11. 2026). Vzkazy se zveřejňují hned, bez schválení, tak tady jde nevhodný rychle skrýt.
//   npx tsx nastroje/vzkazy.ts            posledních 30 vzkazů: id, datum, typ, stav, styl, název, skrytý
//   npx tsx nastroje/vzkazy.ts ukazat ID  celý vzkaz včetně surového přepisu
//   npx tsx nastroje/vzkazy.ts skryt ID   vzkaz zmizí z feedu (v databázi zůstane)
//   npx tsx nastroje/vzkazy.ts vratit ID  skrytý vzkaz se do feedu vrátí
// Jde přes přihlášení Wranglerem do ostré databáze, bez tokenu v souborech.
import { pripojitCloudflare } from './index/cloudflare';

const [prikaz = 'vypsat', id] = process.argv.slice(2);
const cisteId = id?.replace(/^v-/, '');
const { env, ukoncit } = await pripojitCloudflare();
try {
  if (prikaz === 'vypsat') {
    const { results } = await env.DB.prepare(`
      SELECT id, vytvoreno, typ, stav, styl, nazev, skryto FROM vzkaz ORDER BY vytvoreno DESC LIMIT 30`).all();
    console.table(results);
  } else if (prikaz === 'ukazat' && cisteId) {
    const { results } = await env.DB.prepare(`
      SELECT id, vytvoreno, zmeneno, vstup, typ, oblast, stav, styl, nazev, text, text_stylu, surovy_text, navrh_text, podobny_id, skryto
      FROM vzkaz WHERE id = ?`).bind(cisteId).all();
    console.log(results[0] ?? `Vzkaz ${cisteId} neexistuje.`);
  } else if ((prikaz === 'skryt' || prikaz === 'vratit') && cisteId) {
    const { results } = await env.DB.prepare('UPDATE vzkaz SET skryto = ? WHERE id = ? RETURNING id, nazev, skryto')
      .bind(prikaz === 'skryt' ? 1 : 0, cisteId).all();
    console.log(results[0] ? `${prikaz === 'skryt' ? 'Skryto' : 'Vráceno do feedu'}: ${JSON.stringify(results[0])}` : `Vzkaz ${cisteId} neexistuje.`);
  } else {
    console.log('Použití: npx tsx nastroje/vzkazy.ts [vypsat | ukazat ID | skryt ID | vratit ID]');
  }
} finally {
  await ukoncit();
}
