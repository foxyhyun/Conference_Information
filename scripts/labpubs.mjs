// 랩 홈페이지 출판 목록 → data/crawled/lab_pubs.json
//   node scripts/labpubs.mjs   (crawl.mjs 도 호출)
import { p, writeJson, fetchText } from './lib.mjs';

export const LAB_PUB_URL = 'https://gistnpl.github.io/gist-neurophotonicslab/publication/';

const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, ' ').trim();

export async function crawlLabPubs() {
  const html = await fetchText(LAB_PUB_URL);
  const items = [];
  for (const m of html.matchAll(/<li class="pub-item"([^>]*)>([\s\S]*?)<\/li>/g)) {
    const body = m[2];
    const get = (cls) => { const r = body.match(new RegExp(`class="${cls}"[^>]*>([\\s\\S]*?)<\\/(?:span|h3|p)>`)); return r ? strip(r[1]) : ''; };
    const type = (m[1].match(/data-type="([^"]+)"/) || [])[1] || '';
    const doi = (body.match(/doi\.org\/([^"\s<]+)/i) || [])[1] || '';
    const year = Number(get('pub-date')) || Number((get('pub-note').match(/\b(19|20)\d\d\b/) || [])[0]) || null;
    items.push({ type, venue: get('pub-venue'), year, title: get('pub-title'), note: get('pub-note'), doi });
  }
  return items;
}

if (process.argv[1]?.endsWith('labpubs.mjs')) {
  const items = await crawlLabPubs();
  writeJson(p('data/crawled/lab_pubs.json'), { source: LAB_PUB_URL, crawledAt: new Date().toISOString(), items });
  console.log(`${items.length} publications`);
  for (const i of items) console.log(` ${i.year} | ${i.venue || '(no venue)'} | ${i.doi}`);
}
