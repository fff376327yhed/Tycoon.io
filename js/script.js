// ═══════════════════════════════════════════════════
// script.js — 공통 코어
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
// GAME DATA
// ═══════════════════════════════════════════════════



// ── 일꾼 업그레이드 체인 (각 일꾼마다 3단계 강화 + 최저시급) ──────────────
// wUpgMult: 해당 일꾼 aps 배율 증가


let state = {
  currentRegion: '제단',
  totalExp: 0,
  totalClicks: 0,
  evoCount: 0,
  stage: 0,
  clickMult: 1,
  critChance: 0.03,
  critMult: 3,
  autoMult: 1,
  workers: {},
  upgrades: {},
  prestigeMult: 1,
  prestigeCount: 0,
  cmsPrestigeMult: 1,
  cmsPrestigeCount: 0,
  battleClears: {},
  // 유닛스탯: 정아영/차명석 공유, 하나만 장착 가능 (상시 장착, 언제든 교체 가능)
  equippedUnitStat: null,
  workerPaused: false,
  gachaCards: {},    // id: true (보유 카드)
  gachaShards: {},   // grade: count (파편 수)
  desperadoShards: {},   // 데스페라도 장착 중 획득 파편 (합성 불가 별도 보관)
  items: {},         // id: count (보유 아이템 수량)
  gachaPullCount: 0, // 현재 스테이지 내 뽑기 횟수 (스테이지 진화 시 리셋)
  // 차명석
  cmsStage: 0,
  cmsExp: 0,
  cmsUpgrades: {},
  cmsClickMult: 1,
  cmsAutoMult: 1,
  cmsWorkers: {},    // 차명석 전용 일꾼 고용 수
  cmsCritChance: 0.03,
  cmsCritMult: 3,
  cmsTotalClicks: 0,
  // 차명석 전용 뽑기 (정아영과 완전 분리)
  cmsGachaCards: {},    // id: true
  cmsGachaShards: {},   // grade: count
  cmsDesperadoShards: {},   // 데스페라도 장착 중 차명석 획득 파편 (합성 불가 별도 보관)
  cmsGachaPullCount: 0, // 차명석 스테이지 내 뽑기 횟수
  // 은행원 조디 (환전소)
  bankerExchangeDate: '',  // 마지막 환전 날짜 (자정 기준 초기화)
  bankerExchangeCount: 0,  // 오늘 환전 횟수
  // 마녀 테크 (가마솥 클릭으로 적립하는 별도 경제)
  witchExp: 0,
  witchTotalClicks: 0,
  witchTechLevels: {},
  witchHand: [],           // 핸드 아이템 배열 [{itemId, region, zoneIdx}]
  witchCollected: {},      // 수집 완료된 아이템 키: "region_zoneIdx"
};

// 현재 활성 탭 ('jsy' 또는 'cms')
let activeTab = 'jsy';

// 이전 단계 미리보기 (저장 안 함, null이면 현재 단계 표시)
let viewStage = null;
let viewCmsStage = null;

// 특수 효과 런타임 상태 (저장 안 함)
let specialEffect = {
  active: false,
  clickBonus: 0,      // 클릭당 추가 EXP
  critChanceBonus: 0, // 크리 확률 임시 증가
  autoMultBonus: 1,   // 자동 배율 임시 증가
  timer: null,
  remaining: 0,
};

// ═══════════════════════════════════════════════════
// AUDIO
// ═══════════════════════════════════════════════════

let audioCtx = null, musicOn = false, sfxOn = true;
let shakeEnabled = false; // 화면 흔들림 기본 꺼짐
let bgmInterval = null, lastBgmStage = -1, bgmBeatIdx = 0, bgmBassIdx = 0;
let bgmUserTurnedOff = false;  // 사용자가 BGM을 수동으로 껐을 때 클릭으로 자동 재시작 방지

// 마녀 테크 전용 사운드 상태 (정아영/차명석 SFX·BGM과 완전히 분리된 별도 시스템)
// 마녀 테크 입장 시 기본적으로 SFX/BGM 모두 켜진 상태로 시작한다.
// 마녀 스탯
const WITCH_STAT_MAX_HP = 300;
const WITCH_STAT_MAX_AP = 1000;
let witchHp = 300;
let witchAp = 1000;
let witchApAccum = 0;
let witchApTickAccum = 0;
let witchHpTickAccum = 0; // 회복 물약 Lv3 HP 자동 회복 누적용

function getWitchPotionLevels() {
  if (!state.witchPotionLevels) state.witchPotionLevels = {};
  return state.witchPotionLevels;
}

// 체력 물약: 최대 HP
function getWitchMaxHp() {
  const ov = state.witchAdminOverride || {};
  if (ov.maxHp !== undefined) return ov.maxHp;
  const lv = getWitchPotionLevels().hp || 0;
  return 300 + [0, 500, 550, 650][lv];
}

// 회복 물약: AP 회복 { interval(초), amount }
function getWitchApRecovery() {
  const ov = state.witchAdminOverride || {};
  const lv = getWitchPotionLevels().recover || 0;
  const base = [
    { interval: 1.0, amount: 50 },
    { interval: 0.7, amount: 50 },
    { interval: 0.5, amount: 70 },
    { interval: 0.3, amount: 100 },
  ][lv];
  return {
    interval: ov.apInterval !== undefined ? ov.apInterval : base.interval,
    amount:   ov.apAmount  !== undefined ? ov.apAmount  : base.amount,
  };
}

// 힘의 물약: 공격 배율
function getWitchAttackMult() {
  const lv = getWitchPotionLevels().power || 0;
  return [1.0, 1.25, 1.60, 1.85][lv];
}

// 성장의 물약: duration 단축 계산
// 반환: { reducedDuration(초), reducedCost(AP) }
function applyWitchGrowth(baseCost, baseDuration) {
  const lv = getWitchPotionLevels().growth || 0;
  let cost = baseCost;
  let dur = baseDuration;
  if (lv === 0) return { cost, dur };

  if (lv >= 3) {
    // Lv3: AP소모 -50(최소100), 행동력 5마다 0.1초(최소1초)
    cost = Math.max(100, baseCost - 50);
    const effectiveCost = baseCost <= 100 ? baseCost : cost; // 원래값 그대로
    dur = Math.max(1, effectiveCost / 5 * 0.1);
    return { cost, dur };
  }
  if (lv === 2) {
    // Lv2: 행동력 25마다 0.25초 단축(최소3초, 단 원래 duration이 3초 이하면 원래값)
    const reduction = Math.floor(baseCost / 25) * 0.25;
    const reduced = baseDuration - reduction;
    dur = reduced < 3 ? (baseDuration <= 3 ? baseDuration : 3) : reduced;
    return { cost, dur };
  }
  if (lv === 1) {
    // Lv1: 행동력 50마다 0.5초 단축
    const reduction = Math.floor(baseCost / 50) * 0.5;
    dur = Math.max(1, baseDuration - reduction);
    return { cost, dur };
  }
  return { cost, dur };
}

// 마녀 행동 진행 상태 (이동/휴식/방어/공격 공통, 한 번에 하나만 진행 가능)
let witchActionState = null;
// { type: '이동'|'휴식'|'방어'|'공격', elapsed, duration, data }

// 방어 완료 시 부여되는 피해감소 버프 (다음 피격 1회에 적용 후 소멸)
let witchDefenseBuffActive = false;

// 공격 대상 (조사/몬스터 시스템 제작 전까지는 항상 null → 공격 행동 불가)
let witchAttackTarget = null;

// 이동 행동력 비용 테이블
const REGION_MOVE_COST = {
  '오두막_산': 200,   '산_오두막': 200,
  '오두막_간석지': 500, '간석지_오두막': 500,
  '오두막_폐가': 350, '폐가_오두막': 350,
  '산_케이블카': 850, '케이블카_산': 850,
  '폐가_동굴': 400,   '동굴_폐가': 400,
  '간석지_공사장': 500, '공사장_간석지': 500,
  '공사장_케이블카': 300, '케이블카_공사장': 300,
  '공사장_제단': 350, '제단_공사장': 350,
  '제단_해변': 400,   '해변_제단': 400,
  '해변_공사장': 350, '공사장_해변': 350,
};

function getMoveCost(from, to) {
  return REGION_MOVE_COST[from + '_' + to] || REGION_MOVE_COST[to + '_' + from] || 0;
}

function renderWitchStats() {
  const hpBar  = document.getElementById('witch-hp-bar');
  const hpText = document.getElementById('witch-hp-text');
  const apBar  = document.getElementById('witch-ap-bar');
  const apText = document.getElementById('witch-ap-text');
  const maxHp = getWitchMaxHp();
  if (hpBar)  hpBar.style.width  = (witchHp / maxHp * 100) + '%';
  if (hpText) hpText.textContent = witchHp + '/' + maxHp;
  if (apBar)  apBar.style.width  = (witchAp / WITCH_STAT_MAX_AP * 100) + '%';
  if (apText) apText.textContent = witchAp + '/' + WITCH_STAT_MAX_AP;
}

// 마녀 테크 전용 사운드 상태 (정아영/차명석 SFX·BGM과 완전히 분리된 별도 시스템)
let witchSfxOn = true, witchMusicOn = true;
let witchBgmInterval = null, witchBgmBeatIdx = 0, witchBgmBassIdx = 0;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playClick(isCrit) {
  if (!audioCtx || !sfxOn) return;
  const s = state.stage;
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  if (isCrit) {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880+s*60, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1800+s*80, audioCtx.currentTime+0.12);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+0.2);
    osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime+0.2);
  } else {
    const freqs = [330,360,400,440,490,540,600,660,720,790,860,930,1000];
    const f = freqs[Math.min(s, freqs.length-1)];
    osc.type = s<4?'sine':s<8?'triangle':'square';
    osc.frequency.setValueAtTime(f, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(f*0.65, audioCtx.currentTime+0.1);
    gain.gain.setValueAtTime(0.09, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+0.12);
    osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime+0.12);
  }
}

// 차명석 클릭 효과음 (헤비/다크 톤, cmsStage 기반)
function playClickCms(isCrit) {
  if (!audioCtx || !sfxOn) return;
  const s = state.cmsStage;
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  if (isCrit) {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220 + s*30, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440 + s*40, audioCtx.currentTime+0.15);
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+0.25);
    osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime+0.25);
  } else {
    const freqs = [110,120,130,140,150,165,180,196,210,220,240,260,280];
    const f = freqs[Math.min(s, freqs.length-1)];
    osc.type = s<4?'square':s<8?'sawtooth':'sawtooth';
    osc.frequency.setValueAtTime(f*2, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(f, audioCtx.currentTime+0.12);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+0.15);
    osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime+0.15);
  }
}

// 마녀 테크 전용 클릭 효과음 (정아영/차명석 사운드와 분리, 신비로운 종소리 톤)
function playWitchClick(isCrit) {
  if (!audioCtx || !witchSfxOn) return;
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  if (isCrit) {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(660, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime+0.18);
    gain.gain.setValueAtTime(0.16, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+0.3);
    osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime+0.3);
  } else {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(780, audioCtx.currentTime+0.1);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+0.16);
    osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime+0.16);
  }
}

function playBuy() {
  if (!audioCtx || !sfxOn) return;
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(500, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime+0.1);
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+0.14);
  osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime+0.14);
}

function playEvo() {
  if (!audioCtx || !sfxOn) return;
  const notes = [523,659,784,1047,1319];
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
    osc.connect(g); g.connect(audioCtx.destination);
    osc.type = 'triangle'; osc.frequency.value = freq;
    const t = audioCtx.currentTime + i*0.1;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.18,t+0.04);
    g.gain.exponentialRampToValueAtTime(0.001,t+0.5);
    osc.start(t); osc.stop(t+0.5);
  });
}

const BGM_CONFIGS = [
  { tempo:300, melody:[261,294,329,349,392,349,329,294], bass:[130,164], type:'sine' },
  { tempo:240, melody:[294,330,370,392,440,392,370,330], bass:[147,185], type:'triangle' },
  { tempo:190, melody:[330,392,440,523,587,523,440,392], bass:[165,220], type:'triangle' },
  { tempo:150, melody:[392,440,523,587,659,587,523,440], bass:[196,246], type:'square' },
  { tempo:120, melody:[440,523,587,659,784,659,587,523], bass:[220,277], type:'square' },
  { tempo:100, melody:[523,622,698,784,932,784,698,622], bass:[261,329], type:'sawtooth' },
];
// 차명석 BGM: 다크/헤비 톤, 낮은 음역
const CMS_BGM_CONFIGS = [
  { tempo:320, melody:[110,130,110,98,110,130,147,130],  bass:[55,73],  type:'sawtooth' },
  { tempo:260, melody:[130,147,165,147,130,110,130,147], bass:[65,82],  type:'sawtooth' },
  { tempo:200, melody:[147,165,175,196,175,165,147,165], bass:[73,98],  type:'square' },
  { tempo:160, melody:[165,196,220,196,175,165,196,220], bass:[82,110], type:'square' },
  { tempo:130, melody:[196,220,247,220,196,175,220,247], bass:[98,130], type:'sawtooth' },
  { tempo:105, melody:[220,247,277,247,220,196,247,277], bass:[110,147],'type':'sawtooth' },
];
function getBgmConfig() {
  const s=state.stage;
  if(s<=2)return BGM_CONFIGS[0]; if(s<=4)return BGM_CONFIGS[1];
  if(s<=6)return BGM_CONFIGS[2]; if(s<=8)return BGM_CONFIGS[3];
  if(s<=10)return BGM_CONFIGS[4]; return BGM_CONFIGS[5];
}
function getCmsBgmConfig() {
  const s=state.cmsStage||0;
  if(s<=2)return CMS_BGM_CONFIGS[0]; if(s<=4)return CMS_BGM_CONFIGS[1];
  if(s<=6)return CMS_BGM_CONFIGS[2]; if(s<=8)return CMS_BGM_CONFIGS[3];
  if(s<=10)return CMS_BGM_CONFIGS[4]; return CMS_BGM_CONFIGS[5];
}
function startBGM() {
  if(!audioCtx||bgmInterval)return;
  lastBgmStage=state.stage;
  const cfg=getBgmConfig();
  bgmInterval=setInterval(()=>{
    if(!audioCtx)return;
    const c=getBgmConfig();
    const mo=audioCtx.createOscillator(),mg=audioCtx.createGain();
    mo.connect(mg);mg.connect(audioCtx.destination);
    mo.type=c.type; mo.frequency.value=c.melody[bgmBeatIdx%c.melody.length];
    mg.gain.setValueAtTime(0.03,audioCtx.currentTime);
    mg.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.18);
    mo.start(audioCtx.currentTime);mo.stop(audioCtx.currentTime+0.18);
    bgmBeatIdx++;
    if(bgmBeatIdx%2===0){
      const bo=audioCtx.createOscillator(),bg=audioCtx.createGain();
      bo.connect(bg);bg.connect(audioCtx.destination);
      bo.type='sine';bo.frequency.value=c.bass[bgmBassIdx%c.bass.length];
      bg.gain.setValueAtTime(0.05,audioCtx.currentTime);
      bg.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.28);
      bo.start(audioCtx.currentTime);bo.stop(audioCtx.currentTime+0.28);
      bgmBassIdx++;
    }
    if(lastBgmStage!==state.stage){lastBgmStage=state.stage;stopBGM();if(musicOn)startBGM();}
  }, cfg.tempo);
}
function startCmsBGM() {
  if(!audioCtx||bgmInterval)return;
  lastBgmStage=state.cmsStage||0;
  const cfg=getCmsBgmConfig();
  bgmInterval=setInterval(()=>{
    if(!audioCtx)return;
    const c=getCmsBgmConfig();
    const mo=audioCtx.createOscillator(),mg=audioCtx.createGain();
    mo.connect(mg);mg.connect(audioCtx.destination);
    mo.type=c.type; mo.frequency.value=c.melody[bgmBeatIdx%c.melody.length];
    mg.gain.setValueAtTime(0.04,audioCtx.currentTime);
    mg.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.22);
    mo.start(audioCtx.currentTime);mo.stop(audioCtx.currentTime+0.22);
    bgmBeatIdx++;
    if(bgmBeatIdx%2===0){
      const bo=audioCtx.createOscillator(),bg=audioCtx.createGain();
      bo.connect(bg);bg.connect(audioCtx.destination);
      bo.type='sawtooth';bo.frequency.value=c.bass[bgmBassIdx%c.bass.length];
      bg.gain.setValueAtTime(0.07,audioCtx.currentTime);
      bg.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.32);
      bo.start(audioCtx.currentTime);bo.stop(audioCtx.currentTime+0.32);
      bgmBassIdx++;
    }
    const curStage=state.cmsStage||0;
    if(lastBgmStage!==curStage){lastBgmStage=curStage;stopBGM();if(musicOn)startCmsBGM();}
  }, cfg.tempo);
}
// 탭에 맞는 BGM 시작
function startBgmForTab() {
  stopBGM();
  if(!musicOn) return;
  if(activeTab==='cms' && cmsIsUnlocked()) startCmsBGM();
  else startBGM();
}
function stopBGM(){if(bgmInterval){clearInterval(bgmInterval);bgmInterval=null;}}

// 마녀 테크 전용 BGM (정아영/차명석 BGM과 완전히 분리된 별도 오디오, 마녀 모달이 열려있을 때만 재생)
let witchBgmAudio = null;
function startWitchBGM() {
  if(!witchBgmAudio){
    witchBgmAudio = new Audio('MP3/1.mp3');
    witchBgmAudio.loop = true;
    witchBgmAudio.volume = 0.5;
  }
  witchBgmAudio.play().catch(()=>{});
}
function stopWitchBGM(resetPosition = false){
  if(witchBgmAudio){
    witchBgmAudio.pause();
    if(resetPosition) witchBgmAudio.currentTime = 0;
  }
}

function toggleWitchSfx() {
  witchSfxOn = !witchSfxOn;
  const btn = document.getElementById('witch-sfx-btn');
  if (witchSfxOn) { btn.textContent='🔊 SFX'; btn.classList.add('on'); initAudio(); playWitchClick(false); }
  else { btn.textContent='🔇 SFX'; btn.classList.remove('on'); }
}
function toggleWitchBgm() {
  witchMusicOn = !witchMusicOn;
  const btn = document.getElementById('witch-bgm-btn');
  if (witchMusicOn) {
    btn.textContent='♫ BGM ON'; btn.classList.add('on');
    initAudio(); startWitchBGM(); // 멈춘 위치부터 자동 재개 (stopWitchBGM이 pause만 했으므로)
  } else {
    btn.textContent='♪ BGM'; btn.classList.remove('on');
    stopWitchBGM(false); // 위치 유지하며 pause (다시 켤 때 멈춘 곳부터 재개)
  }
  saveGame(); // 마녀 BGM on/off 즉시 저장
}

// 특수 발동 신나는 BGM (짧은 팡파레 느낌)
let specialBgmInterval = null;
function startSpecialBGM(color) {
  if(!audioCtx || !sfxOn) return;
  stopSpecialBGM();
  const melodies = {
    '#39ff14': [523,659,784,1047,784,659,523,659],
    '#00ffcc': [587,698,880,1047,880,698,587,698],
    '#44aaff': [523,622,784,932,784,622,523,622],
    '#ffdd00': [659,784,988,1175,988,784,659,784],
    '#aa44ff': [523,659,830,988,830,659,523,659],
    '#ff88ff': [587,740,932,1109,932,740,587,740],
    '#ff6644': [622,784,988,1175,988,784,622,784],
    '#ffd700': [659,830,1047,1245,1047,830,659,830],
  };
  const mel = melodies[color] || melodies['#39ff14'];
  let beatIdx = 0;
  specialBgmInterval = setInterval(()=>{
    if(!audioCtx) return;
    const mo = audioCtx.createOscillator(), mg = audioCtx.createGain();
    mo.connect(mg); mg.connect(audioCtx.destination);
    mo.type = 'triangle';
    mo.frequency.value = mel[beatIdx % mel.length];
    mg.gain.setValueAtTime(0.06, audioCtx.currentTime);
    mg.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+0.15);
    mo.start(audioCtx.currentTime); mo.stop(audioCtx.currentTime+0.15);
    beatIdx++;
  }, 120);
}
function stopSpecialBGM() {
  if(specialBgmInterval){ clearInterval(specialBgmInterval); specialBgmInterval=null; }
}

function playSpecialActivate(color) {
  if(!audioCtx || !sfxOn) return;
  // 팡파레 효과음
  const fanfare = [523,659,784,1047,1319];
  fanfare.forEach((freq, i)=>{
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.type = 'square'; o.frequency.value = freq;
    const t = audioCtx.currentTime + i*0.07;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.12,t+0.03);
    g.gain.exponentialRampToValueAtTime(0.001,t+0.3);
    o.start(t); o.stop(t+0.3);
  });
}

// ═══════════════════════════════════════════════════
// STARFIELD
// ═══════════════════════════════════════════════════

function initStarfield() {
  const canvas=document.getElementById('starfield');
  const ctx=canvas.getContext('2d');
  canvas.width=window.innerWidth; canvas.height=window.innerHeight;
  const stars=[];
  for(let i=0;i<180;i++) stars.push({x:Math.random()*canvas.width,y:Math.random()*canvas.height,r:Math.random()*1.5+0.2,opacity:Math.random()});
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    stars.forEach(s=>{
      s.opacity+=(Math.random()-0.5)*0.03;
      s.opacity=Math.max(0.05,Math.min(1,s.opacity));
      ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(200,255,200,${s.opacity})`;ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener('resize',()=>{canvas.width=window.innerWidth;canvas.height=window.innerHeight;});
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

function formatNum(n) {
  n = Number(n) || 0;
  if (n < 1000) return (Math.floor(n*100)/100).toString();
  const units = ['K','M','B','T','Qa','Qi','Sx','Sp','Oc','No'];
  let tier = Math.floor(Math.log10(n) / 3);
  let val = n / Math.pow(1000, tier);
  if (val >= 1000) { tier++; val = n / Math.pow(1000, tier); } // 경계값 부동소수점 보정

  if (tier <= units.length) {
    return val.toFixed(2) + units[tier - 1];
  }
  // No 단위를 넘어서면 잘리지 않도록 새 영문 표기로 이어서 확장
  const extra = tier - units.length - 1; // No 바로 다음이 0 → 'a'
  return val.toFixed(2) + letterTier(extra);
}

// No 단위 다음부터 쓰는 확장 표기: a~z → a+~z+ → aa+, ab+, ... 무한 확장
function letterTier(i) {
  if (i < 26) return String.fromCharCode(97 + i);          // a ~ z
  i -= 26;
  if (i < 26) return String.fromCharCode(97 + i) + '+';    // a+ ~ z+
  i -= 26;
  const first = Math.floor(i / 26), second = i % 26;
  return String.fromCharCode(97 + first) + String.fromCharCode(97 + second) + '+'; // aa+, ab+ ...
}

function numToLetterTier(n) {
   let idx = Math.floor(Math.log10(n)/3) - 6;
   let div = Math.pow(10, (idx+6)*3);
   let val = n/div;
   if(val>=1000){ idx++; div=Math.pow(10,(idx+6)*3); val=n/div; }
   let k=idx+1, s='';
   while(k>0){ k--; s=String.fromCharCode(65+(k%26))+s; k=Math.floor(k/26); }
   return val.toFixed(2)+s;
}

function getWorkerCost(w) {
  return w.baseCost; // 1명 제한이므로 고정 가격
}

// 일꾼 특수 효과 발동 (0.1% 확률 - 자동 틱마다 체크)
function tryWorkerSpecial() {
  if(specialEffect.active) return;
  // 마녀 테크 화면에서는 정아영/차명석 일꾼 특수발동 효과음·BGM이 들리지 않도록 차단
  const witchModalEl = document.getElementById('witch-modal');
  if (witchModalEl && witchModalEl.classList.contains('active')) return;
  if (activeTab === 'cms') {
    const hired = CMS_WORKERS.filter(w => (state.cmsWorkers[w.id]||0) > 0);
    if(hired.length === 0) return;
    if(Math.random() >= 0.001) return; // 0.1% 확률
    const w = hired[Math.floor(Math.random() * hired.length)];
    triggerWorkerSpecial(w);
    return;
  }
  const hired = WORKERS.filter(w => (state.workers[w.id]||0) > 0);
  if(hired.length === 0) return;
  if(Math.random() >= 0.001) return; // 0.1% 확률

  const w = hired[Math.floor(Math.random() * hired.length)];
  triggerWorkerSpecial(w);
}

function triggerWorkerSpecial(w) {
  if(!w.special) return;
  const sp = w.special;
  specialEffect.active = true;
  specialEffect.clickBonus = sp.buffType === 'clickBonus' ? sp.buffValue : 0;
  specialEffect.critChanceBonus = sp.buffType === 'critChance' ? sp.buffValue : 0;
  specialEffect.autoMultBonus = sp.buffType === 'autoMult' ? sp.buffValue : 1;
  specialEffect.remaining = sp.duration;

  // 배너 표시
  const banner = document.getElementById('worker-special-banner');
  document.getElementById('special-banner-title').textContent = `${sp.emoji} ${w.name} 특수 발동!`;
  document.getElementById('special-banner-desc').textContent = sp.desc;
  banner.classList.add('active');

  // 배경 오버레이 + SVG 응원 그림
  showWorkerSpecialOverlay(w, sp.color);

  // 신나는 BGM
  initAudio();
  playSpecialActivate(sp.color);
  if(musicOn) { stopBGM(); startSpecialBGM(sp.color); }
  else startSpecialBGM(sp.color);

  // 타이머
  if(specialEffect.timer) clearInterval(specialEffect.timer);
  let elapsed = 0;
  const tick = 100;
  specialEffect.timer = setInterval(()=>{
    elapsed += tick;
    specialEffect.remaining = sp.duration - elapsed;
    const sec = (specialEffect.remaining / 1000).toFixed(1);
    document.getElementById('special-banner-timer').textContent = `⏱ ${sec}s 남음`;
    if(elapsed >= sp.duration) {
      clearInterval(specialEffect.timer);
      specialEffect.active = false;
      specialEffect.clickBonus = 0;
      specialEffect.critChanceBonus = 0;
      specialEffect.autoMultBonus = 1;
      banner.classList.remove('active');
      hideWorkerSpecialOverlay();
      stopSpecialBGM();
      if(musicOn) startBgmForTab();
    }
  }, tick);
}

function showWorkerSpecialOverlay(w, color) {
  const overlay = document.getElementById('worker-special-overlay');
  // SVG 응원 그림 생성 (일꾼 이름에 맞게 다른 파티클 패턴)
  const W = window.innerWidth, H = window.innerHeight;
  const shapes = [];
  const count = 18;
  for(let i = 0; i < count; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const sz = 10 + Math.random() * 30;
    const dur = 1.5 + Math.random() * 2;
    const delay = Math.random() * 1.5;
    const emojis = getWorkerEmojis(w.id);
    shapes.push(`<text x="${x}" y="${y}" font-size="${sz}" opacity="0" fill="${color}"
      style="animation:svgFloat ${dur}s ${delay}s ease-in-out infinite alternate">${emojis[i%emojis.length]}</text>`);
  }
  // 테두리 글로우 효과
  overlay.innerHTML = `
    <style>
      @keyframes svgFloat { from{opacity:0;transform:translateY(0)} to{opacity:0.7;transform:translateY(-30px)} }
      @keyframes borderPulse { 0%,100%{opacity:.3} 50%{opacity:.8} }
    </style>
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs>
        <filter id="glow2"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect x="3" y="3" width="${W-6}" height="${H-6}" fill="none"
        stroke="${color}" stroke-width="3" rx="8" opacity="0.4"
        style="animation:borderPulse 0.8s ease-in-out infinite"/>
      <g filter="url(#glow2)">${shapes.join('')}</g>
    </svg>`;
  overlay.classList.add('active');
}

function getWorkerEmojis(wid) {
  const map = {
    w1: ['🐛','💚','✨','🌿','💫'],
    w2: ['👽','🛸','⭐','💜','✨'],
    w3: ['🛸','🌟','💙','⚡','✨'],
    w4: ['⚡','💛','🌟','✨','🔥'],
    w5: ['🌌','⭐','💜','✨','🌟'],
    w6: ['💎','💗','✨','🌟','💫'],
    w7: ['🚀','🔥','⭐','✨','💥'],
    w8: ['👑','🌟','✨','💛','🎉'],
    cw1: ['💀','🩸','✨','🖤','💫'],
    cw2: ['🗡️','💀','⚔️','🩸','✨'],
    cw3: ['🔥','💀','🌑','✨','💥'],
    cw4: ['⚡','🟣','💀','✨','🔥'],
    cw5: ['🌑','💀','✨','🌌','💜'],
    cw6: ['💎','🌑','✨','💀','🌟'],
    cw7: ['🚀','🔥','💀','✨','💥'],
    cw8: ['👑','💀','🔥','✨','🎉'],
  };
  return map[wid] || ['✨','⭐','💫'];
}

function hideWorkerSpecialOverlay() {
  const overlay = document.getElementById('worker-special-overlay');
  overlay.classList.remove('active');
  setTimeout(()=>{ overlay.innerHTML=''; }, 500);
}

function getClickExpPerClick() {
  return Math.max(1, Math.floor(state.clickMult * state.prestigeMult));
}

function getWorkerAps(w) {
  const cnt = state.workers[w.id]||0;
  if(cnt===0) return 0;
  // 해당 일꾼의 구매된 업그레이드 중 가장 높은 배율 적용
  const wUpgs = WORKER_UPGRADES.filter(u=>u.wid===w.id && u.wUpgMult && state.upgrades[u.id]);
  const mult = wUpgs.length > 0 ? Math.max(...wUpgs.map(u=>u.wUpgMult)) : 1;
  return w.aps * cnt * mult;
}

function getAutoEpsTotal() {
  if(state.workerPaused) return 0;
  let total=0;
  WORKERS.forEach(w=>{total+=getWorkerAps(w);});
  return total * state.autoMult * state.prestigeMult * specialEffect.autoMultBonus;
}

// ═══════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════

function getCharStats() {
  return STAGE_STATS[state.stage] || STAGE_STATS[0];
}

function renderStats() {
  // 차명석 탭: 차명석 스탯 표시
  if (activeTab === 'cms' && cmsIsUnlocked()) {
    const cs = CMS_STAGES[state.cmsStage];
    document.getElementById('stat-atk').textContent = cs.atk;
    document.getElementById('stat-atk').style.color = '#ff6666';
    document.getElementById('stat-hp').textContent = cs.hp;
    document.getElementById('stat-hp').style.color = '#66ff99';
    document.getElementById('stat-spd').textContent = cs.spd;
    document.getElementById('stat-spd').style.color = '#6699ff';
    // 차명석 탭에서도 유닛스탯 해금 여부 반영
    const uniEl = document.getElementById('stat-uni');
    const anyUnlocked = UNIT_STATS.some(us => {
      const sok  = us.unlockStage    === null || state.stage    >= us.unlockStage;
      const csok = us.unlockCmsStage === null || state.cmsStage >= us.unlockCmsStage;
      return sok && csok;
    });
    if (anyUnlocked) {
      const equipped = UNIT_STATS.find(us => us.id === state.equippedUnitStat);
      uniEl.textContent = equipped ? equipped.name : '미장착';
      uniEl.style.fontSize = '0.62rem';
      uniEl.style.color = equipped ? 'var(--purple)' : '#555';
      uniEl.style.textShadow = equipped ? '0 0 6px var(--purple)' : 'none';
      document.getElementById('slime-friend-area').style.display = 'inline-block';
      document.getElementById('open-unit-stat-btn').style.display = 'inline-block';
    } else {
      uniEl.textContent = '—';
      uniEl.style.fontSize = '';
      uniEl.style.color = '#555';
      uniEl.style.textShadow = 'none';
      document.getElementById('slime-friend-area').style.display = 'none';
      document.getElementById('open-unit-stat-btn').style.display = 'none';
    }
    return;
  }

  // 정아영 스탯 복구
  document.getElementById('stat-atk').style.color = '';
  document.getElementById('stat-hp').style.color = '';
  document.getElementById('stat-spd').style.color = '';

  const s = getCharStats();
  document.getElementById('stat-atk').textContent = s.atk;
  document.getElementById('stat-hp').textContent = s.hp;
  document.getElementById('stat-spd').textContent = s.spd;

  // 유닛스탯 표시: 하나라도 해금된 유닛스탯이 있으면 장착된 것 / 없으면 '—'
  const uniEl = document.getElementById('stat-uni');
  const anyUnlocked = UNIT_STATS.some(us => {
    const sok  = us.unlockStage    === null || state.stage    >= us.unlockStage;
    const csok = us.unlockCmsStage === null || state.cmsStage >= us.unlockCmsStage;
    return sok && csok;
  });
  if(anyUnlocked) {
    const equipped = UNIT_STATS.find(us => us.id === state.equippedUnitStat);
    uniEl.textContent = equipped ? equipped.name : '미장착';
    uniEl.style.fontSize = '0.62rem';
    uniEl.style.color = equipped ? 'var(--purple)' : '#555';
    uniEl.style.textShadow = equipped ? '0 0 6px var(--purple)' : 'none';
  } else {
    uniEl.textContent = '—';
    uniEl.style.fontSize = '';
    uniEl.style.color = '';
    uniEl.style.textShadow = '';
  }

  // 유닛스탯 버튼: 하나라도 해금된 게 있으면 표시
  const slimeArea = document.getElementById('slime-friend-area');
  if(anyUnlocked) {
    slimeArea.style.display = 'inline-block';
    document.getElementById('open-unit-stat-btn').style.display = 'inline-block';
  } else {
    slimeArea.style.display = 'none';
    document.getElementById('open-unit-stat-btn').style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════

function removeBackground(img, canvas) {
  const size=240;
  canvas.width=size; canvas.height=size;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,size,size);
  const scale=Math.min(size/img.naturalWidth,size/img.naturalHeight);
  const w=img.naturalWidth*scale, h=img.naturalHeight*scale;
  const ox=(size-w)/2, oy=(size-h)/2;
  try {
    const off=document.createElement('canvas');
    off.width=size; off.height=size;
    const oct=off.getContext('2d');
    oct.drawImage(img,ox,oy,w,h);
    const idata=oct.getImageData(0,0,size,size);
    const d=idata.data;
    function sc(x,y){const i=(y*size+x)*4;return[d[i],d[i+1],d[i+2],d[i+3]];}
    const corners=[sc(2,2),sc(size-3,2),sc(2,size-3),sc(size-3,size-3)];
    const bgR=corners.reduce((s,c)=>s+c[0],0)/4;
    const bgG=corners.reduce((s,c)=>s+c[1],0)/4;
    const bgB=corners.reduce((s,c)=>s+c[2],0)/4;
    const thresh=40;
    for(let i=0;i<d.length;i+=4){
      const r=d[i],g=d[i+1],b=d[i+2],a=d[i+3];
      if(a<10)continue;
      const dr=Math.abs(r-bgR),dg=Math.abs(g-bgG),db=Math.abs(b-bgB);
      if(dr<thresh&&dg<thresh&&db<thresh)
        d[i+3]=Math.floor(a*Math.min(1,Math.sqrt(dr*dr+dg*dg+db*db)/thresh));
    }
    oct.putImageData(idata,0,0);
    ctx.save();ctx.beginPath();ctx.arc(size/2,size/2,size/2-2,0,Math.PI*2);ctx.closePath();ctx.clip();
    ctx.drawImage(off,0,0);ctx.restore();
  } catch(e) {
    ctx.save();ctx.beginPath();ctx.arc(size/2,size/2,size/2-2,0,Math.PI*2);ctx.closePath();ctx.clip();
    ctx.drawImage(img,ox,oy,w,h);ctx.restore();
  }
}

function renderCharacter() {
  const canvas=document.getElementById('char-canvas');
  const img=document.getElementById('char-img');
  let src;
  if (activeTab === 'cms' && cmsIsUnlocked()) {
    const showStage = viewCmsStage !== null ? viewCmsStage : state.cmsStage;
    src = CMS_STAGE_IMAGES['stage'+showStage] || CMS_STAGE_IMAGES['stage0'];
    const cacheKey = 'cms_'+showStage;
    if(canvas.dataset.stage===cacheKey) return;
    canvas.dataset.stage=cacheKey;
  } else {
    const showStage = viewStage !== null ? viewStage : state.stage;
    src=STAGE_IMAGES['stage'+showStage]||STAGE_IMAGES['stage0'];
    if(canvas.dataset.stage===String(showStage))return;
    canvas.dataset.stage=showStage;
  }
  const size=240;
  canvas.width=size; canvas.height=size;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,size,size);
  img.src=src;
  function drawDirect() {
    const scale=Math.min(size/img.naturalWidth,size/img.naturalHeight);
    const w=img.naturalWidth*scale, h=img.naturalHeight*scale;
    const ox=(size-w)/2, oy=(size-h)/2;
    ctx.save();ctx.beginPath();ctx.arc(size/2,size/2,size/2-2,0,Math.PI*2);ctx.closePath();ctx.clip();
    ctx.drawImage(img,ox,oy,w,h);ctx.restore();
  }
  img.onload=()=>drawDirect();
  if(img.complete&&img.naturalWidth>0)drawDirect();
}

function renderEvoInfo() {
  const backBtn = document.getElementById('view-stage-back-btn');
  const descEl = document.getElementById('evo-desc-view');
  if (activeTab === 'cms' && cmsIsUnlocked()) {
    const showStage = viewCmsStage !== null ? viewCmsStage : state.cmsStage;
    const cmsS = CMS_STAGES[showStage];
    document.getElementById('evo-name').textContent = cmsS.name.toUpperCase();
    document.getElementById('evo-name').style.color = '#cc4444';
    document.getElementById('evo-name').style.textShadow = '0 0 20px rgba(204,68,68,0.8)';
    document.getElementById('evo-stage').textContent = `STAGE ${showStage+1} / ${CMS_STAGES.length}`;
    if(backBtn) backBtn.style.display = (viewCmsStage !== null) ? 'inline-block' : 'none';
    if(descEl) { descEl.textContent = (viewCmsStage !== null) ? cmsS.desc : ''; descEl.style.display = (viewCmsStage !== null) ? 'block' : 'none'; }
  } else {
    const showStage = viewStage !== null ? viewStage : state.stage;
    const stage=STAGES[showStage];
    document.getElementById('evo-name').textContent=stage.name.toUpperCase();
    document.getElementById('evo-name').style.color = 'var(--green)';
    document.getElementById('evo-name').style.textShadow = '0 0 20px var(--green)';
    document.getElementById('evo-stage').textContent=`STAGE ${showStage+1} / ${STAGES.length}`;
    if(backBtn) backBtn.style.display = (viewStage !== null) ? 'inline-block' : 'none';
    if(descEl) { descEl.textContent = (viewStage !== null) ? stage.desc : ''; descEl.style.display = (viewStage !== null) ? 'block' : 'none'; }
  }
}

// 미리보기 모드에서 현재 단계로 복귀
function returnToCurrentStage() {
  if (activeTab === 'cms') viewCmsStage = null;
  else viewStage = null;
  renderCharacter(); renderEvoInfo(); renderStageBar();
}



function renderLevelViewer() {
  // 정아영 레벨 뷰어
  const jsyViewer = document.getElementById('jsy-level-viewer');
  const jsyBackWrap = document.getElementById('jsy-level-back-wrap');
  if (jsyViewer) {
    jsyViewer.innerHTML = '';
    const maxStage = state.stage;
    for (let i = 0; i <= maxStage; i++) {
      const isViewing = (viewStage === i);
      const isCurrent = (viewStage === null && i === maxStage) || (viewStage === null && i === maxStage);
      const btn = document.createElement('button');
      btn.textContent = i + 1;
      btn.title = STAGES[i].name;
      btn.style.cssText = `
        width: 28px; height: 28px; border-radius: 6px; font-size: .65rem;
        font-family: 'Orbitron', monospace; font-weight: 700; cursor: pointer;
        transition: all .15s; border: 1px solid;
        background: ${isViewing ? 'rgba(57,255,20,0.25)' : 'rgba(57,255,20,0.06)'};
        border-color: ${isViewing ? 'var(--green)' : 'rgba(57,255,20,0.25)'};
        color: ${isViewing ? 'var(--green)' : '#888'};
        box-shadow: ${isViewing ? '0 0 8px rgba(57,255,20,0.4)' : 'none'};
      `;
      btn.onclick = () => {
        viewStage = i;
        renderCharacter(); renderEvoInfo(); renderStageBar();
        renderLevelViewer();
      };
      jsyViewer.appendChild(btn);
    }
    if (jsyBackWrap) {
      jsyBackWrap.style.display = (viewStage !== null) ? 'block' : 'none';
    }
  }

  // 차명석 레벨 뷰어
  const cmsViewer = document.getElementById('cms-level-viewer');
  const cmsBackWrap = document.getElementById('cms-level-back-wrap');
  if (cmsViewer && cmsIsUnlocked()) {
    cmsViewer.innerHTML = '';
    const maxStage = state.cmsStage;
    for (let i = 0; i <= maxStage; i++) {
      const isViewing = (viewCmsStage === i);
      const btn = document.createElement('button');
      btn.textContent = i + 1;
      btn.title = CMS_STAGES[i].name;
      btn.style.cssText = `
        width: 28px; height: 28px; border-radius: 6px; font-size: .65rem;
        font-family: 'Orbitron', monospace; font-weight: 700; cursor: pointer;
        transition: all .15s; border: 1px solid;
        background: ${isViewing ? 'rgba(204,68,68,0.25)' : 'rgba(204,68,68,0.06)'};
        border-color: ${isViewing ? '#cc4444' : 'rgba(204,68,68,0.25)'};
        color: ${isViewing ? '#cc4444' : '#888'};
        box-shadow: ${isViewing ? '0 0 8px rgba(204,68,68,0.4)' : 'none'};
      `;
      btn.onclick = () => {
        viewCmsStage = i;
        renderCharacter(); renderEvoInfo(); renderStageBar();
        renderLevelViewer();
      };
      cmsViewer.appendChild(btn);
    }
    if (cmsBackWrap) {
      cmsBackWrap.style.display = (viewCmsStage !== null) ? 'block' : 'none';
    }
  }
}


function renderExpBar() {
  if (activeTab === 'cms' && cmsIsUnlocked()) {
    const s = CMS_STAGES[state.cmsStage];
    const nextS = CMS_STAGES[state.cmsStage + 1];
    const expBar = document.getElementById('exp-bar');
    expBar.style.background = 'linear-gradient(90deg, #8b1a1a, #cc4444)';
    document.getElementById('ring-progress').style.stroke = '#cc4444';
    document.getElementById('ring-progress').style.filter = 'drop-shadow(0 0 4px #cc4444)';
    if (!nextS) {
      expBar.style.width='100%';
      document.getElementById('exp-text').textContent='MAX STAGE';
      document.getElementById('ring-progress').style.strokeDashoffset='0';
      return;
    }
    const pct = Math.min(1, Math.max(0, (state.cmsExp - s.expReq) / (nextS.expReq - s.expReq)));
    expBar.style.width = (pct*100)+'%';
    document.getElementById('exp-text').textContent =
      `${formatNum(state.cmsExp - s.expReq)} / ${formatNum(nextS.expReq - s.expReq)} EXP`;
    document.getElementById('ring-progress').style.strokeDashoffset = 816.81*(1-pct);
    return;
  }
  // 정아영
  const expBar = document.getElementById('exp-bar');
  expBar.style.background = 'linear-gradient(90deg, var(--dark-green), var(--green))';
  document.getElementById('ring-progress').style.stroke = 'var(--green)';
  document.getElementById('ring-progress').style.filter = 'drop-shadow(0 0 4px var(--green))';
  const curExp=STAGES[state.stage].expReq;
  const nextExp=state.stage<STAGES.length-1?STAGES[state.stage+1].expReq:Infinity;
  if(nextExp===Infinity){
    expBar.style.width='100%';
    document.getElementById('exp-text').textContent='MAX STAGE';
    document.getElementById('ring-progress').style.strokeDashoffset='0';
    return;
  }
  const pct=Math.min(1,Math.max(0,(state.totalExp-curExp)/(nextExp-curExp)));
  expBar.style.width=(pct*100)+'%';
  document.getElementById('exp-text').textContent=
    `${formatNum(state.totalExp-curExp)} / ${formatNum(nextExp-curExp)} EXP`;
  document.getElementById('ring-progress').style.strokeDashoffset=816.81*(1-pct);
}

function renderHeader() {
  if (activeTab === 'cms' && cmsIsUnlocked()) {
    document.getElementById('total-exp').textContent = formatNum(state.cmsExp);
    document.getElementById('total-exp').style.color = '#cc4444';
    document.getElementById('total-exp').parentElement.querySelector('.label').textContent = '총 EXP';
    // 클릭 EXP
    const cmsCpe = Math.max(1, Math.floor(state.cmsClickMult));
    document.getElementById('cps-display').textContent = formatNum(cmsCpe);
    document.getElementById('cps-display').parentElement.querySelector('.label').textContent = '클릭 EXP';
    // 자동/초
    document.getElementById('aps-display').textContent = formatNum(getCmsAutoGoldTotal())+'/s';
    document.getElementById('aps-display').parentElement.querySelector('.label').textContent = '자동/초';
    // 크리 확률
    document.getElementById('crit-display').textContent = Math.min(100,Math.round(state.cmsCritChance*100))+'%';
    const goldStat = document.getElementById('header-gold-stat');
    if (goldStat) goldStat.style.display = 'none';
  } else {
    document.getElementById('total-exp').textContent=formatNum(state.totalExp);
    document.getElementById('total-exp').style.color = 'var(--green)';
    document.getElementById('total-exp').parentElement.querySelector('.label').textContent = '총 EXP';
    document.getElementById('cps-display').textContent=formatNum(getClickExpPerClick());
    document.getElementById('cps-display').parentElement.querySelector('.label').textContent = '클릭 EXP';
    document.getElementById('aps-display').textContent=formatNum(getAutoEpsTotal())+'/s';
    document.getElementById('aps-display').parentElement.querySelector('.label').textContent = '자동/초';
    document.getElementById('crit-display').textContent=Math.min(100,Math.round(state.critChance*100))+'%';
    const goldStat = document.getElementById('header-gold-stat');
    if (goldStat) goldStat.style.display = 'none';
  }
}

function renderClickStats() {
  if(activeTab === 'cms' && cmsIsUnlocked()) {
    document.getElementById('exp-per-click').textContent=formatNum(Math.max(1, Math.floor(state.cmsClickMult)));
    document.getElementById('crit-mult-display').textContent='x'+state.cmsCritMult;
  } else {
    document.getElementById('exp-per-click').textContent=formatNum(getClickExpPerClick());
    document.getElementById('crit-mult-display').textContent='x'+state.critMult;
  }
  document.getElementById('total-clicks').textContent=formatNum(state.totalClicks);
  document.getElementById('evo-count').textContent=state.evoCount;
}

// ═══════════════════════════════════════════════════
// 차명석 시스템
// ═══════════════════════════════════════════════════

function lpTab(which, btn) {
  activeTab = which;
  state.lastScreen = which; // 마지막으로 본 화면 기억 (정아영/차명석)
  document.getElementById('jsy-panel').style.display = which==='jsy' ? '' : 'none';
  document.getElementById('cms-panel').style.display = which==='cms' ? '' : 'none';
  document.querySelectorAll('.lp-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.lp-tab').forEach(b => {
    if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(`'${which}'`)) b.classList.add('active');
  });
  // 중앙/헤더/오른쪽 패널 전체 재렌더
  renderAll();
  // 차명석 전용 canvas 캐시 무효화 (탭 전환 시 이미지 갱신)
  const canvas = document.getElementById('char-canvas');
  if (canvas) canvas.dataset.stage = '';

  // 탭에 맞춰 캐릭터 글로우 색상 전환 (차명석=빨강, 정아영=초록)
  const glow = document.getElementById('char-glow');
  if (which === 'cms') {
    if (canvas) canvas.classList.add('cms-glow');
    if (glow) glow.classList.add('cms-glow');
  } else {
    if (canvas) canvas.classList.remove('cms-glow');
    if (glow) glow.classList.remove('cms-glow');
  }
  // 탭에 맞는 BGM으로 전환
  startBgmForTab();
}



function toggleWorkerPause() {
  state.workerPaused = !state.workerPaused;
  syncWorkerPauseBtn();
  renderAutoIndicator();
}

function renderWorkers() {
  const container=document.getElementById('workers-list');
  container.innerHTML='';

  // 오른쪽 패널 타이틀 + 일시정지 버튼 탭에 맞게 변경
  const rpTitle = document.querySelector('#right-panel .panel-title');
  const pauseBtn = document.getElementById('worker-pause-btn');

  // ── 차명석 탭 활성 시: 차명석 일꾼 표시 ──────────────────────
  if (activeTab === 'cms' && cmsIsUnlocked()) {
    if (rpTitle) rpTitle.textContent = '💀 차명석 일꾼';
    if (rpTitle) rpTitle.style.color = '#cc4444';
    if (pauseBtn) pauseBtn.style.display = 'none';
    renderCmsWorkers(container);
    return;
  }

  // 정아영 탭 복구
  if (rpTitle) rpTitle.textContent = '👾 일꾼 고용';
  if (rpTitle) rpTitle.style.color = '';
  if (pauseBtn) pauseBtn.style.display = '';

  // ── 최저시급 섹션 ──────────────────────────────────────────
  const minwageUpgs = WORKER_UPGRADES.filter(u=>u.isMinWage);
  const activeMinwage = minwageUpgs.find(u=>!state.upgrades[u.id]);
  const minwageDone = minwageUpgs.every(u=>state.upgrades[u.id]);
  if(activeMinwage || minwageDone) {
    const mwTitle = document.createElement('div');
    mwTitle.className='panel-title';
    mwTitle.style.cssText='margin-top:4px;margin-bottom:4px;color:#ffd700;border-color:#443300;';
    mwTitle.textContent='💼 최저시급 (일꾼 크리 발동)';
    container.appendChild(mwTitle);
    if(minwageDone){
      const d=document.createElement('div');
      d.className='upgrade-btn purchased';
      d.innerHTML=`<div class="upgrade-name" style="color:var(--gold)">최저시급 <span class="upgrade-badge done">완료 ✓</span></div>
        <div class="upgrade-desc">일꾼 자동EXP에 항상 크리 발동!</div>`;
      container.appendChild(d);
    } else {
      const doneCount=minwageUpgs.filter(u=>state.upgrades[u.id]).length;
      const canAfford=state.totalExp>=activeMinwage.cost;
      const btn=document.createElement('button');
      btn.className='upgrade-btn'+(canAfford?' affordable':'');
      btn.style.borderColor='#443300';
      btn.innerHTML=`
        <div class="upgrade-name" style="color:var(--gold)">${activeMinwage.name} <span class="upgrade-badge" style="color:var(--gold)">${doneCount+1}/${minwageUpgs.length}</span></div>
        <div class="upgrade-desc">${activeMinwage.desc}</div>
        <div class="upgrade-cost">💰 ${formatNum(activeMinwage.cost)}</div>
      `;
      btn.addEventListener('click',()=>buyUpgrade(activeMinwage));
      container.appendChild(btn);
    }
  }

  // ── 일꾼 목록 ──────────────────────────────────────────────
  const workerTitle = document.createElement('div');
  workerTitle.className='panel-title';
  workerTitle.style.cssText='margin-top:6px;margin-bottom:4px;';
  workerTitle.textContent='👾 일꾼 고용';
  container.appendChild(workerTitle);

  WORKERS.forEach(w=>{
    const cnt=state.workers[w.id]||0;
    const maxed=cnt>=(w.maxCount||Infinity);
    const cost=getWorkerCost(w);
    const canAfford=state.totalExp>=cost;

    // 일꾼 고용 버튼
    const btn=document.createElement('button');
    if(maxed){
      btn.className='worker-btn maxed';
    } else {
      btn.className='worker-btn'+(canAfford?' affordable':'');
    }
    const apsStr=maxed
      ? `+${formatNum(w.aps)}/s 활성`
      : `고용 시 +${formatNum(w.aps)}/s`;
    btn.innerHTML=`
      <div class="worker-header">
        <span class="worker-name">${w.name}</span>
        <span class="worker-count">${maxed?'✓':''}</span>
      </div>
      <div class="worker-desc">${w.desc}</div>
      <div class="worker-cost">${maxed?'고용 완료':'💰 '+formatNum(cost)}</div>
      <div class="worker-rate">${apsStr}</div>
    `;
    if(!maxed) btn.addEventListener('click',()=>buyWorker(w));
    container.appendChild(btn);

    // 일꾼 고용 후 → 해당 일꾼 업그레이드 표시
    if(maxed){
      const wUpgs=WORKER_UPGRADES.filter(u=>u.wid===w.id);
      const activeWUpg=wUpgs.find(u=>!state.upgrades[u.id]);
      const allDone=wUpgs.every(u=>state.upgrades[u.id]);
      if(allDone){
        const d=document.createElement('div');
        d.className='upgrade-btn purchased';
        d.style.cssText='margin-top:2px;margin-left:8px;padding:5px 8px;';
        d.innerHTML=`<div class="upgrade-name" style="font-size:.68rem;">${w.name.replace(/\S+\s/,'')} <span class="upgrade-badge done">MAX ✓</span></div>`;
        container.appendChild(d);
      } else if(activeWUpg){
        const doneCount=wUpgs.filter(u=>state.upgrades[u.id]).length;
        const canAffordW=state.totalExp>=activeWUpg.cost;
        const ubtn=document.createElement('button');
        ubtn.className='upgrade-btn'+(canAffordW?' affordable':'');
        ubtn.style.cssText='margin-top:2px;margin-left:8px;width:calc(100% - 8px);border-color:#003333;';
        ubtn.innerHTML=`
          <div class="upgrade-name" style="font-size:.7rem;color:var(--neon)">⬆ ${activeWUpg.name} <span class="upgrade-badge" style="color:var(--neon)">${doneCount+1}/${wUpgs.length}</span></div>
          <div class="upgrade-desc">${activeWUpg.desc}</div>
          <div class="upgrade-cost">💰 ${formatNum(activeWUpg.cost)}</div>
        `;
        ubtn.addEventListener('click',()=>buyWorkerUpgrade(activeWUpg));
        container.appendChild(ubtn);
      }
    }
  });
}

function renderStageBar() {
  const bar=document.getElementById('milestone-bar');
  bar.innerHTML='';
  STAGES.forEach((s,i)=>{
    const dot=document.createElement('div');
    dot.className='milestone-dot';
    if(i<state.stage) dot.classList.add('done');
    else if(i===state.stage) dot.classList.add('current');
    dot.title=s.name;
    bar.appendChild(dot);
  });
}

function renderAutoIndicator() {
  const isCmsTab = activeTab === 'cms' && cmsIsUnlocked();
  const aps = isCmsTab ? getCmsAutoGoldTotal() : getAutoEpsTotal();
  const ind=document.getElementById('auto-indicator');
  if(aps>0){ind.classList.add('active');ind.textContent=`+${formatNum(aps)}/s`;}
  else ind.classList.remove('active');
}

function renderAll() {
  renderCharacter(); renderEvoInfo(); renderExpBar(); renderHeader();
  renderClickStats(); renderUpgrades(); renderWorkers(); renderStageBar();
  renderAutoIndicator(); renderStats();
  syncWorkerPauseBtn();
  renderLevelViewer();
  // 차명석 패널이 열려 있을 때만 렌더
  if (document.getElementById('cms-panel').style.display !== 'none') renderCmsPanel();
}

function syncWorkerPauseBtn() {
  const pb = document.getElementById('worker-pause-btn');
  if(!pb) return;
  if(state.workerPaused) {
    pb.textContent='▶ 자동수집 OFF'; pb.style.borderColor='#ff4444'; pb.style.color='#ff4444';
  } else {
    pb.textContent='⏸ 자동수집 ON'; pb.style.borderColor='var(--border)'; pb.style.color='#555';
  }
}

// ═══════════════════════════════════════════════════
// GAME LOGIC
// ═══════════════════════════════════════════════════

function addExp(amount) {
  state.totalExp+=amount;
  checkEvolution();
}

function checkEvolution() {
  let evolved=false, newStage=state.stage;
  while(newStage<STAGES.length-1 && state.totalExp>=STAGES[newStage+1].expReq){
    newStage++; evolved=true;
  }
  if(evolved){
    state.stage=newStage;
    state.evoCount++;
    // 레벨업 시 미리보기(레벨 구경) 모드 초기화 - 새 단계 사진이 정상 반영되도록
    viewStage = null;
    // 스테이지 진화 시: 아이템 + 뽑기 횟수 초기화
    state.items = {};
    state.gachaPullCount = 0;
    // 진행 중이던 아이템 효과 타이머 모두 해제
    Object.keys(itemEffect.timers).forEach(k => clearTimeout(itemEffect.timers[k]));
    itemEffect = { clickBoostMult:1, autoBoostMult:1, allBoostMult:1, critChanceUp:0, critMultUp:0, timers:{} };
    playEvo();
    showEvoPopup();
    renderAll();
    if(musicOn){stopBGM();startBgmForTab();}
  }
}

function showEvoPopup() {
  const stage=STAGES[state.stage];
  const prev=STAGE_STATS[Math.max(0,state.stage-1)];
  const curr=STAGE_STATS[state.stage];
  document.getElementById('popup-new-name').textContent=`✨ ${stage.name.toUpperCase()} ✨`;
  document.getElementById('popup-desc').textContent=stage.desc;
  const gains=document.getElementById('popup-stat-gains');
  gains.innerHTML=`
    <span class="evo-stat-gain atk">⚔️ +${curr.atk-prev.atk}</span>
    <span class="evo-stat-gain spd">💨 +${curr.spd-prev.spd}</span>
  `;
  // stage 9(10레벨) 최초 도달 시 슬라임 절친 해방 알림
  const unlockBanner=document.getElementById('popup-unlock-banner');
  if(state.stage===9){
    unlockBanner.style.display='block';
  } else {
    unlockBanner.style.display='none';
  }
  document.getElementById('evo-popup').classList.add('active');
}

function closeEvoPopup() {
  document.getElementById('evo-popup').classList.remove('active');
}

function buyUpgrade(u) {
  initAudio();
  if(state.upgrades[u.id]){showNotification('이미 구매한 업그레이드입니다!');return;}
  if(state.totalExp<u.cost){showNotification('EXP가 부족합니다!');return;}
  state.totalExp-=u.cost;
  state.upgrades[u.id]=true;
  recalcMultipliers();
  playBuy();
  // 업그레이드 보너스 즉시 효과: 클릭 업그레이드 시 3초간 클릭 EXP 2배 버스트
  if(u.cat==='click' && u.mult) {
    const prevClickMult = state.clickMult / u.mult;
    showNotification(`✦ ${u.name} 획득! 🔥 클릭 ×${u.mult} 활성화! (3초 버스트)`);
    const burstMult = 2;
    state.clickMult *= burstMult;
    setTimeout(()=>{ state.clickMult /= burstMult; renderAll(); }, 3000);
  } else if(u.cat==='auto' && u.mult) {
    showNotification(`✦ ${u.name} 획득! ⚡ 자동EXP ×${u.mult} 활성화! (3초 부스트)`);
    const boostV = u.mult;
    state.autoMult *= boostV;
    setTimeout(()=>{ state.autoMult /= boostV; renderAll(); }, 3000);
  } else if(u.cat==='crit') {
    showNotification(`✦ ${u.name} 획득! 💥 크리 확률 ↑ 5초간 크리 확률 추가 +10%!`);
    state.critChance = Math.min(0.95, state.critChance + 0.10);
    setTimeout(()=>{ recalcMultipliers(); renderAll(); }, 5000);
  } else if(u.cat==='critMult') {
    showNotification(`✦ ${u.name} 획득! 💀 크리 배율 폭발! 5초간 배율 +5!`);
    state.critMult += 5;
    setTimeout(()=>{ recalcMultipliers(); renderAll(); }, 5000);
  } else {
    showNotification(`✦ ${u.name} 획득!`);
  }
  renderAll();
  saveToFirebase();
}

function buyWorkerUpgrade(u) {
  initAudio();
  if(state.upgrades[u.id]){showNotification('이미 구매한 업그레이드입니다!');return;}
  if(state.totalExp<u.cost){showNotification('EXP가 부족합니다!');return;}
  state.totalExp-=u.cost;
  state.upgrades[u.id]=true;
  playBuy();
  showNotification(`⬆ ${u.name} 강화!`);
  renderAll();
  saveToFirebase();
}

function buyWorker(w) {
  initAudio();
  const cnt=state.workers[w.id]||0;
  if(cnt>=(w.maxCount||Infinity)){showNotification('이미 최대 인원입니다!');return;}
  const cost=getWorkerCost(w);
  if(state.totalExp<cost){showNotification('EXP가 부족합니다!');return;}
  state.totalExp-=cost;
  state.workers[w.id]=cnt+1;
  playBuy();
  showNotification(`${w.name} 고용!`);
  renderAll();
  saveToFirebase();
}

function recalcMultipliers() {
  state.clickMult=1;
  state.critChance=0.03;
  state.autoMult=1;
  state.critMult=3;
  UPGRADES.forEach(u=>{
    if(!state.upgrades[u.id])return;
    if(u.cat==='click' && u.mult){
      state.clickMult*=u.mult;
    } else if(u.cat==='auto' && u.mult){
      state.autoMult*=u.mult;
    } else if(u.cat==='crit' && u.critAdd){
      state.critChance+=u.critAdd;
    } else if(u.cat==='critMult' && u.multAdd){
      state.critMult+=u.multAdd;
    }
  });
  // 가챠 카드 효과 적용
  let gachaAllMult = 1;
  GACHA_CARDS.forEach(card=>{
    if(!state.gachaCards[card.id]) return;
    if(card.type==='clickMult')  state.clickMult  *= card.val;
    else if(card.type==='autoMult')   state.autoMult   *= card.val;
    else if(card.type==='critChance') state.critChance += card.val;
    else if(card.type==='critMult')   state.critMult   += card.val;
    else if(card.type==='allMult')    gachaAllMult     *= card.val;
  });
  state.clickMult *= gachaAllMult;
  state.autoMult  *= gachaAllMult;
  // 유닛스탯 슬라임 절친 (정아영/차명석 공유 장착, 정아영 stage 9+ 해방 시 적용)
  if(state.equippedUnitStat === 'slimeFriend' && state.stage >= 9){
    state.critChance=Math.min(1, state.critChance+0.25);
    state.critMult+=1.5;
  }
  // 아이템 시간 효과
  state.clickMult  *= itemEffect.clickBoostMult * itemEffect.allBoostMult;
  state.autoMult   *= itemEffect.autoBoostMult  * itemEffect.allBoostMult;
  state.critChance += itemEffect.critChanceUp;
  state.critMult   += itemEffect.critMultUp;
  state.critChance=Math.min(0.95, state.critChance);
}

// ═══════════════════════════════════════════════════
// CLICK HANDLER
// ═══════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════
// CLICK RATE LIMITER — 초당 최대 15클릭까지만 처리
// ═══════════════════════════════════════════════════════
const AC = {
  MAX_CPS: 15,          // 초당 최대 클릭 수 (이 이상은 그냥 무시)

  _lastClickTime: 0,

  // MAX_CPS 초과 클릭은 조용히 무시
  check(x, y) {
    const now = Date.now();
    if(now - this._lastClickTime < 1000 / this.MAX_CPS) return false;
    this._lastClickTime = now;
    return true;
  },
};

function handleCharClick(e) {
  // 오토클리커 차단
  const cx=e.clientX||(e.touches&&e.touches[0]?e.touches[0].clientX:window.innerWidth/2);
  const cy=e.clientY||(e.touches&&e.touches[0]?e.touches[0].clientY:window.innerHeight/2);
  if(!AC.check(cx, cy)) return;

  initAudio();
  // 첫 클릭 시 BGM 자동 시작 (사용자가 수동으로 끈 경우 제외)
  if(!musicOn && !bgmUserTurnedOff && audioCtx && !bgmInterval) {
    musicOn = true;
    startBgmForTab();
    document.getElementById('music-btn').textContent='♫ BGM ON';
    document.getElementById('music-btn').classList.add('on');
    const bgmMini = document.getElementById('bgm-mini-btn');
    if(bgmMini) { bgmMini.classList.add('on'); bgmMini.textContent='♫'; }
  }

  // ── 차명석 탭 클릭: cmsExp 적립 ──────────────────────────────
  if (activeTab === 'cms' && cmsIsUnlocked()) {
    const effCmsCritChance = Math.min(1, state.cmsCritChance + specialEffect.critChanceBonus);
    const isCrit = Math.random() < effCmsCritChance;
    const base = Math.max(1, Math.floor(state.cmsClickMult)) + specialEffect.clickBonus;
    const amount = isCrit ? base * state.cmsCritMult : base;
    state.cmsTotalClicks = (state.cmsTotalClicks || 0) + 1;
    addCmsExp(amount);

    const p = document.createElement('div');
    p.className = 'click-particle';
    const color = isCrit ? '#ff6666' : '#cc4444';
    const sz = isCrit ? '1.2rem' : '0.9rem';
    p.style.cssText = `left:${cx-24}px;top:${cy-24}px;color:${color};font-size:${sz};text-shadow:0 0 8px ${color};`;
    p.textContent = (isCrit ? '💀 CRIT! +' : '💀+') + formatNum(amount);
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 900);

    playClickCms(isCrit);
    const el = document.getElementById('char-canvas');
    if(shakeEnabled) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    renderCharacter(); renderEvoInfo(); renderExpBar(); renderHeader();
    renderLevelViewer(); renderStageBar();
    return;
  }
  const effCritChance = Math.min(1, state.critChance + specialEffect.critChanceBonus);
  const isCrit=Math.random()<effCritChance;
  const base=getClickExpPerClick() + specialEffect.clickBonus;
  const amount=isCrit?base*state.critMult:base;
  addExp(amount);
  state.totalClicks++;

  const p=document.createElement('div');
  p.className='click-particle';
  const color=isCrit?'#ffaa00':'#39ff14';
  const sz=isCrit?'1.2rem':'0.9rem';
  p.style.cssText=`left:${cx-24}px;top:${cy-24}px;color:${color};font-size:${sz};text-shadow:0 0 8px ${color};`;
  p.textContent=(isCrit?'💥 CRIT! +':'+')+formatNum(amount);
  document.body.appendChild(p);
  setTimeout(()=>p.remove(),900);

  playClick(isCrit);
  const el=document.getElementById('char-canvas');
  if(shakeEnabled) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  renderExpBar(); renderHeader(); renderClickStats();
}

document.getElementById('char-canvas').addEventListener('click', handleCharClick);
document.getElementById('char-canvas').addEventListener('touchend', e=>{e.preventDefault();handleCharClick(e);});

// 스페이스바 → 클릭 EXP (AC 시스템으로 속도 제한)
document.addEventListener('keydown', e=>{
  if(e.code==='Space' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){
    e.preventDefault();

    // 마녀 모달이 열려있으면 뒤에 깔린 정아영/차명석 캔버스가 아니라
    // 마녀 가마솥 클릭으로 처리한다 (그동안 뒤 화면 캔버스가 같이 클릭되던 버그 수정)
    const witchModal = document.getElementById('witch-modal');
    if (witchModal && witchModal.classList.contains('active')) {
      const cauldron = document.getElementById('witch-cauldron-click');
      if (cauldron) {
        const wrect = cauldron.getBoundingClientRect();
        handleWitchCauldronClick({clientX: wrect.left + wrect.width/2, clientY: wrect.top + wrect.height/2});
      }
      return;
    }

    const canvas=document.getElementById('char-canvas');
    const rect=canvas.getBoundingClientRect();
    const cx=rect.left+rect.width/2, cy=rect.top+rect.height/2;
    // 스페이스바는 AC 체크 통과해야만 클릭 처리
    handleCharClick({clientX:cx, clientY:cy});
  }
});

// ═══════════════════════════════════════════════════
// AUTO LOOP
// ═══════════════════════════════════════════════════

let lastTick=Date.now();

// ── 수익 계산 로직 분리 (포그라운드/백그라운드 공통) ──
function tickEarnings(dt, isBackground) {
  if(dt<=0 || dt>300) return;
  const now=Date.now();

  const minwageLv = state.upgrades['minwage3']?3:state.upgrades['minwage2']?2:state.upgrades['minwage1']?1:0;
  let workerCritChance = 0, workerCritMult = state.critMult;
  if(minwageLv===1) workerCritChance=0.50;
  else if(minwageLv===2){ workerCritChance=0.80; workerCritMult=state.critMult*1.5; }
  else if(minwageLv===3){ workerCritChance=1.0;  workerCritMult=state.critMult*1.5; }

  const aps=getAutoEpsTotal();
  if(aps>0){
    let actualExp = aps*dt;
    if(minwageLv>0 && Math.random()<workerCritChance){
      actualExp *= workerCritMult;
      if(!isBackground && (!tickEarnings._lastCritSound || now-tickEarnings._lastCritSound>1000)){
        tickEarnings._lastCritSound=now;
        // 마녀 테크 화면에서는 정아영/차명석 자동수익 효과음이 들리지 않도록 차단
        const witchModalEl = document.getElementById('witch-modal');
        const witchOpen = witchModalEl && witchModalEl.classList.contains('active');
        if(!witchOpen && activeTab !== 'cms') playClick(true);
      }
    }
    addExp(actualExp);
  }

  if (cmsIsUnlocked()) {
    const cmsAps = getCmsAutoGoldTotal();
    if (cmsAps > 0) addCmsExp(cmsAps * dt);
  }
}

function gameTick() {
  const now=Date.now();
  const dt=(now-lastTick)/1000;
  lastTick=now;

  tickEarnings(dt, false);
  tickWitch(dt);

  const aps=getAutoEpsTotal();
  if(aps>0){
    renderExpBar(); renderHeader(); renderClickStats(); renderAutoIndicator();
  }

  if (cmsIsUnlocked()) {
    const prevCmsStage = state.cmsStage;
    if (activeTab === 'cms') {
      renderCharacter(); renderEvoInfo(); renderExpBar(); renderHeader();
      if (state.cmsStage !== prevCmsStage) { renderLevelViewer(); renderStageBar(); }
    }
  }
  // 일꾼 특수 발동 확률 체크 (매 틱마다)
  tryWorkerSpecial();
  if(Math.floor(now/600)!==Math.floor((now-dt*1000)/600)){
    renderUpgrades(); renderWorkers();
  }
  requestAnimationFrame(gameTick);
}

// 탭이 백그라운드로 가면 더 이상 자동 EXP를 적립하지 않음.
// (이전엔 setInterval로 document.hidden 상태에서도 1초마다 수익을 보장했으나 제거함)

// 탭 전환 시 lastTick 리셋 (다시 돌아왔을 때 그 사이 시간만큼 한꺼번에
// 적립되는 "몰아주기"가 발생하지 않도록 dt를 0 근처로 맞춰준다)
document.addEventListener('visibilitychange', function() {
  const now = Date.now();
  lastTick = now;
});

// ═══════════════════════════════════════════════════
// PRESTIGE
// ═══════════════════════════════════════════════════

document.getElementById('prestige-btn').addEventListener('click',()=>{
  const isCmsTab = activeTab === 'cms' && cmsIsUnlocked();
  if(isCmsTab) {
    // 차명석 프레스티지
    if(state.cmsStage < CMS_STAGES.length - 1){showNotification('차명석 최종 단계에 도달해야 합니다!');return;}
    if(!confirm('💀 차명석 프레스티지: 차명석 진행을 초기화하고 영구 배율을 얻습니다. 진행할까요?'))return;
    const bonus = Math.max(1, state.cmsStage);
    state.cmsPrestigeMult = Math.floor(state.cmsPrestigeMult * 1.5 + bonus * 0.1);
    state.cmsPrestigeCount = (state.cmsPrestigeCount||0) + 1;
    state.cmsExp=CMS_STAGES[0].expReq; state.cmsStage=0;
    state.cmsUpgrades={};
    state.cmsGachaCards={}; state.cmsGachaShards={}; state.cmsGachaPullCount=0;
    state.cmsWorkers={};
    recalcCmsMultipliers();
    showNotification(`💀 CMS PRESTIGE! 배율 x${state.cmsPrestigeMult}`);
  } else {
    // 정아영 프레스티지
    if(state.stage < STAGES.length - 1){showNotification('최종 단계에 도달해야 합니다!');return;}
    if(!confirm('🌌 프레스티지: 정아영 진행을 초기화하고 영구 보너스를 얻습니다. 진행할까요?'))return;
    const bonus=Math.max(1,state.evoCount);
    state.prestigeMult=Math.floor(state.prestigeMult*1.5+bonus*0.1);
    state.prestigeCount=(state.prestigeCount||0)+1;
    state.totalExp=STAGES[0].expReq; state.totalClicks=0; state.evoCount=0; state.stage=0;
    state.workers={}; state.upgrades={};
    state.gachaCards={}; state.gachaShards={}; state.gachaPullCount=0;
    state.items={};
    recalcMultipliers();
    showNotification(`✦ PRESTIGE! 배율 x${state.prestigeMult}`);
  }
  renderAll();
});

// ═══════════════════════════════════════════════════
// BGM / SFX
// ═══════════════════════════════════════════════════

document.getElementById('music-btn').addEventListener('click',()=>{
  initAudio();
  if(musicOn){stopBGM();musicOn=false;bgmUserTurnedOff=true;document.getElementById('music-btn').textContent='♪ BGM';document.getElementById('music-btn').classList.remove('on');}
  else{startBgmForTab();musicOn=true;bgmUserTurnedOff=false;document.getElementById('music-btn').textContent='♫ BGM ON';document.getElementById('music-btn').classList.add('on');}
  const bgmMini=document.getElementById('bgm-mini-btn');
  if(bgmMini){ bgmMini.classList.toggle('on',musicOn); bgmMini.textContent=musicOn?'♫':'♪'; }
  saveGame(); // BGM on/off 즉시 저장
});

document.getElementById('sfx-btn').addEventListener('click',()=>{
  initAudio();sfxOn=!sfxOn;
  const btn=document.getElementById('sfx-btn');
  btn.textContent=sfxOn?'🔊 SFX':'🔇 SFX';
  sfxOn?btn.classList.add('on'):btn.classList.remove('on');
  const sfxMini=document.getElementById('sfx-mini-btn');
  if(sfxMini){ sfxMini.classList.toggle('on',sfxOn); sfxMini.textContent=sfxOn?'🔊':'🔇'; }
  saveGame(); // SFX on/off 즉시 저장
});

// ═══════════════════════════════════════════════════
// NOTIFICATION
// ═══════════════════════════════════════════════════

// showNotification: index.html 인라인에서 전역 정의됨

// ═══════════════════════════════════════════════════
// SAVE / LOAD
// ═══════════════════════════════════════════════════

function saveGame(){
  state._savedAt = Date.now();
  try{localStorage.setItem('alien_clicker_v3_save',JSON.stringify(state));}catch(e){}
  // 오디오 설정 별도 저장 (state에 포함하지 않는 런타임 변수)
  try{
    localStorage.setItem('alien_audio_settings', JSON.stringify({
      sfxOn, musicOn, bgmUserTurnedOff,
      witchSfxOn, witchMusicOn
    }));
  }catch(e){}
  // Also save to Firebase if logged in
  saveToFirebase();
}

function loadGame(){
  // 오디오 설정 복원 (state 로드 전에 먼저 읽어둠)
  try{
    const audioSaved = localStorage.getItem('alien_audio_settings');
    if(audioSaved){
      const a = JSON.parse(audioSaved);
      if(a.sfxOn !== undefined)         sfxOn           = !!a.sfxOn;
      if(a.musicOn !== undefined)        musicOn         = !!a.musicOn;
      if(a.bgmUserTurnedOff !== undefined) bgmUserTurnedOff = !!a.bgmUserTurnedOff;
      if(a.witchSfxOn !== undefined)     witchSfxOn      = !!a.witchSfxOn;
      if(a.witchMusicOn !== undefined)   witchMusicOn    = !!a.witchMusicOn;
    }
  }catch(e){}
  try{
    const saved=localStorage.getItem('alien_clicker_v3_save');
    if(saved){
      const parsed=JSON.parse(saved);
      Object.assign(state,parsed);
      if(!state.critMult) state.critMult=3;
      if(!state.prestigeMult) state.prestigeMult=1;
      if(!state.battleClears) state.battleClears={};
      if(!state.gachaCards)  state.gachaCards={};
      if(!state.gachaShards) state.gachaShards={};
      if(!state.items)       state.items={};
      // 차명석 필드 마이그레이션
      if(state.cmsStage === undefined) state.cmsStage = 0;
      if(!state.cmsExp) state.cmsExp = 0;
      // 만렙인데 cmsExp가 만렙 expReq에 딱 고정된 경우 보정 (구버전 버그 세이브 대응)
      if(state.cmsStage >= CMS_STAGES.length - 1 && state.cmsExp <= CMS_STAGES[CMS_STAGES.length-1].expReq) {
        state.cmsExp = CMS_STAGES[CMS_STAGES.length-1].expReq; // 최소 보장, 이후 플레이로 증가
      }
      if(!state.cmsUpgrades) state.cmsUpgrades = {};
      // 차명석 가챠 분리 필드
      if(!state.cmsGachaCards)  state.cmsGachaCards = {};
      if(!state.cmsGachaShards) state.cmsGachaShards = {};
      if(state.cmsGachaPullCount === undefined) state.cmsGachaPullCount = 0;
      if(!state.cmsClickMult) state.cmsClickMult = 1;
      if(!state.cmsAutoMult) state.cmsAutoMult = 1;
      if(!state.cmsPrestigeMult) state.cmsPrestigeMult = 1;
      // 유닛스탯: 구버전(unitStatActive 불린) → equippedUnitStat 마이그레이션
      if(state.equippedUnitStat === undefined) {
        state.equippedUnitStat = state.unitStatActive ? 'slimeFriend' : null;
      }
      delete state.unitStatActive;
      // 은행원 조디 필드 초기화
      if(state.bankerExchangeDate === undefined) state.bankerExchangeDate = '';
      if(state.bankerExchangeCount === undefined) state.bankerExchangeCount = 0;
      if(state.workerPaused === undefined) state.workerPaused=false;
      state.workerPaused = !!state.workerPaused;
      // 마녀 테크 필드 마이그레이션 (구버전엔 localStorage에 따로 저장되어 있었음)
      if(!state.witchExp) state.witchExp = 0;
      if(!state.witchTotalClicks) state.witchTotalClicks = 0;
      if(!state.witchTechLevels) {
        try { state.witchTechLevels = JSON.parse(localStorage.getItem('witchTechLevels') || '{}'); }
        catch(e) { state.witchTechLevels = {}; }
      }
      recalcMultipliers();

      // ── 오프라인 EXP 보상 (25%) ────────────────────────
      if (state._savedAt) {
        const offlineSec = Math.max(0, (Date.now() - state._savedAt) / 1000);
        // 5초 이하는 무시 (새로고침 등)
        if (offlineSec > 5) {
          const jsyAps = getAutoEpsTotal();
          const cmsAps = getCmsAutoGoldTotal();
          const offlineJsy = Math.floor(jsyAps * offlineSec * 0.25);
          const offlineCms = Math.floor(cmsAps * offlineSec * 0.25);
          const offlineMin = Math.floor(offlineSec / 60);
          const offlineSec2 = Math.floor(offlineSec % 60);
          const timeStr = offlineMin > 0
            ? offlineMin + '분 ' + offlineSec2 + '초'
            : offlineSec2 + '초';
          let msg = '💤 오프라인 ' + timeStr + ' —';
          if (offlineJsy > 0) {
            addExp(offlineJsy);
            msg += ' 정아영 +' + formatNum(offlineJsy) + ' EXP';
          }
          if (offlineCms > 0 && cmsIsUnlocked()) {
            addCmsExp(offlineCms);
            msg += ' / 차명석 +' + formatNum(offlineCms) + ' EXP';
          }
          if (offlineJsy > 0 || offlineCms > 0) {
            setTimeout(() => showNotification(msg), 800);
          }
        }
      }
    }
  }catch(e){}
}

setInterval(saveGame,5000);
// 탭 전환/종료 시 즉시 저장 (마지막 변경분 유실 방지)
window.addEventListener('pagehide', saveGame);
window.addEventListener('beforeunload', saveGame);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveGame();
});
// 탭 전환/종료 시 즉시 저장 (마지막 변경분 유실 방지)
window.addEventListener('pagehide', saveGame);
window.addEventListener('beforeunload', saveGame);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveGame();
});
setInterval(()=>{
  const isCmsTab = activeTab === 'cms' && cmsIsUnlocked();
  const show = isCmsTab
    ? state.cmsStage >= CMS_STAGES.length - 1
    : state.stage >= STAGES.length - 1;
  document.getElementById('prestige-btn').style.display = show ? 'block' : 'none';
  // 모바일 탭바 프레스티지 버튼 동기화
  const mobtabP = document.getElementById('mobtab-prestige');
  const mobtabPD = document.getElementById('mobtab-prestige-divider');
  if(mobtabP) mobtabP.style.display = show ? '' : 'none';
  if(mobtabPD) mobtabPD.style.display = show ? '' : 'none';
},2000);

// ═══════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════

const ADMIN_PASSWORD='06290629q';
let adminLoggedIn=false;
document.getElementById('admin-btn').addEventListener('click',openAdminModal);

function openAdminModal(){
  document.getElementById('admin-modal').classList.add('active');
  if(adminLoggedIn)showAdminStagePanel();
  else{
    document.getElementById('admin-login-form').style.display='';
    document.getElementById('admin-stage-panel').style.display='none';
    document.getElementById('admin-status-text').textContent='관리자 비밀번호를 입력하세요';
    document.getElementById('admin-pw-input').value='';
    setTimeout(()=>document.getElementById('admin-pw-input').focus(),100);
  }
}
function closeAdminModal(){document.getElementById('admin-modal').classList.remove('active');}

function attemptAdminLogin(){
  const pw=document.getElementById('admin-pw-input').value;
  if(pw===ADMIN_PASSWORD){
    adminLoggedIn=true;
    document.getElementById('admin-btn').classList.add('active');
    document.getElementById('admin-btn').textContent='⚙ ADMIN ✓';
    showAdminStagePanel();
  }else{
    const input=document.getElementById('admin-pw-input');
    const status=document.getElementById('admin-status-text');
    status.textContent='❌ 비밀번호가 틀렸습니다';status.style.color='#ff4444';
    input.style.borderColor='#ff4444';input.value='';
    setTimeout(()=>{status.textContent='관리자 비밀번호를 입력하세요';status.style.color='';input.style.borderColor='';},1500);
  }
}

function showAdminStagePanel(){
  document.getElementById('admin-login-form').style.display='none';
  document.getElementById('admin-stage-panel').style.display='block';
  document.getElementById('admin-status-text').textContent='✓ 관리자 모드 활성화';
  const grid=document.getElementById('stage-grid');
  grid.innerHTML='';
  STAGES.forEach((s,i)=>{
    const btn=document.createElement('button');
    btn.className='stage-jump-btn'+(i===state.stage?' current-stage':'');
    btn.innerHTML=`<div class="sj-num">STAGE ${i+1}</div><div>${s.name}</div>`;
    btn.addEventListener('click',()=>adminJumpToStage(i));
    grid.appendChild(btn);
  });
  adminRenderUpgradeList();
  adminRenderItemList();
  adminRenderCmsStageGrid();
  adminRenderCmsUpgradeList();
  adminRenderCmsWorkerList();
  adminRenderPrestigeDisplay();
  adminRenderWitchPanel();
}

// ====== 마녀 테크 관리자 기능 ======
function adminRenderWitchPanel() {
  const expDisplay = document.getElementById('admin-witch-exp-display');
  if (!expDisplay) return;
  expDisplay.textContent = `현재 마녀 EXP: ${formatNum(state.witchExp || 0)}`;
  adminRenderWitchTechList();

  // 코인
  const coinDisp = document.getElementById('admin-witch-coin-display');
  if (coinDisp) coinDisp.textContent = `현재 마녀 코인: ${state.witchCoins || 0}`;

  // HP/AP
  const hpApDisp = document.getElementById('admin-witch-hp-ap-display');
  if (hpApDisp) {
    const ov = state.witchAdminOverride || {};
    hpApDisp.textContent = `최대 HP: ${ov.maxHp || '기본('+(getWitchMaxHp())+')'} / 최대 AP: ${ov.maxAp || '기본('+WITCH_STAT_MAX_AP+')'}`;
  }

  // AP 회복
  const apRecDisp = document.getElementById('admin-witch-ap-rec-display');
  if (apRecDisp) {
    const ov = state.witchAdminOverride || {};
    const rec = getWitchApRecovery();
    const interval = ov.apInterval !== undefined ? ov.apInterval : rec.interval;
    const amount  = ov.apAmount  !== undefined ? ov.apAmount  : rec.amount;
    apRecDisp.textContent = `현재: ${interval}초마다 ${amount} AP 회복`;
  }

  // 행동 시간 제수
  const divDisp = document.getElementById('admin-witch-action-speed-display');
  if (divDisp) {
    const ov = state.witchAdminOverride || {};
    const div = ov.actionDivisor !== undefined ? ov.actionDivisor : 50;
    divDisp.textContent = `현재: 행동력 ${div}마다 1초`;
  }

  // 물약 레벨
  adminRenderWitchPotionList();
}

// ── 마녀 코인 ─────────────────────────────────────
function adminSetWitchCoin(subtract) {
  const input = document.getElementById('admin-witch-coin-input');
  const val = parseInt(input.value);
  if (isNaN(val) || val < 0) { showNotification('올바른 값을 입력하세요'); return; }
  state.witchCoins = Math.max(0, (state.witchCoins || 0) + (subtract ? -val : val));
  input.value = '';
  saveGame();
  adminRenderWitchPanel();
  showNotification(`⚙ 마녀 코인 ${subtract ? '차감' : '추가'}: ${val}`);
}

function adminSetWitchCoinDirect() {
  const input = document.getElementById('admin-witch-coin-input');
  const val = parseInt(input.value);
  if (isNaN(val) || val < 0) { showNotification('올바른 값을 입력하세요'); return; }
  state.witchCoins = val;
  input.value = '';
  saveGame();
  adminRenderWitchPanel();
  showNotification(`⚙ 마녀 코인 직접 설정: ${val}`);
}

// ── 최대 체력 / 최대 행동력 ───────────────────────
function adminSetWitchMaxHp() {
  const val = parseInt(document.getElementById('admin-witch-hp-input').value);
  if (isNaN(val) || val < 1) { showNotification('올바른 값을 입력하세요'); return; }
  if (!state.witchAdminOverride) state.witchAdminOverride = {};
  state.witchAdminOverride.maxHp = val;
  witchHp = Math.min(witchHp, val);
  renderWitchStats();
  saveGame();
  adminRenderWitchPanel();
  showNotification(`⚙ 최대 체력 → ${val}`);
}

function adminSetWitchMaxAp() {
  const val = parseInt(document.getElementById('admin-witch-ap-input').value);
  if (isNaN(val) || val < 1) { showNotification('올바른 값을 입력하세요'); return; }
  if (!state.witchAdminOverride) state.witchAdminOverride = {};
  state.witchAdminOverride.maxAp = val;
  witchAp = Math.min(witchAp, val);
  renderWitchStats();
  saveGame();
  adminRenderWitchPanel();
  showNotification(`⚙ 최대 행동력 → ${val}`);
}

// ── 행동력 회복 주기 / 회복량 ─────────────────────
function adminSetWitchApInterval() {
  const val = parseFloat(document.getElementById('admin-witch-ap-interval-input').value);
  if (isNaN(val) || val <= 0) { showNotification('0보다 큰 값을 입력하세요'); return; }
  if (!state.witchAdminOverride) state.witchAdminOverride = {};
  state.witchAdminOverride.apInterval = val;
  witchApTickAccum = 0;
  saveGame();
  adminRenderWitchPanel();
  showNotification(`⚙ 회복 주기 → ${val}초`);
}

function adminSetWitchApAmount() {
  const val = parseInt(document.getElementById('admin-witch-ap-amount-input').value);
  if (isNaN(val) || val < 1) { showNotification('올바른 값을 입력하세요'); return; }
  if (!state.witchAdminOverride) state.witchAdminOverride = {};
  state.witchAdminOverride.apAmount = val;
  saveGame();
  adminRenderWitchPanel();
  showNotification(`⚙ 회복량 → ${val} AP`);
}

// ── 행동 시간 제수 ────────────────────────────────
function adminSetWitchActionDivisor() {
  const val = parseInt(document.getElementById('admin-witch-action-divisor-input').value);
  if (isNaN(val) || val < 1) { showNotification('1 이상의 값을 입력하세요'); return; }
  if (!state.witchAdminOverride) state.witchAdminOverride = {};
  state.witchAdminOverride.actionDivisor = val;
  saveGame();
  adminRenderWitchPanel();
  showNotification(`⚙ 행동 시간 → 행동력 ${val}마다 1초`);
}

function adminResetWitchActionDivisor() {
  if (!state.witchAdminOverride) return;
  delete state.witchAdminOverride.actionDivisor;
  saveGame();
  adminRenderWitchPanel();
  showNotification('⚙ 행동 시간 기본값으로 초기화');
}

// ── 강화하기 물약 레벨 ────────────────────────────
function adminRenderWitchPotionList() {
  const list = document.getElementById('admin-witch-potion-list');
  if (!list || typeof WITCH_POTION_DATA === 'undefined') return;
  const levels = getWitchPotionLevels();
  list.innerHTML = WITCH_POTION_DATA.map(p => {
    const lv = levels[p.key] || 0;
    return `<div style="display:flex;align-items:center;gap:6px;font-size:.68rem;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:6px;padding:5px 8px;">
      <span style="flex:1;color:#ffd700;">${p.icon} ${p.name}</span>
      <span style="color:#888;">Lv ${lv}/${p.maxLv}</span>
      <button onclick="adminWitchPotionChange('${p.key}',-1)" style="font-family:Orbitron,monospace;font-size:.62rem;padding:2px 7px;border-radius:4px;cursor:pointer;border:1px solid var(--border);background:rgba(255,255,255,.05);color:#ff8888;">-</button>
      <button onclick="adminWitchPotionChange('${p.key}',1)" style="font-family:Orbitron,monospace;font-size:.62rem;padding:2px 7px;border-radius:4px;cursor:pointer;border:1px solid var(--border);background:rgba(255,255,255,.05);color:#88ff88;">+</button>
      <button onclick="adminWitchPotionMax('${p.key}')" style="font-family:Orbitron,monospace;font-size:.6rem;padding:2px 7px;border-radius:4px;cursor:pointer;border:1px solid #ffd70044;background:rgba(255,255,255,.05);color:#ffd700;">MAX</button>
    </div>`;
  }).join('');
}

function adminWitchPotionChange(key, delta) {
  const p = WITCH_POTION_DATA.find(x => x.key === key);
  if (!p) return;
  const levels = getWitchPotionLevels();
  levels[key] = Math.max(0, Math.min(p.maxLv, (levels[key] || 0) + delta));
  saveGame();
  adminRenderWitchPotionList();
  showNotification(`⚙ ${p.name} → Lv${levels[key]}`);
}

function adminWitchPotionMax(key) {
  const p = WITCH_POTION_DATA.find(x => x.key === key);
  if (!p) return;
  getWitchPotionLevels()[key] = p.maxLv;
  saveGame();
  adminRenderWitchPotionList();
  showNotification(`⚙ ${p.name} MAX`);
}

// ── 모든 아이템 획득 ──────────────────────────────
function adminGiveAllItems() {
  if (!confirm('모든 아이템(1~46)을 핸드에 추가합니다. 핸드가 가득 찰 수 있습니다. 진행할까요?')) return;
  if (!state.witchHand) state.witchHand = [];
  Object.keys(WITCH_ITEMS).forEach(id => {
    state.witchHand.push({ itemId: Number(id) });
  });
  if (typeof renderWitchHand === 'function') renderWitchHand();
  saveGame();
  showNotification('⚙ 모든 아이템 핸드에 추가 완료');
}

function adminClearHand() {
  if (!confirm('핸드(소지품)를 초기화합니다. 진행할까요?')) return;
  state.witchHand = [];
  if (typeof renderWitchHand === 'function') renderWitchHand();
  saveGame();
  showNotification('⚙ 핸드 초기화 완료');
}

// ── 전체 초기화 ───────────────────────────────────
function adminFullReset() {
  if (!confirm('⚠️ 게임 데이터 전체를 초기화합니다.\n이 작업은 되돌릴 수 없습니다.\n정말 진행할까요?')) return;
  if (!confirm('마지막 확인: 정말로 전체 초기화하시겠습니까?')) return;
  localStorage.clear();
  showNotification('⚙ 전체 초기화 완료. 새로고침합니다...');
  setTimeout(() => location.reload(), 1200);
}

function adminSetWitchExp(subtract) {
  const input = document.getElementById('admin-witch-exp-input');
  const val = parseFloat(input.value);
  if (isNaN(val) || val < 0) { showNotification('올바른 값을 입력하세요'); return; }
  state.witchExp = Math.max(0, (state.witchExp || 0) + (subtract ? -val : val));
  input.value = '';
  saveGame();
  adminRenderWitchPanel();
  renderWitchStatsBar();
  showNotification(`⚙ 마녀 EXP ${subtract ? '차감' : '추가'} 완료`);
}

function adminSetWitchExpDirect() {
  const input = document.getElementById('admin-witch-exp-input');
  const val = parseFloat(input.value);
  if (isNaN(val) || val < 0) { showNotification('올바른 값을 입력하세요'); return; }
  state.witchExp = val;
  input.value = '';
  saveGame();
  adminRenderWitchPanel();
  renderWitchStatsBar();
  showNotification('⚙ 마녀 EXP 직접 설정 완료');
}

function adminRenderWitchTechList() {
  const list = document.getElementById('admin-witch-tech-list');
  if (!list) return;
  const levels = getWitchLevels();
  list.innerHTML = witchTechs.map(t => {
    const lv = levels[t.id] || 0;
    return `<div style="display:flex;align-items:center;gap:6px;font-size:.68rem;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:6px;padding:5px 8px;">
      <span style="flex:1;color:#a0ff60;">${t.icon} ${t.name}</span>
      <span style="color:#888;">Lv ${lv}/${t.maxLevel}</span>
      <button onclick="adminWitchTechLevelChange('${t.id}',-1)" style="font-family:Orbitron,monospace;font-size:.62rem;padding:2px 7px;border-radius:4px;cursor:pointer;border:1px solid var(--border);background:rgba(255,255,255,.05);color:#ff8888;">-</button>
      <button onclick="adminWitchTechLevelChange('${t.id}',1)" style="font-family:Orbitron,monospace;font-size:.62rem;padding:2px 7px;border-radius:4px;cursor:pointer;border:1px solid var(--border);background:rgba(255,255,255,.05);color:#88ff88;">+</button>
      <button onclick="adminWitchTechSetMax('${t.id}')" style="font-family:Orbitron,monospace;font-size:.6rem;padding:2px 7px;border-radius:4px;cursor:pointer;border:1px solid ${'#ffd700'}44;background:rgba(255,255,255,.05);color:#ffd700;">MAX</button>
    </div>`;
  }).join('');
}

function adminWitchTechLevelChange(id, delta) {
  const tech = witchTechs.find(t => t.id === id);
  if (!tech) return;
  const levels = getWitchLevels();
  const cur = levels[id] || 0;
  const next = Math.max(0, Math.min(tech.maxLevel, cur + delta));
  levels[id] = next;
  saveGame();
  adminRenderWitchTechList();
  renderWitchTechGrid();
  showNotification(`⚙ ${tech.name} → Lv${next}`);
}

function adminWitchTechSetMax(id) {
  const tech = witchTechs.find(t => t.id === id);
  if (!tech) return;
  const levels = getWitchLevels();
  levels[id] = tech.maxLevel;
  saveGame();
  adminRenderWitchTechList();
  renderWitchTechGrid();
  showNotification(`⚙ ${tech.name} MAX 적용`);
}

function adminUnlockAllWitchTechs() {
  const levels = getWitchLevels();
  witchTechs.forEach(t => { levels[t.id] = t.maxLevel; });
  saveGame();
  adminRenderWitchTechList();
  renderWitchTechGrid();
  showNotification('⚙ 마녀 테크 전체 해제 완료');
}

function adminResetWitchTechs() {
  if (!confirm('마녀 테크 레벨만 초기화합니다. (EXP는 유지) 진행할까요?')) return;
  state.witchTechLevels = {};
  saveGame();
  adminRenderWitchTechList();
  renderWitchTechGrid();
  showNotification('⚙ 마녀 테크 초기화 완료');
}

function adminResetWitchAll() {
  if (!confirm('🔴 마녀 EXP와 테크 레벨을 모두 초기화합니다. 진행할까요?')) return;
  state.witchExp = 0;
  state.witchTechLevels = {};
  state.witchTotalClicks = 0;
  saveGame();
  adminRenderWitchPanel();
  renderWitchTechGrid();
  renderWitchStatsBar();
  showNotification('⚙ 마녀 전체 초기화 완료');
}

function adminRenderItemList() {
  const list = document.getElementById('admin-item-list');
  if(!list) return;
  list.innerHTML = '';
  ITEMS.forEach(item => {
    const rarityColor = ITEM_RARITY_COLOR[item.rarity] || '#aaa';
    const owned = state.items[item.id] || 0;
    const div = document.createElement('div');
    div.style.cssText = `border:1px solid ${rarityColor}44;border-radius:7px;padding:6px 7px;background:rgba(255,255,255,.02);display:flex;flex-direction:column;gap:2px;`;
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:5px;">
        <span style="font-size:.9rem;">${item.emoji}</span>
        <span style="font-family:Orbitron,monospace;font-size:.5rem;color:${rarityColor};letter-spacing:1px;">${item.rarity}</span>
      </div>
      <div style="font-size:.58rem;color:#ccc;font-weight:700;line-height:1.2;">${item.name}</div>
      <div style="font-size:.52rem;color:#555;line-height:1.2;">${item.desc}</div>
      <div style="display:flex;align-items:center;gap:4px;margin-top:2px;">
        <span style="font-family:Orbitron,monospace;font-size:.52rem;color:${rarityColor};">×${owned}</span>
        <button onclick="adminGiveItem('${item.id}')" style="font-family:Orbitron,monospace;font-size:.52rem;padding:2px 7px;border-radius:4px;cursor:pointer;border:1px solid ${rarityColor}44;background:rgba(255,255,255,.05);color:${rarityColor};flex:1;transition:all .15s;">+1 지급</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function adminGiveItem(itemId) {
  const item = ITEMS.find(i => i.id === itemId);
  if(!item) return;
  state.items[itemId] = (state.items[itemId] || 0) + 1;
  adminRenderItemList();
  if(document.getElementById('item-modal').style.display === 'flex') renderItemModal();
  showNotification(`⚙ ${item.emoji} ${item.name} 지급 완료! (보유: ${state.items[itemId]})`);
}

function adminRenderUpgradeList() {
  const list = document.getElementById('admin-upgrade-list');
  if(!list) return;
  list.innerHTML = '';
  const catNames = { click:'클릭', auto:'자동', crit:'크리확률', critMult:'크리배율' };
  const cats = ['click','auto','crit','critMult'];
  cats.forEach(cat => {
    const items = UPGRADES.filter(u => u.cat === cat);
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;padding:3px 0;border-bottom:1px solid #1a2a1a;';
    row.innerHTML = `<span style="font-family:Orbitron,monospace;font-size:.55rem;color:#555;width:100%;text-align:left;padding-left:2px;">${catNames[cat]}</span>`;
    items.forEach(u => {
      const purchased = !!state.upgrades[u.id];
      const btn = document.createElement('button');
      btn.style.cssText = `font-family:Orbitron,monospace;font-size:.58rem;padding:3px 7px;border-radius:5px;cursor:pointer;transition:all .15s;border:1px solid ${purchased?'var(--green)':'var(--border)'};background:${purchased?'rgba(57,255,20,0.12)':'none'};color:${purchased?'var(--green)':'#666'};`;
      btn.textContent = u.name;
      btn.title = u.desc + ' / ' + formatNum(u.cost);
      btn.addEventListener('click', () => {
        state.upgrades[u.id] = !state.upgrades[u.id];
        recalcMultipliers();
        renderAll();
        adminRenderUpgradeList();
        showNotification(`⚙ ${u.name} ${state.upgrades[u.id]?'활성화':'비활성화'}`);
      });
      row.appendChild(btn);
    });
    list.appendChild(row);
  });
}

function adminSetExp(subtract) {
  const val = parseFloat(document.getElementById('admin-exp-input').value);
  if(isNaN(val) || val <= 0) { showNotification('올바른 숫자를 입력하세요'); return; }
  if(subtract) {
    state.totalExp = Math.max(0, state.totalExp - val);
    showNotification(`⚙ EXP -${formatNum(val)}`);
  } else {
    state.totalExp += val;
    checkEvolution();
    showNotification(`⚙ EXP +${formatNum(val)}`);
  }
  renderAll();
}

function adminSetExpDirect() {
  const val = parseFloat(document.getElementById('admin-exp-input').value);
  if(isNaN(val) || val < 0) { showNotification('올바른 숫자를 입력하세요'); return; }
  state.totalExp = val;
  checkEvolution();
  showNotification(`⚙ EXP = ${formatNum(val)}`);
  renderAll();
}

function adminUnlockAllUpgrades() {
  UPGRADES.forEach(u => { state.upgrades[u.id] = true; });
  recalcMultipliers();
  renderAll();
  adminRenderUpgradeList();
  showNotification('⚙ 모든 업그레이드 해제!');
}

function adminResetUpgrades() {
  state.upgrades = {};
  recalcMultipliers();
  renderAll();
  adminRenderUpgradeList();
  showNotification('⚙ 업그레이드 초기화');
}

// ── 차명석 관리자 패널 ─────────────────────────────────────
function adminRenderCmsStageGrid() {
  const grid = document.getElementById('cms-admin-stage-grid');
  if (!grid) return;
  grid.innerHTML = '';
  CMS_STAGES.forEach((s, i) => {
    const btn = document.createElement('button');
    btn.className = 'stage-jump-btn' + (i === state.cmsStage ? ' current-stage' : '');
    btn.innerHTML = `<div class="sj-num">STAGE ${i + 1}</div><div>${s.name}</div>`;
    btn.addEventListener('click', () => adminCmsJumpToStage(i));
    grid.appendChild(btn);
  });
}

function adminCmsJumpToStage(targetStage) {
  state.cmsStage = targetStage;
  state.cmsExp = CMS_STAGES[targetStage].expReq;  // 해당 레벨의 정확한 EXP로 설정
  viewCmsStage = null;
  recalcCmsMultipliers();
  renderAll();
  if (document.getElementById('cms-panel').style.display !== 'none') renderCmsPanel();
  adminRenderCmsStageGrid();
  showNotification(`⚙ 차명석 ADMIN: ${CMS_STAGES[targetStage].name}으로 이동!`);
}

function adminSetCmsExp(subtract) {
  const val = parseFloat(document.getElementById('admin-cms-gold-input').value);
  if (isNaN(val) || val <= 0) { showNotification('올바른 숫자를 입력하세요'); return; }
  if (subtract) {
    state.cmsExp = Math.max(0, state.cmsExp - val);
    showNotification(`⚙ 차명석 EXP -${formatNum(val)}`);
  } else {
    addCmsExp(val);
    showNotification(`⚙ 차명석 EXP +${formatNum(val)}`);
  }
  recalcCmsMultipliers();
  renderAll();
  if (document.getElementById('cms-panel').style.display !== 'none') renderCmsPanel();
  adminRenderCmsStageGrid();
}

function adminSetCmsExpDirect() {
  const val = parseFloat(document.getElementById('admin-cms-gold-input').value);
  if (isNaN(val) || val < 0) { showNotification('올바른 숫자를 입력하세요'); return; }
  state.cmsExp = val;
  while (state.cmsStage < CMS_STAGES.length - 1) {
    const nxt = CMS_STAGES[state.cmsStage + 1];
    if (!nxt || state.cmsExp < nxt.expReq) break;
    state.cmsStage++;
  }
  viewCmsStage = null;
  showNotification(`⚙ 차명석 EXP = ${formatNum(val)}`);
  recalcCmsMultipliers();
  renderAll();
  if (document.getElementById('cms-panel').style.display !== 'none') renderCmsPanel();
  adminRenderCmsStageGrid();
}

function adminUnlockAllCmsUpgrades() {
  CMS_UPGRADES.forEach(u => { state.cmsUpgrades[u.id] = true; });
  CMS_WORKER_UPGRADES.forEach(u => { state.cmsUpgrades[u.id] = true; });
  recalcCmsMultipliers();
  recalcMultipliers();
  renderAll();
  if (document.getElementById('cms-panel').style.display !== 'none') renderCmsPanel();
  adminRenderCmsUpgradeList();
  showNotification('⚙ 차명석 모든 업그레이드 해제!');
}

function adminResetCmsUpgrades() {
  state.cmsUpgrades = {};
  recalcCmsMultipliers();
  recalcMultipliers();
  renderAll();
  if (document.getElementById('cms-panel').style.display !== 'none') renderCmsPanel();
  adminRenderCmsUpgradeList();
  showNotification('⚙ 차명석 업그레이드 초기화');
}

function adminRenderCmsUpgradeList() {
  const list = document.getElementById('admin-cms-upgrade-list');
  if (!list) return;
  list.innerHTML = '';
  const catNames = { cm_auto:'자동', cm_crit:'크리확률', cm_critMult:'크리배율' };
  const cats = ['cm_auto','cm_crit','cm_critMult'];
  cats.forEach(cat => {
    const items = CMS_UPGRADES.filter(u => u.cat === cat);
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;padding:3px 0;border-bottom:1px solid #2a1a1a;';
    row.innerHTML = `<span style="font-family:Orbitron,monospace;font-size:.55rem;color:#555;width:100%;text-align:left;padding-left:2px;">${catNames[cat]}</span>`;
    items.forEach(u => {
      const purchased = !!state.cmsUpgrades[u.id];
      const btn = document.createElement('button');
      btn.style.cssText = `font-family:Orbitron,monospace;font-size:.58rem;padding:3px 7px;border-radius:5px;cursor:pointer;transition:all .15s;border:1px solid ${purchased?'#cc4444':'var(--border)'};background:${purchased?'rgba(204,68,68,0.12)':'none'};color:${purchased?'#cc4444':'#666'};`;
      btn.textContent = u.name;
      btn.title = u.desc + ' / ' + formatNum(u.cost);
      btn.addEventListener('click', () => {
        state.cmsUpgrades[u.id] = !state.cmsUpgrades[u.id];
        recalcCmsMultipliers();
        renderAll();
        if (document.getElementById('cms-panel').style.display !== 'none') renderCmsPanel();
        adminRenderCmsUpgradeList();
        showNotification(`⚙ ${u.name} ${state.cmsUpgrades[u.id]?'활성화':'비활성화'}`);
      });
      row.appendChild(btn);
    });
    list.appendChild(row);
  });
}

function adminRenderCmsWorkerList() {
  const list = document.getElementById('admin-cms-worker-list');
  if (!list) return;
  list.innerHTML = '';
  CMS_WORKERS.forEach(w => {
    const cnt = state.cmsWorkers[w.id] || 0;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;border:1px solid rgba(204,68,68,0.25);border-radius:6px;padding:4px 8px;';
    row.innerHTML = `
      <span style="flex:1;font-size:.62rem;color:#cc8888;">${w.name}</span>
      <span style="font-family:Orbitron,monospace;font-size:.6rem;color:#cc4444;min-width:30px;text-align:center;">${cnt}/${w.maxCount}</span>
    `;
    const minusBtn = document.createElement('button');
    minusBtn.textContent = '−';
    minusBtn.style.cssText = 'font-family:Orbitron,monospace;font-size:.6rem;width:22px;height:22px;border-radius:4px;cursor:pointer;border:1px solid #aa2200;background:none;color:#aa2200;';
    minusBtn.addEventListener('click', () => {
      state.cmsWorkers[w.id] = Math.max(0, (state.cmsWorkers[w.id]||0) - 1);
      adminRenderCmsWorkerList();
      renderAll();
      if (document.getElementById('cms-panel').style.display !== 'none') renderCmsPanel();
      saveGame();
    });
    const plusBtn = document.createElement('button');
    plusBtn.textContent = '+';
    plusBtn.style.cssText = 'font-family:Orbitron,monospace;font-size:.6rem;width:22px;height:22px;border-radius:4px;cursor:pointer;border:1px solid #cc4444;background:none;color:#cc4444;';
    plusBtn.addEventListener('click', () => {
      state.cmsWorkers[w.id] = Math.min(w.maxCount, (state.cmsWorkers[w.id]||0) + 1);
      adminRenderCmsWorkerList();
      renderAll();
      if (document.getElementById('cms-panel').style.display !== 'none') renderCmsPanel();
      saveGame();
    });
    row.appendChild(minusBtn);
    row.appendChild(plusBtn);
    list.appendChild(row);
  });
}

function adminFullReset() {
  if(!confirm('⚠ 전체 초기화: 업그레이드, 일꾼, 레벨, 아이템, 가챠, 마녀 테크 모두 초기화합니다. 진행할까요?')) return;
  // 정아영 초기화
  state.totalExp = STAGES[0].expReq;  // 레벨 1 기준 EXP
  state.totalClicks = 0;
  state.evoCount = 0;
  state.stage = 0;
  state.workers = {};
  state.upgrades = {};
  state.equippedUnitStat = null;
  state.workerPaused = false;
  state.prestigeMult = 1;
  state.gachaCards = {};
  state.gachaShards = {};
  state.items = {};
  state.gachaPullCount = 0;
  // 차명석 초기화
  state.cmsExp = CMS_STAGES[0].expReq;  // 레벨 1 기준 EXP
  state.cmsStage = 0;
  state.cmsUpgrades = {};
  state.cmsWorkers = {};
  state.cmsPrestigeMult = 1;
  state.cmsGachaCards = {};
  state.cmsGachaShards = {};
  state.cmsGachaPullCount = 0;
  // 마녀 테크 초기화 (EXP, 테크 레벨, 클릭 카운트 모두)
  state.witchExp = 0;
  state.witchTechLevels = {};
  state.witchTotalClicks = 0;
  // 진행 중이던 아이템 효과 타이머 모두 해제
  Object.keys(itemEffect.timers).forEach(k => clearTimeout(itemEffect.timers[k]));
  itemEffect = { clickBoostMult:1, autoBoostMult:1, allBoostMult:1, critChanceUp:0, critMultUp:0, timers:{} };
  recalcMultipliers();
  recalcCmsMultipliers();
  renderAll();
  adminRenderUpgradeList();
  adminRenderItemList();
  adminRenderCmsStageGrid();
  adminRenderCmsUpgradeList();
  adminRenderWitchPanel();
  renderWitchTechGrid();
  showAdminStagePanel();
  showNotification('⚙ 전체 초기화 완료 (레벨1 / 일꾼0 / 아이템0 / 가챠0 / 마녀0)');
}

function adminJumpToStage(targetStage){
  state.stage=targetStage;
  state.totalExp=STAGES[targetStage].expReq;  // 해당 레벨의 정확한 EXP로 설정
  state.evoCount=Math.max(state.evoCount,targetStage);
  viewStage = null;
  renderAll();
  showNotification(`⚙ ADMIN: ${STAGES[targetStage].name}으로 이동!`);
  closeAdminModal();
}

function adminRenderPrestigeDisplay() {
  const el = document.getElementById('admin-prestige-display');
  if (!el) return;
  const jm = state.prestigeMult    || 1;
  const cm = state.cmsPrestigeMult || 1;
  // 정아영 효과: 클릭EXP × jm, 자동EXP × jm
  // 차명석 효과: 클릭EXP × cm, 자동EXP × cm
  el.innerHTML = `
    <div style="flex:1;min-width:120px;border:1px solid rgba(255,215,0,.3);border-radius:8px;padding:8px 10px;background:rgba(255,215,0,.05);text-align:center;">
      <div style="font-family:'Orbitron',monospace;font-size:.55rem;color:var(--gold);letter-spacing:2px;margin-bottom:6px;">⚡ 정아영</div>
      <div style="font-size:1.2rem;font-weight:700;color:var(--gold);text-shadow:0 0 10px rgba(255,215,0,.5);">×${jm}</div>
      <div style="font-size:.58rem;color:#888;margin-top:4px;">클릭/자동 EXP 전체 ×${jm}</div>
    </div>
    <div style="flex:1;min-width:120px;border:1px solid rgba(204,68,68,.3);border-radius:8px;padding:8px 10px;background:rgba(204,68,68,.05);text-align:center;">
      <div style="font-family:'Orbitron',monospace;font-size:.55rem;color:#cc4444;letter-spacing:2px;margin-bottom:6px;">💀 차명석</div>
      <div style="font-size:1.2rem;font-weight:700;color:#cc4444;text-shadow:0 0 10px rgba(204,68,68,.5);">×${cm}</div>
      <div style="font-size:.58rem;color:#888;margin-top:4px;">클릭/자동 EXP 전체 ×${cm}</div>
    </div>
  `;
}

function adminSetPrestige(who) {
  const val = parseInt(document.getElementById('admin-prestige-input').value);
  if (isNaN(val) || val < 1) { showNotification('1 이상의 정수를 입력하세요'); return; }
  if (who === 'jsy') {
    state.prestigeMult = val;
    recalcMultipliers();
    showNotification(`⚙ 정아영 프레스티지 배율 → ×${val}`);
  } else {
    state.cmsPrestigeMult = val;
    recalcCmsMultipliers();
    showNotification(`⚙ 차명석 프레스티지 배율 → ×${val}`);
  }
  adminRenderPrestigeDisplay();
  renderAll();
  saveGame();
}

function adminResetPrestige(who) {
  if (who === 'jsy' || who === 'both') {
    state.prestigeMult = 1;
    recalcMultipliers();
  }
  if (who === 'cms' || who === 'both') {
    state.cmsPrestigeMult = 1;
    recalcCmsMultipliers();
  }
  adminRenderPrestigeDisplay();
  renderAll();
  saveGame();
  const label = who === 'both' ? '전체' : (who === 'jsy' ? '정아영' : '차명석');
  showNotification(`⚙ ${label} 프레스티지 배율 초기화 (×1)`);
}

function adminLogout(){
  adminLoggedIn=false;
  document.getElementById('admin-btn').classList.remove('active');
  document.getElementById('admin-btn').textContent='⚙ ADMIN';
  document.getElementById('admin-login-form').style.display='';
  document.getElementById('admin-stage-panel').style.display='none';
  document.getElementById('admin-status-text').textContent='관리자 비밀번호를 입력하세요';
  closeAdminModal();
}

document.getElementById('admin-modal').addEventListener('click',function(e){if(e.target===this)closeAdminModal();});

// ═══════════════════════════════════════════════════
// SLIME FRIEND POPUP
// ═══════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', ()=>{
  const sfText = document.getElementById('slime-friend-text');
  const sfPopup = document.getElementById('slime-friend-popup');
  if(sfText && sfPopup) {
    sfText.addEventListener('click', (e)=>{
      e.stopPropagation();
      const isOpen = sfPopup.style.display !== 'none';
      sfPopup.style.display = isOpen ? 'none' : 'block';
    });
    document.addEventListener('click', ()=>{ if(sfPopup) sfPopup.style.display='none'; });
    sfPopup.addEventListener('click', e=>e.stopPropagation());
  }
});

// ═══════════════════════════════════════════════════
// UNIT STAT MODAL
// ═══════════════════════════════════════════════════

// 유닛스탯 목록 (나중에 더 추가 예정)
const UNIT_STATS = [
  {
    id: 'slimeFriend',
    name: '슬라임 절친',
    effect: '크리 확률 +25%, 크리 배율 x1.5 상승',
    unlockStage: 9,          // 정아영 stage 기준
    unlockCmsStage: null,    // 차명석 cmsStage 기준 (null = 조건 없음)
    desc: '슬라임이 @@왕국에서 가져온 신비로운 아이템',
  },
  {
    id: 'desperado',
    name: '데스페라도',
    effect: '뽑기 SS 90% / SSS 8% / EX 2% — C~S 등급 완전 소멸',
    unlockStage: null,       // 정아영 stage 조건 없음
    unlockCmsStage: 6,       // 차명석 7레벨 = cmsStage index 6
    desc: '차명석이 어둠의 심연에서 꺼낸 절망의 도박패',
  },
];

function openUnitStatModal() {
  const modal = document.getElementById('unit-stat-modal');
  modal.classList.add('active');
  renderUnitStatList();
}

function closeUnitStatModal() {
  document.getElementById('unit-stat-modal').classList.remove('active');
}

function renderUnitStatList() {
  const list = document.getElementById('unit-stat-list');
  list.innerHTML = '';
  UNIT_STATS.forEach(us => {
    // 해금 조건: 정아영 stage 또는 차명석 cmsStage 중 해당하는 것 확인
    const stageOk    = us.unlockStage    === null || state.stage    >= us.unlockStage;
    const cmsStageOk = us.unlockCmsStage === null || state.cmsStage >= us.unlockCmsStage;
    const unlocked = stageOk && cmsStageOk;
    const isOn = state.equippedUnitStat === us.id;
    // 잠금 힌트 문구
    let lockHint = '';
    if (!unlocked) {
      const hints = [];
      if (us.unlockStage    !== null && state.stage    < us.unlockStage)    hints.push(`정아영 STAGE ${us.unlockStage+1}`);
      if (us.unlockCmsStage !== null && state.cmsStage < us.unlockCmsStage) hints.push(`차명석 LEVEL ${us.unlockCmsStage+1}`);
      lockHint = `<div class="unit-stat-row-locked">🔒 ${hints.join(' & ')} 이상 해방</div>`;
    }
    const row = document.createElement('div');
    row.className = 'unit-stat-row' + (isOn ? ' active-row' : '');
    row.innerHTML = `
      <div class="unit-stat-row-info">
        <div class="unit-stat-row-name">${us.name}</div>
        <div class="unit-stat-row-effect">${us.effect}</div>
        ${lockHint}
      </div>
      <button class="unit-stat-toggle${isOn?' on':''}" ${!unlocked?'disabled':''} onclick="toggleUnitStat('${us.id}', this)">
        ${isOn ? '장착중' : '장착'}
      </button>
    `;
    list.appendChild(row);
  });
}

function toggleUnitStat(id, btn) {
  const us = UNIT_STATS.find(u => u.id === id);
  if(!us) return;
  if(state.equippedUnitStat === id) {
    // 장착 해제
    state.equippedUnitStat = null;
    showNotification(`${us.name} 해제됨`);
  } else {
    // 다른 유닛스탯이 장착되어 있다면 자동으로 교체 (하나만 장착 가능, 정아영/차명석 공유)
    state.equippedUnitStat = id;
    showNotification(`✨ ${us.name} 장착! (정아영/차명석 양쪽에 효과 적용)`);
  }
  recalcMultipliers();
  recalcCmsMultipliers();
  renderUnitStatList();
  renderStats();
  renderClickStats();
  if (document.getElementById('cms-panel').style.display !== 'none') renderCmsPanel();
  saveGame();
}

document.getElementById('unit-stat-modal').addEventListener('click', function(e){
  if(e.target===this) closeUnitStatModal();
});
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
// 은행원 조디 - 환전소 (정아영 EXP → 차명석 EXP)
// ═══════════════════════════════════════════════════
const BANKER_EXCHANGE_RATE = 0.000001; // 기본 환율 (0.0001%)
const BANKER_MAX_PERCENT   = 0.0001;   // 1회 최대 환전 가능량 = 보유 정아영 EXP의 0.01%
const BANKER_DAILY_LIMIT   = 3;        // 하루 최대 환전 횟수

// ── 스마트 환전 계산 (만렙 극한 제한) ──────────────────────────────────────
// 만렙(stage 8) 상태에서 한 번에 거대한 양을 환전하려는 경우 극한 제한 적용
// "거대 환전" 기준: 받는 EXP가 현재 스테이지 gap의 10% 이상이면 캡 적용
function getBankerReceivedExp(inputVal) {
  const rawReceived = inputVal * BANKER_EXCHANGE_RATE;
  const curStage = state.cmsStage;
  const isMaxLevel = (curStage >= CMS_STAGES.length - 1);

  if (!isMaxLevel) {
    // 만렙 아닐 때: 현재→다음 스테이지 gap의 일정 비율로 캡
    const nextStageExp = CMS_STAGES[curStage + 1]?.expReq;
    const curStageExp  = CMS_STAGES[curStage]?.expReq || 0;
    if (nextStageExp !== undefined) {
      const gap = nextStageExp - curStageExp;
      // 받는 EXP가 gap의 10% 이상이면 거대 환전 → gap의 0.1%로 극한 제한
      const hugeThreshold = gap * 0.10;
      const maxCap = gap * 0.001;
      if (rawReceived >= hugeThreshold) {
        return maxCap;
      }
    }
    return rawReceived;
  } else {
    // 만렙일 때: 마지막 스테이지 expReq 기준으로 극한 제한
    // 만렙에서 "다음 스테이지 gap"은 마지막 gap을 재사용
    const lastExp = CMS_STAGES[CMS_STAGES.length - 1].expReq;
    const prevExp = CMS_STAGES[CMS_STAGES.length - 2]?.expReq || 0;
    const gap = lastExp - prevExp;
    // 거대 환전 기준: gap의 10% 이상 → 극한으로 제한 (gap의 0.01%)
    const hugeThreshold = gap * 0.10;
    const maxCap = gap * 0.0001;
    if (rawReceived >= hugeThreshold) {
      return maxCap;
    }
    return rawReceived;
  }
}

// 정아영 업그레이드(테크)를 전부 달성했는지 여부
function allJsyTechMaxed() {
  return UPGRADES.every(u => state.upgrades[u.id]);
}

// 자정 기준 일일 환전 횟수 초기화
function bankerCheckDailyReset() {
  const today = new Date().toDateString();
  if(state.bankerExchangeDate !== today) {
    state.bankerExchangeDate = today;
    state.bankerExchangeCount = 0;
  }
}

// 1회 최대 환전 가능량 (보유 정아영 EXP의 0.01%)
function getBankerMaxAmount() {
  return Math.floor(state.totalExp * BANKER_MAX_PERCENT);
}

function openBankerModal() {
  bankerCheckDailyReset();
  document.getElementById('banker-modal').classList.add('active');
  document.getElementById('banker-amount-input').value = '';
  renderBankerModal();
}

function closeBankerModal() {
  document.getElementById('banker-modal').classList.remove('active');
}

function renderBankerModal() {
  bankerCheckDailyReset();
  document.getElementById('banker-jsy-balance').textContent = formatNum(state.totalExp);
  document.getElementById('banker-cms-balance').textContent = formatNum(state.cmsExp);
  document.getElementById('banker-max-amount').textContent = formatNum(getBankerMaxAmount());
  const remaining = Math.max(0, BANKER_DAILY_LIMIT - state.bankerExchangeCount);
  document.getElementById('banker-remaining-count').textContent = `${remaining} / ${BANKER_DAILY_LIMIT}`;
  const exBtn = document.getElementById('banker-exchange-btn');
  exBtn.disabled = remaining <= 0;
  renderBankerPreview();
}

// 입력값에 따른 환전 결과 미리보기
function renderBankerPreview() {
  const input = document.getElementById('banker-amount-input');
  const previewEl = document.getElementById('banker-preview-text');
  const val = parseFloat(input.value);
  bankerCheckDailyReset();
  const remaining = Math.max(0, BANKER_DAILY_LIMIT - state.bankerExchangeCount);
  const maxAmount = getBankerMaxAmount();
  const exBtn = document.getElementById('banker-exchange-btn');

  if(remaining <= 0) {
    previewEl.textContent = '오늘 환전 횟수를 모두 사용했습니다';
    exBtn.disabled = true;
    return;
  }
  if(isNaN(val) || val <= 0) {
    previewEl.textContent = '환전할 정아영 EXP를 입력하세요';
    exBtn.disabled = true;
    return;
  }
  if(val > state.totalExp) {
    previewEl.textContent = '⚠ 보유한 정아영 EXP보다 많습니다';
    exBtn.disabled = true;
    return;
  }
  if(val > maxAmount) {
    previewEl.innerHTML = `⚠ 1회 최대 환전 가능량(<span class="value">${formatNum(maxAmount)}</span>)을 초과했습니다`;
    exBtn.disabled = true;
    return;
  }
  const received = getBankerReceivedExp(val);
  const rawReceived = val * BANKER_EXCHANGE_RATE;
  const isCapped = received < rawReceived * 0.99;
  let previewMsg = `차명석 EXP <span class="value">${formatNum(received)}</span>(을)를 받습니다`;
  if (isCapped) {
    previewMsg += `<br><span style="color:#ff6644;font-size:0.62rem">⚠ 거대 환전 제한 적용 (기본 환율 적용 시: ${formatNum(rawReceived)})</span>`;
  }
  previewEl.innerHTML = previewMsg;
  exBtn.disabled = false;
}

// 1회 최대 환전 가능량을 입력칸에 채움
function bankerSetMax() {
  const maxAmount = getBankerMaxAmount();
  document.getElementById('banker-amount-input').value = maxAmount;
  renderBankerPreview();
}

// 실제 환전 실행
function doBankerExchange() {
  bankerCheckDailyReset();
  const input = document.getElementById('banker-amount-input');
  const val = parseFloat(input.value);
  const remaining = Math.max(0, BANKER_DAILY_LIMIT - state.bankerExchangeCount);
  const maxAmount = getBankerMaxAmount();

  if(remaining <= 0) { showNotification('⚠ 오늘 환전 횟수를 모두 사용했습니다'); return; }
  if(isNaN(val) || val <= 0) { showNotification('올바른 숫자를 입력하세요'); return; }
  if(val > state.totalExp) { showNotification('⚠ 보유한 정아영 EXP보다 많습니다'); return; }
  if(val > maxAmount) { showNotification(`⚠ 1회 최대 환전 가능량(${formatNum(maxAmount)})을 초과했습니다`); return; }

  const received = getBankerReceivedExp(val);
  state.totalExp -= val;
  addCmsExp(received);
  state.bankerExchangeCount++;

  showNotification(`💰 환전 완료! 정아영 EXP ${formatNum(val)} → 차명석 EXP ${formatNum(received)}`);
  input.value = '';
  renderBankerModal();
  renderAll();
  if (document.getElementById('cms-panel').style.display !== 'none') renderCmsPanel();
  saveGame();
}

document.getElementById('banker-modal').addEventListener('click', function(e){
  if(e.target===this) closeBankerModal();
});
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
// GACHA SYSTEM
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
// ITEM DATA
// ═══════════════════════════════════════════════════
// type: 'expBoost'|'clickBoost'|'autoBoost'|'critUp'|'critMultUp'|'allBoost'|'expFlat'
// duration: ms (0 = 즉시)
const ITEMS = [
  // ── 즉시 EXP ───────────────────────────────────────
  { id:'itm_exp_s',   emoji:'💊', name:'EXP 캡슐 S',      rarity:'일반', desc:'EXP +50,000 즉시',        type:'expFlat',    val:50000,      duration:0    },
  { id:'itm_exp_m',   emoji:'💉', name:'EXP 주사 M',      rarity:'희귀', desc:'EXP +500,000 즉시',       type:'expFlat',    val:500000,     duration:0    },
  { id:'itm_exp_l',   emoji:'🧪', name:'EXP 포션 L',      rarity:'영웅', desc:'EXP +5,000,000 즉시',     type:'expFlat',    val:5000000,    duration:0    },
  { id:'itm_exp_xl',  emoji:'⚗️', name:'EXP 대포션 XL',  rarity:'전설', desc:'EXP +50,000,000 즉시',    type:'expFlat',    val:50000000,   duration:0    },
  { id:'itm_exp_xx',  emoji:'🌟', name:'은하 EXP 결정',   rarity:'신화', desc:'EXP +1,000,000,000 즉시', type:'expFlat',    val:1000000000, duration:0    },

  // ── 시간 부스터 ─────────────────────────────────────
  { id:'itm_click_30', emoji:'⚡', name:'클릭 폭발 (30s)', rarity:'일반', desc:'클릭 EXP ×3 (30초)',      type:'clickBoost', val:3,          duration:30000 },
  { id:'itm_click_60', emoji:'🔥', name:'클릭 폭풍 (60s)', rarity:'희귀', desc:'클릭 EXP ×5 (60초)',      type:'clickBoost', val:5,          duration:60000 },
  { id:'itm_auto_30',  emoji:'🤖', name:'자동 가속 (30s)', rarity:'일반', desc:'자동 EXP ×3 (30초)',      type:'autoBoost',  val:3,          duration:30000 },
  { id:'itm_auto_60',  emoji:'🚀', name:'하이퍼 자동 (60s)',rarity:'희귀', desc:'자동 EXP ×5 (60초)',     type:'autoBoost',  val:5,          duration:60000 },
  { id:'itm_all_30',   emoji:'🌈', name:'전체 부스트 (30s)',rarity:'영웅', desc:'전체 EXP ×4 (30초)',     type:'allBoost',   val:4,          duration:30000 },
  { id:'itm_all_60',   emoji:'💥', name:'황제의 축복 (60s)',rarity:'전설', desc:'전체 EXP ×8 (60초)',     type:'allBoost',   val:8,          duration:60000 },

  // ── 크리티컬 부스터 ──────────────────────────────────
  { id:'itm_crit_30',  emoji:'🎯', name:'크리 집중 (30s)', rarity:'일반', desc:'크리 확률 +20% (30초)',    type:'critUp',     val:0.20,       duration:30000 },
  { id:'itm_cmult_30', emoji:'💀', name:'파멸의 눈 (30s)', rarity:'희귀', desc:'크리 배율 +5 (30초)',      type:'critMultUp', val:5,          duration:30000 },
  { id:'itm_cmult_60', emoji:'💫', name:'신의 일격 (60s)', rarity:'영웅', desc:'크리 배율 +10 (60초)',     type:'critMultUp', val:10,         duration:60000 },
];

const ITEM_RARITY_COLOR = { '일반':'#aaa', '희귀':'#44bbff', '영웅':'#aa44ff', '전설':'#ffaa00', '신화':'#ff44ff' };

// 아이템 사용 임시 효과 (specialEffect 확장)
let itemEffect = {
  clickBoostMult: 1,
  autoBoostMult:  1,
  allBoostMult:   1,
  critChanceUp:   0,
  critMultUp:     0,
  timers:         {},
};

function useItem(itemId) {
  const item = ITEMS.find(i => i.id === itemId);
  if(!item) return;
  if(!(state.items[itemId] > 0)) { showNotification('아이템이 없습니다!'); return; }
  state.items[itemId]--;

  if(item.type === 'expFlat') {
    state.totalExp += item.val;
    checkEvolution();
    renderAll();
    showNotification(`${item.emoji} ${item.name} 사용! EXP +${formatNum(item.val)}`);
    renderItemModal();
    return;
  }

  // 시간 기반 효과 — 기존 타이머가 있으면 초기화 후 재적용
  if(itemEffect.timers[itemId]) {
    clearTimeout(itemEffect.timers[itemId]);
    removeItemEffect(item);
  }

  applyItemEffect(item);

  itemEffect.timers[itemId] = setTimeout(() => {
    removeItemEffect(item);
    delete itemEffect.timers[itemId];
    recalcMultipliers();
    renderAll();
    showNotification(`⌛ ${item.name} 효과 종료`);
  }, item.duration);

  recalcMultipliers();
  renderAll();
  showNotification(`${item.emoji} ${item.name} 사용! (${item.duration/1000}초)`);
  renderItemModal();
}

function applyItemEffect(item) {
  switch(item.type) {
    case 'clickBoost':  itemEffect.clickBoostMult *= item.val; break;
    case 'autoBoost':   itemEffect.autoBoostMult  *= item.val; break;
    case 'allBoost':    itemEffect.allBoostMult   *= item.val; break;
    case 'critUp':      itemEffect.critChanceUp   += item.val; break;
    case 'critMultUp':  itemEffect.critMultUp      += item.val; break;
  }
}

function removeItemEffect(item) {
  switch(item.type) {
    case 'clickBoost':  itemEffect.clickBoostMult /= item.val; break;
    case 'autoBoost':   itemEffect.autoBoostMult  /= item.val; break;
    case 'allBoost':    itemEffect.allBoostMult   /= item.val; break;
    case 'critUp':      itemEffect.critChanceUp   -= item.val; break;
    case 'critMultUp':  itemEffect.critMultUp      -= item.val; break;
  }
}

// 아이템 모달
function openItemModal() {
  document.getElementById('item-modal').classList.add('active');
  renderItemModal();
}
function closeItemModal() {
  document.getElementById('item-modal').classList.remove('active');
}

function renderItemModal() {
  const grid = document.getElementById('item-grid');
  const empty = document.getElementById('item-empty');
  const ownedItems = ITEMS.filter(i => state.items[i.id] > 0);
  grid.innerHTML = '';

  if(ownedItems.length === 0) {
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  ownedItems.forEach(item => {
    const div = document.createElement('div');
    const rarityColor = ITEM_RARITY_COLOR[item.rarity] || '#aaa';
    const isActive = !!itemEffect.timers[item.id];
    div.className = 'item-card' + (isActive ? ' item-active' : '');
    div.style.borderColor = rarityColor;
    div.innerHTML = `
      <div class="item-count" style="background:${rarityColor}22;color:${rarityColor}">×${state.items[item.id]}</div>
      <div class="item-emoji">${item.emoji}</div>
      <div class="item-rarity" style="color:${rarityColor}">${item.rarity}</div>
      <div class="item-name">${item.name}</div>
      <div class="item-desc">${item.desc}</div>
      ${isActive ? `<div class="item-active-badge">사용중</div>` : ''}
      <button class="item-use-btn" onclick="useItem('${item.id}')" style="border-color:${rarityColor};color:${rarityColor}">사용</button>
    `;
    grid.appendChild(div);
  });
}

// ── 뽑기 비용: 스테이지 기반 고정 기준 비용 + 횟수별 지수 증가 ─────────────
// baseCost = 스테이지별 고정값 (동적 수익 기반 대신 명확한 고정값 사용)
// n번째 뽑기 비용 = baseCost × (n+1)^2.0
const JSY_GACHA_BASE_COST_BY_STAGE = [
  20000,        // stage 0
  50000,        // stage 1
  200000,       // stage 2
  1000000,      // stage 3
  5000000,      // stage 4
  25000000,     // stage 5
  150000000,    // stage 6
  1000000000,   // stage 7
  8000000000,   // stage 8
  60000000000,  // stage 9
  500000000000, // stage 10
  3000000000000,// stage 11
  20000000000000,// stage 12
];
function getGachaBaseCost() {
  return JSY_GACHA_BASE_COST_BY_STAGE[Math.min(state.stage, JSY_GACHA_BASE_COST_BY_STAGE.length - 1)];
}
function getGachaCostMult(pullIndex) {
  return Math.pow(pullIndex + 1, 2.0);
}
function getGachaPullRate() { return 2.0; } // 표시용 (하위 호환)
function getCurrentGachaCost() {
  return Math.ceil(getGachaBaseCost() * getGachaCostMult(state.gachaPullCount));
}
function getGachaTotalCost(count) {
  const base = getGachaBaseCost();
  let total = 0;
  for(let i = 0; i < count; i++) {
    total += Math.ceil(base * getGachaCostMult(state.gachaPullCount + i));
  }
  return total;
}

// ── 차명석 전용 가챠 비용 (스테이지 기반 고정값) ─────────────────────
const CMS_GACHA_BASE_COST_BY_STAGE = [
  15000,         // cmsStage 0
  60000,         // cmsStage 1
  400000,        // cmsStage 2
  3000000,       // cmsStage 3
  20000000,      // cmsStage 4
  150000000,     // cmsStage 5
  1200000000,    // cmsStage 6
  10000000000,   // cmsStage 7
  100000000000,  // cmsStage 8
];
function getCmsGachaBaseCost() {
  return CMS_GACHA_BASE_COST_BY_STAGE[Math.min(state.cmsStage, CMS_GACHA_BASE_COST_BY_STAGE.length - 1)];
}
function getCurrentCmsGachaCost() {
  return Math.ceil(getCmsGachaBaseCost() * getGachaCostMult(state.cmsGachaPullCount));
}
function getCmsGachaTotalCost(count) {
  const base = getCmsGachaBaseCost();
  let total = 0;
  for(let i = 0; i < count; i++) {
    total += Math.ceil(base * getGachaCostMult(state.cmsGachaPullCount + i));
  }
  return total;
}
function getCmsGachaPool() {
  return CMS_GACHA_CARDS.filter(c => c.unlockStage <= state.cmsStage);
}
function getCmsGachaProbs() {
  // 데스페라도 장착 시: C~S 소멸, SS 90% / SSS 8% / EX 2%
  if (state.equippedUnitStat === 'desperado') return [0, 0, 0, 0, 90, 8, 2];
  const idx = Math.min(state.cmsStage, CMS_GACHA_PROB_BY_STAGE.length - 1);
  return CMS_GACHA_PROB_BY_STAGE[idx];
}
function pickCmsGachaCard() {
  const probs = getCmsGachaProbs();
  const pool  = getCmsGachaPool();
  const r = Math.random() * 100;
  let cum = 0, pickedGrade = 'C';
  for(let i = 0; i < GRADE_ORDER.length; i++){
    cum += probs[i];
    if(r < cum){ pickedGrade = GRADE_ORDER[i]; break; }
  }
  const gradePool = pool.filter(c => c.grade === pickedGrade);
  if(gradePool.length === 0){
    // 데스페라도 장착 시 fallback: SS (C~S pool 없음)
    const fbGrade = state.equippedUnitStat === 'desperado' ? 'SS' : 'C';
    const fallback = pool.filter(c => c.grade === fbGrade);
    return fallback[Math.floor(Math.random() * fallback.length)] || pool[pool.length-1];
  }
  return gradePool[Math.floor(Math.random() * gradePool.length)];
}

// 현재 가챠 모드: 'jsy' 또는 'cms'
let _gachaMode = 'jsy';

function getGachaPool() {
  return GACHA_CARDS.filter(c => c.unlockStage <= state.stage);
}

function getGachaProbs() {
  // 데스페라도 장착 시: C~S 소멸, SS 90% / SSS 8% / EX 2%
  if (state.equippedUnitStat === 'desperado') return [0, 0, 0, 0, 90, 8, 2];
  const idx = Math.min(state.stage, GACHA_PROB_BY_STAGE.length-1);
  return GACHA_PROB_BY_STAGE[idx]; // [C,B,A,S,SS,SSS,EX]
}

function pickGachaCard() {
  const probs = getGachaProbs();
  const pool = getGachaPool();
  // 등급 선택
  const r = Math.random()*100;
  let cum=0, pickedGrade='C';
  for(let i=0;i<GRADE_ORDER.length;i++){
    cum+=probs[i];
    if(r<cum){ pickedGrade=GRADE_ORDER[i]; break; }
  }
  // 해당 등급 카드 중 랜덤
  const gradePool = pool.filter(c=>c.grade===pickedGrade);
  if(gradePool.length===0){
    // 데스페라도 장착 시 fallback: SS (C~S pool 없음)
    const fbGrade = state.equippedUnitStat === 'desperado' ? 'SS' : 'C';
    const fallback = pool.filter(c=>c.grade===fbGrade);
    return fallback[Math.floor(Math.random()*fallback.length)] || pool[pool.length-1];
  }
  return gradePool[Math.floor(Math.random()*gradePool.length)];
}

// ═══════════════════════════════════════════════════
// GACHA ANIMATION ENGINE
// ═══════════════════════════════════════════════════

let _gachaAnimResults = [];
let _gachaSingleIdx   = 0;
let _gachaPortalAnim  = null;
let _gachaStarAnim    = null;

// ── 등급별 테마 ──────────────────────────────────────
const GRADE_THEME = {
  C:   { color:'#aaaaaa', glow:'rgba(170,170,170,.4)', bg:'linear-gradient(135deg,#0d0d0d,#1a1a1a)', text:'#aaa' },
  B:   { color:'#44bbff', glow:'rgba(68,187,255,.4)',  bg:'linear-gradient(135deg,#00101e,#001c30)', text:'#44bbff' },
  A:   { color:'#44ff88', glow:'rgba(68,255,136,.4)',  bg:'linear-gradient(135deg,#001810,#002a18)', text:'#44ff88' },
  S:   { color:'#ffdd00', glow:'rgba(255,221,0,.5)',   bg:'linear-gradient(135deg,#1a1400,#2a2000)', text:'#ffdd00' },
  SS:  { color:'#ff8844', glow:'rgba(255,136,68,.55)', bg:'linear-gradient(135deg,#1a0800,#2a1000)', text:'#ff8844' },
  SSS: { color:'#ff44aa', glow:'rgba(255,68,170,.6)',  bg:'linear-gradient(135deg,#1a0018,#2a0028)', text:'#ff44aa' },
  EX:  { color:'#cc44ff', glow:'rgba(204,68,255,.8)',  bg:'linear-gradient(135deg,#0e0020,#1a003a)', text:'#cc44ff' },
};

// ── Web Audio: 화려한 가챠 사운드 패키지 ─────────────────
function playGachaIntroSound() {
  if(!audioCtx || !sfxOn) return;
  const now = audioCtx.currentTime;
  // 드럼롤 느낌 — 잦은 노이즈 버스트
  for(let i = 0; i < 12; i++) {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    const filt = audioCtx.createBiquadFilter();
    o.connect(filt); filt.connect(g); g.connect(audioCtx.destination);
    o.type = 'sawtooth';
    const baseHz = 80 + i * 18;
    o.frequency.setValueAtTime(baseHz, now + i * 0.045);
    o.frequency.exponentialRampToValueAtTime(baseHz * 2.5, now + i * 0.045 + 0.04);
    filt.type = 'bandpass'; filt.frequency.value = 400 + i * 80; filt.Q.value = 3;
    const t = now + i * 0.045;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.start(t); o.stop(t + 0.07);
  }
  // 포탈 윙 스윕
  const sweep = audioCtx.createOscillator(), sg = audioCtx.createGain();
  sweep.connect(sg); sg.connect(audioCtx.destination);
  sweep.type = 'sine';
  sweep.frequency.setValueAtTime(80, now + 0.1);
  sweep.frequency.exponentialRampToValueAtTime(600, now + 0.65);
  sg.gain.setValueAtTime(0, now + 0.08);
  sg.gain.linearRampToValueAtTime(0.18, now + 0.25);
  sg.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
  sweep.start(now + 0.08); sweep.stop(now + 1.0);
}

function playGachaCardRevealSound(gradeIdx) {
  if(!audioCtx || !sfxOn) return;
  const now = audioCtx.currentTime;
  const isHigh = gradeIdx >= 4;
  const isEx   = gradeIdx === 6;

  if(isEx) {
    // EX: 심장 터지는 다층 화음 + 폭발
    const chord = [523, 659, 784, 1047, 1319, 1568];
    chord.forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.type = i < 3 ? 'triangle' : 'sine';
      o.frequency.value = f;
      const t = now + i * 0.03;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16 - i * 0.018, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      o.start(t); o.stop(t + 1.3);
    });
    // 폭발 노이즈
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.3, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for(let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * Math.exp(-j / (audioCtx.sampleRate * 0.08));
    const src = audioCtx.createBufferSource(), ng = audioCtx.createGain();
    const filt = audioCtx.createBiquadFilter();
    src.buffer = buf; src.connect(filt); filt.connect(ng); ng.connect(audioCtx.destination);
    filt.type = 'bandpass'; filt.frequency.value = 1200; filt.Q.value = 0.5;
    ng.gain.setValueAtTime(0.22, now); ng.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    src.start(now); src.stop(now + 0.36);
  } else if(isHigh) {
    // SSS/SS: 반짝이는 아르페지오
    const notes = gradeIdx === 5
      ? [523, 659, 784, 1047, 1319]
      : [440, 554, 659, 880, 1109];
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.type = 'triangle'; o.frequency.value = f;
      const t = now + i * 0.055;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.13, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      o.start(t); o.stop(t + 0.6);
    });
  } else {
    // C~S: 짧은 징글
    const freqMap = [330, 392, 440, 523];
    const f = freqMap[Math.min(gradeIdx, 3)];
    [f, f * 1.25].forEach((freq, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.type = 'square'; o.frequency.value = freq;
      const t = now + i * 0.07;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.08, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.start(t); o.stop(t + 0.25);
    });
  }
}

function playGachaResultBGM(bestGradeIdx) {
  if(!audioCtx) return;
  stopSpecialBGM();
  const melodies = [
    [330,392,440,392,330],             // C
    [392,440,523,440,392],             // B
    [440,523,587,523,440],             // A
    [523,659,784,659,523],             // S
    [587,740,880,1047,880,740,587],    // SS
    [659,784,1047,1175,1319,1175,1047,784], // SSS
    [523,659,784,1047,1319,1568,1319,1047,784,659], // EX
  ];
  const mel = melodies[Math.min(bestGradeIdx, 6)];
  const colors = ['#aaa','#44bbff','#44ff88','#ffdd00','#ff8844','#ff44aa','#cc44ff'];
  startSpecialBGM(colors[bestGradeIdx] || '#aa44ff');
}

// ── 파티클 캔버스 유틸 ──────────────────────────────────
function startPortalCanvas(canvasId, color, speed = 1) {
  const canvas = document.getElementById(canvasId);
  if(!canvas) return null;
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;

  // 파티클
  const particles = Array.from({length: 200}, () => ({
    angle: Math.random() * Math.PI * 2,
    r: 20 + Math.random() * 60,
    speed: (0.8 + Math.random() * 1.2) * speed,
    size: 1.5 + Math.random() * 3,
    opacity: Math.random(),
    trail: [],
    color: Math.random() > 0.4 ? color : '#ffffff',
  }));

  // 링 빔
  const beams = Array.from({length: 12}, (_, i) => ({
    angle: (i / 12) * Math.PI * 2,
    len: 80 + Math.random() * 100,
    width: 1 + Math.random() * 2,
    speed: 0.02 + Math.random() * 0.03,
  }));

  let frame = 0;
  let raf;
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // 포탈 링
    const t = frame * 0.03;
    beams.forEach(b => {
      b.angle += b.speed * speed;
      const x2 = cx + Math.cos(b.angle) * b.len * (1 + 0.3 * Math.sin(t));
      const y2 = cy + Math.sin(b.angle) * b.len * (1 + 0.3 * Math.sin(t));
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = color + '55';
      ctx.lineWidth = b.width;
      ctx.stroke();
    });

    // 중앙 글로우
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 140);
    grad.addColorStop(0, color + 'aa');
    grad.addColorStop(0.4, color + '33');
    grad.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(cx, cy, 140, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // 파티클
    particles.forEach(p => {
      p.angle += 0.018 * speed;
      p.r += 1.4 * speed;
      p.opacity -= 0.008;
      if(p.r > Math.max(W, H) * 0.85 || p.opacity <= 0) {
        p.angle = Math.random() * Math.PI * 2;
        p.r = 10 + Math.random() * 40;
        p.opacity = 0.7 + Math.random() * 0.3;
        p.trail = [];
      }
      const px = cx + Math.cos(p.angle) * p.r;
      const py = cy + Math.sin(p.angle) * p.r;
      p.trail.push({x: px, y: py});
      if(p.trail.length > 8) p.trail.shift();

      // 트레일
      if(p.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        p.trail.forEach(pt => ctx.lineTo(pt.x, pt.y));
        ctx.strokeStyle = p.color + Math.floor(p.opacity * 99).toString(16).padStart(2,'0');
        ctx.lineWidth = p.size * 0.6;
        ctx.stroke();
      }

      // 헤드
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2,'0');
      ctx.fill();
    });

    frame++;
    raf = requestAnimationFrame(draw);
  }
  draw();
  return () => cancelAnimationFrame(raf);
}

function startStarCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if(!canvas) return null;
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const stars = Array.from({length: 300}, () => ({
    x: Math.random() * W, y: Math.random() * H,
    r: Math.random() * 2, opacity: Math.random() * 0.6 + 0.1,
    dx: (Math.random() - 0.5) * 0.3, dy: (Math.random() - 0.5) * 0.3,
  }));
  // 파이어웍스
  const fireworks = [];
  function spawnFw() {
    fireworks.push({
      x: Math.random() * W, y: Math.random() * H * 0.7,
      particles: Array.from({length: 30}, () => {
        const a = Math.random() * Math.PI * 2;
        const s = 2 + Math.random() * 4;
        return { dx: Math.cos(a)*s, dy: Math.sin(a)*s, x:0, y:0, life:1, color:`hsl(${Math.random()*360},100%,70%)` };
      }),
    });
  }
  spawnFw(); spawnFw();
  let fwTimer = setInterval(spawnFw, 600);

  let raf;
  function draw() {
    ctx.fillStyle = 'rgba(0,0,0,.15)';
    ctx.fillRect(0, 0, W, H);

    stars.forEach(s => {
      s.x += s.dx; s.y += s.dy;
      if(s.x < 0) s.x = W; if(s.x > W) s.x = 0;
      if(s.y < 0) s.y = H; if(s.y > H) s.y = 0;
      s.opacity += (Math.random() - 0.5) * 0.05;
      s.opacity = Math.max(0.05, Math.min(0.7, s.opacity));
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(200,230,255,${s.opacity})`; ctx.fill();
    });

    for(let i = fireworks.length - 1; i >= 0; i--) {
      const fw = fireworks[i];
      let alive = false;
      fw.particles.forEach(p => {
        if(p.life <= 0) return;
        p.x += p.dx; p.y += p.dy;
        p.dy += 0.08;
        p.life -= 0.022;
        if(p.life > 0) alive = true;
        ctx.beginPath();
        ctx.arc(fw.x + p.x, fw.y + p.y, 2.5, 0, Math.PI*2);
        ctx.fillStyle = p.color + Math.floor(p.life * 255).toString(16).padStart(2,'0');
        ctx.fill();
      });
      if(!alive) fireworks.splice(i, 1);
    }

    raf = requestAnimationFrame(draw);
  }
  draw();
  return () => { cancelAnimationFrame(raf); clearInterval(fwTimer); };
}

// ── 씬 전환 ──────────────────────────────────────────
function gachaShowScene(id) {
  ['gacha-scene-intro','gacha-scene-single','gacha-scene-result'].forEach(s => {
    document.getElementById(s).classList.remove('active');
  });
  document.getElementById(id).classList.add('active');
}

// ── 메인 뽑기 함수 ───────────────────────────────────
function gachaPull(count) { saveToFirebase();
  initAudio();
  if(_gachaMode === 'cms'){
    // 차명석 뽑기: cmsExp 소모
    const cost = getCmsGachaTotalCost(count);
    if(state.cmsExp < cost){ showNotification('💀 EXP가 부족합니다!'); return; }
    state.cmsExp -= cost;
    state.cmsGachaPullCount += count;
    const results = [];
    for(let i = 0; i < count; i++){
      const card  = pickCmsGachaCard();
      const isDup = !!state.cmsGachaCards[card.id];
      if(isDup){
        if(state.equippedUnitStat === 'desperado'){
          state.cmsDesperadoShards[card.grade] = (state.cmsDesperadoShards[card.grade]||0)+1;
        } else {
          state.cmsGachaShards[card.grade] = (state.cmsGachaShards[card.grade]||0)+1;
        }
      } else { state.cmsGachaCards[card.id] = true; }
      results.push({ card, isDup });
    }
    recalcCmsMultipliers();
    renderAll();
    _gachaAnimResults = results;
    _gachaSingleIdx   = 0;
    showGachaAnim(count);
    return;
  }
  // 정아영 뽑기: EXP 소모
  const cost = getGachaTotalCost(count);
  if(state.totalExp < cost){ showNotification('EXP가 부족합니다!'); return; }
  state.totalExp -= cost;
  state.gachaPullCount += count;

  const results = [];
  for(let i = 0; i < count; i++) {
    const card  = pickGachaCard();
    const isDup = !!state.gachaCards[card.id];
    if(isDup) {
      if(state.equippedUnitStat === 'desperado'){
        state.desperadoShards[card.grade] = (state.desperadoShards[card.grade] || 0) + 1;
      } else {
        state.gachaShards[card.grade] = (state.gachaShards[card.grade] || 0) + 1;
      }
    } else {
      state.gachaCards[card.id] = true;
    }
    results.push({ card, isDup });
  }
  recalcMultipliers();
  renderAll();

  _gachaAnimResults = results;
  _gachaSingleIdx   = 0;

  // 인트로 씬 시작
  showGachaAnim(count);
}

let _introPendingTimeout = null;
function showGachaAnim(count) {
  const overlay = document.getElementById('gacha-anim-overlay');
  overlay.classList.add('active');
  document.getElementById('gacha-intro-count').textContent = count === 1 ? '✦ 1 ✦' : `✦ ${count} ✦`;
  document.getElementById('gacha-intro-sub').textContent = count === 1 ? '카드를 소환합니다...' : `${count}장 동시 소환!`;

  if(_gachaPortalAnim) _gachaPortalAnim();
  _gachaPortalAnim = startPortalCanvas('gacha-portal-canvas', '#aa44ff', count === 10 ? 1.8 : 1.0);

  gachaShowScene('gacha-scene-intro');
  playGachaIntroSound();

  const delay = count === 1 ? 1200 : 900;
  if(_introPendingTimeout) clearTimeout(_introPendingTimeout);
  _introPendingTimeout = setTimeout(() => {
    // 1회든 10회든 모두 카드 한 장씩 뒤집기 씬으로
    _gachaSingleIdx = 0;
    gachaAnimShowSingle(0);
  }, delay);
}

// ── 1회 뽑기: 카드 뒤집기 연출 ──────────────────────
let _cardFlipped = false;

function gachaAnimShowSingle(idx) {
  _cardFlipped = false;
  _gachaSingleIdx = idx; // 동기화
  const { card, isDup } = _gachaAnimResults[idx];
  const theme = GRADE_THEME[card.grade] || GRADE_THEME['C'];
  const gradeIdx = GRADE_ORDER.indexOf(card.grade);

  if(_gachaPortalAnim) _gachaPortalAnim();
  _gachaPortalAnim = startPortalCanvas('gacha-single-canvas', theme.color, 1.0);

  gachaShowScene('gacha-scene-single');

  // 카드 뒷면 내용 세팅
  const back = document.getElementById('gflip-back');
  back.style.background  = theme.bg;
  back.style.borderColor = theme.color;
  back.style.boxShadow   = `0 0 60px ${theme.glow}, inset 0 0 30px rgba(0,0,0,0.5)`;

  const dupBadge = isDup ? `<div style="font-size:.58rem;color:#ff8844;background:rgba(255,136,68,0.15);border:1px solid #ff8844;border-radius:6px;padding:2px 8px;margin-top:4px;">파편+1</div>` : '';
  const effectText = _getCardEffectLabel(card);
  back.innerHTML = `
    <div style="font-size:3.5rem;filter:drop-shadow(0 0 16px ${theme.color});text-align:center;">${card.emoji}</div>
    <div style="font-family:'Orbitron',monospace;font-size:1rem;font-weight:900;color:${theme.color};text-shadow:0 0 16px ${theme.color};letter-spacing:3px;">${card.grade}</div>
    <div style="font-size:.82rem;color:#eee;font-weight:700;text-align:center;max-width:160px;">${card.name}</div>
    <div style="font-size:.68rem;color:${theme.color};opacity:.8;text-align:center;max-width:160px;">${effectText}</div>
    ${dupBadge}
  `;

  // 앞면 리셋 (transition 없이 즉시 리셋하여 다음 카드 뒷면 미리보임 방지)
  const inner = document.getElementById('gflip-inner');
  inner.style.transition = 'none';
  inner.classList.remove('flipped');
  // 강제 reflow 후 transition 복원
  void inner.offsetWidth;
  inner.style.transition = '';
  document.getElementById('gflip-tap-hint').style.display = 'block';
  document.getElementById('gacha-single-next-btn').style.display = 'none';

  // 이펙트 요소 초기화
  document.getElementById('grade-fx-overlay').className = 'grade-fx-overlay';
  document.getElementById('lightbeam-container').classList.remove('active');
  document.getElementById('lightbeam-container').innerHTML = '';

  playGachaIntroSound();
}

function _getCardEffectLabel(card) {
  if(card.type === 'clickMult')  return `클릭 EXP ×${card.val}`;
  if(card.type === 'autoMult')   return `자동 EXP ×${card.val}`;
  if(card.type === 'critChance') return `크리 확률 +${(card.val*100).toFixed(1)}%`;
  if(card.type === 'critMult')   return `크리 배율 +${card.val}`;
  if(card.type === 'allMult')    return `전체 EXP ×${card.val}`;
  return card.desc;
}

// 클릭으로 카드 뒤집기
function gachaFlipCard() {
  if(_cardFlipped) return;
  _cardFlipped = true;

  const inner = document.getElementById('gflip-inner');
  inner.classList.add('flipped');
  document.getElementById('gflip-tap-hint').style.display = 'none';

  const { card } = _gachaAnimResults[_gachaSingleIdx];
  const gradeIdx = GRADE_ORDER.indexOf(card.grade);

  // 효과음
  playGachaCardRevealSound(gradeIdx);

  // 고등급 이펙트
  if(gradeIdx >= 4) { // SS 이상
    setTimeout(() => _triggerGradeEffect(gradeIdx, card), 400);
  }
  if(gradeIdx >= 5) playGachaResultBGM(gradeIdx);

  // 카운터 업데이트
  const counter = document.getElementById('gacha-card-counter');
  if(counter) {
    const total = _gachaAnimResults.length;
    if(total > 1) {
      counter.textContent = `${_gachaSingleIdx + 1} / ${total}`;
      counter.style.display = 'block';
    } else {
      counter.style.display = 'none';
    }
  }
  // 다음 버튼 표시
  setTimeout(() => {
    const nextBtn = document.getElementById('gacha-single-next-btn');
    if(nextBtn) {
      const isLast = (_gachaSingleIdx >= _gachaAnimResults.length - 1);
      nextBtn.textContent = isLast ? '결과 보기 ✦' : `다음 ▶  (${_gachaSingleIdx+2}/${_gachaAnimResults.length})`;
      nextBtn.style.display = 'block';
    }
  }, 700);
}

// 고등급 이펙트
function _triggerGradeEffect(gradeIdx, card) {
  const overlay = document.getElementById('grade-fx-overlay');
  const beamCon = document.getElementById('lightbeam-container');
  const theme = GRADE_THEME[card.grade];

  overlay.className = 'grade-fx-overlay active';
  if(gradeIdx >= 6) overlay.classList.add('fx-EX');
  else if(gradeIdx >= 5) overlay.classList.add('fx-SSS');
  else overlay.style.background = `radial-gradient(ellipse at center, ${theme.color}22 0%, transparent 70%)`;

  // 빛줄기
  const beamCount = gradeIdx >= 6 ? 16 : gradeIdx >= 5 ? 10 : 6;
  beamCon.innerHTML = '';
  beamCon.classList.add('active');
  for(let i = 0; i < beamCount; i++) {
    const b = document.createElement('div');
    b.className = 'lightbeam';
    const angle = (i / beamCount) * 360;
    b.style.cssText = `
      transform: translateX(-50%) rotate(${angle}deg);
      background: linear-gradient(to bottom, ${theme.color}cc, transparent);
      animation-delay: ${i * 0.03}s;
      opacity: ${0.3 + (gradeIdx - 4) * 0.15};
    `;
    beamCon.appendChild(b);
  }
  setTimeout(() => {
    overlay.classList.remove('active');
    beamCon.classList.remove('active');
  }, gradeIdx >= 6 ? 1800 : 1200);
}

function gachaAnimNext() {
  _gachaSingleIdx++;
  if(_gachaSingleIdx < _gachaAnimResults.length) {
    // 다음 카드
    // 포탈 애니 정리 후 다음 씬
    if(_gachaPortalAnim) { _gachaPortalAnim(); _gachaPortalAnim = null; }
    gachaAnimShowSingle(_gachaSingleIdx);
  } else {
    // 모두 봤으면 결과 씬
    gachaAnimShowResult();
  }
}

// 전체 스킵
function gachaSkipAll() {
  if(_introPendingTimeout) { clearTimeout(_introPendingTimeout); _introPendingTimeout = null; }
  if(_gachaPortalAnim) { _gachaPortalAnim(); _gachaPortalAnim = null; }
  if(_gachaStarAnim)   { _gachaStarAnim(); _gachaStarAnim = null; }
  const fxOv = document.getElementById('grade-fx-overlay');
  if(fxOv) fxOv.className = 'grade-fx-overlay';
  const bc = document.getElementById('lightbeam-container');
  if(bc) { bc.classList.remove('active'); bc.innerHTML = ''; }
  gachaAnimShowResult();
}

// ── 결과 씬 ─────────────────────────────────────────
function gachaAnimShowResult() {
  if(_gachaPortalAnim) _gachaPortalAnim();
  if(_gachaStarAnim)   _gachaStarAnim();

  const bestResult = _gachaAnimResults.reduce((b, r) => {
    return GRADE_ORDER.indexOf(r.card.grade) > GRADE_ORDER.indexOf(b.card.grade) ? r : b;
  }, _gachaAnimResults[0]);
  const bestGradeIdx = GRADE_ORDER.indexOf(bestResult.card.grade);
  const bestTheme    = GRADE_THEME[bestResult.card.grade] || GRADE_THEME['C'];

  _gachaStarAnim = startStarCanvas('gacha-result-canvas');

  gachaShowScene('gacha-scene-result');

  // 결과 헤더
  document.getElementById('gacha-result-title').style.color = bestTheme.color;
  document.getElementById('gacha-result-title').style.textShadow = `0 0 20px ${bestTheme.color}`;
  const bestEl = document.getElementById('gacha-result-best');
  bestEl.textContent  = `최고 등급: ${bestResult.card.grade} · ${bestResult.card.emoji} ${bestResult.card.name}`;
  bestEl.style.color  = bestTheme.color;

  // 카드 그리드
  const grid = document.getElementById('gacha-result-cards');
  grid.innerHTML = '';
  _gachaAnimResults.forEach((r, i) => {
    const { card, isDup } = r;
    const gi = GRADE_ORDER.indexOf(card.grade);
    const div = document.createElement('div');
    div.className = `gacha-card ${GRADE_BG[card.grade]}${isDup?' is-dup':''}`;
    if(gi >= 3) div.classList.add(`glow-${card.grade}`);
    div.style.animationDelay = (i * 0.06) + 's';
    div.style.borderColor = GRADE_COLORS[card.grade];
    div.innerHTML = `
      ${isDup ? `<div class="card-dup">파편+1</div>` : ''}
      <div class="card-emoji">${card.emoji}</div>
      <div class="card-grade" style="color:${GRADE_COLORS[card.grade]}">${card.grade}</div>
      <div class="card-name">${card.name}</div>
    `;
    grid.appendChild(div);
  });

  playGachaResultBGM(bestGradeIdx);
}

function closeGachaResult() {
  if(_gachaPortalAnim) { _gachaPortalAnim(); _gachaPortalAnim = null; }
  if(_gachaStarAnim)   { _gachaStarAnim();   _gachaStarAnim   = null; }
  document.getElementById('gacha-anim-overlay').classList.remove('active');
  ['gacha-scene-intro','gacha-scene-single','gacha-scene-result'].forEach(s =>
    document.getElementById(s).classList.remove('active')
  );
  stopSpecialBGM();
  if(musicOn) startBgmForTab();
  renderGachaModal();
}

// ── 기존 showGachaResult/playGachaSound 래퍼 (호환용) ─
function showGachaResult(results) { /* 새 엔진이 담당 */ }
function playGachaSound(results) { /* 새 엔진이 담당 */ }

// ── 카드 효과 요약 렌더 ──────────────────────────────────────────
function renderGachaStats() {
  const el = document.getElementById('gacha-stats-content');
  if(!el) return;

  const allCards = _gachaMode === 'cms' ? CMS_GACHA_CARDS : GACHA_CARDS;
  const cardState = _gachaMode === 'cms' ? state.cmsGachaCards : state.gachaCards;
  const owned = allCards.filter(c => cardState[c.id]);
  const unitLabel = 'EXP';
  if(owned.length === 0) {
    el.innerHTML = '<div class="gstat-empty">보유한 카드가 없습니다.<br>뽑기를 시작해 보세요!</div>';
    return;
  }

  // 카테고리별 분류
  const cats = [
    { key: 'clickMult',  label: `🖱 클릭 ${unitLabel}`,   color: '#39ff14', unit: '×', isMultiply: true },
    { key: 'autoMult',   label: `⚙ 자동 ${unitLabel}`,   color: '#00ffcc', unit: '×', isMultiply: true },
    { key: 'critChance', label: '🎯 크리 확률',            color: '#ffaa00', unit: '%', isMultiply: false },
    { key: 'critMult',   label: '💥 크리 배율',            color: '#ff4488', unit: '',  isMultiply: false },
    { key: 'allMult',    label: `✨ 전체 ${unitLabel}`,    color: '#cc44ff', unit: '×', isMultiply: true },
  ];

  let html = '';
  cats.forEach(cat => {
    const cards = owned.filter(c => c.type === cat.key);
    if(cards.length === 0) return;

    let total = cat.isMultiply ? 1 : 0;
    cards.forEach(c => {
      if(cat.isMultiply) total *= c.val;
      else total += c.val;
    });

    // allMult는 click/auto 둘 다 적용되므로 설명 추가
    const catNote = cat.key === 'allMult' ? ' (클릭+자동 모두 적용)' : '';

    html += `<div class="gstat-category">`;
    html += `<div class="gstat-cat-title" style="color:${cat.color};">${cat.label}<span style="font-size:.5rem;color:#555;font-weight:400;">${catNote}</span></div>`;

    cards.forEach(c => {
      const gradeColor = GRADE_COLORS[c.grade] || '#aaa';
      let valStr = '';
      if(cat.key === 'critChance') valStr = `+${(c.val*100).toFixed(1)}%`;
      else if(cat.key === 'critMult') valStr = `+${c.val}`;
      else valStr = `×${c.val}`;

      html += `<div class="gstat-row">
        <span class="gstat-card-name">
          ${c.emoji}
          <span class="gstat-grade-badge" style="color:${gradeColor};border-color:${gradeColor}22;">${c.grade}</span>
          ${c.name}
        </span>
        <span class="gstat-val" style="color:${cat.color};">${valStr}</span>
      </div>`;
    });

    // 합계
    let totalStr = '';
    if(cat.key === 'critChance') totalStr = `+${(total*100).toFixed(1)}%`;
    else if(cat.key === 'critMult') totalStr = `+${total.toFixed(2)}`;
    else totalStr = `×${total.toFixed(4)}`;

    html += `<div class="gstat-total-row">
      <span style="color:#666;">카드 합계</span>
      <span style="color:${cat.color};">${totalStr}</span>
    </div>`;
    html += `</div>`;
  });

  // 현재 실제 적용 수치 요약
  if(_gachaMode === 'cms'){
    html += `<div class="gstat-category" style="border-color:rgba(255,255,255,0.1);">
      <div class="gstat-cat-title" style="color:#cc4444;">💀 차명석 현재 적용 수치</div>
      <div class="gstat-row"><span class="gstat-card-name">클릭 EXP 배율</span><span class="gstat-val" style="color:#ff6666;">×${state.cmsClickMult.toFixed(3)}</span></div>
      <div class="gstat-row"><span class="gstat-card-name">자동 EXP 배율</span><span class="gstat-val" style="color:#ff8888;">×${state.cmsAutoMult.toFixed(3)}</span></div>
      <div class="gstat-row"><span class="gstat-card-name">크리티컬 확률</span><span class="gstat-val" style="color:#ffaa00;">${(state.cmsCritChance*100).toFixed(1)}%</span></div>
      <div class="gstat-row"><span class="gstat-card-name">크리티컬 배율</span><span class="gstat-val" style="color:#ff4488;">×${state.cmsCritMult.toFixed(2)}</span></div>
    </div>`;
  } else {
    html += `<div class="gstat-category" style="border-color:rgba(255,255,255,0.1);">
      <div class="gstat-cat-title" style="color:#fff;">⚡ 현재 실제 적용 수치</div>
      <div class="gstat-row"><span class="gstat-card-name">클릭 EXP 배율</span><span class="gstat-val" style="color:#39ff14;">×${state.clickMult.toFixed(3)}</span></div>
      <div class="gstat-row"><span class="gstat-card-name">자동 EPS 배율</span><span class="gstat-val" style="color:#00ffcc;">×${state.autoMult.toFixed(3)}</span></div>
      <div class="gstat-row"><span class="gstat-card-name">크리티컬 확률</span><span class="gstat-val" style="color:#ffaa00;">${(state.critChance*100).toFixed(1)}%</span></div>
      <div class="gstat-row"><span class="gstat-card-name">크리티컬 배율</span><span class="gstat-val" style="color:#ff4488;">×${state.critMult.toFixed(2)}</span></div>
    </div>`;
  }

  el.innerHTML = html;
}


function openItemModal() {
  const modal = document.getElementById('item-modal');
  modal.style.display = 'flex';
  renderItemModal();
}
function closeItemModal() {
  document.getElementById('item-modal').style.display = 'none';
}

function openGachaModal(mode) {
  _gachaMode = mode || activeTab || 'jsy';
  const modal = document.getElementById('gacha-modal');
  modal.classList.add('active');
  // 모달 타이틀/서브 컬러 분기
  const title = modal.querySelector('.gacha-title');
  const sub   = modal.querySelector('.gacha-sub');
  if(_gachaMode === 'cms'){
    if(title) title.textContent = '💀 암흑 소환';
    if(sub)   sub.textContent   = '암흑 카드를 소환해 영구 보너스 획득 · 중복은 파편으로 변환 · EXP 소모';
    modal.style.setProperty('--gacha-accent','#cc4444');
  } else {
    if(title) title.textContent = '🎰 가챠 소환';
    if(sub)   sub.textContent   = '카드를 소환해 영구 보너스를 획득하세요 · 중복 카드는 파편으로 변환';
    modal.style.setProperty('--gacha-accent','#aa44ff');
  }
  renderGachaModal();
}

document.getElementById('item-modal').addEventListener('click', function(e){
  if(e.target===this) closeItemModal();
});

function closeGachaModal() {
  document.getElementById('gacha-modal').classList.remove('active');
}

document.getElementById('gacha-modal').addEventListener('click',function(e){
  if(e.target===this) closeGachaModal();
});

let _gachaCurrentTab = 'inv';
function gachaTab(tab, btn) {
  _gachaCurrentTab = tab;
  document.querySelectorAll('.gacha-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('gacha-tab-inv').style.display    = tab==='inv'    ? '' : 'none';
  document.getElementById('gacha-tab-shard').style.display  = tab==='shard'  ? '' : 'none';
  document.getElementById('gacha-tab-stats').style.display  = tab==='stats'  ? '' : 'none';
  renderGachaModal();
}

function renderGachaModal() {
  renderGachaProbRow();
  renderGachaInv();
  renderGachaShards();
  renderGachaStats();
  if(_gachaMode === 'cms'){
    // 차명석 모드: 재화 소모
    const cost1  = getCurrentCmsGachaCost();
    const cost10 = getCmsGachaTotalCost(10);
    const can1  = state.cmsExp >= cost1;
    const can10 = state.cmsExp >= cost10;
    document.getElementById('gacha-pull1-btn').disabled  = !can1;
    document.getElementById('gacha-pull10-btn').disabled = !can10;
    document.getElementById('gacha-pull1-btn').textContent  = `✦ 1회 뽑기 · ${formatNum(cost1)} 💀EXP`;
    document.getElementById('gacha-pull10-btn').textContent = `10회 · ${formatNum(cost10)} 💀EXP`;
    const countEl = document.getElementById('gacha-pull-count-info');
    if(countEl) countEl.textContent = `이번 스테이지 뽑기: ${state.cmsGachaPullCount}회 · 기준 비용: ${formatNum(getCmsGachaBaseCost())} EXP`;
  } else {
    // 정아영 모드: EXP 소모
    const cost1  = getCurrentGachaCost();
    const cost10 = getGachaTotalCost(10);
    const can1  = state.totalExp >= cost1;
    const can10 = state.totalExp >= cost10;
    document.getElementById('gacha-pull1-btn').disabled  = !can1;
    document.getElementById('gacha-pull10-btn').disabled = !can10;
    document.getElementById('gacha-pull1-btn').textContent  = `✦ 1회 뽑기 · ${formatNum(cost1)} EXP`;
    document.getElementById('gacha-pull10-btn').textContent = `10회 · ${formatNum(cost10)} EXP`;
    const countEl = document.getElementById('gacha-pull-count-info');
    if(countEl) countEl.textContent = `이번 스테이지 뽑기: ${state.gachaPullCount}회 · 기준 비용: ${formatNum(getGachaBaseCost())} EXP`;
  }
}

function renderGachaProbRow() {
  const probs = _gachaMode === 'cms' ? getCmsGachaProbs() : getGachaProbs();
  const row = document.getElementById('gacha-prob-row');
  row.innerHTML = '';
  GRADE_ORDER.forEach((g,i)=>{
    if(probs[i]<=0) return;
    const pill = document.createElement('div');
    pill.className=`prob-pill`;
    pill.style.cssText=`color:${GRADE_COLORS[g]};border-color:${GRADE_COLORS[g]};`;
    pill.textContent=`${g} ${probs[i]}%`;
    row.appendChild(pill);
  });
}

function renderGachaInv() {
  const grid  = document.getElementById('gacha-inv-grid');
  const empty = document.getElementById('gacha-inv-empty');
  const pool  = _gachaMode === 'cms' ? getCmsGachaPool() : getGachaPool();
  const cards = _gachaMode === 'cms' ? state.cmsGachaCards : state.gachaCards;
  const owned = pool.filter(c=>cards[c.id]);
  grid.innerHTML='';
  if(owned.length===0){
    empty.style.display=''; return;
  }
  empty.style.display='none';
  // 등급 높은 순 정렬
  owned.sort((a,b)=>GRADE_ORDER.indexOf(b.grade)-GRADE_ORDER.indexOf(a.grade));
  owned.forEach(card=>{
    const div = document.createElement('div');
    div.className=`gacha-inv-card ${GRADE_BG[card.grade]}`;
    div.style.borderColor = GRADE_COLORS[card.grade];
    div.innerHTML=`
      <div class="ic-on"></div>
      <div class="ic-emoji">${card.emoji}</div>
      <div class="ic-grade" style="color:${GRADE_COLORS[card.grade]}">${card.grade}</div>
      <div class="ic-name">${card.name}</div>
      <div class="ic-effect">${card.desc}</div>
    `;
    grid.appendChild(div);
  });
}

function renderGachaShards() {
  const list = document.getElementById('gacha-shard-list');
  list.innerHTML='';

  // 데스페라도 장착 중 합성 불가
  if(state.equippedUnitStat === 'desperado') {
    list.innerHTML = `<div style="text-align:center;padding:20px 10px;color:#cc44ff;font-size:.75rem;line-height:1.7;border:1px solid rgba(204,68,255,.3);border-radius:10px;background:rgba(204,68,255,.06);">
      🃏 <b>데스페라도</b> 장착 중<br>
      <span style="color:#555;font-size:.68rem;">데스페라도로 획득한 카드는<br>합성이 불가능합니다.</span>
    </div>`;
    return;
  }

  const shards = _gachaMode === 'cms' ? state.cmsGachaShards : state.gachaShards;
  // C~SSS만 합성 가능 (EX는 최상위)
  GRADE_ORDER.slice(0,-1).forEach((grade,i)=>{
    const nextGrade = GRADE_ORDER[i+1];
    const count = shards[grade]||0;
    const canMerge = count>=25;
    const row = document.createElement('div');
    row.className='gacha-shard-row';
    row.innerHTML=`
      <span class="sr-grade" style="color:${GRADE_COLORS[grade]}">${grade}</span>
      <span class="sr-count">파편 ${count}/25</span>
      <span style="font-size:.6rem;color:#555;">→ <span style="color:${GRADE_COLORS[nextGrade]}">${nextGrade}</span> 카드</span>
      <button class="sr-merge-btn" ${canMerge?'':'disabled'} onclick="gachaMerge('${grade}','${nextGrade}')">합성</button>
    `;
    list.appendChild(row);
  });
}

function gachaMerge(fromGrade, toGrade) {
  // 데스페라도 장착 중 합성 차단
  if(state.equippedUnitStat === 'desperado') { showNotification('🃏 데스페라도 장착 중에는 합성이 불가능합니다!'); return; }
  const shards = _gachaMode === 'cms' ? state.cmsGachaShards : state.gachaShards;
  const cards  = _gachaMode === 'cms' ? state.cmsGachaCards  : state.gachaCards;
  const pool   = _gachaMode === 'cms' ? getCmsGachaPool()    : getGachaPool();
  if((shards[fromGrade]||0)<25){ showNotification('파편이 부족합니다!'); return; }
  const candidates = pool.filter(c=>c.grade===toGrade && !cards[c.id]);
  shards[fromGrade] -= 25;
  if(candidates.length===0){
    // 모두 보유 중 → 파편으로 변환 + 중복 애니 실행
    shards[toGrade] = (shards[toGrade]||0)+1;
    if(_gachaMode === 'cms') recalcCmsMultipliers(); else recalcMultipliers();
    renderAll();
    const allOfGrade = pool.filter(c=>c.grade===toGrade);
    const dupCard = allOfGrade[Math.floor(Math.random()*allOfGrade.length)];
    if(dupCard) {
      initAudio();
      _gachaAnimResults = [{ card: dupCard, isDup: true }];
      _gachaSingleIdx   = 0;
      document.getElementById('gacha-intro-count').textContent = '✦ 합성 ✦';
      document.getElementById('gacha-intro-sub').textContent   = `${fromGrade} 파편 25개 → ${toGrade} 파편+1 (전부 보유!)`;
      const overlay = document.getElementById('gacha-anim-overlay');
      overlay.classList.add('active');
      if(_gachaPortalAnim) _gachaPortalAnim();
      _gachaPortalAnim = startPortalCanvas('gacha-portal-canvas', GRADE_THEME[toGrade]?.color || (_gachaMode==='cms'?'#cc4444':'#aa44ff'), 1.0);
      gachaShowScene('gacha-scene-intro');
      playGachaIntroSound();
      setTimeout(() => gachaAnimShowSingle(0), 1200);
    } else {
      showNotification(`✦ ${fromGrade} 파편 25개 → ${toGrade} 파편 1개 (전부 보유!)`);
      renderGachaModal();
    }
  } else {
    const card = candidates[Math.floor(Math.random()*candidates.length)];
    cards[card.id] = true;
    if(_gachaMode === 'cms') recalcCmsMultipliers(); else recalcMultipliers();
    renderAll();
    // 1회 뽑기와 동일한 애니메이션 실행
    initAudio();
    _gachaAnimResults = [{ card, isDup: false }];
    _gachaSingleIdx   = 0;
    // 인트로 텍스트를 합성 전용으로 설정
    document.getElementById('gacha-intro-count').textContent = '✦ 합성 ✦';
    document.getElementById('gacha-intro-sub').textContent   = `${fromGrade} 파편 25개로 소환 중...`;
    const overlay = document.getElementById('gacha-anim-overlay');
    overlay.classList.add('active');
    if(_gachaPortalAnim) _gachaPortalAnim();
    _gachaPortalAnim = startPortalCanvas('gacha-portal-canvas', GRADE_THEME[toGrade]?.color || (_gachaMode==='cms'?'#cc4444':'#aa44ff'), 1.0);
    gachaShowScene('gacha-scene-intro');
    playGachaIntroSound();
    setTimeout(() => gachaAnimShowSingle(0), 1200);
  }
}



// ═══════════════════════════════════════════════════
// BATTLE SYSTEM (카드 전투 - PvZ Heroes 스타일 레인 보드)
// ═══════════════════════════════════════════════════

const BATTLE_LANE_COUNT = 3;

// 등급별 전투 스탯 매핑: 비용(마나) / 기본 공격력 / 기본 체력
const BATTLE_GRADE_STATS = {
  C:   { cost:1, atk:1, hp:2 },
  B:   { cost:2, atk:2, hp:3 },
  A:   { cost:3, atk:3, hp:4 },
  S:   { cost:4, atk:4, hp:6 },
  SS:  { cost:5, atk:6, hp:8 },
  SSS: { cost:6, atk:8, hp:10 },
  EX:  { cost:7, atk:10, hp:14 },
};

// type별 보너스: 공격형/체력형 성향 살짝 반영
function battleStatFromCard(card) {
  const base = BATTLE_GRADE_STATS[card.grade] || BATTLE_GRADE_STATS.C;
  let atk = base.atk, hp = base.hp;
  if(card.type === 'clickMult' || card.type === 'critMult') atk += 1;       // 공격형
  if(card.type === 'autoMult')  hp  += 1;                                    // 방어형
  if(card.type === 'allMult')   { atk += 1; hp += 1; }                       // 만능형
  return { cost: base.cost, atk, hp, maxHp: hp };
}

// 보유 가챠 카드 → 전투 카드 풀 생성 (해당 모드의 보유 카드만)
function getBattleCardPool(mode) {
  const pool  = mode === 'cms' ? getCmsGachaPool() : getGachaPool();
  const owned = mode === 'cms' ? state.cmsGachaCards : state.gachaCards;
  return pool.filter(c => owned[c.id]).map(c => {
    const stat = battleStatFromCard(c);
    return {
      id: c.id, grade: c.grade, emoji: c.emoji, name: c.name,
      cost: stat.cost, atk: stat.atk, hp: stat.hp, maxHp: stat.maxHp,
    };
  });
}

// 적 프리셋 (스테이지 진행도에 맞춰 잠금 해제)
function getBattleEnemies(mode) {
  const stage = mode === 'cms' ? state.cmsStage : state.stage;
  const enemies = [
    { id:'enemy_slime',   name:'야생 슬라임',   emoji:'🟢', minStage:0, hp:18, manaCap:4,  reward:5000,
      deck:[{grade:'C',atk:1,hp:2},{grade:'C',atk:1,hp:2},{grade:'C',atk:2,hp:1},{grade:'B',atk:2,hp:3}] },
    { id:'enemy_robot',   name:'고철 로봇',     emoji:'🤖', minStage:2, hp:26, manaCap:6,  reward:15000,
      deck:[{grade:'B',atk:2,hp:3},{grade:'B',atk:3,hp:2},{grade:'A',atk:3,hp:4},{grade:'A',atk:2,hp:5}] },
    { id:'enemy_dragon',  name:'어린 드래곤',   emoji:'🐲', minStage:5, hp:36, manaCap:8,  reward:50000,
      deck:[{grade:'A',atk:3,hp:4},{grade:'S',atk:4,hp:6},{grade:'S',atk:5,hp:5},{grade:'SS',atk:6,hp:8}] },
    { id:'enemy_overlord',name:'은하 지배자',   emoji:'👑', minStage:9, hp:50, manaCap:10, reward:150000,
      deck:[{grade:'S',atk:4,hp:6},{grade:'SS',atk:6,hp:8},{grade:'SS',atk:7,hp:7},{grade:'SSS',atk:8,hp:10}] },
  ];
  return enemies.map(e => ({ ...e, locked: stage < e.minStage }));
}

let battleState = null; // 현재 진행 중인 전투 상태

function openBattleModal() {
  showNotification('⚔ 전투 기능은 미구현 기능입니다.');
}
function closeBattleModal() {
  document.getElementById('battle-modal').classList.remove('active');
}
document.getElementById('battle-modal').addEventListener('click', function(e){
  if(e.target===this) closeBattleModal();
});

// ══════════════════════════════════════════════════

function battleBackToSelect() {
  battleState = null;
  document.getElementById('battle-select-screen').style.display = '';
  document.getElementById('battle-arena-screen').style.display = 'none';
  document.getElementById('battle-result-screen').style.display = 'none';
  renderBattleSelectScreen();
}

function renderBattleSelectScreen() {
  const mode = (activeTab === 'cms' && cmsIsUnlocked()) ? 'cms' : 'jsy';
  const cardPool = getBattleCardPool(mode);
  const info = document.getElementById('battle-deck-info');
  if(cardPool.length === 0) {
    info.innerHTML = `보유한 가챠 카드가 없습니다. <span class="bd-count">🎰 뽑기</span>로 카드를 먼저 모아보세요!`;
  } else {
    info.innerHTML = `보유 카드 <span class="bd-count">${cardPool.length}</span>장으로 전투 덱이 자동 구성됩니다.`;
  }

  const list = document.getElementById('battle-enemy-list');
  list.innerHTML = '';
  getBattleEnemies(mode).forEach(enemy => {
    const cleared = !!(state.battleClears && state.battleClears[enemy.id]);
    const div = document.createElement('div');
    div.className = 'battle-enemy-card' + (enemy.locked ? ' locked' : '');
    div.innerHTML = `
      <div class="be-emoji">${enemy.emoji}</div>
      <div class="be-info">
        <div class="be-name">${enemy.name} ${cleared ? '<span class="be-cleared">✔ 클리어</span>' : ''}</div>
        <div class="be-desc">체력 ${enemy.hp} · 최대 마나 ${enemy.manaCap}</div>
        <div class="be-reward">보상: ${formatNum(enemy.reward)} ${mode==='cms'?'💀':''}EXP</div>
      </div>
    `;
    if(!enemy.locked) {
      div.onclick = () => startBattle(mode, enemy);
    } else {
      div.innerHTML += `<div style="font-size:.6rem;color:#666;">🔒 ${mode==='cms'?'차명석':'정아영'} 스테이지 ${enemy.minStage+1} 필요</div>`;
    }
    list.appendChild(div);
  });
}

function startBattle(mode, enemyPreset) {
  const cardPool = getBattleCardPool(mode);
  if(cardPool.length === 0) { showNotification('보유한 가챠 카드가 없습니다! 먼저 뽑기를 해보세요.'); return; }

  // 플레이어 덱 구성: 보유 카드를 섞어서 최대 12장 (부족하면 있는 만큼)
  const deck = shuffleArray([...cardPool]).slice(0, Math.min(12, cardPool.length));
  while(deck.length < 8) deck.push(...cardPool); // 카드가 너무 적으면 채워줌
  shuffleArray(deck);

  // 적 덱 구성
  const enemyDeck = enemyPreset.deck.map((d,i)=>({
    id: enemyPreset.id+'_'+i, grade:d.grade, emoji:'👾', name:'적 유닛',
    cost: BATTLE_GRADE_STATS[d.grade]?.cost || 2,
    atk:d.atk, hp:d.hp, maxHp:d.hp,
  }));

  battleState = {
    mode, enemyPreset,
    playerHp: 30, playerMaxHp: 30,
    enemyHp: enemyPreset.hp, enemyMaxHp: enemyPreset.hp,
    playerMana: 1, playerMaxMana: 1, playerMaxManaCap: 10,
    enemyMana: 1, enemyMaxMana: 1, enemyMaxManaCap: enemyPreset.manaCap,
    deck: deck.map((c,i)=>({...c, uid:'p'+i})),
    enemyDeck: shuffleArray(enemyDeck.map((c,i)=>({...c, uid:'e'+i}))),
    hand: [],
    enemyHand: [],
    // 레인 기반 필드: 길이 BATTLE_LANE_COUNT, 비어있으면 null
    field: new Array(BATTLE_LANE_COUNT).fill(null),
    enemyField: new Array(BATTLE_LANE_COUNT).fill(null),
    turn: 1,
    phase: 'player', // 'player' | 'enemy'
    selectedHandIdx: null,   // 손패에서 선택된 카드 인덱스 (소환 대상 레인 선택 대기)
    selectedAttackerLane: null, // 공격할 내 유닛이 위치한 레인
    over: false,
  };

  // 시작 손패 3장
  for(let i=0;i<3;i++) battleDraw('player');
  for(let i=0;i<3;i++) battleDraw('enemy');

  document.getElementById('battle-select-screen').style.display = 'none';
  document.getElementById('battle-arena-screen').style.display = 'flex';
  document.getElementById('battle-result-screen').style.display = 'none';

  const portraitEmoji = mode === 'cms' ? '🌑' : '🌟';
  document.getElementById('battle-player-portrait').textContent = portraitEmoji;
  document.getElementById('battle-player-name').textContent = mode === 'cms' ? '차명석' : '정아영';
  document.getElementById('battle-enemy-portrait').textContent = enemyPreset.emoji;
  document.getElementById('battle-enemy-name').textContent = enemyPreset.name;

  battleLog(`⚔ ${enemyPreset.name}과의 전투 시작! 카드를 선택하고 레인에 배치하세요.`);
  renderBattle();
}

function shuffleArray(arr) {
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function battleDraw(side) {
  const bs = battleState;
  if(side === 'player') {
    if(bs.deck.length > 0 && bs.hand.length < 8) {
      bs.hand.push(bs.deck.shift());
    }
  } else {
    if(bs.enemyDeck.length > 0 && bs.enemyHand.length < 8) {
      bs.enemyHand.push(bs.enemyDeck.shift());
    }
  }
}

function battleLog(msg) {
  const log = document.getElementById('battle-log');
  log.textContent = msg;
}

// ── 렌더링 ──────────────────────────────────────────
function renderBattle() {
  if(!battleState) return;
  const bs = battleState;

  // HP 바
  document.getElementById('battle-player-hp-fill').style.width = Math.max(0,(bs.playerHp/bs.playerMaxHp*100))+'%';
  document.getElementById('battle-player-hp-text').textContent = `${Math.max(0,bs.playerHp)} / ${bs.playerMaxHp}`;
  document.getElementById('battle-enemy-hp-fill').style.width = Math.max(0,(bs.enemyHp/bs.enemyMaxHp*100))+'%';
  document.getElementById('battle-enemy-hp-text').textContent = `${Math.max(0,bs.enemyHp)} / ${bs.enemyMaxHp}`;

  // 마나
  document.getElementById('battle-player-mana').textContent = `⚡ ${bs.playerMana}/${bs.playerMaxMana}`;

  // 레인 보드
  renderBattleBoard();

  // 손패
  renderBattleHand();

  // 턴 종료 버튼
  const endBtn = document.getElementById('battle-endturn-btn');
  endBtn.disabled = bs.phase !== 'player' || bs.over;
  endBtn.textContent = bs.phase === 'player' ? '턴 종료 ▶' : '적 턴 진행 중...';
}

// 레인 카드 1개 DOM 생성
function makeLaneCardEl(unit, isEnemy) {
  const div = document.createElement('div');
  div.className = `bcard field-card grade-${unit.grade}`;
  if(!isEnemy && unit.summonSick) div.classList.add('summon-sick');
  div.innerHTML = `
    <div class="bc-emoji">${unit.emoji}</div>
    <div class="bc-name">${unit.name}</div>
    <div class="bc-atk">${unit.atk}</div>
    <div class="bc-hp">${unit.hp}</div>
  `;
  return div;
}

function renderBattleBoard() {
  const bs = battleState;
  const enemyRow  = document.getElementById('battle-lane-row-enemy');
  const playerRow = document.getElementById('battle-lane-row-player');
  enemyRow.innerHTML = '';
  playerRow.innerHTML = '';

  const attackingLane = bs.selectedAttackerLane;

  for(let lane=0; lane<BATTLE_LANE_COUNT; lane++) {
    // ── 적 레인 ──
    const eLane = document.createElement('div');
    eLane.className = 'battle-lane';
    const eUnit = bs.enemyField[lane];
    if(eUnit) {
      const cardEl = makeLaneCardEl(eUnit, true);
      eLane.appendChild(cardEl);
    }
    // 플레이어가 공격할 유닛을 선택한 상태 → 모든 적 레인이 공격 대상
    if(bs.phase === 'player' && attackingLane !== null && !bs.over) {
      eLane.classList.add(eUnit ? 'lane-attackable' : 'lane-empty-target');
      eLane.onclick = () => battleAttack(attackingLane, lane);
    }
    enemyRow.appendChild(eLane);

    // ── 내 레인 ──
    const pLane = document.createElement('div');
    pLane.className = 'battle-lane';
    const pUnit = bs.field[lane];
    if(pUnit) {
      const cardEl = makeLaneCardEl(pUnit, false);
      if(attackingLane === lane) cardEl.classList.add('selected');
      if(bs.phase === 'player' && !bs.over) {
        if(!pUnit.summonSick) {
          cardEl.onclick = (e) => { e.stopPropagation(); battleSelectAttacker(lane); };
        }
      }
      pLane.appendChild(cardEl);
    } else if(bs.phase === 'player' && bs.selectedHandIdx !== null && !bs.over) {
      // 손패에서 카드를 선택한 상태 → 빈 내 레인에 소환 가능
      pLane.classList.add('lane-empty-target');
      pLane.onclick = () => battlePlaceSelectedCard(lane);
    }
    playerRow.appendChild(pLane);
  }
}

function renderBattleHand() {
  const bs = battleState;
  const hand = document.getElementById('battle-player-hand');
  hand.innerHTML = '';
  bs.hand.forEach((card, idx) => {
    const div = document.createElement('div');
    const canPlay = bs.phase === 'player' && bs.playerMana >= card.cost && !bs.over;
    div.className = `bcard grade-${card.grade}` + (canPlay ? '' : ' no-mana') + (bs.selectedHandIdx===idx ? ' selected' : '');
    div.innerHTML = `
      <div class="bc-cost">${card.cost}</div>
      <div class="bc-emoji">${card.emoji}</div>
      <div class="bc-name">${card.name}</div>
      <div class="bc-atk">${card.atk}</div>
      <div class="bc-hp">${card.hp}</div>
    `;
    if(canPlay) div.onclick = () => battleSelectHandCard(idx);
    hand.appendChild(div);
  });
}

// ── 플레이어 행동 ────────────────────────────────────
function battleSelectHandCard(idx) {
  const bs = battleState;
  if(bs.phase !== 'player' || bs.over) return;
  bs.selectedAttackerLane = null; // 공격 선택 취소
  bs.selectedHandIdx = (bs.selectedHandIdx === idx) ? null : idx;
  renderBattle();
}

function battlePlaceSelectedCard(lane) {
  const bs = battleState;
  if(bs.phase !== 'player' || bs.over) return;
  if(bs.selectedHandIdx === null) return;
  if(bs.field[lane]) return; // 이미 차있는 레인
  const card = bs.hand[bs.selectedHandIdx];
  if(bs.playerMana < card.cost) return;
  bs.playerMana -= card.cost;
  bs.hand.splice(bs.selectedHandIdx,1);
  bs.field[lane] = { ...card, summonSick:true };
  bs.selectedHandIdx = null;
  initAudio();
  battleLog(`${card.emoji} ${card.name}을 ${lane+1}번 레인에 배치!`);
  renderBattle();
}

function battleSelectAttacker(lane) {
  const bs = battleState;
  if(bs.phase !== 'player' || bs.over) return;
  const unit = bs.field[lane];
  if(!unit || unit.summonSick) return;
  bs.selectedHandIdx = null; // 소환 선택 취소
  bs.selectedAttackerLane = (bs.selectedAttackerLane === lane) ? null : lane;
  renderBattle();
}

// 같은 레인끼리 충돌. 적 레인이 비어있으면 직접 공격(영웅 본체)
function battleAttack(attackerLane, targetLane) {
  const bs = battleState;
  if(bs.phase !== 'player' || bs.over) return;
  const attacker = bs.field[attackerLane];
  if(!attacker || attacker.summonSick) return;
  if(attackerLane !== targetLane) {
    // 항상 같은 레인끼리만 교전 (PvZ Heroes 방식)
    targetLane = attackerLane;
  }

  const target = bs.enemyField[targetLane];
  if(target) {
    target.hp -= attacker.atk;
    attacker.hp -= target.atk;
    battleLog(`${attacker.emoji}와 ${target.emoji}가 ${targetLane+1}번 레인에서 격돌! (${attacker.atk} ↔ ${target.atk})`);
    if(target.hp <= 0) bs.enemyField[targetLane] = null;
    if(attacker.hp <= 0) bs.field[attackerLane] = null;
  } else {
    // 직접 공격 (적 본체)
    bs.enemyHp -= attacker.atk;
    battleLog(`${attacker.emoji} ${attacker.name}이 ${targetLane+1}번 레인을 통해 적 본체에 ${attacker.atk} 데미지!`);
  }
  bs.selectedAttackerLane = null;
  renderBattle();
  checkBattleEnd();
}

function battleEndTurn() {
  const bs = battleState;
  if(bs.phase !== 'player' || bs.over) return;
  bs.selectedAttackerLane = null;
  bs.selectedHandIdx = null;
  bs.phase = 'enemy';
  renderBattle();
  setTimeout(()=> enemyTurn(), 600);
}

// ── 적 AI 턴 ─────────────────────────────────────────
function enemyTurn() {
  const bs = battleState;
  if(bs.over) return;

  // 마나 증가 & 카드 소환 (간단한 AI: 마나가 허용하는 한 빈 레인에 무작위로 카드 소환)
  bs.enemyMaxMana = Math.min(bs.enemyMaxManaCap, bs.enemyMaxMana + 1);
  bs.enemyMana = bs.enemyMaxMana;

  function summonNext() {
    if(bs.over) { return; }
    const emptyLanes = [];
    for(let i=0;i<BATTLE_LANE_COUNT;i++) if(!bs.enemyField[i]) emptyLanes.push(i);

    const playable = bs.enemyHand
      .map((c,i)=>({c,i}))
      .filter(x => x.c.cost <= bs.enemyMana);

    if(emptyLanes.length === 0 || playable.length === 0) {
      setTimeout(()=> enemyAttackPhase(), 500);
      return;
    }
    const pick = playable[Math.floor(Math.random()*playable.length)];
    const lane = emptyLanes[Math.floor(Math.random()*emptyLanes.length)];
    bs.enemyMana -= pick.c.cost;
    bs.enemyHand.splice(pick.i,1);
    bs.enemyField[lane] = { ...pick.c, summonSick:true };
    battleLog(`${pick.c.emoji} 적이 ${pick.c.name}을 ${lane+1}번 레인에 배치!`);
    renderBattle();
    setTimeout(summonNext, 500);
  }
  setTimeout(summonNext, 400);
}

function enemyAttackPhase() {
  const bs = battleState;
  if(bs.over) return;

  let lane = 0;
  function nextAttack() {
    if(lane >= BATTLE_LANE_COUNT || bs.over) {
      finishEnemyTurn();
      return;
    }
    const attacker = bs.enemyField[lane];
    if(!attacker || attacker.summonSick || attacker.hp <= 0) { lane++; nextAttack(); return; }

    const target = bs.field[lane];
    if(target) {
      target.hp -= attacker.atk;
      attacker.hp -= target.atk;
      battleLog(`👾 ${attacker.emoji}와 ${target.emoji}가 ${lane+1}번 레인에서 격돌! (${attacker.atk} ↔ ${target.atk})`);
      if(target.hp <= 0) bs.field[lane] = null;
      if(attacker.hp <= 0) bs.enemyField[lane] = null;
    } else {
      bs.playerHp -= attacker.atk;
      battleLog(`👾 ${attacker.emoji}가 ${lane+1}번 레인을 통해 플레이어에게 ${attacker.atk} 데미지!`);
    }
    renderBattle();
    checkBattleEnd();
    lane++;
    setTimeout(nextAttack, 600);
  }
  setTimeout(nextAttack, 300);
}

function finishEnemyTurn() {
  const bs = battleState;
  if(bs.over) return;
  // 소환 직후 상태 해제
  bs.field.forEach(u=>{ if(u) u.summonSick=false; });
  bs.enemyField.forEach(u=>{ if(u) u.summonSick=false; });

  bs.turn++;
  bs.phase = 'player';
  bs.playerMaxMana = Math.min(bs.playerMaxManaCap, bs.playerMaxMana + 1);
  bs.playerMana = bs.playerMaxMana;
  battleDraw('player');
  battleDraw('enemy');
  battleLog(`── 턴 ${bs.turn} ──`);
  renderBattle();
}

function checkBattleEnd() {
  const bs = battleState;
  if(bs.over) return;
  if(bs.enemyHp <= 0) {
    bs.over = true;
    onBattleWin();
  } else if(bs.playerHp <= 0) {
    bs.over = true;
    onBattleLose();
  }
}

function onBattleWin() {
  const bs = battleState;
  const reward = bs.enemyPreset.reward;
  if(bs.mode === 'cms') addCmsExp(reward); else addExp(reward);
  if(!state.battleClears) state.battleClears = {};
  state.battleClears[bs.enemyPreset.id] = true;
  saveGame();
  renderAll();

  document.getElementById('battle-arena-screen').style.display = 'none';
  document.getElementById('battle-result-screen').style.display = '';
  document.getElementById('battle-result-title').textContent = '🎉 승리!';
  document.getElementById('battle-result-title').className = 'battle-result-title win';
  document.getElementById('battle-result-desc').innerHTML =
    `${bs.enemyPreset.name}을 물리쳤습니다!<br>보상: <span style="color:#ffdd00">${formatNum(reward)} ${bs.mode==='cms'?'💀':''}EXP</span> 획득`;
}

function onBattleLose() {
  const bs = battleState;
  document.getElementById('battle-arena-screen').style.display = 'none';
  document.getElementById('battle-result-screen').style.display = '';
  document.getElementById('battle-result-title').textContent = '💀 패배...';
  document.getElementById('battle-result-title').className = 'battle-result-title lose';
  document.getElementById('battle-result-desc').innerHTML =
    `${bs.enemyPreset.name}에게 패배했습니다.<br>카드를 더 모아 다시 도전해보세요!`;
}


// ═══════════════════════════════════════════════════
// HELP MODAL
// ═══════════════════════════════════════════════════

function openHelpModal() {
  document.getElementById('help-modal').classList.add('active');
}
function closeHelpModal() {
  document.getElementById('help-modal').classList.remove('active');
}
let _helpCurrentTab = 'intro';
function helpTab(tab, btn) {
  _helpCurrentTab = tab;
  document.querySelectorAll('.help-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.help-section').forEach(s=>s.classList.remove('active'));
  document.getElementById('help-'+tab).classList.add('active');
}
document.getElementById('help-modal').addEventListener('click', function(e){
  if(e.target===this) closeHelpModal();
});

// ═══════════════════════════════════════════════════
// RANK MODAL
// ═══════════════════════════════════════════════════

let _rankCurrentTab = 'jsy';
function openRankModal() {
  document.getElementById('rank-modal').classList.add('active');
  loadRankData(_rankCurrentTab);
}
function closeRankModal() {
  document.getElementById('rank-modal').classList.remove('active');
}
function rankTab(tab, btn) {
  _rankCurrentTab = tab;
  document.querySelectorAll('.rank-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  loadRankData(tab);
}
document.getElementById('rank-modal').addEventListener('click', function(e){
  if(e.target===this) closeRankModal();
});

function loadRankData(category) {
  const listEl = document.getElementById('rank-list');
  listEl.innerHTML = '<div class="rank-empty">불러오는 중...</div>';
  if(!window._fbDb || !window._fbRef || !window._fbGet) {
    setTimeout(()=>loadRankData(category), 700);
    return;
  }
  const dbRef = window._fbRef(window._fbDb, 'users');
  window._fbGet(dbRef).then(snapshot => {
    if(!snapshot.exists()) { listEl.innerHTML = '<div class="rank-empty">랭킹 데이터가 없습니다</div>'; return; }
    const all = snapshot.val();
    const rows = [];
    Object.keys(all).forEach(uid => {
      const gs = all[uid] && all[uid].gameState;
      if(!gs) return;
      const name = gs._displayName || '익명';
      let exp=0, prestige=0, gacha=0;
      if(category==='jsy') {
        exp = gs.totalExp||0;
        // prestigeMult에서 환생 횟수 역산: mult=1→0회, 2→1회, 3→2회... (log 근사)
        const pm = gs.prestigeMult||1;
        prestige = pm <= 1 ? 0 : Math.round(Math.log(pm) / Math.log(1.5));
        gacha = Object.keys(gs.gachaCards||{}).length;
      } else if(category==='cms') {
        exp = gs.cmsExp||0;
        const cpm = gs.cmsPrestigeMult||1;
        prestige = cpm <= 1 ? 0 : Math.round(Math.log(cpm) / Math.log(1.5));
        gacha = Object.keys(gs.cmsGachaCards||{}).length;
      } else {
        exp = gs.witchExp||0;
        prestige = 0;
        gacha = 0;
      }
      rows.push({uid, name, exp, prestige, gacha});
    });
    rows.sort((a,b)=>b.exp-a.exp);
    renderRankRows(rows.slice(0,50));
  }).catch(e => {
    console.warn('rank load error:', e);
    listEl.innerHTML = '<div class="rank-empty">랭킹을 불러오지 못했습니다<br>(Firebase 읽기 권한 확인 필요)</div>';
  });
}

function renderRankRows(rows) {
  const listEl = document.getElementById('rank-list');
  if(!rows.length) { listEl.innerHTML = '<div class="rank-empty">아직 랭킹 데이터가 없습니다</div>'; return; }
  const myUid = window._currentUser ? window._currentUser.uid : null;
  listEl.innerHTML = rows.map((r,i) => `
    <div class="rank-row${r.uid===myUid?' me':''}">
      <div class="rank-num">${i+1}</div>
      <div class="rank-name">${r.name}</div>
      <div class="rank-stats">
        <div class="rank-stat">EXP<b>${formatNum(r.exp)}</b></div>
        <div class="rank-stat">환생<b>${r.prestige}</b></div>
        <div class="rank-stat">뽑기<b>${r.gacha}</b></div>
      </div>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════
// FIREBASE + GOOGLE LOGIN
// ═══════════════════════════════════════════════════

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyCg4SWd62Lgdv1K-S7pnTdHRtCdjBFv1I8",
  authDomain: "tycoon-3756d.firebaseapp.com",
  projectId: "tycoon-3756d",
  storageBucket: "tycoon-3756d.firebasestorage.app",
  messagingSenderId: "291083351185",
  appId: "1:291083351185:web:a7851f0261163b891f3b30",
  measurementId: "G-V0L7D2HQVT",
  databaseURL: "https://tycoon-3756d-default-rtdb.firebaseio.com"
};

let _fbApp = null, _fbAuth = null, _fbDb = null, _currentUser = null;
let _fbInitialized = false;

function initFirebase() {
  if(_fbInitialized) return;
  _fbInitialized = true;
  // 오버레이 표시 (로딩 중)
  const ov = document.getElementById('login-overlay');
  const ovStatus = document.getElementById('login-overlay-status');
  const ovBtn = document.getElementById('login-overlay-btn');
  if(ov) { ov.style.display = 'flex'; }
  if(ovStatus) ovStatus.textContent = '🔄 인증 서버 연결 중...';
  if(ovBtn) ovBtn.disabled = true;
  try {
    const script1 = document.createElement('script');
    script1.type = 'module';
    script1.textContent = `
      import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
      import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
        from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
      import { getDatabase, ref, set, get, onValue }
        from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

      const app = initializeApp(${JSON.stringify(firebaseConfig).replace(/\//g, '\/')});
      const auth = getAuth(app);
      const db = getDatabase(app);
      window._fbAuth = auth;
      window._fbDb = db;
      window._GoogleAuthProvider = GoogleAuthProvider;
      window._fbSignInWithPopup = signInWithPopup;
      window._fbSignOut = signOut;
      window._fbOnAuthStateChanged = onAuthStateChanged;
      window._fbRef = ref;
      window._fbSet = set;
      window._fbGet = get;
      window._fbOnValue = onValue;

      // onAuthStateChanged: 자동로그인 포함 — 기존 세션 있으면 user 전달
      onAuthStateChanged(auth, (user) => {
        window._currentUser = user;
        window._onAuthStateChange(user);
      });
    `;
    script1.onload = () => {
      if(ovBtn) ovBtn.disabled = false;
    };
    document.head.appendChild(script1);
    // SDK 로드 완료 후 버튼 활성화 (module script는 onload 없으므로 타이머 보조)
    setTimeout(() => { if(ovBtn) ovBtn.disabled = false; if(ovStatus && ovStatus.textContent.includes('연결')) ovStatus.textContent = ''; }, 2500);
  } catch(e) {
    console.warn('Firebase init error:', e);
    if(ovStatus) ovStatus.textContent = '❌ 연결 실패. 새로고침 해주세요.';
    if(ovBtn) ovBtn.disabled = false;
  }
}

function _onAuthStateChange(user) {
  const ov = document.getElementById('login-overlay');
  const ovStatus = document.getElementById('login-overlay-status');
  const ovBtn = document.getElementById('login-overlay-btn');
  if(user) {
    // 로그인 성공 — 오버레이 숨김
    if(ov) ov.style.display = 'none';
    document.getElementById('login-btn').style.display = 'none';
    const avatar = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name-display');
    const logoutBtn = document.getElementById('logout-btn');
    if(user.photoURL) { avatar.src = user.photoURL; avatar.style.display = 'block'; }
    const displayName = user.displayName ? user.displayName.split(' ')[0] : '유저';
    nameEl.textContent = displayName;
    nameEl.style.display = 'block';
    logoutBtn.style.display = 'block';
    showNotification('✅ ' + displayName + '님 로그인!');
    // 더보기 메뉴 토글
    var ml = document.getElementById('moremenu-login');
    var mlo = document.getElementById('moremenu-logout');
    if(ml) ml.style.display = 'none';
    if(mlo) { mlo.style.display = ''; mlo.querySelector('span:last-child').textContent = displayName + ' 로그아웃'; }
    // Load cloud save
    loadFromFirebase(user.uid);
  } else {
    // 미로그인 — 오버레이 표시, 게임 차단
    if(ov) ov.style.display = 'flex';
    if(ovStatus) ovStatus.textContent = '';
    if(ovBtn) ovBtn.disabled = false;
    document.getElementById('login-btn').style.display = 'block';
    document.getElementById('user-avatar').style.display = 'none';
    document.getElementById('user-name-display').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'none';
    // 더보기 메뉴 토글
    var ml = document.getElementById('moremenu-login');
    var mlo = document.getElementById('moremenu-logout');
    if(ml) ml.style.display = '';
    if(mlo) mlo.style.display = 'none';
  }
}

function signInWithGoogle() {
  if(!window._fbAuth) {
    showNotification('🔄 Firebase 초기화 중...');
    setTimeout(signInWithGoogle, 1500);
    return;
  }
  try {
    const provider = new window._GoogleAuthProvider();
    window._fbSignInWithPopup(window._fbAuth, provider)
      .then(result => {
        // onAuthStateChanged will handle UI update
      })
      .catch(err => {
        console.error('Google login error:', err);
        showNotification('❌ 로그인 실패: ' + (err.message || '다시 시도하세요'));
      });
  } catch(e) {
    showNotification('❌ 로그인 오류: Firebase를 불러오는 중입니다. 잠시 후 다시 시도하세요.');
  }
}

function signOutUser() {
  if(!window._fbAuth) return;
  window._fbSignOut(window._fbAuth).then(() => {
    showNotification('로그아웃 완료');
    _currentUser = null;
  });
}

let _fbSaveTimeout = null;
function saveToFirebase() {
  if(!window._currentUser || !window._fbDb) return;
  // Debounce: 3초 내 여러 호출은 한번만 저장
  if(_fbSaveTimeout) clearTimeout(_fbSaveTimeout);
  _fbSaveTimeout = setTimeout(() => {
    try {
      const uid = window._currentUser.uid;
      const saveData = {
        ...state,
        _savedAt: Date.now(),
        _version: 3,
        _displayName: window._currentUser.displayName || '',
        _email: window._currentUser.email || '',
      };
      const dbRef = window._fbRef(window._fbDb, 'users/' + uid + '/gameState');
      window._fbSet(dbRef, saveData).then(() => {
        const ind = document.getElementById('cloud-save-indicator');
        if(ind) { ind.classList.add('show'); setTimeout(()=>ind.classList.remove('show'), 2000); }
      }).catch(e => console.warn('Firebase save error:', e));
    } catch(e) {
      console.warn('saveToFirebase error:', e);
    }
  }, 3000);
}

function loadFromFirebase(uid) {
  if(!window._fbDb) { setTimeout(()=>loadFromFirebase(uid), 500); return; }
  try {
    const dbRef = window._fbRef(window._fbDb, 'users/' + uid + '/gameState');
    window._fbGet(dbRef).then(snapshot => {
      if(snapshot.exists()) {
        const cloudData = snapshot.val();
        // Compare cloud vs local: use newer one
        const localSaved = localStorage.getItem('alien_clicker_v3_save');
        let localData = null;
        try { localData = JSON.parse(localSaved); } catch(e){}
        const localTime = localData?._savedAt || 0;
        const cloudTime = cloudData._savedAt || 0;
        if(cloudTime > localTime) {
          // Cloud is newer
          delete cloudData._savedAt; delete cloudData._version;
          delete cloudData._displayName; delete cloudData._email;
          Object.assign(state, cloudData);
          if(!state.critMult) state.critMult=3;
          if(!state.prestigeMult) state.prestigeMult=1;
          if(!state.gachaCards) state.gachaCards={};
          if(!state.gachaShards) state.gachaShards={};
          if(!state.items) state.items={};
          if(state.equippedUnitStat === undefined) {
            state.equippedUnitStat = state.unitStatActive ? 'slimeFriend' : null;
          }
          delete state.unitStatActive;
          if(state.bankerExchangeDate === undefined) state.bankerExchangeDate = '';
          if(state.bankerExchangeCount === undefined) state.bankerExchangeCount = 0;
          if(state.workerPaused===undefined) state.workerPaused=false;
          recalcMultipliers();
          recalcCmsMultipliers();
          renderAll();
        } else {
          saveToFirebase(); // Sync local to cloud
        }
      } else {
        // No cloud save yet - upload local
        saveToFirebase();
      }
    }).catch(e => {
      console.warn('Firebase load error:', e);
      showNotification('☁ 클라우드 로드 실패 (로컬 데이터 유지)');
    });
  } catch(e) {
    console.warn('loadFromFirebase error:', e);
  }
}

initFirebase();
loadGame();
initStarfield();
renderAll();
requestAnimationFrame(gameTick);

// 마지막으로 있던 화면 복원: 마녀 테크에서 나가지 않고 종료했으면 마녀 테크,
// 차명석/정아영 탭에 있었으면 그 탭으로 복원
(function restoreLastScreen() {
  if (state.lastScreen === 'witch') {
    openWitchModal();
  } else if (state.lastScreen === 'cms' && typeof cmsIsUnlocked === 'function' && cmsIsUnlocked()) {
    lpTab('cms');
  } else {
    lpTab('jsy');
  }
})();

// 오디오 버튼 초기 UI를 복원된 설정에 맞게 동기화
(function syncAudioUI() {
  const sfxBtn   = document.getElementById('sfx-btn');
  const musicBtn = document.getElementById('music-btn');
  if(sfxBtn){
    sfxBtn.textContent = sfxOn ? '🔊 SFX' : '🔇 SFX';
    sfxOn ? sfxBtn.classList.add('on') : sfxBtn.classList.remove('on');
  }
  if(musicBtn){
    musicBtn.textContent = musicOn ? '♫ BGM ON' : '♪ BGM';
    musicOn ? musicBtn.classList.add('on') : musicBtn.classList.remove('on');
  }
  // BGM이 켜진 상태였으면 첫 클릭(initAudio) 이후 자동 재생될 수 있도록
  // bgmUserTurnedOff 상태를 그대로 유지한다 (startBGM은 클릭 이후 initAudio가 완료된 후 호출됨)
})();

// ── 모바일 탭바 ──────────────────────────────────────
(function() {
  // 더보기 드롭업 메뉴
  const more = document.createElement('div');
  more.id = 'mobtab-more-menu';
  more.innerHTML =
    '<button class="more-menu-item" id="moremenu-rank" onclick="openRankModal();closeMobMoreMenu()" style="color:#ffcc00;">' +
      '<span>&#x1F3C6;</span><span>랭킹</span></button>' +
    '<button class="more-menu-item" id="moremenu-admin" onclick="openAdminModal();closeMobMoreMenu()">' +
      '<span>&#x2699;&#xFE0F;</span><span>ADMIN</span></button>' +
    '<div class="more-menu-sep"></div>' +
    '<div class="more-menu-label">설정</div>' +
    '<button class="more-menu-item more-menu-toggle" id="moremenu-shake" onclick="toggleShakeSetting()">' +
      '<span>&#x1F4F3;</span><span>화면 흔들림</span><span class="more-toggle-badge" id="shake-badge">OFF</span></button>' +
    '<div class="more-menu-sep"></div>' +
    '<button class="more-menu-item" id="moremenu-login" onclick="signInWithGoogle();closeMobMoreMenu()" style="color:#4285F4;">' +
      '<span>&#x1F511;</span><span>구글 로그인</span></button>' +
    '<button class="more-menu-item" id="moremenu-logout" onclick="signOutUser();closeMobMoreMenu()" style="color:#ff4444;display:none;">' +
      '<span>&#x23CF;&#xFE0F;</span><span>로그아웃</span></button>';
  document.body.appendChild(more);

  // 탭바
  const tabbar = document.createElement('div');
  tabbar.id = 'mobile-tabbar';
  tabbar.innerHTML =
    '<button class="mob-tab active" id="mobtab-center" onclick="mobileTab(\'center\',this)">' +
      '<span class="mob-tab-icon">&#x1F47E;</span><span>클리커</span></button>' +
    '<div class="mob-tab-divider"></div>' +
    '<button class="mob-tab" id="mobtab-growth" onclick="mobileTab(\'growth\',this)">' +
      '<span class="mob-tab-icon">&#x26A1;</span><span>성장</span></button>' +
    '<div class="mob-tab-divider"></div>' +
    '<button class="mob-tab" id="mobtab-sfx" onclick="document.getElementById(\'sfx-btn\').click();mobtabSfxSync()">' +
      '<span class="mob-tab-icon">&#x1F50A;</span><span>효과음</span></button>' +
    '<div class="mob-tab-divider"></div>' +
    '<button class="mob-tab" id="mobtab-bgm" onclick="document.getElementById(\'music-btn\').click();mobtabBgmSync()">' +
      '<span class="mob-tab-icon">&#x266B;</span><span>배경음</span></button>' +
    '<div class="mob-tab-divider"></div>' +
    '<button class="mob-tab" id="mobtab-more" onclick="toggleMobMoreMenu(this)">' +
      '<span class="mob-tab-icon">&#x22EF;</span><span>더보기</span></button>';
  document.body.appendChild(tabbar);

  // 외부 클릭 시 더보기 닫기
  document.addEventListener('click', function(e) {
    var menu = document.getElementById('mobtab-more-menu');
    var btn  = document.getElementById('mobtab-more');
    if(menu && menu.classList.contains('open') &&
       !menu.contains(e.target) && !btn.contains(e.target)) {
      closeMobMoreMenu();
    }
  });
})();

function mobileTab(tab, btn) {
  ['mobtab-center','mobtab-growth'].forEach(function(id) {
    var el = document.getElementById(id);
    if(el) el.classList.remove('active');
  });
  btn.classList.add('active');
  var left   = document.getElementById('left-panel');
  var right  = document.getElementById('right-panel');
  var center = document.getElementById('center');
  left.classList.remove('mobile-active','merged-half');
  right.classList.remove('mobile-active','merged-half');
  center.style.display = '';
  if(tab === 'growth') {
    center.style.display = 'none';
    left.classList.add('mobile-active');
  }
}

function toggleMobMoreMenu(btn) {
  var menu = document.getElementById('mobtab-more-menu');
  if(!menu) return;
  var isOpen = menu.classList.toggle('open');
  btn.classList.toggle('active', isOpen);
}

function closeMobMoreMenu() {
  var menu = document.getElementById('mobtab-more-menu');
  if(menu) menu.classList.remove('open');
  var btn = document.getElementById('mobtab-more');
  if(btn) btn.classList.remove('active');
}

function mobtabSfxSync() {
  var btn = document.getElementById('mobtab-sfx');
  if(!btn) return;
  btn.classList.toggle('active', sfxOn);
}

function mobtabBgmSync() {
  var btn = document.getElementById('mobtab-bgm');
  if(!btn) return;
  btn.classList.toggle('active', musicOn);
}

function toggleShakeSetting() {
  shakeEnabled = !shakeEnabled;
  var badge = document.getElementById('shake-badge');
  if(badge) {
    badge.textContent = shakeEnabled ? 'ON' : 'OFF';
    badge.style.background = shakeEnabled ? 'rgba(90,255,32,0.25)' : 'rgba(80,80,80,0.3)';
    badge.style.color = shakeEnabled ? '#a0ff60' : '#666';
  }
}