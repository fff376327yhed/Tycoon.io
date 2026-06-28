// ═══════════════════════════════════════════════════
// script1.js — 정아영 테크
// ═══════════════════════════════════════════════════

const STAGES = [
  { name: "정아영",              expReq: 0,                    desc: "평범한 인간..? 뭔가 이상한 기운이 느껴진다" },
  { name: "성장한 정아영",        expReq: 500,                  desc: "알 수 없는 거리감이 느껴진다" },
  { name: "정체를 알 수 없는 알",  expReq: 2000,                 desc: "알 속에 갇혀버렸다" },
  { name: "균열된 알",            expReq: 20000,                desc: "알에 금이 가기 시작했다! 곧 깨어난다" },
  { name: "해치링",               expReq: 200000,               desc: "귀여운 외계인의 모습, 약간 소름이 끼친다" },
  { name: "네오 해치링",          expReq: 2000000,              desc: "외계인이 무언갈 원하고 있다, 확실히 키가 작다" },
  { name: "후디 외계인",          expReq: 20000000,             desc: "후드를 입은 쿨한 외계인으로 성장!" },
  { name: "슬라임의 친구",        expReq: 400000000,            desc: "슬라임 부하들이 생겼다. 이제 혼자가 아니야" },
  { name: "폭발적인 슬라임 성장", expReq: 7000000000,           desc: "초록 에너지가 폭발적으로 넘쳐흐른다!" },
  { name: "UFO 파일럿",          expReq: 100000000000,         desc: "우주선을 타고 은하를 누빈다! ✨ 슬라임 절친 해방!" },
  { name: "은하 정복자",          expReq: 2000000000000,        desc: "은하를 누비며 슬라임 친구를 모았다. 우주를 정복하자!" },
  { name: "슬라임 군대",          expReq: 20000000000000,       desc: "우주를 정복하려하는 슬라임 군대." },
  { name: "은하 황제",            expReq: 5000000000000000,     desc: "슬라임 왕좌에 앉은 은하의 지배자! 결국 모든 것을 지배하였다" },
];

// ── 스테이지별 스탯 ──────────────────────────────────────────
// 각 stage 인덱스에 대응. 완만하게 증가하도록 선형+소폭 보정.
// 유닛스탯(uni)은 나중에 추가 예정 → 현재 null 처리.
// ✏️ 수정 가능: atk(공격력), hp(체력), spd(스피드), uni(유닛스탯)
const STAGE_STATS = [
  { atk: 10,  hp: 80,   spd: 12,  uni: null },  // 0: 정아영
  { atk: 18,  hp: 140,  spd: 20,  uni: null },  // 1: 성장한 정아영
  { atk: 28,  hp: 220,  spd: 22,  uni: null },  // 2: 정체를 알 수 없는 알
  { atk: 40,  hp: 330,  spd: 30,  uni: null },  // 3: 균열된 알
  { atk: 60,  hp: 480,  spd: 55,  uni: null },  // 4: 해치링
  { atk: 85,  hp: 650,  spd: 90,  uni: null },  // 5: 네오 해치링
  { atk: 120, hp: 850,  spd: 130, uni: null },  // 6: 후디 외계인
  { atk: 165, hp: 1100, spd: 160, uni: null },  // 7: 슬라임의 친구
  { atk: 220, hp: 1400, spd: 200, uni: null },  // 8: 폭발적인 슬라임 성장
  { atk: 290, hp: 1800, spd: 260, uni: null },  // 9: UFO 파일럿
  { atk: 380, hp: 2300, spd: 340, uni: null },  // 10: 은하 정복자
  { atk: 490, hp: 3000, spd: 440, uni: null },  // 11: 슬라임 군대
  { atk: 650, hp: 4000, spd: 600, uni: null },  // 12: 은하 황제
];

// ── 업그레이드: 체인 구조 ────────────────────────────────────
// 같은 category 안에서는 순서대로 하나씩만 활성화.
// purchased: bool (1회 구매 후 다음으로 넘어감)
//
// category: 'click' | 'auto' | 'crit'
// next: 다음 업그레이드 id (없으면 null → 마지막)
const UPGRADES = [
  // ── 클릭 체인 ──────────────────────────────────────────────
  { id:'c1', cat:'click', name:'집중 클릭',      desc:'클릭 EXP ×8',   cost:2000,              mult:8,   effectStr:'클릭 ×8',   next:'c2' },
  { id:'c2', cat:'click', name:'에너지 응축',    desc:'클릭 EXP ×14',  cost:80000,             mult:14,  effectStr:'클릭 ×14',  next:'c3' },
  { id:'c3', cat:'click', name:'외계 코어',      desc:'클릭 EXP ×28',  cost:2000000,           mult:28,  effectStr:'클릭 ×28',  next:'c4' },
  { id:'c4', cat:'click', name:'차원 가속',      desc:'클릭 EXP ×50',  cost:60000000,          mult:50,  effectStr:'클릭 ×50',  next:'c5' },
  { id:'c5', cat:'click', name:'은하 타격',      desc:'클릭 EXP ×100', cost:2000000000,        mult:100, effectStr:'클릭 ×100', next:'c6' },
  { id:'c6', cat:'click', name:'황제의 일격',    desc:'클릭 EXP ×220', cost:80000000000,       mult:220, effectStr:'클릭 ×220', next:'c7' },
  { id:'c7', cat:'click', name:'초월 타격',      desc:'클릭 EXP ×450', cost:3000000000000,     mult:450, effectStr:'클릭 ×450', next:'c8' },
  { id:'c8', cat:'click', name:'은하 붕괴 타격', desc:'클릭 EXP ×1100',cost:150000000000000,   mult:1100,effectStr:'클릭 ×1100',next:'c9' },
  { id:'c9', cat:'click', name:'우주 소멸격',    desc:'클릭 EXP ×2400',cost:8000000000000000,  mult:2400,effectStr:'클릭 ×2400',next:null },

  // ── 자동화 체인 ──────────────────────────────────────────────
  { id:'a1', cat:'auto',  name:'자동 수집기',     desc:'자동 EXP ×1.6', cost:5000,              mult:1.6, effectStr:'자동 ×1.6', next:'a2' },
  { id:'a2', cat:'auto',  name:'드론 편대',       desc:'자동 EXP ×2',   cost:200000,            mult:2,   effectStr:'자동 ×2',   next:'a3' },
  { id:'a3', cat:'auto',  name:'은하 발전망',     desc:'자동 EXP ×2.5', cost:5000000,           mult:2.5, effectStr:'자동 ×2.5', next:'a4' },
  { id:'a4', cat:'auto',  name:'항성 네트워크',   desc:'자동 EXP ×3',   cost:150000000,         mult:3,   effectStr:'자동 ×3',   next:'a5' },
  { id:'a5', cat:'auto',  name:'우주 에너지망',   desc:'자동 EXP ×4',   cost:5000000000,        mult:4,   effectStr:'자동 ×4',   next:'a6' },
  { id:'a6', cat:'auto',  name:'항성간 채굴망',   desc:'자동 EXP ×6',   cost:200000000000,      mult:6,   effectStr:'자동 ×6',   next:'a7' },
  { id:'a7', cat:'auto',  name:'은하 코어망',     desc:'자동 EXP ×10',  cost:8000000000000,     mult:10,  effectStr:'자동 ×10',  next:'a8' },
  { id:'a8', cat:'auto',  name:'우주 심층 네트',  desc:'자동 EXP ×16',  cost:500000000000000,   mult:16,  effectStr:'자동 ×16',  next:null },

  // ── 크리티컬 확률 체인 ──────────────────────────────────────────
  { id:'r1', cat:'crit',  name:'예리함',          desc:'크리 확률 +4%',  cost:10000,             critAdd:0.04, effectStr:'크리 +4%',  next:'r2' },
  { id:'r2', cat:'crit',  name:'날카로운 감각',    desc:'크리 확률 +5%',  cost:500000,            critAdd:0.05, effectStr:'크리 +5%',  next:'r3' },
  { id:'r3', cat:'crit',  name:'사냥꾼의 눈',     desc:'크리 확률 +6%',  cost:20000000,          critAdd:0.06, effectStr:'크리 +6%',  next:'r4' },
  { id:'r4', cat:'crit',  name:'본능 각성',        desc:'크리 확률 +7%',  cost:800000000,         critAdd:0.07, effectStr:'크리 +7%',  next:'r5' },
  { id:'r5', cat:'crit',  name:'전투 직감',        desc:'크리 확률 +8%',  cost:40000000000,       critAdd:0.08, effectStr:'크리 +8%',  next:'r6' },
  { id:'r6', cat:'crit',  name:'무아지경',         desc:'크리 확률 +10%', cost:2000000000000,     critAdd:0.10, effectStr:'크리 +10%', next:'r7' },
  { id:'r7', cat:'crit',  name:'초월 각성',        desc:'크리 확률 +12%', cost:100000000000000,   critAdd:0.12, effectStr:'크리 +12%', next:null },

  // ── 크리티컬 배율 체인 ──────────────────────────────────────────
  { id:'m1', cat:'critMult', name:'파괴의 눈',      desc:'크리 배율 ×5',   cost:2000000000,        multAdd:2,  effectStr:'크리 ×5',  next:'m2' },
  { id:'m2', cat:'critMult', name:'멸절의 일격',    desc:'크리 배율 ×8',   cost:60000000000,       multAdd:3,  effectStr:'크리 ×8',  next:'m3' },
  { id:'m3', cat:'critMult', name:'은하 붕괴',      desc:'크리 배율 ×12',  cost:3000000000000,     multAdd:4,  effectStr:'크리 ×12', next:'m4' },
  { id:'m4', cat:'critMult', name:'우주 파멸',      desc:'크리 배율 ×18',  cost:200000000000000,   multAdd:6,  effectStr:'크리 ×18', next:'m5' },
  { id:'m5', cat:'critMult', name:'절대 소멸',      desc:'크리 배율 ×28',  cost:8000000000000000,  multAdd:10, effectStr:'크리 ×28', next:'m6' },
  { id:'m6', cat:'critMult', name:'우주 붕괴',      desc:'크리 배율 ×45',  cost:200000000000000000,multAdd:17, effectStr:'크리 ×45', next:null },
];

// ═══════════════════════════════════════════════════
// 차명석 데이터
// ═══════════════════════════════════════════════════


function getActiveUpgrades(purchased) {
  const cats = {};
  UPGRADES.forEach(u => {
    if (purchased[u.id]) return;
    if (!cats[u.cat]) cats[u.cat] = u;
  });
  return Object.values(cats);
}


const WORKER_UPGRADES = [
  // 슬라임 아기
  { id:'wu1a', wid:'w1', name:'슬라임 훈련',     desc:'슬라임 아기 생산 ×50',   cost:2000,        wUpgMult:50,  next:'wu1b' },
  { id:'wu1b', wid:'w1', name:'슬라임 진화',      desc:'슬라임 아기 생산 ×500',  cost:30000,       wUpgMult:500, next:'wu1c' },
  { id:'wu1c', wid:'w1', name:'슬라임 폭발',      desc:'슬라임 아기 생산 ×200000',cost:500000,     wUpgMult:200000,next:null },
  // 외계 수습생
  { id:'wu2a', wid:'w2', name:'수습 열정',        desc:'외계 수습생 생산 ×30',   cost:15000,       wUpgMult:30,  next:'wu2b' },
  { id:'wu2b', wid:'w2', name:'수습 졸업',        desc:'외계 수습생 생산 ×200',  cost:250000,      wUpgMult:200, next:'wu2c' },
  { id:'wu2c', wid:'w2', name:'수습 초월',        desc:'외계 수습생 생산 ×25000',cost:5000000,     wUpgMult:25000,next:null  },
  // UFO 드론
  { id:'wu3a', wid:'w3', name:'드론 강화',        desc:'UFO 드론 생산 ×20',      cost:100000,      wUpgMult:20,  next:'wu3b' },
  { id:'wu3b', wid:'w3', name:'드론 AI 탑재',     desc:'UFO 드론 생산 ×100',     cost:1500000,     wUpgMult:100, next:'wu3c' },
  { id:'wu3c', wid:'w3', name:'드론 자율 비행',   desc:'UFO 드론 생산 ×5000',    cost:30000000,    wUpgMult:5000,next:null   },
  // 에너지 코어
  { id:'wu4a', wid:'w4', name:'코어 과충전',      desc:'에너지 코어 생산 ×10',   cost:700000,      wUpgMult:10,  next:'wu4b' },
  { id:'wu4b', wid:'w4', name:'코어 결정화',      desc:'에너지 코어 생산 ×50',   cost:15000000,    wUpgMult:50,  next:'wu4c' },
  { id:'wu4c', wid:'w4', name:'코어 임계 돌파',   desc:'에너지 코어 생산 ×1000', cost:300000000,   wUpgMult:1000,next:null   },
  // 은하 발전기
  { id:'wu5a', wid:'w5', name:'발전기 증폭',      desc:'은하 발전기 생산 ×5',    cost:5000000,     wUpgMult:5,   next:'wu5b' },
  { id:'wu5b', wid:'w5', name:'은하 연결망',      desc:'은하 발전기 생산 ×30',   cost:80000000,    wUpgMult:30,  next:'wu5c' },
  { id:'wu5c', wid:'w5', name:'은하 코어 연동',   desc:'은하 발전기 생산 ×200',  cost:2000000000,  wUpgMult:200, next:null   },
  // 크리스탈 광산
  { id:'wu6a', wid:'w6', name:'광맥 확장',        desc:'크리스탈 광산 생산 ×2',  cost:30000000,    wUpgMult:2,   next:'wu6b' },
  { id:'wu6b', wid:'w6', name:'정제 공장',        desc:'크리스탈 광산 생산 ×3',  cost:600000000,   wUpgMult:3,   next:'wu6c' },
  { id:'wu6c', wid:'w6', name:'순수 결정',        desc:'크리스탈 광산 생산 ×5',  cost:15000000000, wUpgMult:5,   next:null   },
  // 항성 엔진
  { id:'wu7a', wid:'w7', name:'엔진 과부하',      desc:'항성 엔진 생산 ×2',      cost:200000000,   wUpgMult:2,   next:'wu7b' },
  { id:'wu7b', wid:'w7', name:'항성 융합로',      desc:'항성 엔진 생산 ×3',      cost:5000000000,  wUpgMult:3,   next:'wu7c' },
  { id:'wu7c', wid:'w7', name:'초신성 엔진',      desc:'항성 엔진 생산 ×5',      cost:150000000000,wUpgMult:5,   next:null   },
  // 황제 함대
  { id:'wu8a', wid:'w8', name:'함대 확장',        desc:'황제 함대 생산 ×2',      cost:2000000000,  wUpgMult:2,   next:'wu8b' },
  { id:'wu8b', wid:'w8', name:'황제의 명령',      desc:'황제 함대 생산 ×3',      cost:40000000000, wUpgMult:3,   next:'wu8c' },
  { id:'wu8c', wid:'w8', name:'무적 함대',        desc:'황제 함대 생산 ×5',      cost:1000000000000,wUpgMult:5,  next:null   },

  // ── 최저시급 (일꾼 자동EXP에도 크리 발동) ───────────────────
  { id:'minwage1', wid:null, cat:'minwage', name:'💼 최저시급 I',   desc:'일꾼 자동EXP에 크리 발동 (일꾼 크리 확률 50%)', cost:5000000,       isMinWage:true, next:'minwage2' },
  { id:'minwage2', wid:null, cat:'minwage', name:'💼 최저시급 II',  desc:'일꾼 크리 확률 80%, 크리 배율 ×1.5 적용',      cost:200000000,     isMinWage:true, next:'minwage3' },
  { id:'minwage3', wid:null, cat:'minwage', name:'💼 최저시급 III', desc:'일꾼 크리 확률 100% (항상 크리!)',              cost:10000000000,   isMinWage:true, next:null       },
];

// ⚠️ 수정 금지 구역 시작 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 이 블록은 스테이지별 이미지 경로 매핑입니다.
// 이미지 파일(a1.png ~ a13.png)은 index.html 옆 images/ 폴더에 있어야 합니다.
// 파일명이나 경로를 임의로 변경하지 마세요.
//
// 매핑 순서:
//   a1  = stage0  : 정아영 (치비 후디 인간)
//   a2  = stage1  : 성장한 정아영 (성인 후디 인간)
//   a3  = stage2  : 정체를 알 수 없는 알 (검은 알)
//   a4  = stage3  : 균열된 알 (금 간 알)
//   a5  = stage4  : 해치링 (알에서 막 나온 아기)
//   a6  = stage5  : 네오 해치링 (알껍데기와 함께)
//   a7  = stage6  : 후디 외계인 (혼자)
//   a8  = stage7  : 슬라임의 친구 (외계인 + 슬라임 2마리)
//   a9  = stage8  : 폭발적인 슬라임 성장 (빛 폭발)
//   a10 = stage9  : UFO 파일럿 (UFO 탑승)
//   a11 = stage10 : 은하 정복자 (은하 정복 장면)
//   a12 = stage11 : 슬라임 군대
//   a13 = stage12 : 은하 황제 (슬라임 왕좌)

const STAGE_IMAGES = {
  stage0:'images/a/a1.png', stage1:'images/a/a2.png', stage2:'images/a/a3.png',
  stage3:'images/a/a4.png', stage4:'images/a/a5.png', stage5:'images/a/a6.png',
  stage6:'images/a/a7.png', stage7:'images/a/a8.png', stage8:'images/a/a9.png',
  stage9:'images/a/a10.png', stage10:'images/a/a11.png', stage11:'images/a/a12.png', stage12:'images/a/a13.png',
};
// 차명석 스테이지별 이미지 (b1.png ~ b9.png)

const WORKERS = [
  { id:'w1', name:'🐛 슬라임 아기',   desc:'묵묵히 에너지를 모은다',     baseCost:100,       aps:1,     maxCount:1,
    special:{ duration:5000, desc:'슬라임이 응원해요! 클릭 +15 EXP (5초)', buffType:'clickBonus', buffValue:15, color:'#39ff14', emoji:'🐛' } },
  { id:'w2', name:'👽 외계 수습생',   desc:'경험치를 부지런히 모아온다',  baseCost:1000,      aps:8,     maxCount:1,
    special:{ duration:5000, desc:'수습생이 전력질주! 클릭 +30 EXP (5초)', buffType:'clickBonus', buffValue:30, color:'#00ffcc', emoji:'👽' } },
  { id:'w3', name:'🛸 UFO 드론',      desc:'하늘을 날며 자동 수집',       baseCost:6000,      aps:35,    maxCount:1,
    special:{ duration:5000, desc:'UFO 에너지 버스트! 클릭 +80 EXP (5초)', buffType:'clickBonus', buffValue:80, color:'#44aaff', emoji:'🛸' } },
  { id:'w4', name:'⚡ 에너지 코어',   desc:'강력한 에너지 발생기',        baseCost:35000,     aps:130,   maxCount:1,
    special:{ duration:5000, desc:'코어 과부하! 크리 확률 +15% (5초)', buffType:'critChance', buffValue:0.15, color:'#ffdd00', emoji:'⚡' } },
  { id:'w5', name:'🌌 은하 발전기',   desc:'은하 에너지를 수확한다',      baseCost:200000,    aps:500,   maxCount:1,
    special:{ duration:5000, desc:'은하 에너지 폭발! 클릭 +500 EXP (5초)', buffType:'clickBonus', buffValue:500, color:'#aa44ff', emoji:'🌌' } },
  { id:'w6', name:'💎 크리스탈 광산', desc:'순수 에너지 결정체 채굴',     baseCost:1200000,   aps:2000,  maxCount:1,
    special:{ duration:5000, desc:'크리스탈 공명! 크리 확률 +20% (5초)', buffType:'critChance', buffValue:0.20, color:'#ff88ff', emoji:'💎' } },
  { id:'w7', name:'🚀 항성 엔진',     desc:'별의 에너지를 직접 추출',     baseCost:8000000,   aps:9000,  maxCount:1,
    special:{ duration:5000, desc:'항성 폭발 에너지! 클릭 +3000 EXP (5초)', buffType:'clickBonus', buffValue:3000, color:'#ff6644', emoji:'🚀' } },
  { id:'w8', name:'👑 황제 함대',     desc:'우주 함대 에너지 네트워크',   baseCost:60000000,  aps:45000, maxCount:1,
    special:{ duration:6000, desc:'황제의 축복! 자동 수집 x5 (6초)', buffType:'autoMult', buffValue:5, color:'#ffd700', emoji:'👑' } },
];

// ═══════════════════════════════════════════════════
// GACHA DATA
// ═══════════════════════════════════════════════════
// 등급: C B A S SS SSS EX
// unlockStage: 이 stage 이상이어야 뽑기 풀에 포함
// effect: recalcMultipliers에서 적용
//   type: 'clickMult'|'autoMult'|'critChance'|'critMult'|'allMult'
//   val: 곱연산 or 덧셈 (type에 따라)

const GRADE_ORDER = ['C','B','A','S','SS','SSS','EX'];
const GRADE_COLORS = { C:'#aaa', B:'#44bbff', A:'#44ff88', S:'#ffdd00', SS:'#ff8844', SSS:'#ff44aa', EX:'#cc44ff' };
const GRADE_BG    = { C:'bg-C', B:'bg-B', A:'bg-A', S:'bg-S', SS:'bg-SS', SSS:'bg-SSS', EX:'bg-EX' };

// 스테이지 0~12 → 뽑기 풀 확률표 (해당 stage부터 해금)
// 각 풀은 [C,B,A,S,SS,SSS,EX] 비율 (합=100), EX≤1%, SSS≤5%

const GACHA_PROB_BY_STAGE = [
  // stage 0~2: C/B만
  [76,   24,    0,    0,    0,    0,    0],   // 합=100
  [74,   26,    0,    0,    0,    0,    0],   // 합=100
  [68,   27,    5,    0,    0,    0,    0],   // 합=100
  // stage 3~4
  [58,   27,   13,    2,    0,    0,    0],   // 합=100
  [50,   27,   18,    4.5,  0.5,  0,    0],   // 합=100
  // stage 5~6
  [43,   25,   21,    8,    2.5,  0.5,  0],   // 합=100
  [37,   23,   22,   12,    4,    1.5,  0.5], // 합=100
  // stage 7~8
  [32,   21,   22,   15,    7,    2.5,  0.5], // 합=100
  [29,   20,   22,   19,    5,    4.5,  0.5], // 합=100, SSS<5%, EX=0.5%
  // stage 9~10
  [24.7, 18,   22,   20.5, 10,    4,    0.8], // 합=100, SSS<5%, EX=0.8%
  [19,   16,   22,   22,   15,    5,    1],   // 합=100, SSS=5%, EX=1%
  // stage 11~12
  [21.2, 14,   21,   24,   14,    5,    0.8], // 합=100, SSS=5%, EX=0.8%
  [14.5, 12,   20,   25,   23,    5,    0.5], // 합=100
];

// ═══════════════════════════════════════════════════
// 차명석 전용 가챠 카드 (어둠/암흑 테마)
// unlockStage: 차명석 cmsStage 기준
// ═══════════════════════════════════════════════════

const GACHA_CARDS = [
  // ══════════════════════════════════════════════════
  // C등급 (stage 0+) — 14장
  // ══════════════════════════════════════════════════
  { id:'c01', grade:'C', emoji:'🌱', name:'새싹의 힘',       desc:'클릭 EXP ×1.08',  unlockStage:0, type:'clickMult',  val:1.08 },
  { id:'c02', grade:'C', emoji:'🍃', name:'바람의 속삭임',    desc:'자동 EXP ×1.08',  unlockStage:0, type:'autoMult',   val:1.08 },
  { id:'c03', grade:'C', emoji:'🌀', name:'작은 소용돌이',    desc:'크리 확률 +1%',   unlockStage:0, type:'critChance', val:0.01 },
  { id:'c04', grade:'C', emoji:'💧', name:'물방울 응축',      desc:'클릭 EXP ×1.10',  unlockStage:0, type:'clickMult',  val:1.10 },
  { id:'c05', grade:'C', emoji:'🪨', name:'돌의 기운',        desc:'자동 EXP ×1.10',  unlockStage:0, type:'autoMult',   val:1.10 },
  { id:'c06', grade:'C', emoji:'🍀', name:'네잎클로버',       desc:'크리 확률 +1%',   unlockStage:0, type:'critChance', val:0.01 },
  { id:'c07', grade:'C', emoji:'🌾', name:'황금 밀밭',        desc:'자동 EXP ×1.12',  unlockStage:0, type:'autoMult',   val:1.12 },
  { id:'c08', grade:'C', emoji:'🪵', name:'나무의 결',        desc:'클릭 EXP ×1.12',  unlockStage:0, type:'clickMult',  val:1.12 },
  { id:'c09', grade:'C', emoji:'🌞', name:'햇살 에너지',      desc:'크리 배율 +0.1',  unlockStage:0, type:'critMult',   val:0.10 },
  { id:'c10', grade:'C', emoji:'🌧️', name:'빗소리 리듬',     desc:'자동 EXP ×1.15',  unlockStage:0, type:'autoMult',   val:1.15 },
  { id:'c11', grade:'C', emoji:'🍄', name:'버섯 포자',        desc:'클릭 EXP ×1.15',  unlockStage:0, type:'clickMult',  val:1.15 },
  { id:'c12', grade:'C', emoji:'🦋', name:'나비 날개',        desc:'크리 확률 +1.5%', unlockStage:0, type:'critChance', val:0.015},
  { id:'c13', grade:'C', emoji:'🐚', name:'조개 껍데기',      desc:'자동 EXP ×1.12',  unlockStage:0, type:'autoMult',   val:1.12 },
  { id:'c14', grade:'C', emoji:'🌵', name:'선인장 가시',      desc:'클릭 EXP ×1.12',  unlockStage:0, type:'clickMult',  val:1.12 },

  // ══════════════════════════════════════════════════
  // B등급 (stage 0+) — 14장
  // ══════════════════════════════════════════════════
  { id:'b01', grade:'B', emoji:'⚡', name:'전기 충전',        desc:'클릭 EXP ×1.18',  unlockStage:0, type:'clickMult',  val:1.18 },
  { id:'b02', grade:'B', emoji:'🔥', name:'작은 불꽃',        desc:'크리 확률 +2%',   unlockStage:0, type:'critChance', val:0.02 },
  { id:'b03', grade:'B', emoji:'🌊', name:'파도의 리듬',      desc:'자동 EXP ×1.20',  unlockStage:0, type:'autoMult',   val:1.20 },
  { id:'b04', grade:'B', emoji:'🌙', name:'달빛 에너지',      desc:'클릭 EXP ×1.20',  unlockStage:0, type:'clickMult',  val:1.20 },
  { id:'b05', grade:'B', emoji:'❄️', name:'얼음 결정',        desc:'크리 배율 +0.15', unlockStage:0, type:'critMult',   val:0.15 },
  { id:'b06', grade:'B', emoji:'🌪️', name:'회오리 기운',     desc:'자동 EXP ×1.22',  unlockStage:0, type:'autoMult',   val:1.22 },
  { id:'b07', grade:'B', emoji:'🦊', name:'여우의 날렵함',    desc:'클릭 EXP ×1.22',  unlockStage:0, type:'clickMult',  val:1.22 },
  { id:'b08', grade:'B', emoji:'🌺', name:'꽃잎 폭발',        desc:'크리 확률 +2.5%', unlockStage:0, type:'critChance', val:0.025},
  { id:'b09', grade:'B', emoji:'🦜', name:'앵무새의 지혜',    desc:'자동 EXP ×1.25',  unlockStage:0, type:'autoMult',   val:1.25 },
  { id:'b10', grade:'B', emoji:'🧊', name:'빙하 코어',        desc:'크리 배율 +0.20', unlockStage:0, type:'critMult',   val:0.20 },
  { id:'b11', grade:'B', emoji:'🌶️', name:'매운 에너지',     desc:'클릭 EXP ×1.25',  unlockStage:0, type:'clickMult',  val:1.25 },
  { id:'b12', grade:'B', emoji:'🎯', name:'명중의 감각',      desc:'크리 확률 +3%',   unlockStage:1, type:'critChance', val:0.03 },
  { id:'b13', grade:'B', emoji:'🐍', name:'뱀의 독',          desc:'자동 EXP ×1.28',  unlockStage:1, type:'autoMult',   val:1.28 },
  { id:'b14', grade:'B', emoji:'🔔', name:'울림의 파동',      desc:'클릭 EXP ×1.28',  unlockStage:1, type:'clickMult',  val:1.28 },

  // ══════════════════════════════════════════════════
  // A등급 (stage 2+) — 14장
  // ══════════════════════════════════════════════════
  { id:'a01', grade:'A', emoji:'🌟', name:'별빛 증폭',        desc:'클릭 EXP ×1.35',  unlockStage:2, type:'clickMult',  val:1.35 },
  { id:'a02', grade:'A', emoji:'🦅', name:'독수리의 눈',      desc:'크리 확률 +4%',   unlockStage:2, type:'critChance', val:0.04 },
  { id:'a03', grade:'A', emoji:'🌈', name:'무지개 파동',      desc:'전체 EXP ×1.12',  unlockStage:2, type:'allMult',    val:1.12 },
  { id:'a04', grade:'A', emoji:'🔮', name:'수정 구슬',        desc:'자동 EXP ×1.38',  unlockStage:2, type:'autoMult',   val:1.38 },
  { id:'a05', grade:'A', emoji:'⚔️', name:'예리한 칼날',      desc:'크리 배율 +0.35', unlockStage:2, type:'critMult',   val:0.35 },
  { id:'a06', grade:'A', emoji:'🧲', name:'인력 코어',        desc:'클릭 EXP ×1.38',  unlockStage:2, type:'clickMult',  val:1.38 },
  { id:'a07', grade:'A', emoji:'🦋', name:'변이 나비',        desc:'자동 EXP ×1.42',  unlockStage:3, type:'autoMult',   val:1.42 },
  { id:'a08', grade:'A', emoji:'🌊', name:'심해의 힘',        desc:'크리 배율 +0.45', unlockStage:3, type:'critMult',   val:0.45 },
  { id:'a09', grade:'A', emoji:'🎆', name:'폭죽 에너지',      desc:'전체 EXP ×1.15',  unlockStage:3, type:'allMult',    val:1.15 },
  { id:'a10', grade:'A', emoji:'🦄', name:'유니콘의 뿔',      desc:'크리 확률 +5%',   unlockStage:3, type:'critChance', val:0.05 },
  { id:'a11', grade:'A', emoji:'🌙', name:'초승달 각인',      desc:'클릭 EXP ×1.42',  unlockStage:3, type:'clickMult',  val:1.42 },
  { id:'a12', grade:'A', emoji:'🐺', name:'늑대의 울부짖음',  desc:'자동 EXP ×1.45',  unlockStage:4, type:'autoMult',   val:1.45 },
  { id:'a13', grade:'A', emoji:'💠', name:'다면체 수정',      desc:'전체 EXP ×1.18',  unlockStage:4, type:'allMult',    val:1.18 },
  { id:'a14', grade:'A', emoji:'🔱', name:'삼지창 문양',      desc:'크리 배율 +0.55', unlockStage:4, type:'critMult',   val:0.55 },

  // ══════════════════════════════════════════════════
  // S등급 (stage 4+) — 13장
  // ══════════════════════════════════════════════════
  { id:'s01', grade:'S', emoji:'💎', name:'다이아 코어',      desc:'전체 EXP ×1.22',  unlockStage:4, type:'allMult',    val:1.22 },
  { id:'s02', grade:'S', emoji:'🌠', name:'유성우',            desc:'클릭 EXP ×1.55',  unlockStage:4, type:'clickMult',  val:1.55 },
  { id:'s03', grade:'S', emoji:'🌌', name:'성운의 기운',      desc:'자동 EXP ×1.60',  unlockStage:4, type:'autoMult',   val:1.60 },
  { id:'s04', grade:'S', emoji:'👁️', name:'제3의 눈',         desc:'크리 확률 +6%',   unlockStage:5, type:'critChance', val:0.06 },
  { id:'s05', grade:'S', emoji:'🗡️', name:'영혼 파열',        desc:'크리 배율 +0.65', unlockStage:5, type:'critMult',   val:0.65 },
  { id:'s06', grade:'S', emoji:'🏆', name:'챔피언의 의지',    desc:'전체 EXP ×1.28',  unlockStage:5, type:'allMult',    val:1.28 },
  { id:'s07', grade:'S', emoji:'🐲', name:'어린 용',           desc:'클릭 EXP ×1.65',  unlockStage:5, type:'clickMult',  val:1.65 },
  { id:'s08', grade:'S', emoji:'⭐', name:'별의 핵',           desc:'자동 EXP ×1.72',  unlockStage:6, type:'autoMult',   val:1.72 },
  { id:'s09', grade:'S', emoji:'🌋', name:'용암 흐름',         desc:'크리 배율 +0.80', unlockStage:6, type:'critMult',   val:0.80 },
  { id:'s10', grade:'S', emoji:'🌀', name:'소용돌이 핵',       desc:'전체 EXP ×1.32',  unlockStage:6, type:'allMult',    val:1.32 },
  { id:'s11', grade:'S', emoji:'🦁', name:'사자의 포효',       desc:'크리 확률 +7%',   unlockStage:6, type:'critChance', val:0.07 },
  { id:'s12', grade:'S', emoji:'🌊', name:'해일의 파도',       desc:'클릭 EXP ×1.75',  unlockStage:7, type:'clickMult',  val:1.75 },
  { id:'s13', grade:'S', emoji:'🔮', name:'예언의 구슬',       desc:'자동 EXP ×1.80',  unlockStage:7, type:'autoMult',   val:1.80 },

  // ══════════════════════════════════════════════════
  // SS등급 (stage 6+) — 13장
  // ══════════════════════════════════════════════════
  { id:'ss01', grade:'SS', emoji:'🔱', name:'삼지창의 힘',    desc:'전체 EXP ×1.40',  unlockStage:6,  type:'allMult',   val:1.40 },
  { id:'ss02', grade:'SS', emoji:'🌋', name:'화산 폭발',      desc:'클릭 EXP ×2.0',   unlockStage:6,  type:'clickMult', val:2.0  },
  { id:'ss03', grade:'SS', emoji:'🌪️', name:'토네이도 코어', desc:'자동 EXP ×2.0',   unlockStage:7,  type:'autoMult',  val:2.0  },
  { id:'ss04', grade:'SS', emoji:'🦁', name:'왕의 포효',      desc:'크리 확률 +9%',   unlockStage:7,  type:'critChance',val:0.09 },
  { id:'ss05', grade:'SS', emoji:'⚡', name:'번개 심판',      desc:'크리 배율 +1.1',  unlockStage:7,  type:'critMult',  val:1.1  },
  { id:'ss06', grade:'SS', emoji:'🐉', name:'반룡의 비늘',    desc:'전체 EXP ×1.48',  unlockStage:7,  type:'allMult',   val:1.48 },
  { id:'ss07', grade:'SS', emoji:'🌑', name:'어둠 에너지',    desc:'클릭 EXP ×2.2',   unlockStage:8,  type:'clickMult', val:2.2  },
  { id:'ss08', grade:'SS', emoji:'☄️', name:'혜성 충돌',      desc:'자동 EXP ×2.3',   unlockStage:8,  type:'autoMult',  val:2.3  },
  { id:'ss09', grade:'SS', emoji:'💫', name:'별똥별 소나기',  desc:'크리 배율 +1.3',  unlockStage:8,  type:'critMult',  val:1.3  },
  { id:'ss10', grade:'SS', emoji:'🌟', name:'초고온 플라즈마',desc:'전체 EXP ×1.55',  unlockStage:8,  type:'allMult',   val:1.55 },
  { id:'ss11', grade:'SS', emoji:'🦅', name:'폭풍의 황제',    desc:'크리 확률 +10%',  unlockStage:8,  type:'critChance',val:0.10 },
  { id:'ss12', grade:'SS', emoji:'🌊', name:'심해 압력',      desc:'클릭 EXP ×2.4',   unlockStage:9,  type:'clickMult', val:2.4  },
  { id:'ss13', grade:'SS', emoji:'🔮', name:'심연의 거울',    desc:'자동 EXP ×2.5',   unlockStage:9,  type:'autoMult',  val:2.5  },

  // ══════════════════════════════════════════════════
  // SSS등급 (stage 9+) — 12장
  // ══════════════════════════════════════════════════
  { id:'sss01', grade:'SSS', emoji:'🐉', name:'용의 심장',    desc:'전체 EXP ×1.65',  unlockStage:9,  type:'allMult',   val:1.65 },
  { id:'sss02', grade:'SSS', emoji:'🌑', name:'블랙홀 코어',  desc:'클릭 EXP ×2.6',   unlockStage:9,  type:'clickMult', val:2.6  },
  { id:'sss03', grade:'SSS', emoji:'🌀', name:'차원 균열',    desc:'자동 EXP ×2.8',   unlockStage:9,  type:'autoMult',  val:2.8  },
  { id:'sss04', grade:'SSS', emoji:'💀', name:'절대 소멸',    desc:'크리 확률 +13%',  unlockStage:9,  type:'critChance',val:0.13 },
  { id:'sss05', grade:'SSS', emoji:'🌟', name:'초신성 폭발',  desc:'크리 배율 +1.8',  unlockStage:9,  type:'critMult',  val:1.8  },
  { id:'sss06', grade:'SSS', emoji:'⚛️', name:'원자 분열',    desc:'전체 EXP ×1.80',  unlockStage:10, type:'allMult',   val:1.80 },
  { id:'sss07', grade:'SSS', emoji:'🌌', name:'은하 핵',       desc:'클릭 EXP ×3.0',   unlockStage:10, type:'clickMult', val:3.0  },
  { id:'sss08', grade:'SSS', emoji:'🔱', name:'신의 삼지창',  desc:'자동 EXP ×3.2',   unlockStage:10, type:'autoMult',  val:3.2  },
  { id:'sss09', grade:'SSS', emoji:'👁️', name:'전지의 눈',    desc:'크리 확률 +15%',  unlockStage:10, type:'critChance',val:0.15 },
  { id:'sss10', grade:'SSS', emoji:'💥', name:'빅뱅 여파',    desc:'크리 배율 +2.3',  unlockStage:11, type:'critMult',  val:2.3  },
  { id:'sss11', grade:'SSS', emoji:'🌠', name:'항성 폭발',    desc:'전체 EXP ×2.0',   unlockStage:11, type:'allMult',   val:2.0  },
  { id:'sss12', grade:'SSS', emoji:'🦋', name:'우주 나비',    desc:'클릭 EXP ×3.5',   unlockStage:11, type:'clickMult', val:3.5  },

  // ══════════════════════════════════════════════════
  // EX등급 (stage 11+) — 8장
  // ══════════════════════════════════════════════════
  { id:'ex01', grade:'EX', emoji:'👑', name:'은하 황제의 인장',  desc:'전체 EXP ×2.5',  unlockStage:11, type:'allMult',   val:2.5  },
  { id:'ex02', grade:'EX', emoji:'🌌', name:'우주의 근원',       desc:'전체 EXP ×3.0',  unlockStage:11, type:'allMult',   val:3.0  },
  { id:'ex03', grade:'EX', emoji:'⚛️', name:'초월 존재',         desc:'크리 배율 +3.5', unlockStage:11, type:'critMult',  val:3.5  },
  { id:'ex04', grade:'EX', emoji:'🐉', name:'태초의 용',         desc:'클릭 EXP ×4.0',  unlockStage:12, type:'clickMult', val:4.0  },
  { id:'ex05', grade:'EX', emoji:'💫', name:'신의 숨결',         desc:'자동 EXP ×4.5',  unlockStage:12, type:'autoMult',  val:4.5  },
  { id:'ex06', grade:'EX', emoji:'💀', name:'영겁의 심판',       desc:'크리 확률 +18%', unlockStage:12, type:'critChance',val:0.18 },
  { id:'ex07', grade:'EX', emoji:'🌟', name:'빅뱅의 씨앗',      desc:'전체 EXP ×3.5',  unlockStage:12, type:'allMult',   val:3.5  },
  { id:'ex08', grade:'EX', emoji:'♾️', name:'무한의 고리',       desc:'크리 배율 +4.5', unlockStage:12, type:'critMult',  val:4.5  },
];

function jsyLevelViewBack() {
  viewStage = null;
  renderCharacter(); renderEvoInfo(); renderStageBar();
  renderLevelViewer();
}

function renderUpgrades() {
  const container=document.getElementById('upgrades-list');
  container.innerHTML='';
  const active=getActiveUpgrades(state.upgrades);
  const cats=['click','auto','crit','critMult'];
  cats.forEach(cat=>{
    const activeU=active.find(u=>u.cat===cat);
    if(activeU){
      const canAfford=state.totalExp>=activeU.cost;
      const btn=document.createElement('button');
      btn.className='upgrade-btn'+(canAfford?' affordable':'');
      const chainItems=UPGRADES.filter(u=>u.cat===cat);
      const doneCount=chainItems.filter(u=>state.upgrades[u.id]).length;
      const totalCount=chainItems.length;
      const bonusLabel = activeU.cat==='click' ? '🔥 구매 시 3초 클릭 2배 버스트!'
        : activeU.cat==='auto' ? '⚡ 구매 시 3초 자동EXP 즉시 증폭!'
        : activeU.cat==='crit' ? '💥 구매 시 5초 크리 확률 +10% 보너스!'
        : activeU.cat==='critMult' ? '💀 구매 시 5초 크리 배율 +5 보너스!' : '';
      btn.innerHTML=`
        <div class="upgrade-name">${activeU.name} <span class="upgrade-badge">${doneCount+1}/${totalCount}</span></div>
        <div class="upgrade-desc">${activeU.desc}</div>
        <div class="upgrade-cost">💰 ${formatNum(activeU.cost)}</div>
        <div class="upgrade-effect">${activeU.effectStr}</div>
        ${bonusLabel ? `<div class="upgrade-bonus-fx">${bonusLabel}</div>` : ''}
      `;
      btn.addEventListener('click',()=>buyUpgrade(activeU));
      container.appendChild(btn);
    } else {
      const chainItems=UPGRADES.filter(u=>u.cat===cat);
      if(chainItems.every(u=>state.upgrades[u.id])){
        const div=document.createElement('div');
        div.className='upgrade-btn purchased';
        const catName=cat==='click'?'클릭 강화':cat==='auto'?'자동화':cat==='crit'?'크리 확률':'크리 배율';
        div.innerHTML=`
          <div class="upgrade-name">${catName} <span class="upgrade-badge done">완료 ✓</span></div>
          <div class="upgrade-desc">모든 단계 완료!</div>
        `;
        container.appendChild(div);
      }
    }
  });

  // ── 모든 정아영 테크 만렙 달성 시: 은행원 조디 (환전소) 버튼 ──
  if(allJsyTechMaxed()){
    const bankerBtn=document.createElement('button');
    bankerBtn.className='upgrade-btn banker-btn';
    bankerBtn.innerHTML=`
      <div class="upgrade-name">💰 은행원 조디</div>
      <div class="upgrade-desc">정아영 EXP ↔ 차명석 EXP 환전소</div>
      <div class="upgrade-effect">클릭하여 환전 창 열기</div>
    `;
    bankerBtn.addEventListener('click', openBankerModal);
    container.appendChild(bankerBtn);
  }
}