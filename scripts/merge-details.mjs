// 조사 결과 YAML 조각들을 data/details.yml 로 병합
//   node scripts/merge-details.mjs <file1.yml> <file2.yml> ...
import { p, readYaml, writeYaml } from './lib.mjs';

const target = p('data/details.yml');
const merged = readYaml(target, {}) || {};
let n = 0;
for (const f of process.argv.slice(2)) {
  const part = readYaml(f, {}) || {};
  for (const [id, d] of Object.entries(part)) {
    if (!d || typeof d !== 'object') continue;
    const { next_edition, ...rest } = d;
    merged[id] = { ...(merged[id] || {}), ...rest };
    if (next_edition) console.log(`  [next_edition] ${id}: ${JSON.stringify(next_edition)}`);
    n++;
  }
}
writeYaml(target, merged,
  '# 학회 상세 설명 (사이트의 "학회 상세" 패널). 직접 수정해도 됩니다.\n' +
  '#   about: 소개 / topics: 제출 분야 / features: 특징 / acceptance_rate / typical_schedule / sources\n\n');
console.log(`merged ${n} entries → ${Object.keys(merged).length} total`);
