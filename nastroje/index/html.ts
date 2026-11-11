import { HTMLElement, Node, NodeType, TextNode, parse } from 'node-html-parser';

const BLOKOVE = new Set([
  'p', 'div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'blockquote', 'figure', 'figcaption',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'table', 'thead', 'tbody', 'tfoot',
  'tr', 'pre', 'address', 'hr',
]);
const VYNECHAT = new Set(['script', 'style', 'noscript', 'template', 'svg', 'iframe', 'form', 'button', 'nav', 'img', 'picture', 'video', 'audio']);

export function rozebratHtml(html: string) {
  return parse(html, { comment: false, blockTextElements: { script: false, style: false, noscript: false, pre: true } });
}

function cistyRadek(text: string) {
  return text.replace(/[\u00a0\u2007\u202f]/g, ' ').replace(/[\u200b\u00ad]/g, '').replace(/[ \t\f\v\r\n]+/g, ' ').trim();
}

// Text prvku po odstavcích. Odstavce odděluje prázdný řádek, zalomení <br> jeden řádek,
// buňky tabulky svislá čára. Na odstavcích stojí dělení na úseky (8.4).
export function textPrvku(koren: HTMLElement, preskocit: (prvek: HTMLElement) => boolean = () => false) {
  const bloky: string[] = [];
  let radky: string[] = [];
  let radek = '';

  const ukoncitRadek = () => {
    const cisty = cistyRadek(radek);
    if (cisty) radky.push(cisty);
    radek = '';
  };
  const ukoncitBlok = () => {
    ukoncitRadek();
    if (radky.length) bloky.push(radky.join('\n'));
    radky = [];
  };

  const projit = (uzel: Node) => {
    if (uzel.nodeType === NodeType.TEXT_NODE) {
      radek += (uzel as TextNode).text;
      return;
    }
    if (uzel.nodeType !== NodeType.ELEMENT_NODE) return;
    const prvek = uzel as HTMLElement;
    const znacka = prvek.rawTagName?.toLowerCase() ?? '';
    if (VYNECHAT.has(znacka) || preskocit(prvek)) return;
    if (znacka === 'br') {
      ukoncitRadek();
      return;
    }
    if (znacka === 'tr') {
      ukoncitBlok();
      const bunky = prvek.childNodes
        .filter((u): u is HTMLElement => u.nodeType === NodeType.ELEMENT_NODE && ['td', 'th'].includes((u as HTMLElement).rawTagName?.toLowerCase()))
        .map((bunka) => cistyRadek(textPrvku(bunka, preskocit).replace(/\n+/g, ' ')))
        .filter(Boolean);
      if (bunky.length) bloky.push(bunky.join(' | '));
      return;
    }
    const blokovy = BLOKOVE.has(znacka);
    if (blokovy) ukoncitBlok();
    if (znacka === 'li') radek += '- ';
    for (const dite of prvek.childNodes) projit(dite);
    if (blokovy) ukoncitBlok();
    // Sousední řádkové prvky bez mezery (odkazy vedle sebe, popisek a hodnota) by splynuly v jedno slovo.
    else if (prvek.nextSibling?.nodeType === NodeType.ELEMENT_NODE || znacka === 'td' || znacka === 'th') radek += ' ';
  };

  projit(koren);
  ukoncitBlok();
  return bloky.join('\n\n');
}

export function cistyText(prvek: HTMLElement | null | undefined) {
  return prvek ? cistyRadek(prvek.text) : '';
}
