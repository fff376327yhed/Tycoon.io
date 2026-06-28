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