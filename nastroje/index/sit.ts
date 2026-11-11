import { ROZESTUP_MS, USER_AGENT } from './nastaveni';

export interface Stazeno {
  status: number;
  hlavicky: Headers;
  bajty: Uint8Array;
}

const pockat = (ms: number) => new Promise((hotovo) => setTimeout(hotovo, ms));

// Všechny požadavky jdou po jednom za sebou a mezi nimi je rozestup (zadání kroku 8).
export function vytvorStahovac({ rozestupMs = ROZESTUP_MS, pokusu = 3 } = {}) {
  let konecPosledniho = 0;
  let pocet = 0;

  async function stahnout(url: string, hlavicky: Record<string, string> = {}): Promise<Stazeno> {
    for (let pokus = 1; ; pokus += 1) {
      const cekat = konecPosledniho + rozestupMs - Date.now();
      if (cekat > 0) await pockat(cekat);
      pocet += 1;
      try {
        const odpoved = await fetch(url, {
          headers: { 'user-agent': USER_AGENT, ...hlavicky },
          redirect: 'follow',
          signal: AbortSignal.timeout(180_000),
        });
        const bajty = new Uint8Array(await odpoved.arrayBuffer());
        konecPosledniho = Date.now();
        if (odpoved.status >= 500 && pokus < pokusu) {
          await pockat(5000 * pokus);
          continue;
        }
        return { status: odpoved.status, hlavicky: odpoved.headers, bajty };
      } catch (chyba) {
        konecPosledniho = Date.now();
        if (pokus >= pokusu) throw chyba;
        await pockat(5000 * pokus);
      }
    }
  }

  return { stahnout, pocetPozadavku: () => pocet };
}

interface PravidloRobots {
  povolit: boolean;
  cesta: string;
}

// Jednoduchý výklad robots.txt: skupina pro všechny roboty, nejdelší shodná cesta vyhrává.
export function precistRobots(text: string, nazevRobota = 'prisovicke-ucho') {
  const skupiny: { agenti: string[]; pravidla: PravidloRobots[] }[] = [];
  let aktualni: { agenti: string[]; pravidla: PravidloRobots[] } | null = null;
  let posledniBylAgent = false;
  for (const radek of text.split(/\r?\n/)) {
    const bezKomentare = radek.replace(/#.*/, '').trim();
    const shoda = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(bezKomentare);
    if (!shoda) continue;
    const klic = shoda[1].toLowerCase();
    const hodnota = shoda[2].trim();
    if (klic === 'user-agent') {
      if (!aktualni || !posledniBylAgent) {
        aktualni = { agenti: [], pravidla: [] };
        skupiny.push(aktualni);
      }
      aktualni.agenti.push(hodnota.toLowerCase());
      posledniBylAgent = true;
      continue;
    }
    posledniBylAgent = false;
    if (!aktualni || (klic !== 'allow' && klic !== 'disallow')) continue;
    if (klic === 'disallow' && !hodnota) continue;
    aktualni.pravidla.push({ povolit: klic === 'allow', cesta: hodnota });
  }
  const vlastni = skupiny.filter((s) => s.agenti.some((a) => a !== '*' && nazevRobota.toLowerCase().includes(a)));
  const pravidla = (vlastni.length ? vlastni : skupiny.filter((s) => s.agenti.includes('*'))).flatMap((s) => s.pravidla);

  return function jePovoleno(adresa: string) {
    const url = new URL(adresa);
    const cesta = url.pathname + url.search;
    let nejlepsi: PravidloRobots | null = null;
    for (const pravidlo of pravidla) {
      const vzor = new RegExp(
        '^' + pravidlo.cesta.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'),
      );
      if (!vzor.test(cesta)) continue;
      if (!nejlepsi || pravidlo.cesta.length > nejlepsi.cesta.length
        || (pravidlo.cesta.length === nejlepsi.cesta.length && pravidlo.povolit)) {
        nejlepsi = pravidlo;
      }
    }
    return nejlepsi?.povolit ?? true;
  };
}
