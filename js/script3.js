// ═══════════════════════════════════════════════════
// script3.js — 마녀 테크
// ═══════════════════════════════════════════════════

// 마녀 테크 MODAL
// ══════════════════════════════════════════════════
// 초반 addLevels 레벨까지는 step만큼 단순 덧셈으로 누적되고,
// 그 이후 레벨부터는 (1+누적값) 자체에 step배를 곱하는 곱셈 성장으로 전환된다.
// 예: step=0.15, addLevels=2 → Lv1:+15% Lv2:+30%(덧셈) Lv3:(1.30*1.15-1)=+49.5%(곱셈)...
function tieredWitchBonus(lv, step, addLevels) {
  if (lv <= 0) return 0;
  let total = 0;
  for (let i = 1; i <= lv; i++) {
    if (i <= addLevels) total += step;
    else total = (1 + total) * (1 + step) - 1;
  }
  return total;
}

const witchTechs = [
  {
    id: 'wt_click_power',
    icon: '🌙',
    name: '월광 클릭',
    desc: '마녀의 달빛 마법이 클릭 파워를 강화한다.',
    maxLevel: 5,
    baseCost: 200,
    costMult: 2.8,
    effect: lv => `클릭 EXP +${Math.round(tieredWitchBonus(lv, 0.15, 2) * 100)}%`,
    apply: lv => tieredWitchBonus(lv, 0.15, 2),
    stat: 'clickMult',
  },
  {
    id: 'wt_auto_cauldron',
    icon: '🫧',
    name: '끓는 가마솥',
    desc: '마녀의 가마솥이 쉬지 않고 자동 EXP를 끓여낸다.',
    maxLevel: 5,
    baseCost: 500,
    costMult: 3.2,
    effect: lv => `자동 EXP +${Math.round(tieredWitchBonus(lv, 0.20, 2) * 100)}%`,
    apply: lv => tieredWitchBonus(lv, 0.20, 2),
    stat: 'autoMult',
  },
  {
    id: 'wt_curse_crit',
    icon: '💀',
    name: '저주의 눈',
    desc: '마녀의 저주로 치명타 확률이 증가한다.',
    maxLevel: 3,
    baseCost: 2000,
    costMult: 5.0,
    effect: lv => `치명타 확률 +${Math.round(tieredWitchBonus(lv, 0.05, 1) * 100)}%`,
    apply: lv => tieredWitchBonus(lv, 0.05, 1),
    stat: 'critBonus',
  },
  {
    id: 'wt_spell_worker',
    icon: '🐱',
    name: '흑묘 결사대',
    desc: '마녀의 고양이 부하들이 워커 효율을 높인다.',
    maxLevel: 4,
    baseCost: 3000,
    costMult: 4.5,
    effect: lv => `워커 EXP +${Math.round(tieredWitchBonus(lv, 0.25, 2) * 100)}%`,
    apply: lv => tieredWitchBonus(lv, 0.25, 2),
    stat: 'workerMult',
  },
  {
    id: 'wt_potion',
    icon: '🧪',
    name: '마력 포션',
    desc: '마녀의 비약이 EXP 획득량을 폭발적으로 늘린다.',
    maxLevel: 3,
    baseCost: 8000,
    costMult: 6.0,
    effect: lv => `전체 EXP +${Math.round(tieredWitchBonus(lv, 0.30, 1) * 100)}%`,
    apply: lv => tieredWitchBonus(lv, 0.30, 1),
    stat: 'globalMult',
  },
  {
    id: 'wt_red_moon',
    icon: '🌕',
    name: '피의 보름달',
    desc: '핏빛 달이 뜨면 모든 마법이 최고조에 달한다.',
    maxLevel: 1,
    baseCost: 50000,
    costMult: 1,
    effect: lv => lv > 0 ? '모든 테크 효과 +50%' : '잠금',
    apply: lv => lv * 0.50,
    stat: 'witchMasterBonus',
    requireAll: true,
  },
];

// 저장: state.witchTechLevels 사용 (saveGame/loadGame이 자동으로 처리)
function getWitchLevels() {
  if (!state.witchTechLevels) state.witchTechLevels = {};
  return state.witchTechLevels;
}

function witchTechCost(tech, currentLv) {
  return Math.floor(tech.baseCost * Math.pow(tech.costMult, currentLv));
}

function allPrevWitchMaxed(excludeId) {
  const levels = getWitchLevels();
  return witchTechs
    .filter(t => !t.requireAll && t.id !== excludeId)
    .every(t => (levels[t.id] || 0) >= t.maxLevel);
}

function getWitchBonus(stat) {
  const levels = getWitchLevels();
  let total = 0;
  const masterLv = levels['wt_red_moon'] || 0;
  const masterBonus = masterLv > 0 ? 1.5 : 1.0;
  for (const t of witchTechs) {
    if (t.stat === stat && t.id !== 'wt_red_moon') {
      const lv = levels[t.id] || 0;
      total += t.apply(lv);
    }
  }
  if (stat !== 'witchMasterBonus') total *= masterBonus;
  return total;
}

// 마녀 자신의 스탯 (클릭파워/크리/자동초당) - 마녀 테크 레벨에서 산출
function getWitchStats() {
  const clickAmount = Math.max(1, Math.round(3 * (1 + getWitchBonus('clickMult'))));
  const critChance = Math.min(1, 0.03 + getWitchBonus('critBonus'));
  const critMult = 3;
  const hasAuto = (getWitchLevels()['wt_auto_cauldron'] || 0) > 0;
  const autoPerSec = hasAuto ? (2 + getWitchBonus('autoMult') * 2) : 0;
  const globalMult = 1 + getWitchBonus('globalMult');
  return { clickAmount, critChance, critMult, autoPerSec, globalMult };
}

function addWitchExp(amount) {
  const ws = getWitchStats();
  state.witchExp += amount * ws.globalMult;
}

// 모래시계 파티클 상태
let _hgParticles = [];
let _hgLastSpawn = 0;

function _hgSpawnParticle() {
  _hgParticles.push({
    x: 22 + (Math.random() - 0.5) * 4,
    y: 36,
    vy: 1.2 + Math.random() * 1.4,
    vx: (Math.random() - 0.5) * 0.6,
    life: 1.0,
    r: 1.0 + Math.random() * 0.8,
  });
}

function renderWitchHourglass() {
  const hg = document.getElementById('witch-hourglass');
  if (!hg) return;
  if (!witchActionState) {
    hg.style.display = 'none';
    _hgParticles = [];
    return;
  }
  hg.style.display = 'flex';
  const label = document.getElementById('witch-action-label');
  if (label) label.textContent = witchActionState.type;

  const canvas = document.getElementById('witch-hg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 44, H = 72;
  const pct = Math.min(1, witchActionState.elapsed / witchActionState.duration);
  const now = Date.now();

  ctx.clearRect(0, 0, W, H);

  // 위/아래 받침 (나무 프레임 느낌)
  ctx.fillStyle = 'rgba(255,200,80,0.14)';
  ctx.strokeStyle = 'rgba(255,200,80,0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.rect(2, 2, 40, 5);  ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(2, 65, 40, 5); ctx.fill(); ctx.stroke();

  // 유리 벌브 (곡선 형태, 목 부분이 살짝 두께를 가진 실제 모래시계 모양)
  ctx.strokeStyle = 'rgba(160,255,96,0.75)';
  ctx.beginPath();
  ctx.moveTo(2, 7);
  ctx.quadraticCurveTo(-4, 16, 19, 34);
  ctx.lineTo(19, 38);
  ctx.quadraticCurveTo(-4, 56, 2, 65);
  ctx.moveTo(42, 7);
  ctx.quadraticCurveTo(48, 16, 25, 34);
  ctx.lineTo(25, 38);
  ctx.quadraticCurveTo(48, 56, 42, 65);
  ctx.stroke();

  // 위 모래 (곡선 벌브 형태로 클리핑, 진행에 따라 줄어듦)
  const topH = (1 - pct);
  if (topH > 0.01) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(2, 7); ctx.lineTo(42, 7);
    ctx.quadraticCurveTo(48, 16, 25, 34);
    ctx.lineTo(19, 34);
    ctx.quadraticCurveTo(-4, 16, 2, 7);
    ctx.closePath();
    ctx.clip();
    const fillY = 7 + (1 - topH) * 27;
    ctx.fillStyle = 'rgba(160,255,96,0.45)';
    ctx.fillRect(-10, fillY, 70, 50);
    ctx.restore();
  }

  // 아래 모래 (곡선 벌브+받침 형태로 클리핑, 맨 아래부터 쌓임)
  const botH = pct;
  if (botH > 0.01) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(25, 38);
    ctx.quadraticCurveTo(48, 56, 42, 65);
    ctx.lineTo(42, 70); ctx.lineTo(2, 70); ctx.lineTo(2, 65);
    ctx.quadraticCurveTo(-4, 56, 19, 38);
    ctx.closePath();
    ctx.clip();
    const fillY = 70 - botH * 32;
    ctx.fillStyle = 'rgba(160,255,96,0.45)';
    ctx.fillRect(-10, fillY, 70, 80);
    ctx.restore();
  }

  // 파티클 스폰 (이동 중일 때만)
  if (now - _hgLastSpawn > 80) {
    _hgSpawnParticle();
    _hgLastSpawn = now;
  }

  // 파티클 업데이트 & 렌더
  _hgParticles = _hgParticles.filter(p => p.life > 0 && p.y < 68);
  for (const p of _hgParticles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08; // 중력
    p.life -= 0.03;
    const alpha = Math.max(0, p.life) * 0.9;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(180,255,120,${alpha.toFixed(2)})`;
    ctx.fill();
  }

  // 가운데 목 흐르는 점
  const dot = Math.sin(now / 150) * 0.5 + 0.5;
  ctx.beginPath();
  ctx.arc(22, 36, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(160,255,96,${dot.toFixed(2)})`;
  ctx.fill();
}

function renderWitchTechGrid() {
  const colL = document.getElementById('witch-tech-col-left');
  const colR = document.getElementById('witch-tech-col-right');
  if (!colL || !colR) return;
  const levels = getWitchLevels();
  const curExp = state.witchExp || 0;

  const cardHtml = (tech) => {
    const lv = levels[tech.id] || 0;
    const maxed = lv >= tech.maxLevel;
    const locked = tech.requireAll && !allPrevWitchMaxed(tech.id);
    const cost = maxed ? 0 : witchTechCost(tech, lv);
    const canAfford = !maxed && !locked && curExp >= cost;

    let cls = 'witch-tech-card';
    if (maxed) cls += ' maxed';
    else if (locked) cls += ' locked';
    else if (canAfford) cls += ' affordable';

    const costHtml = maxed
      ? '<div class="wtc-cost-row"><span class="wtc-cost maxed-cost">✦ MAX</span></div>'
      : locked
        ? '<div class="wtc-cost-row"><span class="wtc-cost locked-cost">🔒 잠금</span></div>'
        : `<div class="wtc-cost-row"><span class="wtc-cost-label">필요 비용</span><span class="wtc-cost">💫 ${formatNum(cost)} EXP</span></div>`;

    return `<div class="${cls}" onclick="buyWitchTech('${tech.id}')">
      <div class="wtc-icon">${tech.icon}</div>
      <div class="wtc-name">${tech.name}</div>
      <div class="wtc-level">Lv ${lv} / ${tech.maxLevel}</div>
      <div class="wtc-desc">${tech.desc}</div>
      <div class="wtc-effect">${tech.effect(lv)}</div>
      ${costHtml}
    </div>`;
  };

  const mid = Math.ceil(witchTechs.length / 2);
  colL.innerHTML = witchTechs.slice(0, mid).map(cardHtml).join('');
  colR.innerHTML = witchTechs.slice(mid).map(cardHtml).join('');

  renderWitchStatsBar();
}

function renderWitchStatsBar() {
  const statsBar = document.querySelector('.witch-stats-bar');
  if (statsBar) statsBar.style.display = 'none';
}

function buyWitchTech(id) {
  const tech = witchTechs.find(t => t.id === id);
  if (!tech) return;
  const levels = getWitchLevels();
  const lv = levels[id] || 0;
  if (lv >= tech.maxLevel) return;
  if (tech.requireAll && !allPrevWitchMaxed(id)) return;

  const cost = witchTechCost(tech, lv);
  if ((state.witchExp || 0) < cost) {
    showNotification('마녀 EXP 부족!');
    return;
  }
  state.witchExp -= cost;
  levels[id] = lv + 1;
  saveGame();
  renderWitchTechGrid();
  requestAnimationFrame(positionWitchCauldronHitbox);
  showNotification(`${tech.name} Lv${lv + 1}!`);
}

// 마녀 테크 전체 초기화: 테크 레벨(크리확률/초당EXP/클릭EXP 등 산출값 전부 포함),
// 총 마녀EXP, 누적 클릭 수까지 전부 0으로 되돌린다.
function resetWitchTech() {
  state.witchTechLevels = {};
  state.witchExp = 0;
  state.witchTotalClicks = 0;
  saveGame();
  renderWitchTechGrid(); // 내부에서 renderWitchStatsBar()도 같이 호출됨
  showNotification('🔄 마녀 테크가 모두 초기화되었습니다');
}

function handleWitchCauldronClick(e) {
  const cx = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : window.innerWidth / 2);
  const cy = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : window.innerHeight / 2);
  if (!AC.check(cx, cy)) return;
  initAudio();
  const ws = getWitchStats();
  const isCrit = Math.random() < ws.critChance;
  const amount = isCrit ? ws.clickAmount * ws.critMult : ws.clickAmount;
  state.witchTotalClicks = (state.witchTotalClicks || 0) + 1;
  addWitchExp(amount);
  playWitchClick(isCrit);
}

// 마녀 테크 인게임 시계 (오전 0:00 시작, 1초 실시간 = 1분 게임, 마녀 모달 열릴 때만 진행)
let witchClockMinutes = 0; // 0 ~ 1439 (24*60-1)
let witchClockAccum = 0;   // 실시간 누적 초 (1초마다 1분 증가)

function witchClockStr() {
  const totalMin = witchClockMinutes % 1440;
  const h = Math.floor(totalMin / 60) % 12 || 12;
  const m = totalMin % 60;
  const ampm = Math.floor(totalMin / 60) < 12 ? '오전' : '오후';
  return `${ampm} ${h}:${String(m).padStart(2,'0')}`;
}

function renderWitchClock() {
  const el = document.getElementById('witch-clock-display');
  if (el) el.textContent = witchClockStr();
}

// 마녀 모달이 열려있는 동안에만 자동 EXP 누적 (게임 메인 루프 gameTick에서 호출)
let witchLastTick = Date.now();
function tickWitch(dt) {
  const modal = document.getElementById('witch-modal');
  if (!modal || !modal.classList.contains('active')) return;
  if (dt <= 0 || dt > 300) return;
  const ws = getWitchStats();
  if (ws.autoPerSec > 0) {
    addWitchExp(ws.autoPerSec * dt);
    renderWitchStatsBar();
  }
  // 행동력 회복 (회복 물약 레벨 반영)
  if (witchAp < WITCH_STAT_MAX_AP) {
    const apRec = getWitchApRecovery();
    witchApTickAccum += dt;
    if (witchApTickAccum >= apRec.interval) {
      witchApTickAccum -= apRec.interval;
      witchAp = Math.min(WITCH_STAT_MAX_AP, witchAp + apRec.amount);
      renderWitchStats();
    }
  }
  // 회복 물약 Lv3: 3초마다 HP +30
  if ((getWitchPotionLevels().recover || 0) >= 3) {
    witchHpTickAccum += dt;
    if (witchHpTickAccum >= 3) {
      witchHpTickAccum -= 3;
      const maxHp = getWitchMaxHp();
      if (witchHp < maxHp) {
        witchHp = Math.min(maxHp, witchHp + 30);
        renderWitchStats();
      }
    }
  }

  // 행동 타이머 (이동/휴식/방어/공격 공통)
  if (witchActionState) {
    witchActionState.elapsed += dt;
    renderWitchHourglass();
    if (witchActionState.elapsed >= witchActionState.duration) {
      const finished = witchActionState;
      witchActionState = null;
      completeWitchAction(finished);
    }
  }
  // 시계 진행: 0.3초 실시간 = 1분 게임
  witchClockAccum += dt * (10 / 3);
  const addedMins = Math.floor(witchClockAccum);
  if (addedMins > 0) {
    witchClockMinutes = (witchClockMinutes + addedMins) % 1440;
    witchClockAccum -= addedMins;
    renderWitchClock();
  }
}

function openWitchModal() {
  const modal = document.getElementById('witch-modal');
  modal.classList.add('active');
  state.lastScreen = 'witch'; // 마지막 화면 기록 (재방문 시 복원용)
  document.getElementById('witch-mobile-tabbar').classList.add('mobile-active');
  // 현재 지역 이미지로 배경 설정 (지역 이동 시 변경된 이미지 유지)
  setRegionBackground(state.currentRegion);
  // 마녀 테크 진입 시점에 이미 오두막 내부에 있다면(이동을 거치지 않고 바로 시작하는 경우)
  // 인트로 채팅을 바로 체크해서 보낸다
  if (state.currentRegion === '오두막 내부') {
    triggerWitchIntroChat();
  }
  witchLastTick = Date.now();
  // 정아영/차명석 화면 위에 마녀 테크가 겹쳐 보이는 구조라, 아래 화면의 BGM/효과음이
  // 그대로 들리지 않도록 메인 BGM을 멈추고(클릭 SFX는 모달이 입력을 가로채므로 자동 차단됨)
  // 마녀 테크 전용 BGM으로 완전히 교체한다.
  initAudio();
  stopBGM();
  stopSpecialBGM(); // 마녀 테크 진입 전에 일꾼 특수발동 BGM이 켜져있던 경우까지 차단
  if (witchMusicOn) startWitchBGM();
  document.getElementById('witch-sfx-btn').classList.toggle('on', witchSfxOn);
  document.getElementById('witch-sfx-btn').textContent = witchSfxOn ? '🔊 SFX' : '🔇 SFX';
  document.getElementById('witch-bgm-btn').classList.toggle('on', witchMusicOn);
  document.getElementById('witch-bgm-btn').textContent = witchMusicOn ? '♫ BGM ON' : '♪ BGM';
  renderWitchTechGrid();
  renderWitchClock();
  renderWitchHand();
  requestAnimationFrame(positionWitchCauldronHitbox);
}
function closeWitchModal() {
  document.getElementById('witch-modal').classList.remove('active');
  document.getElementById('witch-mobile-tabbar').classList.remove('mobile-active');
  state.lastScreen = (typeof activeTab !== 'undefined') ? activeTab : 'jsy'; // 정아영/차명석 화면으로 복귀 기록
  stopWitchBGM(true); // 모달 닫을 때는 처음부터 다시 재생하도록 위치 초기화
  // 마녀 테크에서 지역이동으로 #center에 깔린 제단 등 배경 이미지를
  // 정아영/차명석 화면으로 돌아갈 때 남기지 않도록 초기화한다.
  const center = document.getElementById('center');
  if (center) center.style.backgroundImage = '';
  // 마녀 테크 모달을 닫으면 원래 보던 정아영/차명석 화면의 BGM을 다시 재생한다.
  if (musicOn) { lastBgmStage = -1; startBgmForTab(); }
  saveGame();
}

function toggleWitchSettings() {
  const panel = document.getElementById('witch-settings-panel');
  if (!panel) return;
  const isOpen = panel.style.display === 'flex';
  panel.style.display = isOpen ? 'none' : 'flex';
}
function closeWitchSettings() {
  const panel = document.getElementById('witch-settings-panel');
  if (panel) panel.style.display = 'none';
}

function openRegionMap() {
  const m = document.getElementById('region-map-modal');
  if(!m) return;
  m.classList.add('active');
  // 현재 위치·이동가능·불가 클래스 적용
  const allowed = REGION_ADJACENCY[state.currentRegion] || [];
  document.querySelectorAll('.region-spot').forEach(function(el) {
    const name = el.getAttribute('title');
    el.classList.remove('rs-current','rs-reachable','rs-unreachable');
    if(name === state.currentRegion) el.classList.add('rs-current');
    else if(allowed.includes(name))  el.classList.add('rs-reachable');
    else                             el.classList.add('rs-unreachable');
    // 툴팁 이벤트 등록 (중복 방지)
    if(el._tipBound) return;
    el._tipBound = true;
    el.addEventListener('mouseenter', function() {
      const tip = document.getElementById('region-spot-tooltip');
      if(!tip) return;
      const wrap = document.getElementById('region-map-wrap');
      const wr = wrap.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      const rname = el.title;
      const cost = getMoveCost(state.currentRegion, rname);
      if(rname === state.currentRegion) {
        tip.textContent = rname + ' (현재 위치)';
      } else if(cost > 0) {
        tip.textContent = rname + ' — ⚡' + cost + ' AP';
      } else {
        tip.textContent = rname;
      }
      tip.style.left = (er.left - wr.left + er.width / 2) + 'px';
      tip.style.top  = (er.top  - wr.top  - 34) + 'px';
      tip.style.display = 'block';
    });
    el.addEventListener('mouseleave', function() {
      const tip = document.getElementById('region-spot-tooltip');
      if(tip) tip.style.display = 'none';
    });
  });
}

function closeRegionMap() {
  const m = document.getElementById('region-map-modal');
  if(m) m.classList.remove('active');
}

const REGION_IMAGES = {
  '오두막': 'images/c/basic/2.png',
  '오두막 내부': 'images/c/basic/1.png',
  '폐가': 'images/c/basic/3.png',
  '폐가 내부': 'images/c/basic/3-1.png',
  '공사장': 'images/c/basic/4.png',
  '제단': 'images/c/basic/5.png',
  '동굴': 'images/c/basic/6.png',
  '동굴 입구': 'images/c/6-1.png',
  '간석지': 'images/c/basic/7.png',
  '해변': 'images/c/basic/8.png',
  '산': 'images/c/basic/9.png',
  '케이블카': 'images/c/basic/10.png',
};

const REGION_ADJACENCY = {
  '산': ['오두막'],
  '케이블카': ['공사장'],
  '오두막': ['산','폐가','간석지'],
  '기본': ['오두막'],
  '오두막 내부': ['오두막'],
  '공사장': ['케이블카','제단','간석지'],
  '폐가': ['오두막','동굴'],
  '폐가 내부': ['폐가'],
  '제단': ['공사장','해변'],
  '동굴': ['폐가'],
  '간석지': ['오두막','공사장'],
  '해변': ['제단'],
  '동굴 입구': ['동굴'],
};

function setRegionBackground(name) {
  const src = REGION_IMAGES[name];
  const bgImg = document.getElementById('witch-bg-img');
  if(!bgImg) return;
  bgImg.src = src || 'images/c/basic/1.png';
  renderItemLayer();
}

function showRegionArrivalImage(name) {
  setRegionBackground(name);
  // 오버레이 없이 배경 이미지만 교체 (지역 이동 시 사진이 잠깐 뜨는 동작 제거)
}

const REGION_ACTIONS = {
  '제단': function() { openWitchModal(); },
  '오두막 내부': function() { triggerWitchIntroChat(); },
};

let _pendingRegion = null;

function selectRegion(name) {
  if(name === state.currentRegion) { closeRegionMap(); return; }
  const allowed = REGION_ADJACENCY[state.currentRegion] || [];
  if(!allowed.includes(name)){
    closeRegionMap();
    showNotification('🚫 이동할 수 없는 지역입니다');
    return;
  }
  const cost = getMoveCost(state.currentRegion, name);
  if(witchAp < cost){
    closeRegionMap();
    showNotification('⚡ 행동력이 부족합니다 (' + witchAp + '/' + cost + ')');
    return;
  }
  // 이동 시작: 행동력 50마다 1초
  const divisor = (state.witchAdminOverride && state.witchAdminOverride.actionDivisor) || 50;
  const { cost: finalCost, dur: duration } = applyWitchGrowth(cost, cost / divisor);
  witchActionState = { type: '이동', elapsed: 0, duration: duration, data: { target: name, cost: finalCost } };
  closeRegionMap();
  renderWitchHourglass();
}

function confirmRegionMove() {
  if(!_pendingRegion) return;
  const name = _pendingRegion;
  _pendingRegion = null;
  const panel = document.getElementById('witch-move-confirm');
  if(panel) panel.style.display = 'none';
  state.currentRegion = name;
  setRegionBackground(name);
  showNotification('📍 ' + name + '(으)로 이동했습니다.');
  const action = REGION_ACTIONS[name];
  if(action) action();
  saveGame();
}

function hideMoveConfirm() {
  _pendingRegion = null;
  const panel = document.getElementById('witch-move-confirm');
  if(panel) panel.style.display = 'none';
  // witch-action-bar는 fixed로 항상 표시되므로 별도 복원 불필요
}

// ══════════════════════════════════════════════
// 아이템 정의
// ══════════════════════════════════════════════
const WITCH_ITEMS = {
  1:'밧줄', 2:'돌맹이', 3:'나뭇가지', 4:'삽', 5:'염소뿔',
  6:'조개껍질', 7:'골프채', 8:'장난감 삽', 9:'등산지팡이', 10:'만년필',
  11:'도끼', 12:'망치', 13:'손전등', 14:'책', 15:'가위',
  16:'권총', 17:'샷건', 18:'횟칼', 19:'낫', 20:'짐승이빨',
  21:'메스', 22:'면도칼', 23:'커터칼', 24:'USB', 25:'비커',
  26:'렌치', 27:'소화기', 28:'진압용 방패', 29:'방독면', 30:'야전삽',
  31:'먼지떨이', 32:'큐대', 33:'낚싯대', 34:'망원경', 35:'녹슨창',
  36:'철근', 37:'절연테이프', 38:'붕대', 39:'전선', 40:'채찍',
  41:'1레벨 보안카드', 42:'2레벨 보안카드', 43:'3레벨 보안카드',
  44:'미확인 주사기', 45:'가방', 46:'고장난 폭탄'
};

// ── 아이템 속성 ────────────────────────────────────
// 각 아이템 ID에 속성 맵. 0 = 손(기본), 나머지는 해당 속성값 보유
const ITEM_ATTRS = {
  0:  {},
  1:  { 끈:2 },
  2:  { 단단함:1 },
  3:  { 막대:1 },
  4:  { 삽:1 },
  5:  { 날카로움:1, 무기:7 },
  6:  { 날카로움:1 },
  7:  { 단단함:1, 무기:5, 막대:1 },
  8:  { 삽:1 },
  9:  { 막대:1, 무기:4 },
  10: { 날카로움:1, 무기:7 },
  11: { 막대:1, 날카로움:2, 무기:17 },
  12: { 단단함:3, 막대:1, 무기:18 },
  13: { 불:2 },
  14: { 단단함:2 },
  15: { 날카로움:2 },
  16: { 무기:25 },
  17: { 무기:40, 막대:2 },
  18: { 날카로움:2, 무기:12 },
  19: { 날카로움:3, 무기:16 },
  20: { 날카로움:3 },
  21: { 날카로움:2, 무기:11 },
  22: { 날카로움:1, 무기:6 },
  23: { 날카로움:1, 무기:9 },
  24: { USB:1 },
  25: { 단단함:1 },
  26: { 단단함:2 },
  27: { 단단함:2 },
  28: { 단단함:2, 방어:18 },
  29: { 방어:25 },
  30: { 삽:2, 무기:10 },
  31: { 막대:1 },
  32: { 막대:2, 무기:9 },
  33: { 막대:3, 무기:10 },
  34: { 막대:2 },
  35: { 막대:3, 무기:20 },
  36: { 막대:4 },
  37: { 끈:2 },
  38: { 끈:2 },
  39: { 끈:1 },
  40: { 끈:2, 무기:16 },
  41: { 보안카드:1 },
  42: { 보안카드:2 },
  43: { 보안카드:3 },
  44: { 날카로움:2 },
  45: { 인벤토리:1 },
  46: { 단단함:2, 무기:10, 고장남:1 }
};

// ── 손에 든 아이템 속성 합산 ──────────────────────
function getHandAttrTotal() {
  const total = {};
  const hand = state.witchHand || [];
  hand.forEach(h => {
    if (!h) return;
    const attrs = ITEM_ATTRS[h.itemId] || {};
    Object.entries(attrs).forEach(([k,v]) => { total[k] = (total[k]||0) + v; });
  });
  return total;
}

// ── 개별 핸드 슬롯 속성 ───────────────────────────
function getItemAttrs(itemId) {
  return ITEM_ATTRS[itemId] || {};
}

// ── 지역별 조사 영역 ─────────────────────────────
// style: % 단위 (배경이미지 실제 렌더 영역 기준으로 JS에서 보정)
// requireAttr: { 속성명: 최소값 } — 없으면 손(기본)으로 가능
// ── 지역별 조사 오브젝트 ──────────────────────────
// pos: 배경 이미지 기준 % (left, top, width, height)
// imgSrc: 아이템 레이어 이미지 경로 (투명 PNG)
// respawnMins: 게임 내 분 단위 재생성 시간 (기본 360 = 6시간)
// ── 아이템 내구도 ──────────────────────────────────
const ITEM_DURABILITY = {
  1:1, 2:9, 3:9, 4:6, 5:3, 6:3, 7:9, 8:3, 9:6, 10:6,
  11:18, 12:21, 13:Infinity, 14:9, 15:6, 16:15, 17:12, 18:15, 19:3, 20:9,
  21:9, 22:6, 24:3, 25:6, 26:15, 27:18, 28:30, 29:50, 30:21, 31:9,
  32:9, 33:15, 34:21, 35:9, 36:15, 37:3, 38:9, 39:3, 40:18,
  41:Infinity, 42:Infinity, 43:Infinity, 44:3, 45:Infinity, 46:1,
};

// ── 아이템 기본 판매가 (마녀코인) ──────────────────
const ITEM_SELL_PRICE = {
  1:10, 2:1, 3:1, 4:1, 5:2, 6:1, 7:1, 8:1, 9:1, 10:1,
  11:35, 12:40, 13:20, 14:5, 15:3, 16:30, 17:50, 18:17, 19:20, 20:25,
  21:12, 22:10, 24:30, 25:10, 26:18, 27:22, 28:35, 29:100, 30:35, 31:7,
  32:19, 33:45, 34:35, 35:30, 36:65, 37:33, 38:10, 39:17, 40:28,
  41:30, 42:70, 43:150, 44:100, 45:50, 46:1,
};

// ── 아이템 실제 판매가 계산 (내구도 감소당 -10% 복리) ──
function calcActualSellPrice(itemId, currentDur) {
  const base = ITEM_SELL_PRICE[itemId] || 1;
  const maxDur = ITEM_DURABILITY[itemId];
  if (!isFinite(maxDur)) return base; // 무한 내구도는 감소 없음
  const lost = Math.max(0, maxDur - currentDur);
  let price = base;
  for (let i = 0; i < lost; i++) price = Math.floor(price * 0.9);
  return Math.max(1, price);
}

// ── 핸드(소지품) 최대 슬롯 ──────────────────────────
// 영구 누적이 아니라 "현재 핸드에 들고 있는 가방 개수"에 따라 실시간으로 결정됨.
// 가방 1개당 +5칸, 최대 4개(=+20칸)까지 인정. 가방을 팔거나 버리면 그만큼 다시 줄어든다.
const WITCH_BASE_HAND_SIZE = 5;
const WITCH_BAG_BONUS_PER = 5;
const WITCH_BAG_MAX_COUNT = 4;
const WITCH_BAG_ITEM_ID = 45;

// 현재 핸드에 들고 있는 가방 개수 (최대 4개까지만 인정)
function getCurrentWitchBagCount() {
  const hand = state.witchHand || [];
  let count = 0;
  for (let i = 0; i < hand.length; i++) {
    if (hand[i] && hand[i].itemId === WITCH_BAG_ITEM_ID) count++;
  }
  return Math.min(WITCH_BAG_MAX_COUNT, count);
}

// 현재 보유 가방 개수: 4개→20칸, 3개→15칸, 2개→10칸, 1개→5칸, 0개→0칸 (기본 5칸에 가산)
function getWitchHandMax() {
  return WITCH_BASE_HAND_SIZE + getCurrentWitchBagCount() * WITCH_BAG_BONUS_PER;
}

const REGION_INSPECT_ZONES = {
  '오두막': [
    {
      label: '집', action: 'move', target: '오두막 내부', requireAttr: {},
      pos: { left:'30%', top:'55%', width:'50%', height:'40%' },
      imgSrc: null,
    },
    {
      label: '땅', action: 'item', itemId: 2, requireAttr: {}, apCost: 100,
      respawnMins: 360,
    },
    {
      label: '나무', action: 'item', itemId: 3, requireAttr: {}, apCost: 100,
      respawnMins: 360,
    },
  ],
  '오두막 내부': [
    {
      label: '가마솥', action: 'cauldron', requireAttr: {}, apCost: 500,
      pos: { left:'35%', top:'45%', width:'30%', height:'30%' },
      imgSrc: null,
    },
  ],
  '폐가': [
    {
      label: '폐가 내부', action: 'move', target: '폐가 내부', requireAttr: {},
      pos: { left:'25%', top:'50%', width:'55%', height:'45%' },
      imgSrc: null,
    },
    {
      label: '가로등', action: 'msg', msg: '낡은 가로등이다.', requireAttr: { 막대:2 }, apCost: 100,
    },
    {
      label: '땅', action: 'msg', msg: '황량한 땅이다.', requireAttr: { 삽:1 }, apCost: 100,
    },
  ],
  '폐가 내부': [
    {
      label: '그림자', action: 'shop', requireAttr: {}, apCost: 100,
      pos: { left:'72%', top:'55%', width:'22%', height:'35%' },
      imgSrc: null,
      shadow: true,
    },
  ],
  '동굴': [
    {
      label: '동굴 입구', action: 'move', target: '동굴 입구', requireAttr: {},
      pos: { left:'30%', top:'40%', width:'40%', height:'50%' },
      imgSrc: null,
    },
  ],
  '동굴 입구': [
    {
      label: '키패드', action: 'msg', msg: '보안 키패드가 있다. 뭔가 입력해야 할 것 같다.', requireAttr: { 보안카드:1 }, apCost: 100,
    },
    {
      label: '수상한 문양', action: 'msg', msg: '수상해 보이는 문양이다.', requireAttr: {}, apCost: 100,
    },
    {
      label: '금이 간 벽', action: 'msg', msg: '벽에 금이 가 있다. 힘을 가하면 부술 수 있을 것 같다.', requireAttr: { 단단함:2 }, apCost: 100,
    },
  ],
  '산': [
    {
      label: '케이블카', action: 'move_ap', target: '케이블카', apCost: 850, requireAttr: {},
    },
    {
      label: '발전소', action: 'msg', msg: '🚧 아직 준비 중입니다.', requireAttr: {}, apCost: 100,
    },
  ],
  '케이블카': [
    {
      label: '케이블카', action: 'move_ap', target: '산', apCost: 850, requireAttr: {},
    },
    {
      label: '책상', action: 'msg', msg: '낡은 책상이다. 특별한 것은 없어 보인다.', requireAttr: {}, apCost: 100,
    },
    {
      label: '문', action: 'msg', msg: '🚧 문 너머는 아직 준비 중입니다.', requireAttr: {}, apCost: 100,
    },
  ],
  '공사장': [
    {
      label: '건축자재', action: 'msg', msg: '단단한 건축자재들이 쌓여 있다.', requireAttr: { 단단함:1 }, apCost: 100,
    },
    {
      label: '땅', action: 'msg', msg: '단단히 다져진 공사장 땅이다.', requireAttr: { 삽:2 }, apCost: 100,
    },
    {
      label: '공사장 내부', action: 'msg', msg: '🚧 아직 준비 중입니다.', requireAttr: {}, apCost: 100,
    },
  ],
  '제단': [
    {
      label: '땅', action: 'msg', msg: '제단 주변의 땅이다.', requireAttr: {}, apCost: 100,
    },
    {
      label: '나무', action: 'msg', msg: '오래된 나무가 서 있다.', requireAttr: {}, apCost: 100,
    },
    {
      label: '제단', action: 'msg', msg: '수상해 보인다..', requireAttr: {}, apCost: 100,
    },
  ],
  '해변': [
    {
      label: '모래', action: 'msg', msg: '부드러운 모래가 펼쳐져 있다.', requireAttr: { 삽:1 }, apCost: 100,
    },
    {
      label: '바다', action: 'msg', msg: '끝없이 펼쳐진 바다다.', requireAttr: {}, apCost: 100,
    },
  ],
  '간석지': [
    {
      label: '키패드', action: 'msg', msg: '바닷가 한켠에 낡은 키패드가 있다.', requireAttr: { 보안카드:3 }, apCost: 100,
    },
    {
      label: '돌', action: 'msg', msg: '간석지에 박혀 있는 돌이다.', requireAttr: {}, apCost: 100,
    },
    {
      label: '바다', action: 'msg', msg: '잔잔한 바다가 펼쳐져 있다.', requireAttr: {}, apCost: 100,
    },
  ],
};

// ── 아이템 내구도 소모 (조사: -3, 공격: -2) ────────
function consumeHandDurability(amount) {
  const hand = state.witchHand;
  if (!hand) return;
  // requireAttr가 있는 아이템(손 제외) 중 내구도 유한한 것에 적용
  // 소지한 아이템 전체에 적용 (null 슬롯 제외)
  let changed = false;
  for (let i = hand.length - 1; i >= 0; i--) {
    const item = hand[i];
    if (!item) continue;
    const maxDur = ITEM_DURABILITY[item.itemId];
    if (!isFinite(maxDur)) continue; // 무한 내구도 스킵
    const cur = (item.durability !== undefined && item.durability !== null) ? item.durability : maxDur;
    item.durability = cur - amount;
    if (item.durability <= 0) {
      showNotification('💔 ' + (WITCH_ITEMS[item.itemId] || '아이템') + ' 이(가) 부서졌습니다!');
      hand.splice(i, 1);
    }
    changed = true;
  }
  if (changed) {
    renderWitchHand();
    saveGame();
  }
}

// ── 현재 조사 대기 중인 존 ────────────────────────
let _pendingInspectZone = null;

// ── 아이템 레이어 렌더 (배경 위 아이템 이미지 표시/숨김) ──
function renderItemLayer() {
  const layer = document.getElementById('witch-item-layer');
  if (!layer) return;
  layer.innerHTML = '';
  const zones = REGION_INSPECT_ZONES[state.currentRegion];
  if (!zones) return;

  const now = witchClockMinutes;

  zones.forEach((zone, idx) => {
    if (!zone.imgSrc && !zone.shadow) return;  // 이미지도 없고 그림자도 아닌 존은 스킵
    const key = state.currentRegion + '_' + idx;
    const collected = state.witchCollected && state.witchCollected[key];

    // 재생성 체크
    if (collected) {
      const respawn = zone.respawnMins || 360;
      const elapsed = (now - collected.collectedAt + 1440) % 1440;
      if (elapsed < respawn) return;  // 아직 재생성 안 됨 → 이미지 숨김
      // 재생성 시간 지남 → 수집 기록 삭제
      delete state.witchCollected[key];
      saveGame();
    }

    let el;
    if (zone.shadow) {
      el = document.createElement('div');
      el.title = zone.label;
      const rect2 = getBgImgRect();
      const pL = parseFloat(zone.pos.left) / 100;
      const pT = parseFloat(zone.pos.top) / 100;
      const pW = parseFloat(zone.pos.width) / 100;
      const pH = parseFloat(zone.pos.height) / 100;
      const sLeft   = rect2 ? (rect2.x + rect2.w * pL) + 'px' : zone.pos.left;
      const sTop    = rect2 ? (rect2.y + rect2.h * pT) + 'px' : zone.pos.top;
      const sWidth  = rect2 ? (rect2.w * pW) + 'px' : zone.pos.width;
      const sHeight = rect2 ? (rect2.h * pH) + 'px' : zone.pos.height;
      el.style.cssText = `
        position:absolute;
        left:${sLeft}; top:${sTop};
        width:${sWidth}; height:${sHeight};
        background:rgba(0,0,0,0.45);
        border-radius:8px;
        pointer-events:auto;
        cursor:crosshair;
        box-shadow: inset 0 0 18px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.6);
        transition:background 0.15s, box-shadow 0.15s;
      `;
      el.onmouseenter = () => {
        el.style.background = 'rgba(0,0,0,0.62)';
        el.style.boxShadow = 'inset 0 0 24px rgba(0,0,0,0.9), 0 4px 20px rgba(120,255,60,0.18)';
      };
      el.onmouseleave = () => {
        el.style.background = 'rgba(0,0,0,0.45)';
        el.style.boxShadow = 'inset 0 0 18px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.6)';
      };
      el.onclick = (e) => { e.stopPropagation(); openInspectConfirmPopup(zone, idx); };
      layer.appendChild(el);
      return;
    }
    const img = document.createElement('img');
    img.src = zone.imgSrc;
    img.alt = zone.label;
    const rect = getBgImgRect();
    let iLeft, iTop, iWidth, iHeight;
    if (rect) {
      const pL = parseFloat(zone.pos.left) / 100;
      const pT = parseFloat(zone.pos.top) / 100;
      const pW = parseFloat(zone.pos.width) / 100;
      const pH = parseFloat(zone.pos.height) / 100;
      iLeft   = (rect.x + rect.w * pL) + 'px';
      iTop    = (rect.y + rect.h * pT) + 'px';
      iWidth  = (rect.w * pW) + 'px';
      iHeight = (rect.h * pH) + 'px';
    } else {
      iLeft = zone.pos.left; iTop = zone.pos.top;
      iWidth = zone.pos.width; iHeight = zone.pos.height;
    }
    img.style.cssText = `
      position:absolute;
      left:${iLeft}; top:${iTop};
      width:${iWidth}; height:${iHeight};
      object-fit:contain;
      pointer-events:auto;
      cursor:crosshair;
      filter:drop-shadow(0 4px 8px rgba(0,0,0,0.7));
      transition:transform 0.15s, filter 0.15s;
    `;
    img.title = zone.label;
    img.onmouseenter = () => {
      img.style.transform = 'scale(1.06)';
      img.style.filter = 'drop-shadow(0 4px 12px rgba(255,220,100,0.5))';
    };
    img.onmouseleave = () => {
      img.style.transform = '';
      img.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.7))';
    };
    img.onclick = (e) => {
      e.stopPropagation();
      openInspectConfirmPopup(zone, idx);
    };
    layer.appendChild(img);
  });
}

// ── 배경이미지 실제 렌더 영역 계산 ───────────────
// object-fit:cover 기준으로 이미지가 실제로 표시되는 rect 반환
function getBgImgRect() {
  const wrap = document.getElementById('witch-scene-wrap');
  if (!wrap) return null;
  return { x: 0, y: 0, w: wrap.clientWidth, h: wrap.clientHeight };
}

// ── 조사 오버레이 표시 (조사 버튼 클릭 시 즉시) ──
function showInspectOverlay() {
  // 동굴 입구: 불 소지 없으면 조사 불가
  if (state.currentRegion === '동굴 입구') {
    const attrs = getHandAttrTotal();
    if ((attrs['불'] || 0) < 1) {
      showNotification('🕯 어두워서 아무것도 보이지 않는다...');
      return;
    }
  }
  const zones = REGION_INSPECT_ZONES[state.currentRegion];
  if (!zones || zones.length === 0) {
    showNotification('🔍 조사할 것이 없습니다');
    return;
  }

  const panel = document.getElementById('witch-inspect-msg');
  if (!panel) return;
  panel.innerHTML = '';
  panel.style.display = 'flex';

  // 헤더
  const header = document.createElement('div');
  header.style.cssText = 'font-family:"Orbitron",monospace;font-size:.6rem;color:rgba(200,255,150,.7);letter-spacing:2px;margin-bottom:8px;';
  header.textContent = '🔍 ' + state.currentRegion + ' — 무엇을 조사할까요?';
  panel.appendChild(header);

  // 선택지 버튼들
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;';

  zones.forEach((zone, idx) => {
    const key = state.currentRegion + '_' + idx;
    if (zone.action === 'item' && state.witchCollected && state.witchCollected[key]) return;

    const btn = document.createElement('button');
    btn.textContent = zone.label;
    btn.style.cssText = `
      font-family:'Orbitron',monospace;font-size:.65rem;letter-spacing:1px;
      padding:7px 16px;border-radius:6px;cursor:pointer;
      background:rgba(90,255,32,.08);border:1px solid rgba(90,255,32,.4);
      color:#a0ff60;transition:background .15s;
    `;
    btn.onmouseenter = () => btn.style.background = 'rgba(90,255,32,.2)';
    btn.onmouseleave = () => btn.style.background = 'rgba(90,255,32,.08)';
    btn.onclick = () => {
      hideInspectOverlay();
      openInspectConfirmPopup(zone, idx);
    };
    btnRow.appendChild(btn);
  });
  panel.appendChild(btnRow);

  // 닫기 버튼
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ 닫기';
  closeBtn.style.cssText = `
    margin-top:8px;font-family:'Orbitron',monospace;font-size:.55rem;
    padding:5px 12px;border-radius:6px;cursor:pointer;
    background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.15);
    color:rgba(255,255,255,.4);transition:background .15s;
  `;
  closeBtn.onclick = hideInspectOverlay;
  panel.appendChild(closeBtn);
}

function hideInspectOverlay() {
  const overlay = document.getElementById('witch-inspect-overlay');
  if (overlay) { overlay.style.display = 'none'; overlay.innerHTML = ''; }
  const panel = document.getElementById('witch-inspect-msg');
  if (panel) panel.style.display = 'none';
}

// ── 클릭 후 행동력 소모 + 모래시계 시작 ──────────
function startInspectAction(zone, zoneIdx) {
  if (witchActionState) {
    showNotification('⏳ 이미 다른 행동을 진행 중입니다'); return;
  }
  const AP_COST = zone.apCost || 100;
  if (witchAp < AP_COST) {
    showNotification('⚡ 행동력이 부족합니다 (' + witchAp + '/' + AP_COST + ')'); return;
  }
  witchAp -= AP_COST;
  renderWitchStats();
  _pendingInspectZone = { zone, zoneIdx };
  const divisor = (state.witchAdminOverride && state.witchAdminOverride.actionDivisor) || 50;
  const baseDur = AP_COST / divisor;
  const { cost: growthCost, dur: inspectDuration } = applyWitchGrowth(AP_COST, baseDur);
  witchAp += (AP_COST - growthCost); // Lv3 AP 절감분 환급
  renderWitchStats();
  _pendingInspectZone = { zone, zoneIdx };
  witchActionState = { type:'조사', elapsed:0, duration:inspectDuration, data:{ zone, zoneIdx } };
  renderWitchHourglass();
  showNotification('🔍 ' + zone.label + ' 조사 중...');
}

// ── 조사 완료 처리 ────────────────────────────────
function completeInspect(zone, zoneIdx) {
  _pendingInspectZone = null;
  renderWitchHourglass();

  // 조사 사용 시 내구도 -3
  consumeHandDurability(3);

  if (zone.action === 'move') {
    let target = zone.target || '오두막 내부';
    // 동굴 입구: 불 소지 여부에 따라 이미지 분기
    if (target === '동굴 입구') {
      const attrs = getHandAttrTotal();
      const hasFire = (attrs['불'] || 0) >= 1;
      state.currentRegion = target;
      const bgImg = document.getElementById('witch-bg-img');
      if (bgImg) bgImg.src = hasFire ? 'images/c/6-2.png' : 'images/c/6-1.png';
      renderItemLayer();
      showNotification('🕳 동굴 입구로 이동했습니다');
      saveGame();
      return;
    }
    state.currentRegion = target;
    setRegionBackground(state.currentRegion);
    showNotification('🏠 ' + target + '으로 이동했습니다');
    const regionAction = REGION_ACTIONS[state.currentRegion];
    if (regionAction) regionAction();
    saveGame();
  } else if (zone.action === 'move_ap') {
    // AP를 이미 소모했으므로 지역만 이동
    state.currentRegion = zone.target;
    setRegionBackground(state.currentRegion);
    showNotification('📍 ' + zone.target + '으로 이동했습니다');
    const regionAction = REGION_ACTIONS[state.currentRegion];
    if (regionAction) regionAction();
    saveGame();
  } else if (zone.action === 'item') {
    openItemFoundPopup(zone.itemId, zone, zoneIdx);
  } else if (zone.action === 'cauldron') {
    openCauldronScreen();
  } else if (zone.action === 'shop') {
    openWitchShopPopup();
  } else if (zone.action === 'msg') {
    showNotification('🔍 ' + zone.msg);
  }
}

// ── 가마솥 화면 (나가기 / 연금술 / 강화하기) ──────
function openCauldronScreen() {
  let overlay = document.getElementById('witch-cauldron-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'witch-cauldron-overlay';
    overlay.style.cssText = `
      position:fixed; top:0; left:0; right:0; bottom:0; z-index:9300;
      background:rgba(0,0,0,.88); display:flex; flex-direction:column;
      align-items:center; justify-content:center; gap:16px;
    `;
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = '';
  overlay.style.display = 'flex';

  const title = document.createElement('div');
  title.style.cssText = "font-family:'Orbitron',monospace;font-size:.85rem;color:#a0ff60;letter-spacing:3px;margin-bottom:14px;";
  title.textContent = '🧪 가마솥';
  overlay.appendChild(title);

  function makeBtn(label, handler) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `
      font-family:'Orbitron',monospace; font-size:.7rem; letter-spacing:2px;
      padding:14px 36px; border-radius:8px; cursor:pointer; min-width:200px;
      background:rgba(90,255,32,.08); border:1px solid rgba(90,255,32,.4);
      color:#c8ffa0; transition:background .15s;
    `;
    btn.onmouseenter = () => { btn.style.background = 'rgba(90,255,32,.18)'; };
    btn.onmouseleave = () => { btn.style.background = 'rgba(90,255,32,.08)'; };
    btn.onclick = handler;
    return btn;
  }

  overlay.appendChild(makeBtn('⚗️ 연금술', function() {
    showNotification('⚗️ 연금술은 아직 준비 중입니다');
  }));
  overlay.appendChild(makeBtn('🔨 강화하기', function() {
    openCauldronUpgradePanel(overlay);
  }));

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ 닫기';
  closeBtn.style.cssText = `
    font-family:'Orbitron',monospace; font-size:.55rem; letter-spacing:1px;
    padding:8px 24px; border-radius:6px; cursor:pointer; margin-top:8px;
    background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.18); color:rgba(255,255,255,.45);
  `;
  closeBtn.onclick = closeCauldronScreen;
  overlay.appendChild(closeBtn);
}

function closeCauldronScreen() {
  const overlay = document.getElementById('witch-cauldron-overlay');
  if (overlay) overlay.style.display = 'none';
}

const WITCH_POTION_DATA = [
  {
    key: 'hp', icon: '🧴', name: '체력 물약', maxLv: 3,
    desc: ['최대 체력 +500', '최대 체력 +550', '최대 체력 +650'],
    cost: [20, 70, 155],
    onUpgrade(lv) {
      witchHp = Math.min(getWitchMaxHp(), witchHp);
      renderWitchStats();
      showNotification('🧴 체력 물약 Lv' + lv + ' — 최대 체력 증가!');
    },
  },
  {
    key: 'recover', icon: '💚', name: '회복 물약', maxLv: 3,
    desc: [
      '0.7초마다 행동력 50 회복',
      '0.5초마다 행동력 70 회복',
      '0.3초마다 행동력 100 회복 + 3초마다 체력 30 회복',
    ],
    cost: [100, 180, 350],
    onUpgrade(lv) {
      witchApTickAccum = 0;
      showNotification('💚 회복 물약 Lv' + lv + ' — 행동력 회복 강화!');
    },
  },
  {
    key: 'power', icon: '🔴', name: '힘의 물약', maxLv: 3,
    desc: ['공격력 +25%', '공격력 +60%', '공격력 +85%'],
    cost: [45, 170, 350],
    onUpgrade(lv) {
      showNotification('🔴 힘의 물약 Lv' + lv + ' — 공격력 증가!');
    },
  },
  {
    key: 'growth', icon: '🌿', name: '성장의 물약', maxLv: 3,
    desc: [
      '행동력 50마다 0.5초 단축',
      '행동력 25마다 0.25초 단축 (최소 3초)',
      '모든 행동력 소모 -50 (최소 100) + 행동력 5마다 0.1초 (최소 1초)',
    ],
    cost: [150, 350, 700],
    onUpgrade(lv) {
      showNotification('🌿 성장의 물약 Lv' + lv + ' — 행동 시간 단축!');
    },
  },
];

function openCauldronUpgradePanel(parentOverlay) {
  parentOverlay.innerHTML = '';

  const title = document.createElement('div');
  title.style.cssText = "font-family:'Orbitron',monospace;font-size:.78rem;color:#a0ff60;letter-spacing:3px;margin-bottom:4px;text-align:center;";
  title.textContent = '🔨 강화하기';
  parentOverlay.appendChild(title);

  const coinEl = document.createElement('div');
  coinEl.style.cssText = 'font-size:.62rem;color:#ffe060;margin-bottom:12px;text-align:center;letter-spacing:1px;';
  coinEl.textContent = '🪙 마녀코인: ' + (state.witchCoins || 0);
  parentOverlay.appendChild(coinEl);

  WITCH_POTION_DATA.forEach(potion => {
    const levels = getWitchPotionLevels();
    const curLv = levels[potion.key] || 0;
    const maxed = curLv >= potion.maxLv;

    const row = document.createElement('div');
    row.style.cssText = `
      display:flex;align-items:center;gap:12px;
      background:rgba(90,255,32,.05);border:1px solid rgba(90,255,32,${maxed ? '.5' : '.18'});
      border-radius:10px;padding:10px 14px;width:270px;max-width:82vw;margin-bottom:8px;
    `;

    const icon = document.createElement('div');
    icon.style.cssText = 'font-size:1.5rem;flex-shrink:0;';
    icon.textContent = potion.icon;
    row.appendChild(icon);

    const info = document.createElement('div');
    info.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;';

    const nameEl = document.createElement('div');
    nameEl.style.cssText = "font-family:'Orbitron',monospace;font-size:.6rem;color:#c8ffa0;";
    nameEl.textContent = potion.name + '  Lv' + curLv + ' / ' + potion.maxLv;
    info.appendChild(nameEl);

    const descEl = document.createElement('div');
    descEl.style.cssText = 'font-size:.52rem;color:rgba(255,255,255,.5);line-height:1.45;';
    descEl.textContent = maxed ? '✅ 최대 레벨' : '▶ ' + potion.desc[curLv];
    info.appendChild(descEl);

    if (!maxed) {
      const costEl = document.createElement('div');
      costEl.style.cssText = 'font-size:.54rem;color:#ffe060;margin-top:1px;';
      costEl.textContent = '🪙 ' + potion.cost[curLv] + ' 코인';
      info.appendChild(costEl);
    }
    row.appendChild(info);

    const btn = document.createElement('button');
    if (maxed) {
      btn.textContent = 'MAX';
      btn.disabled = true;
      btn.style.cssText = `
        font-family:'Orbitron',monospace;font-size:.52rem;padding:8px 10px;
        border-radius:6px;flex-shrink:0;cursor:not-allowed;
        background:rgba(90,255,32,.06);border:1px solid rgba(90,255,32,.25);color:rgba(160,255,96,.35);
      `;
    } else {
      const canAfford = (state.witchCoins || 0) >= potion.cost[curLv];
      btn.textContent = '강화';
      btn.style.cssText = `
        font-family:'Orbitron',monospace;font-size:.58rem;padding:8px 12px;
        border-radius:6px;flex-shrink:0;cursor:${canAfford ? 'pointer' : 'not-allowed'};
        background:rgba(255,200,60,${canAfford ? '.14' : '.04'});
        border:1px solid rgba(255,200,60,${canAfford ? '.6' : '.2'});
        color:${canAfford ? '#ffe060' : 'rgba(255,224,96,.3)'};
      `;
      btn.onclick = () => {
        const coin = state.witchCoins || 0;
        if (coin < potion.cost[curLv]) { showNotification('🪙 코인이 부족합니다'); return; }
        state.witchCoins -= potion.cost[curLv];
        getWitchPotionLevels()[potion.key] = curLv + 1;
        potion.onUpgrade(curLv + 1);
        saveGame();
        openCauldronUpgradePanel(parentOverlay);
      };
    }
    row.appendChild(btn);
    parentOverlay.appendChild(row);
  });

  const backBtn = document.createElement('button');
  backBtn.textContent = '← 돌아가기';
  backBtn.style.cssText = `
    font-family:'Orbitron',monospace;font-size:.58rem;padding:9px 24px;
    border-radius:6px;cursor:pointer;margin-top:4px;
    background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.18);color:rgba(255,255,255,.5);
  `;
  backBtn.onclick = () => openCauldronScreen();
  parentOverlay.appendChild(backBtn);
}


// ── 조사 전 확인 팝업 (필요 아이템 체크) ─────────
function openInspectConfirmPopup(zone, zoneIdx) {
  const req = zone.requireAttr || {};
  const handTotal = getHandAttrTotal();
  const missing = Object.entries(req).filter(([k,v]) => (handTotal[k]||0) < v);
  if (missing.length > 0) {
    const msgParts = missing.map(([k,v]) => k + ' ' + v + ' 이상');
    showNotification('🚫 필요 아이템 부족: ' + msgParts.join(', '));
    return;
  }
  startInspectAction(zone, zoneIdx);
}

function openItemFoundPopup(itemId, zone, zoneIdx) {
  const popup = document.getElementById('witch-item-popup');
  if (!popup) return;
  document.getElementById('witch-item-popup-img').src = 'images/c/items/' + itemId + '.png';
  document.getElementById('witch-item-popup-title').textContent = '발견!';
  document.getElementById('witch-item-popup-name').textContent = WITCH_ITEMS[itemId] || '???';

  const req = zone.requireAttr || {};
  const reqEl = document.getElementById('witch-item-popup-require');
  if (reqEl) {
    reqEl.textContent = Object.keys(req).length > 0
      ? '🔧 사용: ' + Object.entries(req).map(([k,v]) => k + ' ' + v).join(', ')
      : '🖐 맨손으로 획득 가능';
  }

  const hand = state.witchHand || [];
  const isFull = hand.length >= getWitchHandMax();
  const key = state.currentRegion + '_' + zoneIdx;

  document.getElementById('witch-item-btn-get').style.display = isFull ? 'none' : 'inline-block';
  document.getElementById('witch-item-btn-full').style.display = isFull ? 'inline-block' : 'none';
  document.getElementById('witch-item-btn-drop').style.display = 'inline-block';

  document.getElementById('witch-item-btn-get').onclick = function() {
    if (!state.witchHand) state.witchHand = [];
    state.witchHand.push({ itemId, region: state.currentRegion, zoneIdx });
    if (!state.witchCollected) state.witchCollected = {};
    state.witchCollected[key] = { collectedAt: witchClockMinutes };
    closeItemFoundPopup();
    renderWitchHand();
    renderItemLayer();
    showNotification('✅ ' + (WITCH_ITEMS[itemId] || '???') + ' 획득!' + (itemId === WITCH_BAG_ITEM_ID ? ' 🎒 핸드 최대 ' + getWitchHandMax() + '칸' : ''));
    saveGame();
  };
  document.getElementById('witch-item-btn-drop').onclick = function() {
    if (!state.witchCollected) state.witchCollected = {};
    state.witchCollected[key] = { collectedAt: witchClockMinutes };
    closeItemFoundPopup();
    renderItemLayer();
    showNotification('🗑 ' + (WITCH_ITEMS[itemId] || '???') + ' 버렸습니다');
    saveGame();
  };
  popup.style.display = 'flex';
}

function closeItemFoundPopup() {
  const popup = document.getElementById('witch-item-popup');
  if (popup) popup.style.display = 'none';
}

// ── 핸드(소지품) 렌더 ─────────────────────────────
function renderWitchHand() {
  const hand = state.witchHand || [];
  const maxHand = getWitchHandMax();
  // 가방을 팔아서 최대치가 줄어도 이미 들고 있는 아이템은 가려지지 않도록 보장
  const displaySlots = Math.max(maxHand, hand.length);

  // 슬롯 컨테이너 — 현재 표시 칸 수와 실제 슬롯 개수가 다르면 다시 생성
  const wrap = document.getElementById('witch-hand-slots-wrap');
  const currentSlotCount = wrap ? wrap.querySelectorAll('.witch-hand-slot').length : 0;
  if (wrap && currentSlotCount !== displaySlots) {
    wrap.innerHTML = '';
    for (let i = 0; i < displaySlots; i++) {
      // 기본 핸드(5칸)와 가방으로 늘어난 추가 핸드 사이에 구분선 표시
      if (i === WITCH_BASE_HAND_SIZE && displaySlots > WITCH_BASE_HAND_SIZE) {
        const divider = document.createElement('div');
        divider.className = 'witch-hand-divider';
        divider.title = '가방 추가 칸';
        divider.style.cssText = 'width:0;align-self:stretch;border-left:1px dashed rgba(90,255,32,.4);margin:0 3px;';
        wrap.appendChild(divider);
      }
      const slotEl = document.createElement('div');
      slotEl.id = 'witch-hand-slot-' + i;
      slotEl.className = 'witch-hand-slot';
      wrap.appendChild(slotEl);
    }
  }

  // 모든 슬롯에 드롭(놓기) 대상 역할 부여 — 빈 슬롯이어도 드롭 가능
  for (let i = 0; i < maxHand; i++) {
    const slot = document.getElementById('witch-hand-slot-' + i);
    if (slot) slot.dataset.slotIdx = String(i);
  }

  for (let i = 0; i < maxHand; i++) {
    const slot = document.getElementById('witch-hand-slot-' + i);
    if (!slot) continue;
    slot.innerHTML = '';
    if (hand[i]) {
      const item = hand[i];

      const img = document.createElement('img');
      img.src = 'images/c/items/' + item.itemId + '.png';
      img.style.cssText = 'width:36px;height:36px;object-fit:contain;cursor:grab;touch-action:none;';
      img.draggable = false;
      img.oncontextmenu = (e) => e.preventDefault(); // 모바일 길게 누르기 시 메뉴 방지

      // ── 꾹 누르기(long-press) = 상세정보, 일정 거리 이상 이동 = 드래그 이동 ──
      let pressTimer = null;
      let dragging = false;
      let ghost = null;
      let startX = 0, startY = 0;
      const DRAG_THRESHOLD = 10;

      const clearHighlights = () => {
        document.querySelectorAll('.witch-hand-slot').forEach(s => { s.style.outline = ''; });
      };
      const removeGhost = () => {
        if (ghost) { ghost.remove(); ghost = null; }
        img.style.opacity = '1';
      };
      const findSlotAt = (x, y) => {
        const el = document.elementFromPoint(x, y);
        return el ? el.closest('.witch-hand-slot') : null;
      };
      const onPointerMove = (e) => {
        const dx = e.clientX - startX, dy = e.clientY - startY;
        if (!dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
          dragging = true;
          if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
          ghost = img.cloneNode(true);
          ghost.style.position = 'fixed';
          ghost.style.width = '36px';
          ghost.style.height = '36px';
          ghost.style.pointerEvents = 'none';
          ghost.style.zIndex = '99999';
          ghost.style.opacity = '0.85';
          ghost.style.filter = 'drop-shadow(0 0 8px rgba(90,255,32,.8))';
          document.body.appendChild(ghost);
          img.style.opacity = '0.3';
        }
        if (dragging && ghost) {
          ghost.style.left = (e.clientX - 18) + 'px';
          ghost.style.top = (e.clientY - 18) + 'px';
          clearHighlights();
          const slotEl = findSlotAt(e.clientX, e.clientY);
          if (slotEl) slotEl.style.outline = '2px solid #5aff20';
        }
      };
      const onPointerUp = (e) => {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
        clearHighlights();
        if (dragging) {
          const slotEl = findSlotAt(e.clientX, e.clientY);
          removeGhost();
          if (slotEl && slotEl.dataset && slotEl.dataset.slotIdx !== undefined) {
            moveWitchHandItem(i, parseInt(slotEl.dataset.slotIdx, 10));
          }
        }
        dragging = false;
      };
      img.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        startX = e.clientX; startY = e.clientY;
        dragging = false;
        pressTimer = setTimeout(() => {
          showItemDetailPopup(item.itemId, i);
        }, 450);
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
      });

      const nameEl = document.createElement('div');
      nameEl.style.cssText = 'font-size:.48rem;color:#c8ffa0;margin-top:2px;line-height:1.2;';
      nameEl.textContent = WITCH_ITEMS[item.itemId] || '???';

      const dropBtn = document.createElement('button');
      dropBtn.textContent = '버리기';
      dropBtn.style.cssText = 'margin-top:3px;font-size:.45rem;padding:1px 5px;background:rgba(255,60,60,0.2);border:1px solid rgba(255,80,80,0.5);color:#ff9999;border-radius:3px;cursor:pointer;';
      dropBtn.onclick = () => dropWitchHandItem(i);

      slot.appendChild(img);
      slot.appendChild(nameEl);
      slot.appendChild(dropBtn);
      slot.style.opacity = '1';
    } else {
      slot.innerHTML = '<div style="font-size:.55rem;color:#333;">비어있음</div>';
      slot.style.opacity = '0.5';
    }
  }
  // 핸드 카운터
  const counter = document.getElementById('witch-hand-counter');
  if (counter) counter.textContent = 'HAND  ' + hand.length + ' / ' + maxHand;
}

// ── 핸드 슬롯 간 아이템 위치 이동(드래그 앤 드롭) ──
// 메인핸드(0~4) ↔ 추가핸드(가방으로 늘어난 칸) 어디로든 자유롭게 이동 가능
function moveWitchHandItem(fromIdx, toIdx) {
  if (!state.witchHand) return;
  const hand = state.witchHand;
  if (fromIdx === toIdx) return;
  if (fromIdx < 0 || fromIdx >= hand.length) return;

  const maxSlots = getWitchHandMax();
  if (toIdx < 0) toIdx = 0;
  if (toIdx >= maxSlots) toIdx = maxSlots - 1;

  // 빈 슬롯으로 이동: 중간에 null을 채워서 위치 고정
  const maxLen = Math.max(hand.length, toIdx + 1);
  while (hand.length < maxLen) hand.push(null);

  const moved = hand[fromIdx];
  hand[fromIdx] = null;

  if (hand[toIdx] !== null && hand[toIdx] !== undefined) {
    // 대상 슬롯에 아이템이 있으면 swap
    hand[fromIdx] = hand[toIdx];
  }
  hand[toIdx] = moved;
  // fromIdx가 배열 끝이고 null이면 뒤쪽만 정리 (toIdx 이후 null은 위치 보존)
  while (hand.length > toIdx + 1 && hand[hand.length - 1] === null) hand.pop();
  renderWitchHand();
  saveGame();
}

// ── 아이템 속성 한글 표시 순서 ─────────────────────
const ITEM_ATTR_ORDER = ['막대','날카로움','무기','단단함','끈','삽','불','방어','보안카드','USB','인벤토리','고장남'];

// ── 아이템 상세정보 팝업 ───────────────────────────
function showItemDetailPopup(itemId, handIdx) {
  let overlay = document.getElementById('witch-item-detail-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'witch-item-detail-overlay';
    overlay.style.cssText = `
      position:fixed; top:0; left:0; right:0; bottom:0; z-index:9400;
      background:rgba(0,0,0,.82); display:flex; align-items:center; justify-content:center;
    `;
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = '';
  overlay.style.display = 'flex';
  overlay.onclick = (e) => { if (e.target === overlay) closeItemDetailPopup(); };

  const card = document.createElement('div');
  card.style.cssText = `
    width:260px; max-width:85vw; background:#0d150a; border:1px solid rgba(90,255,32,.4);
    border-radius:12px; padding:18px 16px; display:flex; flex-direction:column; align-items:center; gap:10px;
  `;
  card.onclick = (e) => e.stopPropagation();

  const img = document.createElement('img');
  img.src = 'images/c/items/' + itemId + '.png';
  img.style.cssText = 'width:64px;height:64px;object-fit:contain;';
  card.appendChild(img);

  const name = document.createElement('div');
  name.style.cssText = "font-family:'Orbitron',monospace;font-size:.8rem;color:#a0ff60;letter-spacing:1px;";
  name.textContent = WITCH_ITEMS[itemId] || '???';
  card.appendChild(name);

  // 속성 표시 (예: 막대 1, 무기 17 ...)
  const attrs = ITEM_ATTRS[itemId] || {};
  const attrKeys = Object.keys(attrs).sort((a, b) => {
    const ai = ITEM_ATTR_ORDER.indexOf(a), bi = ITEM_ATTR_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  const attrRow = document.createElement('div');
  attrRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;justify-content:center;';
  if (attrKeys.length === 0) {
    const tag = document.createElement('span');
    tag.style.cssText = 'font-size:.6rem;color:rgba(255,255,255,.4);';
    tag.textContent = '속성 없음';
    attrRow.appendChild(tag);
  } else {
    attrKeys.forEach((k) => {
      const tag = document.createElement('span');
      tag.style.cssText = 'font-size:.6rem;color:#c8ffa0;background:rgba(90,255,32,.1);border:1px solid rgba(90,255,32,.3);border-radius:5px;padding:3px 8px;';
      tag.textContent = k + ' ' + attrs[k];
      attrRow.appendChild(tag);
    });
  }
  card.appendChild(attrRow);

  const desc = document.createElement('div');
  desc.style.cssText = 'font-size:.62rem;color:rgba(255,255,255,.7);text-align:center;line-height:1.5;margin:4px 0 6px;';
  desc.textContent = getItemDescription(itemId);
  card.appendChild(desc);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;width:100%;';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '닫기';
  closeBtn.style.cssText = `
    flex:1; font-family:'Orbitron',monospace; font-size:.6rem; letter-spacing:1px;
    padding:9px 0; border-radius:6px; cursor:pointer;
    background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.2); color:rgba(255,255,255,.7);
  `;
  closeBtn.onclick = closeItemDetailPopup;
  btnRow.appendChild(closeBtn);

  const dropBtn = document.createElement('button');
  dropBtn.textContent = '버리기';
  dropBtn.style.cssText = `
    flex:1; font-family:'Orbitron',monospace; font-size:.6rem; letter-spacing:1px;
    padding:9px 0; border-radius:6px; cursor:pointer;
    background:rgba(255,60,60,.15); border:1px solid rgba(255,80,80,.5); color:#ff9999;
  `;
  dropBtn.onclick = () => {
    dropWitchHandItem(handIdx);
    closeItemDetailPopup();
  };
  btnRow.appendChild(dropBtn);

  card.appendChild(btnRow);
  overlay.appendChild(card);
}

function closeItemDetailPopup() {
  const overlay = document.getElementById('witch-item-detail-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ── 아이템별 설명 텍스트 (없으면 기본 문구로 대체) ──
const WITCH_ITEM_DESC = {
  3: '이 나뭇가지도 어딘가 쓸모가 있겠지?',
  11: '날카롭게 갈린 도끼날, 무언가를 베어내는 데 쓸 수 있을 것 같다.',
  12: '묵직한 망치, 부수거나 박는 데 제격일 듯하다.',
  29: '코를 보호해줄 방독면, 위험한 곳에서 쓸모가 있겠지.',
  46: '겉보기엔 위협적이지만 고장이 나서 그런지 어딘가 불안정해 보인다.',
};
function getItemDescription(itemId) {
  if (WITCH_ITEM_DESC[itemId]) return WITCH_ITEM_DESC[itemId];
  const name = WITCH_ITEMS[itemId] || '이것';
  return '이 ' + name + '도 어딘가 쓸모가 있겠지?';
}

function dropWitchHandItem(idx) {
  if (!state.witchHand) return;
  const wasBag = state.witchHand[idx] && state.witchHand[idx].itemId === WITCH_BAG_ITEM_ID;
  state.witchHand.splice(idx, 1);
  renderWitchHand();
  showNotification('🗑 아이템을 버렸습니다' + (wasBag ? ' 🎒 핸드 최대 ' + getWitchHandMax() + '칸으로 감소' : ''));
  saveGame();
}

function toggleWitchHand() {
  const bar = document.getElementById('witch-hand-bar');
  const btn = document.getElementById('wact-hand-btn');
  if (!bar) return;
  const visible = bar.style.display !== 'none';
  bar.style.display = visible ? 'none' : 'block';
  if (btn) btn.classList.toggle('active', !visible);
}

function witchAction(type) {
  if (witchActionState) {
    if (witchActionState.type === type) {
      cancelWitchAction();   // 같은 버튼 재클릭 → 취소
    } else {
      showNotification('⏳ 이미 ' + witchActionState.type + ' 진행 중입니다');
    }
    return;
  }
  if (type === '이동') { openRegionMap(); return; }
  if (type === '휴식') { startWitchRest(); return; }
  if (type === '방어') { startWitchDefense(); return; }
  if (type === '공격') { startWitchAttack(); return; }
  if (type === '조사') { showInspectOverlay(); return; }
  showNotification('[ ' + type + ' ] — 준비중');
}

function startWitchRest() {
  witchActionState = { type: '휴식', elapsed: 0, duration: 3, data: {} };
  renderWitchHourglass();
  showNotification('🛏 휴식 시작 (3초)');
}

function startWitchDefense() {
  witchActionState = { type: '방어', elapsed: 0, duration: 5, data: {} };
  renderWitchHourglass();
  showNotification('🎽 방어 태세 돌입 (5초)');
}

function startWitchAttack() {
  if (!witchAttackTarget) {
    showNotification('🚫 공격할 대상이 없습니다');
    return;
  }
  witchActionState = { type: '공격', elapsed: 0, duration: 4, data: { target: witchAttackTarget } };
  renderWitchHourglass();
  showNotification('👊 공격 시전 중 (4초)');
}

function completeWitchAction(action) {
  switch (action.type) {
    case '조사': {
      const { zone, zoneIdx } = action.data;
      completeInspect(zone, zoneIdx);
      break;
    }
    case '이동': {
      const name = action.data.target;
      const cost = action.data.cost;
      witchAp = Math.max(0, witchAp - cost);
      state.currentRegion = name;
      setRegionBackground(name);
      renderWitchStats();
      renderWitchHourglass();
      const regionAction = REGION_ACTIONS[name];
      if (regionAction) regionAction();
      saveGame();
      break;
    }
    case '휴식': {
      const healed = witchHp < WITCH_STAT_MAX_HP ? 15 : 0;
      witchHp = Math.min(WITCH_STAT_MAX_HP, witchHp + 15);
      witchAp = Math.min(WITCH_STAT_MAX_AP, witchAp + 100);
      renderWitchStats();
      renderWitchHourglass();
      showNotification(healed > 0 ? `🛏 휴식 완료! 체력 +${healed}, 행동력 +100` : '🛏 휴식 완료! 행동력 +100 (체력 최대)');
      saveGame();
      break;
    }
    case '방어': {
      witchDefenseBuffActive = true;
      renderWitchHourglass();
      showNotification('🎽 방어 완료! 다음 피격 피해 25% 감소');
      saveGame();
      break;
    }
    case '공격': {
      const dmg = Math.round(35 * getWitchAttackMult());
      const target = action.data.target;
      if (target && typeof target.takeDamage === 'function') target.takeDamage(dmg);
      consumeHandDurability(2);
      renderWitchHourglass();
      showNotification(`👊 공격 성공! ${dmg} 피해`);
      saveGame();
      break;
    }
  }
}

function witchTakeDamage(amount) {
  let dmg = amount;
  if (witchDefenseBuffActive) {
    dmg = Math.round(dmg * 0.75);
    witchDefenseBuffActive = false; // 1회 피격에 사용 후 소멸
  }
  witchHp = Math.max(0, witchHp - dmg);
  renderWitchStats();
  return dmg;
}

function cancelWitchAction() {
  if (!witchActionState) return;
  const type = witchActionState.type;

  // 조사 취소 시 선차감된 AP 환불
  if (type === '조사') {
    const refund = witchActionState.data && witchActionState.data.zone
      ? (witchActionState.data.zone.apCost || 100)
      : 100;
    witchAp = Math.min(witchMaxAp, witchAp + refund);
    renderWitchStats();
  }

  witchActionState = null;
  _pendingInspectZone = null;
  hideInspectOverlay();
  renderWitchHourglass();
  showNotification('🚫 ' + type + ' 취소됨');
}

// ── 폐가 상점 팝업 (판매 + 구매) ──────────────────
function openWitchShopPopup() {
  if (!state.witchCoins) state.witchCoins = 0;

  let overlay = document.getElementById('witch-shop-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'witch-shop-overlay';
    overlay.style.cssText = `
      position:fixed; top:0; left:0; right:0; bottom:0; z-index:9500;
      background:rgba(0,0,0,.88); display:flex; align-items:center; justify-content:center;
    `;
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = '';
  overlay.style.display = 'flex';
  overlay.onclick = (e) => { if (e.target === overlay) closeWitchShopPopup(); };

  const box = document.createElement('div');
  box.style.cssText = `
    width:320px; max-width:92vw; max-height:85vh; overflow-y:auto;
    background:#0a1208; border:1px solid rgba(120,255,60,.4);
    border-radius:14px; padding:18px 14px; display:flex; flex-direction:column; gap:12px;
  `;
  box.onclick = (e) => e.stopPropagation();

  // 헤더
  const header = document.createElement('div');
  header.style.cssText = "font-family:'Orbitron',monospace;font-size:.75rem;color:#a0ff60;letter-spacing:2px;text-align:center;";
  header.textContent = '🏚 그림자 거래소';
  box.appendChild(header);

  // 코인 표시
  const coinEl = document.createElement('div');
  coinEl.id = 'witch-shop-coin-display';
  coinEl.style.cssText = 'text-align:center;font-size:.65rem;color:#ffe060;letter-spacing:1px;';
  coinEl.textContent = '🪙 마녀코인: ' + (state.witchCoins || 0);
  box.appendChild(coinEl);

  // 탭 버튼
  const tabRow = document.createElement('div');
  tabRow.style.cssText = 'display:flex;gap:6px;';
  const tabs = ['판매', '구매'];
  let activeTab = '판매';
  const tabBtns = {};
  const contentArea = document.createElement('div');

  function renderTab(tab) {
    activeTab = tab;
    Object.entries(tabBtns).forEach(([t, b]) => {
      b.style.background = t === tab ? 'rgba(90,255,32,.22)' : 'rgba(90,255,32,.06)';
      b.style.borderColor = t === tab ? 'rgba(90,255,32,.8)' : 'rgba(90,255,32,.25)';
    });
    contentArea.innerHTML = '';
    if (tab === '판매') renderSellTab(contentArea);
    else renderBuyTab(contentArea);
  }

  tabs.forEach(t => {
    const btn = document.createElement('button');
    btn.textContent = t;
    btn.style.cssText = `
      flex:1; font-family:'Orbitron',monospace; font-size:.62rem; letter-spacing:1px;
      padding:7px 0; border-radius:6px; cursor:pointer;
      background:rgba(90,255,32,.06); border:1px solid rgba(90,255,32,.25); color:#a0ff60;
      transition:background .15s;
    `;
    btn.onclick = () => renderTab(t);
    tabBtns[t] = btn;
    tabRow.appendChild(btn);
  });
  box.appendChild(tabRow);
  box.appendChild(contentArea);

  // 닫기
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ 닫기';
  closeBtn.style.cssText = `
    font-family:'Orbitron',monospace; font-size:.58rem; padding:8px 0;
    border-radius:6px; cursor:pointer; background:rgba(255,255,255,.04);
    border:1px solid rgba(255,255,255,.15); color:rgba(255,255,255,.5);
  `;
  closeBtn.onclick = closeWitchShopPopup;
  box.appendChild(closeBtn);

  overlay.appendChild(box);
  renderTab('판매');
}

function renderSellTab(container) {
  const hand = state.witchHand || [];
  if (hand.length === 0) {
    const msg = document.createElement('div');
    msg.style.cssText = 'text-align:center;font-size:.62rem;color:rgba(255,255,255,.4);padding:16px 0;';
    msg.textContent = '손에 든 아이템이 없습니다';
    container.appendChild(msg);
    return;
  }

  // itemId별로 그룹화 (원본 배열 인덱스 보존, 내구도 낮은 것부터 판매되도록 정렬)
  const groups = {};
  hand.forEach((item, idx) => {
    if (!groups[item.itemId]) groups[item.itemId] = [];
    groups[item.itemId].push({ idx, durability: item.durability });
  });

  Object.keys(groups).forEach(itemIdStr => {
    const itemId = Number(itemIdStr);
    const maxDur = ITEM_DURABILITY[itemId];
    const entries = groups[itemIdStr].sort((a, b) => {
      const da = (a.durability !== undefined) ? a.durability : maxDur;
      const db = (b.durability !== undefined) ? b.durability : maxDur;
      return da - db; // 내구도 낮은 것부터 판매되어 좋은 아이템은 남도록
    });
    const count = entries.length;

    const row = document.createElement('div');
    row.style.cssText = `
      display:flex; align-items:center; gap:8px; flex-wrap:wrap;
      padding:8px; border-radius:8px; background:rgba(255,255,255,.03);
      border:1px solid rgba(90,255,32,.15);
    `;

    const imgWrap = document.createElement('div');
    imgWrap.style.cssText = 'position:relative;width:40px;height:40px;flex-shrink:0;';
    const img = document.createElement('img');
    img.src = 'images/c/items/' + itemId + '.png';
    img.style.cssText = 'width:40px;height:40px;object-fit:contain;filter:drop-shadow(0 3px 6px rgba(0,0,0,.8));';
    imgWrap.appendChild(img);
    row.appendChild(imgWrap);

    const info = document.createElement('div');
    info.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:2px;min-width:88px;';
    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-size:.63rem;color:#c8ffa0;';
    nameEl.textContent = (WITCH_ITEMS[itemId] || '???') + ' (보유 ' + count + '개)';
    const priceEl = document.createElement('div');
    priceEl.style.cssText = 'font-size:.58rem;color:#ffe060;';
    info.appendChild(nameEl);
    info.appendChild(priceEl);
    row.appendChild(info);

    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.min = '1';
    qtyInput.max = String(count);
    qtyInput.value = '1';
    qtyInput.style.cssText = `
      width:44px; font-size:.6rem; text-align:center; border-radius:6px;
      background:rgba(255,255,255,.06); border:1px solid rgba(90,255,32,.3);
      color:#c8ffa0; padding:6px 2px;
    `;

    function calcSum(qty) {
      const n = Math.max(1, Math.min(count, qty));
      let sum = 0;
      for (let i = 0; i < n; i++) {
        const dur = (entries[i].durability !== undefined) ? entries[i].durability : maxDur;
        sum += calcActualSellPrice(itemId, isFinite(maxDur) ? dur : maxDur);
      }
      return sum;
    }
    function updatePriceLabel() {
      const qty = parseInt(qtyInput.value, 10) || 1;
      priceEl.textContent = '🪙 ' + calcSum(qty) + ' 코인';
    }
    qtyInput.oninput = () => {
      let v = parseInt(qtyInput.value, 10) || 1;
      if (v < 1) v = 1;
      if (v > count) v = count;
      qtyInput.value = String(v);
      updatePriceLabel();
    };
    updatePriceLabel();
    row.appendChild(qtyInput);

    const maxBtn = document.createElement('button');
    maxBtn.textContent = '최대';
    maxBtn.style.cssText = `
      font-family:'Orbitron',monospace; font-size:.54rem; padding:6px 7px;
      border-radius:6px; cursor:pointer; flex-shrink:0;
      background:rgba(90,255,32,.08); border:1px solid rgba(90,255,32,.35); color:#a0ff60;
    `;
    maxBtn.onclick = () => {
      qtyInput.value = String(count);
      updatePriceLabel();
    };
    row.appendChild(maxBtn);

    const sellBtn = document.createElement('button');
    sellBtn.textContent = '판매';
    sellBtn.style.cssText = `
      font-family:'Orbitron',monospace; font-size:.58rem; padding:7px 10px;
      border-radius:6px; cursor:pointer; flex-shrink:0;
      background:rgba(255,200,60,.12); border:1px solid rgba(255,200,60,.5); color:#ffe060;
    `;
    sellBtn.onclick = () => {
      const qty = Math.max(1, Math.min(count, parseInt(qtyInput.value, 10) || 1));
      const sellEntries = entries.slice(0, qty);
      const sum = calcSum(qty);
      if (!state.witchCoins) state.witchCoins = 0;
      state.witchCoins += sum;
      const idxToRemove = sellEntries.map(e => e.idx).sort((a, b) => b - a);
      idxToRemove.forEach(i => state.witchHand.splice(i, 1));
      renderWitchHand();
      saveGame();
      showNotification('🪙 ' + (WITCH_ITEMS[itemId]||'???') + ' ' + qty + '개 판매! +' + sum + ' 코인' + (itemId === WITCH_BAG_ITEM_ID ? ' 🎒 핸드 최대 ' + getWitchHandMax() + '칸으로 감소' : ''));
      closeWitchShopPopup();
      openWitchShopPopup();
    };
    row.appendChild(sellBtn);

    container.appendChild(row);
  });
}

function renderBuyTab(container) {
  const allIds = Object.keys(WITCH_ITEMS).map(Number);
  allIds.forEach(itemId => {
    const basePrice = ITEM_SELL_PRICE[itemId] || 1;
    const buyPrice = Math.ceil(basePrice * 1.75);
    const maxDur = ITEM_DURABILITY[itemId];

    const row = document.createElement('div');
    row.style.cssText = `
      display:flex; align-items:center; gap:8px; flex-wrap:wrap;
      padding:8px; border-radius:8px; background:rgba(255,255,255,.03);
      border:1px solid rgba(90,255,32,.12); margin-bottom:5px;
    `;

    const imgWrap = document.createElement('div');
    imgWrap.style.cssText = 'position:relative;width:38px;height:38px;flex-shrink:0;';
    const img = document.createElement('img');
    img.src = 'images/c/items/' + itemId + '.png';
    img.style.cssText = 'width:38px;height:38px;object-fit:contain;filter:drop-shadow(0 2px 5px rgba(0,0,0,.8));';
    imgWrap.appendChild(img);
    row.appendChild(imgWrap);

    const info = document.createElement('div');
    info.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:2px;min-width:88px;';
    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-size:.63rem;color:#c8ffa0;';
    nameEl.textContent = WITCH_ITEMS[itemId] || '???';
    const durEl = document.createElement('div');
    durEl.style.cssText = 'font-size:.52rem;color:rgba(255,255,255,.4);';
    durEl.textContent = '내구도: ' + (isFinite(maxDur) ? maxDur : '∞');
    const priceEl = document.createElement('div');
    priceEl.style.cssText = 'font-size:.58rem;color:#80dfff;';
    info.appendChild(nameEl);
    info.appendChild(durEl);
    info.appendChild(priceEl);
    row.appendChild(info);

    const freeSlots = getWitchHandMax() - (state.witchHand || []).length;
    const affordableQty = buyPrice > 0 ? Math.floor((state.witchCoins || 0) / buyPrice) : 0;
    const maxQty = Math.max(0, Math.min(freeSlots, affordableQty));

    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.min = '1';
    qtyInput.max = String(Math.max(1, maxQty));
    qtyInput.value = '1';
    qtyInput.disabled = maxQty < 1;
    qtyInput.style.cssText = `
      width:44px; font-size:.6rem; text-align:center; border-radius:6px;
      background:rgba(255,255,255,.06); border:1px solid rgba(80,200,255,.3);
      color:#80dfff; padding:6px 2px;
    `;

    function updateBuyPriceLabel() {
      const qty = parseInt(qtyInput.value, 10) || 1;
      priceEl.textContent = '🪙 ' + (buyPrice * qty) + ' 코인';
    }
    qtyInput.oninput = () => {
      let v = parseInt(qtyInput.value, 10) || 1;
      if (v < 1) v = 1;
      if (maxQty >= 1 && v > maxQty) v = maxQty;
      qtyInput.value = String(v);
      updateBuyPriceLabel();
    };
    updateBuyPriceLabel();
    row.appendChild(qtyInput);

    const maxBtn = document.createElement('button');
    maxBtn.textContent = '최대';
    maxBtn.disabled = maxQty < 1;
    maxBtn.style.cssText = `
      font-family:'Orbitron',monospace; font-size:.54rem; padding:6px 7px;
      border-radius:6px; cursor:${maxQty < 1 ? 'not-allowed' : 'pointer'}; flex-shrink:0;
      background:rgba(80,200,255,.08); border:1px solid rgba(80,200,255,${maxQty < 1 ? '.15' : '.35'});
      color:${maxQty < 1 ? 'rgba(128,223,255,.3)' : '#80dfff'};
    `;
    maxBtn.onclick = () => {
      if (maxQty < 1) return;
      qtyInput.value = String(maxQty);
      updateBuyPriceLabel();
    };
    row.appendChild(maxBtn);

    const buyBtn = document.createElement('button');
    buyBtn.textContent = '구매';
    const canBuyAny = maxQty >= 1;
    buyBtn.disabled = !canBuyAny;
    buyBtn.style.cssText = `
      font-family:'Orbitron',monospace; font-size:.58rem; padding:7px 10px;
      border-radius:6px; cursor:${canBuyAny ? 'pointer' : 'not-allowed'}; flex-shrink:0;
      background:rgba(80,200,255,.12); border:1px solid rgba(80,200,255,${canBuyAny ? '.5' : '.2'});
      color:${canBuyAny ? '#80dfff' : 'rgba(128,223,255,.3)'};
    `;
    buyBtn.onclick = () => {
      const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
      const totalCost = buyPrice * qty;
      const slots = getWitchHandMax() - (state.witchHand || []).length;
      if ((state.witchCoins || 0) < totalCost) { showNotification('🪙 코인이 부족합니다'); return; }
      if (slots < qty) { showNotification('🚫 아이템이 가득찼습니다'); return; }
      state.witchCoins -= totalCost;
      if (!state.witchHand) state.witchHand = [];
      for (let i = 0; i < qty; i++) {
        state.witchHand.push({ itemId, durability: isFinite(maxDur) ? maxDur : null });
      }
      renderWitchHand();
      saveGame();
      showNotification('🛒 ' + (WITCH_ITEMS[itemId]||'???') + ' ' + qty + '개 구매! -' + totalCost + ' 코인' + (itemId === WITCH_BAG_ITEM_ID ? ' 🎒 핸드 최대 ' + getWitchHandMax() + '칸' : ''));
      closeWitchShopPopup();
      openWitchShopPopup();
    };
    row.appendChild(buyBtn);
    container.appendChild(row);
  });
}

function closeWitchShopPopup() {
  const overlay = document.getElementById('witch-shop-overlay');
  if (overlay) overlay.style.display = 'none';
}

// 이동 확인 패널 외부 클릭 시 취소
document.addEventListener('click', function(e) {
  const panel = document.getElementById('witch-move-confirm');
  if(!panel || panel.style.display === 'none') return;
  if(!_pendingRegion) return;  // 이미 이동 처리된 경우 무시
  const confirmBtn = document.getElementById('witch-move-confirm-btn');
  if(panel.contains(e.target) || (confirmBtn && confirmBtn.contains(e.target))) return;
  hideMoveConfirm();
});

// 가마솥 클릭 가능 영역을 좌/우 테크 칼럼, 상단 스탯바, 하단 닫기 버튼 사이의

// 가마솥 클릭 가능 영역을 좌/우 테크 칼럼, 상단 스탯바, 하단 닫기 버튼 사이의
// "실제 빈 공간"으로 매번 재계산한다. 화면 비율/기기에 따라 배경 이미지가
// object-fit:contain으로 다르게 렌더링되어도 클릭 영역이 항상 중앙 가용 공간을
// 정확히 채우도록 해서, 중앙을 눌렀을 때 클릭이 빗나가 모달 배경(바깥)을
// 누른 것으로 처리되는 일이 없게 한다.
function positionWitchCauldronHitbox() {
  const modal = document.getElementById('witch-modal');
  const hit = document.getElementById('witch-cauldron-click');
  if (!modal || !hit || !modal.classList.contains('active')) return;
  const leftCol = document.getElementById('witch-tech-col-left');
  const rightCol = document.getElementById('witch-tech-col-right');
  const statsBar = modal.querySelector('.witch-stats-bar');
  const closeBtn = modal.querySelector('.witch-close-btn');
  if (!leftCol || !rightCol || !statsBar || !closeBtn) return;

  const lcRect = leftCol.getBoundingClientRect();
  const rcRect = rightCol.getBoundingClientRect();
  const sbRect = statsBar.getBoundingClientRect();
  const mobileBar = document.getElementById('witch-mobile-tabbar');
  const mobileBarVisible = mobileBar && getComputedStyle(mobileBar).display !== 'none';
  const cbRect = mobileBarVisible ? mobileBar.getBoundingClientRect() : closeBtn.getBoundingClientRect();
  const gap = 12;

  const left = lcRect.right + gap;
  const right = rcRect.left - gap;
  const top = sbRect.bottom + gap;
  const bottom = cbRect.top - gap;

  const width = Math.max(60, right - left);
  const height = Math.max(60, bottom - top);

  hit.style.left = left + 'px';
  hit.style.top = top + 'px';
  hit.style.width = width + 'px';
  hit.style.height = height + 'px';
}
window.addEventListener('resize', positionWitchCauldronHitbox);
window.addEventListener('orientationchange', () => setTimeout(positionWitchCauldronHitbox, 200));
// 마녀 모달은 화면 전체가 배경 그림이라 "바깥"이 따로 없으므로,
// 배경(빈 공간)을 눌러서 모달이 닫히는 동작은 제공하지 않는다.
// 닫기는 오직 ✕ 버튼으로만 가능하다.
// ── 채팅 시스템 ────────────────────────────────────
const WITCH_CHAT_KEY = 'witch_chat_logs';
const WITCH_CHAT_FLAGS_KEY = 'witch_chat_flags';

function loadWitchChatLogs() {
  try { return JSON.parse(localStorage.getItem(WITCH_CHAT_KEY) || '[]'); }
  catch(e) { return []; }
}
function saveWitchChatLogs(logs) {
  try { localStorage.setItem(WITCH_CHAT_KEY, JSON.stringify(logs)); } catch(e) {}
}
function getWitchChatFlags() {
  try { return JSON.parse(localStorage.getItem(WITCH_CHAT_FLAGS_KEY) || '{}'); }
  catch(e) { return {}; }
}
function setWitchChatFlag(key) {
  const f = getWitchChatFlags(); f[key] = true;
  try { localStorage.setItem(WITCH_CHAT_FLAGS_KEY, JSON.stringify(f)); } catch(e) {}
}

// NPC 메시지 추가
function addWitchNpcMessage(npcName, text, avatarEmoji) {
  const logs = loadWitchChatLogs();
  logs.push({ type:'npc', npc:npcName, avatar:avatarEmoji||'🧙‍♀️', text, time:Date.now() });
  saveWitchChatLogs(logs);
  renderWitchChatMessages();
}

// 플레이어 메시지 추가
function addWitchPlayerMessage(text) {
  const logs = loadWitchChatLogs();
  logs.push({ type:'player', text, time:Date.now() });
  saveWitchChatLogs(logs);
  renderWitchChatMessages();
}

// 날짜 구분선 텍스트 생성
function _chatDateLabel(ts) {
  const d = new Date(ts);
  const y = d.getFullYear(), m = d.getMonth()+1, day = d.getDate();
  const dow = ['일','월','화','수','목','금','토'][d.getDay()];
  return y + '년 ' + m + '월 ' + day + '일 ' + dow + '요일';
}

function renderWitchChatMessages() {
  const container = document.getElementById('witch-chat-messages');
  if (!container) return;
  const logs = loadWitchChatLogs();
  container.innerHTML = '';

  if (logs.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;color:rgba(200,255,150,.2);font-size:.6rem;margin-top:60px;letter-spacing:1px;';
    empty.textContent = '아직 대화가 없습니다';
    container.appendChild(empty);
    return;
  }

  let lastDateStr = '';

  logs.forEach((log, i) => {
    const dateStr = _chatDateLabel(log.ts || log.time);

    // 날짜 구분선
    if (dateStr !== lastDateStr) {
      lastDateStr = dateStr;
      const sep = document.createElement('div');
      sep.style.cssText = 'display:flex;align-items:center;gap:8px;margin:14px 0 10px;';
      sep.innerHTML = `<div style="flex:1;height:1px;background:rgba(255,255,255,.08);"></div>
        <div style="font-size:.55rem;color:rgba(255,255,255,.25);white-space:nowrap;">${dateStr}</div>
        <div style="flex:1;height:1px;background:rgba(255,255,255,.08);"></div>`;
      container.appendChild(sep);
    }

    const isPlayer = log.type === 'player';

    // 같은 NPC 연속 메시지면 아바타/이름 숨김
    const prevLog = logs[i - 1];
    const isContinue = !isPlayer && prevLog && prevLog.type === 'npc'
      && prevLog.npc === log.npc
      && (log.time - prevLog.time) < 60000
      && _chatDateLabel(prevLog.ts || prevLog.time) === dateStr;

    const row = document.createElement('div');
    row.style.cssText = `display:flex;flex-direction:${isPlayer?'row-reverse':'row'};align-items:flex-start;gap:8px;margin-bottom:${isContinue?'3px':'10px'};`;

    if (!isPlayer) {
      // 아바타 자리 (연속이면 투명 spacer)
      const av = document.createElement('div');
      av.style.cssText = 'width:38px;height:38px;border-radius:12px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:1.3rem;';
      if (!isContinue) {
        av.style.background = 'rgba(30,60,20,.85)';
        av.style.border = '1px solid rgba(90,255,32,.25)';
        av.textContent = log.avatar || '🧙‍♀️';
      }
      row.appendChild(av);
    }

    const msgCol = document.createElement('div');
    msgCol.style.cssText = `display:flex;flex-direction:column;align-items:${isPlayer?'flex-end':'flex-start'};max-width:72%;`;

    // NPC 이름 (첫 메시지에만)
    if (!isPlayer && !isContinue) {
      const nameEl = document.createElement('div');
      nameEl.style.cssText = 'font-size:.6rem;color:rgba(200,255,150,.55);margin-bottom:4px;padding-left:2px;font-weight:600;letter-spacing:.5px;';
      nameEl.textContent = log.npc || 'NPC';
      msgCol.appendChild(nameEl);
    }

    const bubbleRow = document.createElement('div');
    bubbleRow.style.cssText = `display:flex;flex-direction:${isPlayer?'row-reverse':'row'};align-items:flex-end;gap:5px;`;

    const bubble = document.createElement('div');
    if (isPlayer) {
      bubble.style.cssText = 'padding:9px 13px;border-radius:18px 4px 18px 18px;background:#f9e000;color:#1a1a00;font-size:.78rem;line-height:1.55;word-break:break-all;max-width:100%;';
    } else {
      bubble.style.cssText = 'padding:9px 13px;border-radius:4px 18px 18px 18px;background:rgba(255,255,255,.1);color:#e8ffe0;font-size:.78rem;line-height:1.55;word-break:break-all;max-width:100%;';
    }
    bubble.textContent = log.text;

    // 시간
    const d = new Date(log.time);
    const timeEl = document.createElement('div');
    timeEl.style.cssText = 'font-size:.5rem;color:rgba(255,255,255,.25);white-space:nowrap;flex-shrink:0;margin-bottom:3px;';
    timeEl.textContent = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');

    bubbleRow.appendChild(bubble);
    bubbleRow.appendChild(timeEl);
    msgCol.appendChild(bubbleRow);
    row.appendChild(msgCol);
    container.appendChild(row);
  });

  container.scrollTop = container.scrollHeight;
}

function openWitchChat() {
  const modal = document.getElementById('witch-chat-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  renderWitchChatMessages();
}

function closeWitchChat() {
  const modal = document.getElementById('witch-chat-modal');
  if (modal) modal.style.display = 'none';
}

function sendWitchChat() {
  const input = document.getElementById('witch-chat-input');
  if (!input || !input.value.trim()) return;
  addWitchPlayerMessage(input.value.trim());
  input.value = '';
}

// ── 오두막 내부 첫 입장 시 마녀 인트로 메시지 ──────
function triggerWitchIntroChat() {
  const flags = getWitchChatFlags();
  if (flags['witch_intro_done']) return; // 이미 보낸 적 있으면 스킵
  setWitchChatFlag('witch_intro_done');

  const messages = [
    '이곳은 인간이 들어올 수 없을텐데..',
    '이왕 이렇게 된거 자네 나 좀 도와주지 않겠어.?',
    '보상은 생각할 수 없을 정도로 많이 주지',
    '그렇다면 자네 아래 버튼에 이동 버튼을 눌러 이동을 해보게',
    '이동은 가장 가까운 지역만 이동할 수 있지',
    '내가 지금 움직일 수가 없어서 나 대신 푸른 기운 5개좀 모아와줘',
    '참고로 이곳엔 너만 있는게 아니란다..',
    '그럼 무사히 돌아오길',
  ];

  // 1.2초 간격으로 순차 발송
  messages.forEach((text, i) => {
    setTimeout(() => {
      addWitchNpcMessage('마녀', text, '🧙‍♀️');
      // 채팅 모달이 열려있으면 자동 스크롤
      const modal = document.getElementById('witch-chat-modal');
      if (modal && modal.style.display === 'flex') {
        const c = document.getElementById('witch-chat-messages');
        if (c) c.scrollTop = c.scrollHeight;
      } else if (i === 0) {
        // 채팅창이 닫혀있을 때 첫 메시지 도착 시 알림
        showNotification('💬 마녀로부터 메시지가 도착했습니다');
      }
    }, i * 1400);
  });
}

// ── 퀘스트 시스템 (골격) ──────────────────────────
function openWitchQuest() {
  const modal = document.getElementById('witch-quest-modal');
  if (modal) modal.style.display = 'flex';
}

function closeWitchQuest() {
  const modal = document.getElementById('witch-quest-modal');
  if (modal) modal.style.display = 'none';
}