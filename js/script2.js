// ═══════════════════════════════════════════════════
// script2.js — 차명석 테크
// ═══════════════════════════════════════════════════

const CMS_STAGES = [
  { name:"차명석",        expReq:0,             desc:"못생겼다",              atk:15,  hp:100,  spd:18  },
  { name:"용병 차명석",expReq:500,           desc:"돈을 위해서라면 뭐든지 하는 용병",                       atk:28,  hp:180,  spd:35  },
  { name:"담나투스", expReq:5000,          desc:"전쟁중 마녀의 저주에 의해 돌이 되어버렸다",             atk:50,  hp:300,  spd:60  },
  { name:"성장한 담나투스", expReq:60000,         desc:"마녀의 저주로 인해 돌에서 깨어나지 못한다...",           atk:85,  hp:500,  spd:100 },
  { name:"라피스 리모수스", expReq:800000,        desc:"내면에서 무언가 요동친다",                  atk:140, hp:800,  spd:160 },
  { name:"파멸의 전령",   expReq:15000000,      desc:"오직 마녀... 그녀를 잡기 위해서라면...",                  atk:220, hp:1200, spd:240 },
  { name:"비불루스",   expReq:300000000,     desc:"형체를 점점 잃어간다. 곧 돌에서 깨어날 것 같다.",                    atk:350, hp:1900, spd:380 },
  { name:"울티오", expReq:8000000000,    desc:"엄청난 초월의 힘이 느껴진다. 흑화한 모습이다.",                    atk:550, hp:3000, spd:580 },
  { name:"테메라리아",   expReq:200000000000,  desc:"무모한 심판자. 모든 것을 소멸시킨다.",                   atk:900, hp:5000, spd:900 },
];

const CMS_UPGRADES = [
  // ── 클릭 배율 체인
  // stage0 EXP=0, stage1 EXP=500, stage2 EXP=5000, stage3 EXP=60000
  // stage4 EXP=800000, stage5 EXP=15M, stage6 EXP=300M, stage7 EXP=8B, stage8 EXP=200B
  { id:'cm_c1', cat:'cm_click', name:'암흑의 일격',   desc:'클릭 EXP ×8',   cost:1200,              mult:8,   effectStr:'클릭 ×8',      critAdd:0, multAdd:0, unlockStage:0 },
  { id:'cm_c2', cat:'cm_click', name:'지옥 타격',     desc:'클릭 EXP ×16',  cost:30000,             mult:16,  effectStr:'클릭 ×16',     critAdd:0, multAdd:0, unlockStage:1 },
  { id:'cm_c3', cat:'cm_click', name:'공허 파쇄',     desc:'클릭 EXP ×35',  cost:1500000,           mult:35,  effectStr:'클릭 ×35',     critAdd:0, multAdd:0, unlockStage:2 },
  { id:'cm_c4', cat:'cm_click', name:'절멸의 강타',   desc:'클릭 EXP ×85',  cost:80000000,          mult:85,  effectStr:'클릭 ×85',     critAdd:0, multAdd:0, unlockStage:4 },
  { id:'cm_c5', cat:'cm_click', name:'차명석의 분노', desc:'클릭 EXP ×180', cost:8000000000,        mult:180, effectStr:'클릭 ×180',    critAdd:0, multAdd:0, unlockStage:6 },
  { id:'cm_c6', cat:'cm_click', name:'암흑 소멸격',   desc:'클릭 EXP ×400', cost:1000000000000,     mult:400, effectStr:'클릭 ×400',    critAdd:0, multAdd:0, unlockStage:7 },
  { id:'cm_c7', cat:'cm_click', name:'우주 말살격',   desc:'클릭 EXP ×1000',cost:30000000000000,    mult:1000,effectStr:'클릭 ×1000',   critAdd:0, multAdd:0, unlockStage:8 },
  // ── 자동화 체인
  { id:'cm_a1', cat:'cm_auto',  name:'어둠의 자동수집',desc:'자동 EXP ×1.5', cost:1500,              mult:1.5, effectStr:'자동 ×1.5',   critAdd:0, multAdd:0, unlockStage:0 },
  { id:'cm_a2', cat:'cm_auto',  name:'지옥 드론',      desc:'자동 EXP ×2',   cost:20000,             mult:2,   effectStr:'자동 ×2',     critAdd:0, multAdd:0, unlockStage:1 },
  { id:'cm_a3', cat:'cm_auto',  name:'공허 에너지망',  desc:'자동 EXP ×3',   cost:800000,            mult:3,   effectStr:'자동 ×3',     critAdd:0, multAdd:0, unlockStage:2 },
  { id:'cm_a4', cat:'cm_auto',  name:'파멸의 네트워크',desc:'자동 EXP ×5',   cost:50000000,          mult:5,   effectStr:'자동 ×5',     critAdd:0, multAdd:0, unlockStage:4 },
  { id:'cm_a5', cat:'cm_auto',  name:'차원 붕괴망',    desc:'자동 EXP ×10',  cost:5000000000,        mult:10,  effectStr:'자동 ×10',    critAdd:0, multAdd:0, unlockStage:6 },
  { id:'cm_a6', cat:'cm_auto',  name:'절대 암흑망',    desc:'자동 EXP ×20',  cost:600000000000,      mult:20,  effectStr:'자동 ×20',    critAdd:0, multAdd:0, unlockStage:7 },
  { id:'cm_a7', cat:'cm_auto',  name:'암흑 심연망',    desc:'자동 EXP ×40',  cost:15000000000000,    mult:40,  effectStr:'자동 ×40',    critAdd:0, multAdd:0, unlockStage:8 },
  // ── 크리 확률 체인
  { id:'cm_r1', cat:'cm_crit',  name:'암흑의 예리함',  desc:'크리 확률 +5%', cost:3000,              mult:1, critAdd:0.05, multAdd:0, effectStr:'크리 +5%',  unlockStage:0 },
  { id:'cm_r2', cat:'cm_crit',  name:'죽음의 감각',    desc:'크리 확률 +8%', cost:80000,             mult:1, critAdd:0.08, multAdd:0, effectStr:'크리 +8%',  unlockStage:1 },
  { id:'cm_r3', cat:'cm_crit',  name:'파멸의 직감',    desc:'크리 확률 +12%',cost:5000000,           mult:1, critAdd:0.12, multAdd:0, effectStr:'크리 +12%', unlockStage:3 },
  { id:'cm_r4', cat:'cm_crit',  name:'절대 각성',      desc:'크리 확률 +15%',cost:200000000,         mult:1, critAdd:0.15, multAdd:0, effectStr:'크리 +15%', unlockStage:5 },
  { id:'cm_r5', cat:'cm_crit',  name:'차명석의 눈',    desc:'크리 확률 +18%',cost:15000000000,       mult:1, critAdd:0.18, multAdd:0, effectStr:'크리 +18%', unlockStage:7 },
  { id:'cm_r6', cat:'cm_crit',  name:'절대자의 감각',  desc:'크리 확률 +20%',cost:2000000000000,     mult:1, critAdd:0.20, multAdd:0, effectStr:'크리 +20%', unlockStage:8 },
  // ── 크리 배율 체인
  { id:'cm_m1', cat:'cm_critMult', name:'공허의 눈',   desc:'크리 배율 +3',  cost:8000,              mult:1, critAdd:0, multAdd:3,  effectStr:'크리 배율 +3',  unlockStage:0 },
  { id:'cm_m2', cat:'cm_critMult', name:'파멸의 일격', desc:'크리 배율 +5',  cost:300000,            mult:1, critAdd:0, multAdd:5,  effectStr:'크리 배율 +5',  unlockStage:2 },
  { id:'cm_m3', cat:'cm_critMult', name:'절대 소멸',   desc:'크리 배율 +10', cost:30000000,          mult:1, critAdd:0, multAdd:10, effectStr:'크리 배율 +10', unlockStage:4 },
  { id:'cm_m4', cat:'cm_critMult', name:'암흑 심연',   desc:'크리 배율 +20', cost:1500000000,        mult:1, critAdd:0, multAdd:20, effectStr:'크리 배율 +20', unlockStage:6 },
  { id:'cm_m5', cat:'cm_critMult', name:'우주 붕괴',   desc:'크리 배율 +35', cost:150000000000,      mult:1, critAdd:0, multAdd:35, effectStr:'크리 배율 +35', unlockStage:7 },
  { id:'cm_m6', cat:'cm_critMult', name:'절대 소멸자', desc:'크리 배율 +60', cost:8000000000000,     mult:1, critAdd:0, multAdd:60, effectStr:'크리 배율 +60', unlockStage:8 },
];

// ── 차명석 전용 일꾼 ────────────────────────────────────────────────────
const CMS_WORKERS = [
  { id:'cw1', name:'💀 어둠의 졸개',    desc:'암흑 에너지를 조금씩 긁어온다',  baseCost:75,        aps:1,     maxCount:1,
    special:{ duration:5000, desc:'졸개의 발악! 클릭 +15 EXP (5초)', buffType:'clickBonus', buffValue:15, color:'#aa2222', emoji:'💀' } },
  { id:'cw2', name:'🗡️ 암살단 신병',   desc:'빠르게 재화를 수집한다',         baseCost:500,       aps:8,     maxCount:1,
    special:{ duration:5000, desc:'신병의 기습! 클릭 +30 EXP (5초)', buffType:'clickBonus', buffValue:30, color:'#cc3333', emoji:'🗡️' } },
  { id:'cw3', name:'🔥 지옥 드론',      desc:'암흑 에너지를 자동 수집',        baseCost:3500,      aps:35,    maxCount:1,
    special:{ duration:5000, desc:'드론 폭주! 클릭 +80 EXP (5초)', buffType:'clickBonus', buffValue:80, color:'#ff4422', emoji:'🔥' } },
  { id:'cw4', name:'⚡ 공허 코어',      desc:'강력한 암흑 발생기',             baseCost:75000,     aps:130,   maxCount:1,
    special:{ duration:5000, desc:'코어 과부하! 크리 확률 +15% (5초)', buffType:'critChance', buffValue:0.15, color:'#cc44ff', emoji:'⚡' } },
  { id:'cw5', name:'🌑 어둠 발전기',    desc:'어둠 에너지를 대량 수확',        baseCost:500000,    aps:500,   maxCount:1,
    special:{ duration:5000, desc:'어둠 폭발! 클릭 +500 EXP (5초)', buffType:'clickBonus', buffValue:500, color:'#6644aa', emoji:'🌑' } },
  { id:'cw6', name:'💎 암흑 광산',      desc:'순수 암흑 결정체 채굴',          baseCost:6000000,   aps:2000,  maxCount:1,
    special:{ duration:5000, desc:'결정 공명! 크리 확률 +20% (5초)', buffType:'critChance', buffValue:0.20, color:'#ff66cc', emoji:'💎' } },
  { id:'cw7', name:'🚀 절멸 엔진',      desc:'차원의 에너지를 직접 추출',      baseCost:40000000,  aps:9000,  maxCount:1,
    special:{ duration:5000, desc:'엔진 폭발 에너지! 클릭 +3000 EXP (5초)', buffType:'clickBonus', buffValue:3000, color:'#ff5522', emoji:'🚀' } },
  { id:'cw8', name:'👑 공허 함대',      desc:'차명석 직속 암흑 네트워크',      baseCost:300000000, aps:45000, maxCount:1,
    special:{ duration:6000, desc:'함대의 축복! 자동 수집 x5 (6초)', buffType:'autoMult', buffValue:5, color:'#cc8800', emoji:'👑' } },
];

// ── 차명석 일꾼 업그레이드 체인 (각 일꾼마다 3단계 강화) ──────────────
const CMS_WORKER_UPGRADES = [
  // 어둠의 졸개
  { id:'cwu1a', wid:'cw1', name:'졸개 훈련',     desc:'어둠의 졸개 생산 ×15',  cost:400,         wUpgMult:15, next:'cwu1b' },
  { id:'cwu1b', wid:'cw1', name:'졸개 진화',     desc:'어둠의 졸개 생산 ×30',  cost:5000,        wUpgMult:30, next:'cwu1c' },
  { id:'cwu1c', wid:'cw1', name:'졸개 폭주',     desc:'어둠의 졸개 생산 ×350',  cost:80000,       wUpgMult:350, next:null  },
  // 암살단 신병
  { id:'cwu2a', wid:'cw2', name:'신병 단련',     desc:'암살단 신병 생산 ×4',  cost:2500,        wUpgMult:4, next:'cwu2b' },
  { id:'cwu2b', wid:'cw2', name:'신병 졸업',     desc:'암살단 신병 생산 ×25',  cost:40000,       wUpgMult:25, next:'cwu2c' },
  { id:'cwu2c', wid:'cw2', name:'신병 초월',     desc:'암살단 신병 생산 ×110',  cost:800000,      wUpgMult:110, next:null  },
  // 지옥 드론
  { id:'cwu3a', wid:'cw3', name:'드론 강화',     desc:'지옥 드론 생산 ×10',    cost:15000,       wUpgMult:10, next:'cwu3b' },
  { id:'cwu3b', wid:'cw3', name:'드론 AI 탑재',  desc:'지옥 드론 생산 ×20',    cost:250000,      wUpgMult:20, next:'cwu3c' },
  { id:'cwu3c', wid:'cw3', name:'드론 자율 비행',desc:'지옥 드론 생산 ×40',    cost:5000000,     wUpgMult:40, next:null  },
  // 공허 코어
  { id:'cwu4a', wid:'cw4', name:'코어 과충전',   desc:'공허 코어 생산 ×2',    cost:350000,      wUpgMult:2, next:'cwu4b' },
  { id:'cwu4b', wid:'cw4', name:'코어 결정화',   desc:'공허 코어 생산 ×3',    cost:6000000,     wUpgMult:3, next:'cwu4c' },
  { id:'cwu4c', wid:'cw4', name:'코어 임계 돌파',desc:'공허 코어 생산 ×5',    cost:100000000,   wUpgMult:5, next:null  },
  // 어둠 발전기
  { id:'cwu5a', wid:'cw5', name:'발전기 증폭',   desc:'어둠 발전기 생산 ×2',  cost:4000000,     wUpgMult:2, next:'cwu5b' },
  { id:'cwu5b', wid:'cw5', name:'어둠 연결망',   desc:'어둠 발전기 생산 ×3',  cost:64000000,    wUpgMult:3, next:'cwu5c' },
  { id:'cwu5c', wid:'cw5', name:'암흑 코어 연동',desc:'어둠 발전기 생산 ×5',  cost:1600000000,  wUpgMult:5, next:null  },
  // 암흑 광산
  { id:'cwu6a', wid:'cw6', name:'광맥 확장',     desc:'암흑 광산 생산 ×2',    cost:24000000,    wUpgMult:2, next:'cwu6b' },
  { id:'cwu6b', wid:'cw6', name:'정제 공장',     desc:'암흑 광산 생산 ×3',    cost:480000000,   wUpgMult:3, next:'cwu6c' },
  { id:'cwu6c', wid:'cw6', name:'순수 결정',     desc:'암흑 광산 생산 ×5',    cost:12000000000, wUpgMult:5, next:null  },
  // 절멸 엔진
  { id:'cwu7a', wid:'cw7', name:'엔진 과부하',   desc:'절멸 엔진 생산 ×2',    cost:160000000,   wUpgMult:2, next:'cwu7b' },
  { id:'cwu7b', wid:'cw7', name:'차원 융합로',   desc:'절멸 엔진 생산 ×3',    cost:4000000000,  wUpgMult:3, next:'cwu7c' },
  { id:'cwu7c', wid:'cw7', name:'초신성 엔진',   desc:'절멸 엔진 생산 ×5',    cost:120000000000,wUpgMult:5, next:null  },
  // 공허 함대
  { id:'cwu8a', wid:'cw8', name:'함대 확장',     desc:'공허 함대 생산 ×2',    cost:1600000000,  wUpgMult:2, next:'cwu8b' },
  { id:'cwu8b', wid:'cw8', name:'암흑의 명령',   desc:'공허 함대 생산 ×3',    cost:32000000000, wUpgMult:3, next:'cwu8c' },
  { id:'cwu8c', wid:'cw8', name:'무적 함대',     desc:'공허 함대 생산 ×5',    cost:800000000000,wUpgMult:5, next:null  },
];

function getCmsWorkerCost(w) {
  const cnt = state.cmsWorkers[w.id] || 0;
  return Math.floor(w.baseCost * Math.pow(1.15, cnt));
}

function getCmsWorkerAps(w) {
  const cnt = state.cmsWorkers[w.id] || 0;
  if (cnt === 0) return 0;
  const wUpgs = CMS_WORKER_UPGRADES.filter(u=>u.wid===w.id && u.wUpgMult && state.cmsUpgrades[u.id]);
  const wMult = wUpgs.length > 0 ? Math.max(...wUpgs.map(u=>u.wUpgMult)) : 1;
  return w.aps * cnt * wMult * state.cmsAutoMult;
}

function getCmsAutoGoldTotal() {
  let total = 0;
  CMS_WORKERS.forEach(w => { total += getCmsWorkerAps(w); });
  return total * specialEffect.autoMultBonus;
}

function buyCmsWorker(w) {
  initAudio();
  if (!cmsIsUnlocked()) return;
  const cnt = state.cmsWorkers[w.id] || 0;
  if (cnt >= w.maxCount) { showNotification('이미 최대 고용 수입니다!'); return; }
  const cost = getCmsWorkerCost(w);
  if (state.cmsExp < cost) { showNotification('💀 EXP가 부족합니다!'); return; }
  state.cmsExp -= cost;
  state.cmsWorkers[w.id] = cnt + 1;
  playBuy();
  renderCmsPanel();
  saveGame();
  showNotification('💀 ' + w.name + ' 고용!');
}

function buyCmsWorkerUpgrade(u) {
  initAudio();
  if(state.cmsUpgrades[u.id]){showNotification('이미 구매한 업그레이드입니다!');return;}
  if(state.cmsExp<u.cost){showNotification('💀 EXP가 부족합니다!');return;}
  state.cmsExp-=u.cost;
  state.cmsUpgrades[u.id]=true;
  playBuy();
  showNotification(`⬆ ${u.name} 강화!`);
  renderCmsPanel();
  saveGame();
}

function renderCmsWorkers(container) {
  let html = '<div class="panel-title" style="font-size:.62rem;margin:10px 0 6px;">💀 차명석 일꾼</div>';
  CMS_WORKERS.forEach(w => {
    const cnt   = state.cmsWorkers[w.id] || 0;
    const cost  = getCmsWorkerCost(w);
    const aps   = getCmsWorkerAps(w);
    const maxed = cnt >= w.maxCount;
    const canAfford = state.cmsExp >= cost;
    const cls = maxed ? 'maxed' : (canAfford ? 'affordable' : '');
    html += `<button class="worker-btn ${cls}" style="border-color:rgba(204,68,68,0.3);margin-bottom:5px;" ${maxed?'disabled':''} onclick="buyCmsWorker(CMS_WORKERS.find(x=>x.id==='${w.id}'))">
      <div class="worker-header">
        <span class="worker-name" style="color:#cc6666;">${w.name}</span>
        <span class="worker-count" style="background:rgba(204,68,68,0.1);color:#cc4444;">${cnt}/${w.maxCount}</span>
      </div>
      <div class="worker-desc">${w.desc}</div>
      ${aps>0?`<div class="worker-rate" style="color:rgba(204,68,68,0.5);">암흑 EPS: ${formatNum(aps)}/s</div>`:''}
      ${maxed?'<div class="worker-cost" style="color:#555;">최대 고용</div>':`<div class="worker-cost" style="color:var(--gold);">${formatNum(cost)} 💀EXP</div>`}
    </button>`;

    // 일꾼 고용 후 → 해당 일꾼 업그레이드 표시
    if(maxed){
      const wUpgs=CMS_WORKER_UPGRADES.filter(u=>u.wid===w.id);
      const activeWUpg=wUpgs.find(u=>!state.cmsUpgrades[u.id]);
      const allDone=wUpgs.every(u=>state.cmsUpgrades[u.id]);
      if(allDone){
        html += `<div class="upgrade-btn purchased" style="margin-top:2px;margin-bottom:5px;margin-left:8px;padding:5px 8px;border-color:rgba(204,68,68,0.3);">
          <div class="upgrade-name" style="font-size:.68rem;">${w.name.replace(/\S+\s/,'')} <span class="upgrade-badge done">MAX ✓</span></div>
        </div>`;
      } else if(activeWUpg){
        const doneCount=wUpgs.filter(u=>state.cmsUpgrades[u.id]).length;
        const canAffordW=state.cmsExp>=activeWUpg.cost;
        html += `<button class="upgrade-btn${canAffordW?' affordable':''}" style="margin-top:2px;margin-bottom:5px;margin-left:8px;width:calc(100% - 8px);border-color:rgba(204,68,68,0.3);" onclick="buyCmsWorkerUpgrade(CMS_WORKER_UPGRADES.find(x=>x.id==='${activeWUpg.id}'))">
          <div class="upgrade-name" style="font-size:.7rem;color:#cc4444;">⬆ ${activeWUpg.name} <span class="upgrade-badge" style="color:#cc4444;">${doneCount+1}/${wUpgs.length}</span></div>
          <div class="upgrade-desc">${activeWUpg.desc}</div>
          <div class="upgrade-cost">💀 ${formatNum(activeWUpg.cost)}</div>
        </button>`;
      }
    }
  });
  container.insertAdjacentHTML('beforeend', html);
}

function cmsGetActiveUpgrades(purchased) {
  const cats = {};
  CMS_UPGRADES.forEach(u => {
    if (purchased[u.id]) return;
    if (!cats[u.cat]) cats[u.cat] = u;
  });
  return Object.values(cats);
}

// ── 어떤 업그레이드가 현재 활성(구매 가능)인지 계산 ──
// 각 카테고리에서 아직 구매 안 된 첫 번째 항목만 표시.

const CMS_STAGE_IMAGES = {
  stage0:'images/b/b1.png', stage1:'images/b/b2.png', stage2:'images/b/b3.png',
  stage3:'images/b/b4.png', stage4:'images/b/b5.png', stage5:'images/b/b6.png',
  stage6:'images/b/b7.png', stage7:'images/b/b8.png', stage8:'images/b/b9.png',
};
// ⚠️ 수정 금지 구역 끝 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── 일꾼: maxCount:1 → 각 일꾼 1명씩만 고용 가능 ───────────────────────
// special: { duration(ms), desc, buffType, buffValue, color, emoji }
// buffType: 'clickBonus'(클릭당 +N exp), 'critChance'(크리확률+N), 'autoMult'(자동배율*N)

// 2026-07 확률 재조정: 전설급(SSS·EX)을 실제 모바일 가챠 수준으로 하향
// (EX 최종 0.5%, SSS 최종 3%까지만 — 남는 비율은 S/SS로 재분배)
const CMS_GACHA_PROB_BY_STAGE = [
  // cmsStage 0~1: C/B만
  [76,   24,   0,    0,    0,    0,   0],    // 합=100
  [70,   26,   4,    0,    0,    0,   0],    // 합=100
  // stage 2~3
  [58,   27,   13,   2,    0,    0,   0],    // 합=100
  [46,   27,   20,   6,    1,    0,   0],    // 합=100
  // stage 4~5
  [36,   24,   22,   11,   6.2,  0.7, 0.1],  // 합=100, SSS 0.7%, EX 0.1%
  [28,   21,   21,   16,   12.3, 1.5, 0.2],  // 합=100, SSS 1.5%, EX 0.2%
  // stage 6~7
  [22,   17.5, 21,   19,   18,   2.2, 0.3],  // 합=100, SSS 2.2%, EX 0.3%
  [17.5, 14.5, 20,   22,   22.9, 2.7, 0.4],  // 합=100, SSS 2.7%, EX 0.4%
  // stage 8
  [14.5, 12,   19,   25,   26,   3.0, 0.5],  // 합=100, SSS 3%(최종), EX 0.5%(최종)
];


const CMS_GACHA_CARDS = [
  // C등급
  { id:'dk_c01', grade:'C', emoji:'💀', name:'해골의 기운',      desc:'클릭 EXP ×1.08',  unlockStage:0, type:'clickMult',  val:1.08 },
  { id:'dk_c02', grade:'C', emoji:'🌑', name:'어둠의 속삭임',    desc:'자동 EXP ×1.08',  unlockStage:0, type:'autoMult',   val:1.08 },
  { id:'dk_c03', grade:'C', emoji:'🗡️', name:'녹슨 단검',        desc:'오프라인 EXP +1%',   unlockStage:0, type:'offlineMult', val:0.01 },
  { id:'dk_c04', grade:'C', emoji:'🕸️', name:'거미줄 함정',      desc:'클릭 EXP ×1.10',  unlockStage:0, type:'clickMult',  val:1.10 },
  { id:'dk_c05', grade:'C', emoji:'🦴', name:'뼈의 울림',        desc:'자동 EXP ×1.10',  unlockStage:0, type:'autoMult',   val:1.10 },
  { id:'dk_c06', grade:'C', emoji:'🌫️', name:'안개 장막',        desc:'오프라인 EXP +1%',   unlockStage:0, type:'offlineMult', val:0.01 },
  { id:'dk_c07', grade:'C', emoji:'⛓️', name:'쇠사슬 속박',      desc:'자동 EXP ×1.12',  unlockStage:0, type:'autoMult',   val:1.12 },
  { id:'dk_c08', grade:'C', emoji:'🪦', name:'묘비의 기운',      desc:'클릭 EXP ×1.12',  unlockStage:0, type:'clickMult',  val:1.12 },
  { id:'dk_c09', grade:'C', emoji:'🕯️', name:'검은 촛불',        desc:'크리 배율 +0.1',  unlockStage:0, type:'critMult',   val:0.10 },
  { id:'dk_c10', grade:'C', emoji:'🐦‍⬛', name:'까마귀의 눈',     desc:'자동 EXP ×1.15',  unlockStage:0, type:'autoMult',   val:1.15 },
  { id:'dk_c11', grade:'C', emoji:'🌒', name:'초승달 저주',      desc:'클릭 EXP ×1.15',  unlockStage:0, type:'clickMult',  val:1.15 },
  { id:'dk_c12', grade:'C', emoji:'🩸', name:'핏자국',           desc:'오프라인 EXP +1.5%', unlockStage:0, type:'offlineMult', val:0.015},
  // B등급
  { id:'dk_b01', grade:'B', emoji:'⚰️', name:'관 속의 힘',       desc:'클릭 EXP ×1.18',  unlockStage:0, type:'clickMult',  val:1.18 },
  { id:'dk_b02', grade:'B', emoji:'🔥', name:'지옥불 씨앗',      desc:'오프라인 EXP +2%',   unlockStage:0, type:'offlineMult', val:0.02 },
  { id:'dk_b03', grade:'B', emoji:'🌪️', name:'암흑 소용돌이',   desc:'자동 EXP ×1.20',  unlockStage:0, type:'autoMult',   val:1.20 },
  { id:'dk_b04', grade:'B', emoji:'👁️', name:'감시자의 눈',      desc:'클릭 EXP ×1.20',  unlockStage:0, type:'clickMult',  val:1.20 },
  { id:'dk_b05', grade:'B', emoji:'💎', name:'어둠의 수정',      desc:'크리 배율 +0.15', unlockStage:0, type:'critMult',   val:0.15 },
  { id:'dk_b06', grade:'B', emoji:'🐍', name:'독사의 독니',      desc:'자동 EXP ×1.22',  unlockStage:0, type:'autoMult',   val:1.22 },
  { id:'dk_b07', grade:'B', emoji:'🦇', name:'박쥐 군단',        desc:'클릭 EXP ×1.22',  unlockStage:1, type:'clickMult',  val:1.22 },
  { id:'dk_b08', grade:'B', emoji:'🌋', name:'용암 발걸음',      desc:'오프라인 EXP +2.5%', unlockStage:1, type:'offlineMult', val:0.025},
  { id:'dk_b09', grade:'B', emoji:'⚡', name:'암흑 번개',        desc:'자동 EXP ×1.25',  unlockStage:1, type:'autoMult',   val:1.25 },
  { id:'dk_b10', grade:'B', emoji:'🌑', name:'월식 코어',        desc:'크리 배율 +0.20', unlockStage:1, type:'critMult',   val:0.20 },
  { id:'dk_b11', grade:'B', emoji:'🗡️', name:'지옥 단검',        desc:'클릭 EXP ×1.25',  unlockStage:1, type:'clickMult',  val:1.25 },
  { id:'dk_b12', grade:'B', emoji:'👻', name:'망령의 손길',      desc:'오프라인 EXP +3%',   unlockStage:2, type:'offlineMult', val:0.03 },
  // A등급
  { id:'dk_a01', grade:'A', emoji:'🌌', name:'공허의 파편',      desc:'클릭 EXP ×1.35',  unlockStage:2, type:'clickMult',  val:1.35 },
  { id:'dk_a02', grade:'A', emoji:'💀', name:'왕해골의 기운',    desc:'오프라인 EXP +4%',   unlockStage:2, type:'offlineMult', val:0.04 },
  { id:'dk_a03', grade:'A', emoji:'🌑', name:'블랙문 파동',      desc:'전체 EXP ×1.12',  unlockStage:2, type:'allMult',    val:1.12 },
  { id:'dk_a04', grade:'A', emoji:'🕳️', name:'차원 구멍',        desc:'자동 EXP ×1.38',  unlockStage:2, type:'autoMult',   val:1.38 },
  { id:'dk_a05', grade:'A', emoji:'⚔️', name:'저주받은 칼',      desc:'크리 배율 +0.35', unlockStage:3, type:'critMult',   val:0.35 },
  { id:'dk_a06', grade:'A', emoji:'🌀', name:'암흑 소환진',      desc:'클릭 EXP ×1.38',  unlockStage:3, type:'clickMult',  val:1.38 },
  { id:'dk_a07', grade:'A', emoji:'🐉', name:'암흑용 비늘',      desc:'자동 EXP ×1.42',  unlockStage:3, type:'autoMult',   val:1.42 },
  { id:'dk_a08', grade:'A', emoji:'🌊', name:'지옥 해일',        desc:'크리 배율 +0.45', unlockStage:4, type:'critMult',   val:0.45 },
  { id:'dk_a09', grade:'A', emoji:'💫', name:'저주의 별',        desc:'전체 EXP ×1.15',  unlockStage:4, type:'allMult',    val:1.15 },
  { id:'dk_a10', grade:'A', emoji:'☠️', name:'독해골 인장',      desc:'오프라인 EXP +5%',   unlockStage:4, type:'offlineMult', val:0.05 },
  // S등급
  { id:'dk_s01', grade:'S', emoji:'🔮', name:'암흑 수정구',      desc:'전체 EXP ×1.22',  unlockStage:3, type:'allMult',    val:1.22 },
  { id:'dk_s02', grade:'S', emoji:'⛧',  name:'악마의 계약',      desc:'클릭 EXP ×1.55',  unlockStage:3, type:'clickMult',  val:1.55 },
  { id:'dk_s03', grade:'S', emoji:'🌑', name:'암흑성운',         desc:'자동 EXP ×1.60',  unlockStage:4, type:'autoMult',   val:1.60 },
  { id:'dk_s04', grade:'S', emoji:'👁️', name:'악마의 눈',        desc:'오프라인 EXP +6%',   unlockStage:4, type:'offlineMult', val:0.06 },
  { id:'dk_s05', grade:'S', emoji:'💀', name:'데스 카운터',      desc:'크리 배율 +0.65', unlockStage:5, type:'critMult',   val:0.65 },
  { id:'dk_s06', grade:'S', emoji:'⚔️', name:'어둠 군주의 의지', desc:'전체 EXP ×1.28',  unlockStage:5, type:'allMult',    val:1.28 },
  { id:'dk_s07', grade:'S', emoji:'🐲', name:'지옥용의 분노',    desc:'클릭 EXP ×1.65',  unlockStage:5, type:'clickMult',  val:1.65 },
  { id:'dk_s08', grade:'S', emoji:'🌋', name:'화산 폭발의 힘',   desc:'자동 EXP ×1.72',  unlockStage:6, type:'autoMult',   val:1.72 },
  { id:'dk_s09', grade:'S', emoji:'⚡', name:'암흑 번개 심판',   desc:'크리 배율 +0.80', unlockStage:6, type:'critMult',   val:0.80 },
  // SS등급
  { id:'dk_ss01', grade:'SS', emoji:'💀', name:'절대 해골 왕',   desc:'전체 EXP ×1.40',  unlockStage:4, type:'allMult',   val:1.40 },
  { id:'dk_ss02', grade:'SS', emoji:'🌑', name:'차원 붕괴',      desc:'클릭 EXP ×2.0',   unlockStage:4, type:'clickMult', val:2.0  },
  { id:'dk_ss03', grade:'SS', emoji:'🌀', name:'공허 소용돌이',  desc:'자동 EXP ×2.0',   unlockStage:5, type:'autoMult',  val:2.0  },
  { id:'dk_ss04', grade:'SS', emoji:'👁️', name:'만신의 눈',      desc:'오프라인 EXP +9%',   unlockStage:5, type:'offlineMult',val:0.09 },
  { id:'dk_ss05', grade:'SS', emoji:'⛧',  name:'악마 대왕의 인장',desc:'크리 배율 +1.1', unlockStage:5, type:'critMult',  val:1.1  },
  { id:'dk_ss06', grade:'SS', emoji:'🐉', name:'암흑용의 심장',  desc:'전체 EXP ×1.48',  unlockStage:6, type:'allMult',   val:1.48 },
  { id:'dk_ss07', grade:'SS', emoji:'☄️', name:'저주의 혜성',    desc:'클릭 EXP ×2.2',   unlockStage:6, type:'clickMult', val:2.2  },
  { id:'dk_ss08', grade:'SS', emoji:'🌊', name:'지옥 해일 폭발', desc:'자동 EXP ×2.3',   unlockStage:7, type:'autoMult',  val:2.3  },
  { id:'dk_ss09', grade:'SS', emoji:'💫', name:'운명의 별똥별',  desc:'크리 배율 +1.3',  unlockStage:7, type:'critMult',  val:1.3  },
  // SSS등급
  { id:'dk_sss01', grade:'SSS', emoji:'👑', name:'어둠 군주의 왕관', desc:'전체 EXP ×1.65', unlockStage:6, type:'allMult',   val:1.65 },
  { id:'dk_sss02', grade:'SSS', emoji:'🌑', name:'블랙홀의 심연',    desc:'클릭 EXP ×2.6',  unlockStage:6, type:'clickMult', val:2.6  },
  { id:'dk_sss03', grade:'SSS', emoji:'🌀', name:'공허 차원 균열',   desc:'자동 EXP ×2.8',  unlockStage:7, type:'autoMult',  val:2.8  },
  { id:'dk_sss04', grade:'SSS', emoji:'💀', name:'절대 소멸의 인장', desc:'오프라인 EXP +13%', unlockStage:7, type:'offlineMult',val:0.13 },
  { id:'dk_sss05', grade:'SSS', emoji:'⚡', name:'파멸의 번개폭풍',  desc:'크리 배율 +1.8',  unlockStage:7, type:'critMult',  val:1.8  },
  { id:'dk_sss06', grade:'SSS', emoji:'🐲', name:'암흑 대용의 날개', desc:'전체 EXP ×1.80', unlockStage:8, type:'allMult',   val:1.80 },
  { id:'dk_sss07', grade:'SSS', emoji:'👁️', name:'전지전능의 눈',    desc:'오프라인 EXP +15%', unlockStage:8, type:'offlineMult',val:0.15 },
  // EX등급
  { id:'dk_ex01', grade:'EX', emoji:'💀', name:'차명석의 영혼',        desc:'전체 EXP ×2.5',  unlockStage:7, type:'allMult',   val:2.5  },
  { id:'dk_ex02', grade:'EX', emoji:'🌑', name:'공허의 근원',          desc:'전체 EXP ×3.0',  unlockStage:7, type:'allMult',   val:3.0  },
  { id:'dk_ex03', grade:'EX', emoji:'⛧',  name:'악마왕 강림',          desc:'크리 배율 +3.5',  unlockStage:8, type:'critMult',  val:3.5  },
  { id:'dk_ex04', grade:'EX', emoji:'🐉', name:'암흑 용신의 강림',     desc:'클릭 EXP ×4.0',  unlockStage:8, type:'clickMult', val:4.0  },
  { id:'dk_ex05', grade:'EX', emoji:'👑', name:'절대 어둠의 군주',     desc:'자동 EXP ×4.5',  unlockStage:8, type:'autoMult',  val:4.5  },
];

function cmsLevelViewBack() {
  viewCmsStage = null;
  renderCharacter(); renderEvoInfo(); renderStageBar();
  renderLevelViewer();
}

function cmsIsUnlocked() { return state.stage >= 9; }

function addCmsExp(amount) {
  state.cmsExp += amount;
  if (state.cmsStage >= CMS_STAGES.length - 1) return;
  while (state.cmsStage < CMS_STAGES.length - 1) {
    const nxt = CMS_STAGES[state.cmsStage + 1];
    if (!nxt || state.cmsExp < nxt.expReq) break;
    state.cmsStage++;
    state.cmsGachaPullCount = 0;
    // 레벨업 시 미리보기(레벨 구경) 모드 초기화 - 새 단계 사진이 정상 반영되도록
    viewCmsStage = null;
    showCmsEvoPopup(state.cmsStage);
    recalcCmsMultipliers();
  }
}

function recalcCmsMultipliers() {
  let cm = 1, am = 1, cr = 0.03, crm = 3;
  CMS_UPGRADES.forEach(u => {
    if (!state.cmsUpgrades[u.id]) return;
    if (u.cat === 'cm_click' && u.mult > 1) cm *= u.mult;
    if (u.cat === 'cm_auto'  && u.mult > 1) am *= u.mult;
    if (u.cat === 'cm_crit'  && u.critAdd)  cr += u.critAdd;
    if (u.cat === 'cm_critMult' && u.multAdd) crm += u.multAdd;
  });
  // 차명석 전용 가챠 카드 효과 (2026-07: 크리 확률만 제거 → 오프라인 EXP 배율 추가 / 크리 배율은 유지)
  let cmsGachaAllMult = 1;
  state.cmsOfflineBonus = 0;
  CMS_GACHA_CARDS.forEach(card => {
    if (!state.cmsGachaCards[card.id]) return;
    if (card.type === 'clickMult')  cm  *= card.val;
    else if (card.type === 'autoMult')   am  *= card.val;
    else if (card.type === 'critMult')   crm += card.val;
    else if (card.type === 'offlineMult') state.cmsOfflineBonus += card.val;
    else if (card.type === 'allMult')    cmsGachaAllMult *= card.val;
  });
  cm  *= cmsGachaAllMult;
  am  *= cmsGachaAllMult;
  // 유닛스탯 슬라임 절친 (정아영/차명석 공유 장착, 해방 조건은 정아영 stage 9+ 기준)
  if(state.equippedUnitStat === 'slimeFriend' && state.stage >= 9){
    cr = Math.min(1, cr+0.25);
    crm += 1.5;
  }
  state.cmsClickMult  = cm * state.cmsPrestigeMult;
  state.cmsAutoMult   = am * state.cmsPrestigeMult;
  state.cmsCritChance = Math.min(0.95, cr);
  state.cmsCritMult   = crm;
}

function showCmsEvoPopup(stageIdx) {
  const s = CMS_STAGES[stageIdx];
  showNotification('💀 차명석 진화! → ' + s.name);

  // 데스페라도 해금 알림 (cmsStage 6 = 7레벨 도달 시)
  const desperadoUnlocked = stageIdx === 6;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.88);z-index:9999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:linear-gradient(135deg,#1a0808,#0d0d0d);border:1px solid rgba(204,68,68,.5);border-radius:16px;padding:30px 36px;text-align:center;max-width:340px;width:90%;box-shadow:0 0 40px rgba(204,68,68,.3);">
      <div style="font-size:2rem;margin-bottom:8px;">💀</div>
      <div style="font-family:'Orbitron',monospace;font-size:.65rem;color:#555;letter-spacing:3px;margin-bottom:4px;">진화</div>
      <h2 style="font-family:'Orbitron',monospace;font-size:1.15rem;color:#cc4444;text-shadow:0 0 20px rgba(204,68,68,.7);letter-spacing:3px;margin-bottom:8px;">${s.name.toUpperCase()}</h2>
      <p style="color:#666;font-size:.8rem;margin-bottom:12px;font-style:italic;">${s.desc}</p>
      <div style="display:flex;gap:10px;justify-content:center;margin-bottom:${desperadoUnlocked?'14px':'20px'};">
        <span style="font-family:'Orbitron',monospace;font-size:.65rem;color:#ff6666;background:rgba(255,255,255,.04);padding:4px 10px;border-radius:6px;">⚔️ ${s.atk}</span>
        <span style="font-family:'Orbitron',monospace;font-size:.65rem;color:#66ff66;background:rgba(255,255,255,.04);padding:4px 10px;border-radius:6px;">❤️ ${s.hp}</span>
        <span style="font-family:'Orbitron',monospace;font-size:.65rem;color:#6699ff;background:rgba(255,255,255,.04);padding:4px 10px;border-radius:6px;">💨 ${s.spd}</span>
      </div>
      ${desperadoUnlocked ? `
      <div style="background:rgba(204,68,255,.12);border:1px solid rgba(204,68,255,.5);border-radius:10px;padding:12px 16px;margin-bottom:16px;">
        <div style="font-family:'Orbitron',monospace;font-size:.6rem;color:#cc44ff;letter-spacing:2px;margin-bottom:4px;">🃏 유닛스탯 해금</div>
        <div style="font-size:1.1rem;margin-bottom:4px;">데스페라도</div>
        <div style="color:#aaa;font-size:.72rem;line-height:1.5;">뽑기 확률 대변혁<br><span style="color:#ff8844;">SS 90%</span> · <span style="color:#ff44aa;">SSS 8%</span> · <span style="color:#cc44ff;">EX 2%</span><br><span style="color:#555;font-size:.65rem;">C · B · A · S 등급 완전 소멸</span></div>
      </div>` : ''}
      <button onclick="this.parentElement.parentElement.remove()" style="font-family:'Orbitron',monospace;font-size:.65rem;background:none;border:1px solid #cc4444;color:#cc4444;padding:8px 24px;border-radius:8px;cursor:pointer;letter-spacing:2px;">계속하기 →</button>
    </div>`;
  document.body.appendChild(overlay);
}

function buyCmsUpgrade(u) {
  initAudio();
  if (state.cmsUpgrades[u.id]) { showNotification('이미 구매한 업그레이드입니다!'); return; }
  if (state.cmsExp < u.cost)  { showNotification('💀 EXP가 부족합니다!'); return; }
  state.cmsExp -= u.cost;
  state.cmsUpgrades[u.id] = true;
  recalcCmsMultipliers();
  recalcMultipliers();
  renderCmsPanel();
  renderUpgrades();
  renderHeader();
  saveGame();
  showNotification('💀 ' + u.name + ' 구매 완료!');
}

function renderCmsPanel() {
  const locked   = document.getElementById('cms-locked-msg');
  const unlocked = document.getElementById('cms-unlocked-content');
  if (!cmsIsUnlocked()) {
    locked.style.display   = '';
    unlocked.style.display = 'none';
    return;
  }
  locked.style.display   = 'none';
  unlocked.style.display = '';

  const s    = CMS_STAGES[state.cmsStage];
  const nextS= CMS_STAGES[state.cmsStage + 1];

  document.getElementById('cms-stage-name').textContent  = s.name.toUpperCase();
  document.getElementById('cms-stage-label').textContent = 'STAGE ' + (state.cmsStage+1) + ' / ' + CMS_STAGES.length;
  document.getElementById('cms-stage-desc').textContent  = s.desc;
  document.getElementById('cms-atk').textContent = s.atk;
  document.getElementById('cms-hp').textContent  = s.hp;
  document.getElementById('cms-spd').textContent = s.spd;

  // EXP 바
  if (nextS) {
    const pct = Math.min(100, ((state.cmsExp - s.expReq) / (nextS.expReq - s.expReq)) * 100);
    document.getElementById('cms-exp-bar').style.width = pct + '%';
    document.getElementById('cms-exp-text').textContent = formatNum(state.cmsExp - s.expReq) + ' / ' + formatNum(nextS.expReq - s.expReq) + ' EXP';
  } else {
    document.getElementById('cms-exp-bar').style.width = '100%';
    document.getElementById('cms-exp-text').textContent = '✅ 최종 단계 달성!';
  }

  // 배율 표시
  document.getElementById('cms-click-mult').textContent = 'x' + state.cmsClickMult.toFixed(1);
  document.getElementById('cms-auto-mult').textContent  = 'x' + state.cmsAutoMult.toFixed(1);

  // 업그레이드 목록
  const container = document.getElementById('cms-upgrades-list');
  container.innerHTML = '';

  const cats = ['cm_click','cm_auto','cm_crit','cm_critMult'];
  const catNames = { cm_click:'클릭 배율', cm_auto:'자동화', cm_crit:'크리 확률', cm_critMult:'크리 배율' };
  cats.forEach(cat => {
    const activeU = cmsGetActiveUpgrades(state.cmsUpgrades).find(u => u.cat === cat);
    const chainItems = CMS_UPGRADES.filter(u => u.cat === cat);
    if (activeU) {
      const canAfford = state.cmsExp >= activeU.cost;
      const isLocked  = state.cmsStage < (activeU.unlockStage || 0);
      const doneCount = chainItems.filter(u => state.cmsUpgrades[u.id]).length;
      const btn = document.createElement('button');
      btn.className = 'cms-upgrade-btn' + (canAfford && !isLocked ? ' affordable' : '') + (isLocked ? ' locked' : '');
      if(isLocked) {
        btn.disabled = true;
        btn.innerHTML = '<div class="upgrade-name">🔒 ' + catNames[cat] + ' <span class="upgrade-badge">' + (doneCount+1) + '/' + chainItems.length + '</span></div>'
          + '<div class="upgrade-desc" style="color:#444;">차명석 STAGE ' + (activeU.unlockStage+1) + ' 달성 필요</div>';
      } else {
        btn.innerHTML = '<div class="upgrade-name">' + activeU.name + ' <span class="upgrade-badge">' + (doneCount+1) + '/' + chainItems.length + '</span></div>'
          + '<div class="upgrade-desc">' + activeU.desc + '</div>'
          + '<div class="upgrade-cost">💀 ' + formatNum(activeU.cost) + '</div>'
          + '<div class="upgrade-effect">' + activeU.effectStr + '</div>';
        btn.addEventListener('click', () => buyCmsUpgrade(activeU));
      }
      container.appendChild(btn);
    } else if (chainItems.every(u => state.cmsUpgrades[u.id])) {
      const div = document.createElement('div');
      div.className = 'cms-upgrade-btn purchased';
      div.innerHTML = '<div class="upgrade-name">' + catNames[cat] + ' <span class="upgrade-badge done">완료 ✓</span></div><div class="upgrade-desc">모든 단계 완료!</div>';
      container.appendChild(div);
    }
  });

}