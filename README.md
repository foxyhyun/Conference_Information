# Lab Deadlines

Neurophotonics Lab 학회·저널 마감 트래커. 랩원은 사이트를 보기만 하고, 데이터 수정은 저장소 관리자만 합니다.

## 구조

| 경로 | 내용 |
|---|---|
| `data/venues.yml` | **직접 수정하는 마스터 목록** (학회·저널, 분야, 지표, 수동 일정) |
| `data/discovered.yml` | 크롤러가 새로 찾은 학회 (PR 로 올라옴, `hidden: true` 로 숨김) |
| `data/candidates.yml` | WikiCFP 후보 (사이트 '신규 후보' 탭에만 표시) |
| `data/crawled/` | 크롤링 원본 (자동 생성, 수정 X) |
| `data/details.yml` | 학회 상세 (소개·제출 분야·특징·출처). 사이트의 "학회 상세" 패널 |
| `data/notices.yml` | 국내 학회 홈페이지의 논문/초록 모집 공지 (`hidden: true` 로 숨김) |
| `scripts/crawl.mjs` | ccfddl · huggingface/ai-deadlines · WikiCFP · 공식 사이트 크롤러 |
| `scripts/scrape.mjs` | 공식 사이트 날짜 추출기 + 국내 공지 감시 |
| `scripts/build.mjs` | 병합 + 점수 계산 → `site/data.json` |
| `site/` | 정적 사이트 (GitHub Pages) |

## 자주 하는 일

- **학회 추가/수정**: `data/venues.yml` 수정 → commit/push → 1~2분 뒤 사이트 반영
- **국내 학회 마감 입력**: 해당 학회에 `editions:` 블록 추가 (파일 상단 예시 참고, 시간대 기본값 UTC+9)
- **IF 갱신** (매년 6월 JCR 발표 후): `journals:` 의 `if`, `if_year`, `quartile` 수정, 확인한 항목은 `verified: true`
- **공식 사이트 자동 추출 추가**: 학회에 `scrape:` 설정 → `node scripts/scrape.mjs <id> --dump` 로 확인
  (현재: ISBI, MIDL, EMBC, CLEO, Optica Biophotonics, OHBM, SfN, IPIU)
- **국내 공지 감시 추가**: 학회에 `watch: <홈페이지 URL>`
  (현재: IPIU, 대한전자공학회, 대한의용생체공학회, 한국광학회, 대한의료인공지능학회, 한국뇌신경과학회)
- **자동 추출이 안 되는 곳** (SPIE 봇 차단, KIISE·KCCV 등 JS 렌더링/접속 불가): `editions:` 로 직접 입력
- **즉시 크롤링**: GitHub → Actions → `update` → Run workflow
- **새 학회 PR**: 매월 1일·15일 자동 생성 → 분야 확인 후 Merge

## 점수

- 학회: h5-index(로그 스케일) 0.45 · CORE 0.3 · CCF 0.15 가중 평균. 지표가 없는 학회는 수동 `tier` 사용.
  h5 가 없고 등급만 있으면 등급 평균 × 0.85 로 h5 항목을 추정.
- 정규화: **분야 내 최고 = 1.0**, **전체 최고 = 1.0** 두 가지를 모두 계산.
- 난이도: 채택률 기준 (최상 <20%, 상 <27%, 중상 <35%, 중 <50%, 하).
- 저널: log(IF) 기준으로 같은 방식 정규화.

## 로컬 실행

```bash
npm install
npm run crawl   # 선택
npm run dev     # http://localhost:8080
```

## 최초 GitHub 설정 (1회)

1. Settings → Pages → Source: **GitHub Actions**
2. Settings → Actions → General → Workflow permissions: **Read and write**, 그리고
   **Allow GitHub Actions to create and approve pull requests** 체크
3. Settings → Collaborators 에는 아무도 추가하지 않음 (랩원은 사이트 링크만 사용)
