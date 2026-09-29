/* Grandad's Cold Snap: the board game rules, turn flow, HUD and start-up. */
(function (G) {
  'use strict';
  const { $, Sound, sleep, rnd, pick, clamp, esc } = G;
  const B = G.Board;

  let settings = G.loadSettings();
  Sound.muted = settings.muted;
  let S = null;
  let busy = false;

  const ICON = {
    slippers: '<svg viewBox="0 0 48 48"><g stroke="#2b1a10" stroke-width="2"><path d="M8 40c-3-10 1-26 9-27s9 13 7 27c-1 4-15 4-16 0z" fill="#a8312a"/><path d="M26 40c-2-14 0-28 8-27s10 17 6 27c-2 4-13 4-14 0z" fill="#a8312a"/></g><path d="M9 22h14M9 29h15M27 22h14M27 29h14" stroke="#e0a526" stroke-width="1.6"/><ellipse cx="16" cy="35" rx="5.5" ry="4.5" fill="#f3e6c9" stroke="#2b1a10" stroke-width="1.5"/><ellipse cx="33" cy="35" rx="5.5" ry="4.5" fill="#f3e6c9" stroke="#2b1a10" stroke-width="1.5"/></svg>',
    tea: '<svg viewBox="0 0 48 48"><path d="M17 12c-3-3 3-5 0-8M25 12c-3-3 3-5 0-8" fill="none" stroke="#8a7a6a" stroke-width="2" stroke-linecap="round"/><path d="M35 21h2.5a6 6 0 0 1 0 12H35" fill="none" stroke="#2b1a10" stroke-width="3"/><path d="M10 16h25v19a7 7 0 0 1-7 7H17a7 7 0 0 1-7-7z" fill="#f3efe4"/><rect x="10" y="24" width="25" height="6" fill="#c9531f"/><path d="M10 16h25v19a7 7 0 0 1-7 7H17a7 7 0 0 1-7-7z" fill="none" stroke="#2b1a10" stroke-width="2"/></svg>',
    blanket: '<svg viewBox="0 0 48 48"><rect x="6" y="11" width="36" height="27" rx="3" fill="#2f5d3a"/><path d="M6 19h36M6 31h36M16 11v27M32 11v27" stroke="#a8312a" stroke-width="4.5" opacity=".9"/><path d="M6 25h36M24 11v27" stroke="#e0a526" stroke-width="1.4"/><rect x="6" y="11" width="36" height="27" rx="3" fill="none" stroke="#2b1a10" stroke-width="2"/></svg>',
    scarf: '<svg viewBox="0 0 48 48"><path d="M27 19l5 19h-8l-3-18z" fill="#c9531f" stroke="#2b1a10" stroke-width="2"/><path d="M24.5 26h6.5M25.5 32h7" stroke="#f3e6c9" stroke-width="2.4"/><path d="M8 12q16 8 32 0l1 8q-17 9-34 0z" fill="#c9531f" stroke="#2b1a10" stroke-width="2"/><path d="M15 15.5l-.5 7M24 17v8M33 15.5l.5 7" stroke="#f3e6c9" stroke-width="2.4"/></svg>',
    hwb: '<svg viewBox="0 0 48 48"><rect x="18" y="4" width="12" height="7" rx="2" fill="#2b1a10"/><path d="M20 10h8v5h5a5 5 0 0 1 5 5v18a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6V20a5 5 0 0 1 5-5h5z" fill="#e0667a" stroke="#2b1a10" stroke-width="2"/><path d="M16 24h16M16 30h16M16 36h16" stroke="#b8475a" stroke-width="2.4" stroke-linecap="round"/></svg>',
    cardigan: '<svg viewBox="0 0 48 48"><path d="M17 7l7 11 7-11 11 5-3 11-5-2v20H14V21l-5 2-3-11z" fill="#7b4a2a" stroke="#2b1a10" stroke-width="2" stroke-linejoin="round"/><path d="M17 7l7 11 7-11z" fill="#a9c1d1" stroke="#2b1a10" stroke-width="1.5" stroke-linejoin="round"/><path d="M24 18v23" stroke="#2b1a10" stroke-width="2"/><circle cx="26.5" cy="24" r="1.6" fill="#e0a526"/><circle cx="26.5" cy="30" r="1.6" fill="#e0a526"/><circle cx="26.5" cy="36" r="1.6" fill="#e0a526"/></svg>',
    hat: '<svg viewBox="0 0 48 48"><path d="M10 35c0-12 6-20 14-20s14 8 14 20z" fill="#2a7a8c" stroke="#2b1a10" stroke-width="2"/><path d="M12 27q12-5 24 0" fill="none" stroke="#f3e6c9" stroke-width="3"/><rect x="8" y="32" width="32" height="9" rx="3.5" fill="#e0a526" stroke="#2b1a10" stroke-width="2"/><circle cx="24" cy="12" r="6.5" fill="#f3e6c9" stroke="#2b1a10" stroke-width="2"/></svg>',
    logs: '<svg viewBox="0 0 48 48"><rect x="8" y="28" width="34" height="11" rx="5.5" fill="#8a5a33" stroke="#2b1a10" stroke-width="2"/><rect x="12" y="16" width="30" height="11" rx="5.5" fill="#9c6a3f" stroke="#2b1a10" stroke-width="2"/><circle cx="13.5" cy="33.5" r="5.5" fill="#e3c49a" stroke="#2b1a10" stroke-width="2"/><circle cx="17.5" cy="21.5" r="5.5" fill="#e3c49a" stroke="#2b1a10" stroke-width="2"/></svg>',
  };
  const SPEAKER_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
  const SPEAKER_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
  const PAWN_CSS = ['var(--p1)', 'var(--p2)', 'var(--p3)', 'var(--p4)'];
  const CROWN = '<svg class="crown" viewBox="0 0 24 18" aria-label="Grandad\'s favourite"><path d="M2 15 1 4l6 5 5-8 5 8 6-5-1 11z" fill="#e0a526" stroke="#2b1a10" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="11" r="1.8" fill="#b3261e"/></svg>';
  // favourite points: Grandad keeps score of who's been most helpful
  const POINTS = { stall: 3, deliver: 2, duck: 1, boiler: 1, warm: 1, hit: -1 };

  // ---------- State ----------
  function freshState() {
    const D = G.DIFFS[settings.diff];
    return {
      phase: 'setup',
      diff: settings.diff,
      temp: D.start,
      round: 1,
      turns: 0,
      cur: 0,
      roll: null,
      players: Array.from({ length: settings.count }, (_, k) => ({
        name: (settings.names[k] || G.DEFAULT_NAMES[k]).trim() || G.DEFAULT_NAMES[k],
        pos: 0, carry: [], skip: false, biscuits: 2, score: 0, won: 0, charm: false,
      })),
      dealt: { ...G.dealt },
      leader: null,
      watching: false,
      nap: false,
      lastFind: {},
      items: Object.fromEntries(G.ITEM_KEYS.map((k) => [k, { state: 'room', by: null }])),
      delivered: [],
      log: [],
      warned: [],
      swats: 0,
      ducks: 0,
      stalls: 0,
      stallWins: 0,
    };
  }
  const curP = () => S.players[S.cur];
  const districtAt = (pos) => { const sp = G.SPACES[pos]; return sp.type === 'room' ? G.DISTRICTS[sp.district] : null; };
  const prizeAt = (pos) => { const d = districtAt(pos); return d && S.items[d.item].state === 'room' ? d : null; };
  const coldness = () => clamp((36.8 - S.temp) / 1.8, 0, 1);
  const coolRate = () => {
    const D = G.DIFFS[S.diff];
    const ins = S.delivered.reduce((a, k) => a + G.ITEMS[k].ins, 0);
    return D.cool * (1 - 0.09 * (S.players.length - 1)) * (1 - ins);
  };
  const setTemp = (t) => { S.temp = Math.round(clamp(t, 34.5, 37.2) * 1000) / 1000; };
  const frozen = () => S.temp < G.LOSE_AT;
  const allDone = () => S.delivered.length === G.ITEM_KEYS.length;

  // ---------- Log, speech, toasts ----------
  const LOG_TAGS = {
    news: ['LATEST', ''], fair: ['AT THE FAIR', ''], won: ['WINNER', 'good'], lost: ['NO LUCK', 'bad'], deliver: ['DELIVERED', 'good'],
    thwack: ['THWACK', 'bad'], duck: ['DUCKED', 'good'], draught: ['DRAUGHT', 'bad'], biscuit: ['BISCUITS', ''], boiler: ['BOILER', ''],
    cat: ['CAT', 'bad'], ride: ['STAIRLIFT', ''], dazed: ['MISSED GO', 'bad'], warm: ['WARM TOWEL', 'good'], pinch: ['PINCHED', 'bad'],
    find: ['RUMMAGE', 'good'], dud: ['RUMMAGE', ''], findbad: ['RUMMAGE', 'bad'], charm: ['LUCKY CHARM', 'good'], nap: ['FORTY WINKS', 'good'],
  };
  function log(kind, text) {
    S.log.unshift({ kind, text });
    if (S.log.length > 40) S.log.length = 40;
    renderLog();
  }
  function renderLog() {
    $('log').innerHTML = S.log.map((e) => {
      const [tag, tone] = LOG_TAGS[e.kind] || LOG_TAGS.news;
      return `<li class="${tone}"><b>${tag}</b>${esc(e.text)}</li>`;
    }).join('');
  }
  let bubbleTimer = null;
  function say(text, ms = 4200) {
    const b = $('bubble');
    b.textContent = text;
    b.classList.remove('quiet', 'pop');
    void b.offsetWidth;
    b.classList.add('pop');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => b.classList.add('quiet'), ms);
  }
  function toast(text, cls = '') {
    const t = document.createElement('div');
    t.className = 'toast' + (cls ? ' ' + cls : '');
    t.textContent = text;
    $('stage').appendChild(t);
    setTimeout(() => t.remove(), 1500);
  }
  function burstAt(world) {
    const p = G.toScreen(world, B.camera);
    const b = document.createElement('div');
    b.className = 'burst';
    b.innerHTML = '<svg viewBox="0 0 120 90"><polygon points="60,2 72,26 100,10 90,36 118,42 92,54 108,82 76,66 64,88 52,66 20,84 32,56 2,48 30,36 16,10 46,26" fill="#e0a526" stroke="#2b1a10" stroke-width="4" stroke-linejoin="round"/><text x="60" y="53" text-anchor="middle" font-family="Shrikhand, Cooper Black, Georgia, serif" font-size="19" fill="#b3261e">THWACK!</text></svg>';
    b.style.left = p.x + 'px';
    b.style.top = p.y + 'px';
    $('stage').appendChild(b);
    setTimeout(() => b.remove(), 900);
  }

  // ---------- Rendering ----------
  // judged on the temperature as shown (one decimal place), so the label, colour and number always agree
  const shownTemp = () => Math.round(S.temp * 10) / 10;
  function tempState() {
    const t = shownTemp();
    if (t >= 36.5) return ['Comfy-ish', ''];
    if (t >= 36.0) return ['Chilly', ''];
    if (t >= 35.6) return ['Shivering', 'cold'];
    if (t >= 35.3) return ['Freezing', 'danger'];
    return ['Danger!', 'danger'];
  }
  function describeDest(dir) {
    const p = curP();
    const to = G.wrap(p.pos + dir * S.roll);
    const sp = G.SPACES[to];
    const bits = [G.spaceName(to)];
    const d = prizeAt(to);
    if (d) bits.push(`win the ${G.ITEMS[d.item].name}`);
    else if (sp.type === 'corner') bits.push(sp.short);
    else if (G.SPACE_FX[to]) bits.push(G.SPACE_FX[to].short);
    else if (canRummage(to)) bits.push('rummage');
    if (p.carry.length) for (let s = 1; s <= S.roll; s++) if (G.DOORS.includes(G.wrap(p.pos + dir * s))) { bits.push('hand over'); break; }
    return { to, text: bits.join(' · ') };
  }

  function renderPanel() {
    const p = curP();
    const k = S.cur;
    $('turnChip').style.background = PAWN_CSS[k];
    $('turnName').textContent = S.phase === 'setup' ? 'New game' : S.players.length > 1 ? `${p.name}'s go` : p.name === G.DEFAULT_NAMES[0] ? 'Your go' : `${p.name}'s go`;
    $('roundLabel').textContent = `Round ${S.round}`;
    $('tempText').textContent = S.temp.toFixed(1) + '°C';
    const [label, tone] = tempState();
    const pill = $('tempState');
    pill.textContent = label;
    pill.className = 'state-pill' + (tone ? ' ' + tone : '');
    $('rateText').textContent = `losing ${coolRate().toFixed(2)}°C a go`;
    renderThermo();
    const hints = {
      setup: 'Pick your players and how cold it is, then start.',
      roll: 'Roll the dice to take your go.' + (p.carry.length ? " Pass a yellow door to hand over what you're carrying." : ''),
      rolling: 'Rolling...',
      choose: G.isTouch ? `You rolled a ${S.roll}. Tap a flashing square, or a direction button.` : `You rolled a ${S.roll}. Pick a direction: click a flashing square, or press ← or →.`,
      moving: 'On the move...',
      fair: 'At the fair...',
      pinch: 'Pinch it, or leave it?',
      dodge: G.isTouch ? 'Duck! Tap the Duck button when the marker is in the green.' : 'Duck! Press Space when the marker is in the green.',
      over: 'Game over.',
    };
    $('hint').textContent = hints[S.phase] || '';
    $('rollBtn').disabled = S.phase !== 'roll';
    const choosing = S.phase === 'choose';
    $('cwBtn').disabled = !choosing;
    $('acwBtn').disabled = !choosing;
    $('cwDest').textContent = choosing ? describeDest(1).text : ' ';
    $('acwDest').textContent = choosing ? describeDest(-1).text : ' ';
    const rr = $('rerollBtn');
    rr.disabled = !(choosing && p.biscuits > 0);
    rr.innerHTML = `Eat a custard cream to re-roll (${p.biscuits} left) <kbd>R</kbd>`;
    $('team').innerHTML = S.players.map((q, j) => {
      const carry = q.carry.length ? q.carry.map((c) => `<span title="${esc(G.ITEMS[c].name)}">${ICON[c]}</span>`).join('') : '<span>Empty-handed</span>';
      return `<div class="player-row${j === k && S.players.length > 1 ? ' now' : ''}">
        <span class="chip" style="background:${PAWN_CSS[j]}"></span>
        <span class="pname">${S.leader === j ? CROWN : ''}${esc(q.name)}</span>
        <span class="pscore" title="Favourite points">★ ${q.score}</span>
        <div class="carry">${carry}</div>
        <span class="pmeta">${q.skip ? '<span class="badge">misses next go</span> ' : ''}${q.charm ? '<span class="badge lucky">lucky charm</span> ' : ''}${q.biscuits} custard cream${q.biscuits === 1 ? '' : 's'}</span>
      </div>`;
    }).join('');
    $('needsList').innerHTML = G.DISTRICTS.map((d) => {
      const it = S.items[d.item];
      const game = G.Mini.GAMES[G.stallOf(d)].title;
      let cls = '', where = `${game}, ${d.name}`;
      if (it.state === 'done') { cls = 'done'; where = 'Delivered'; }
      else if (it.state === 'carried') { cls = 'carried'; where = `<span class="dot" style="background:${PAWN_CSS[it.by]}"></span>With ${esc(S.players[it.by].name)}`; }
      return `<li class="${cls}">${ICON[d.item]}<span class="iname">${esc(G.ITEMS[d.item].name)}</span><span class="where">${where}</span></li>`;
    }).join('');
  }

  // The thermometer: 35.0°C (hypothermia) on the left, 37.0°C on the right, the danger zone below 35.6°C.
  const THERMO_MIN = 35, THERMO_MAX = 37;
  G.DANGER_AT = 35.6;
  const thermoPct = (t) => clamp((t - THERMO_MIN) / (THERMO_MAX - THERMO_MIN), 0, 1) * 100;
  // goes left before he drops below 35.0°C, counting this one, at today's rate of cooling
  const goesLeft = () => Math.floor((S.temp - G.LOSE_AT) / coolRate()) + 1;
  function renderThermo() {
    const box = $('thermoFill').closest('.temp-box');
    const over = S.phase === 'over';
    const rate = coolRate();
    const now = thermoPct(S.temp);
    const next = over ? now : thermoPct(S.temp - rate);
    $('thermoFill').style.width = now + '%';
    $('thermoLoss').style.left = next + '%';
    $('thermoLoss').style.width = (now - next) + '%';
    const t = $('thermo');
    t.setAttribute('aria-valuenow', S.temp.toFixed(1));
    const n = goesLeft();
    const multi = S.players.length > 1;
    let text;
    if (over) text = allDone() ? 'Saved! He\'s warming up nicely.' : 'Hypothermia. Time for a blanket and the doctor.';
    else if (n <= 1) text = 'Last chance! He\'ll be too cold after this go.';
    else if (n <= 3) text = `Only ${n} goes left${multi ? ' between you' : ''} before hypothermia!`;
    else text = `About ${n} goes left${multi ? ' between you' : ''} before hypothermia`;
    $('thermoGoes').textContent = text;
    t.setAttribute('aria-valuetext', `${S.temp.toFixed(1)}°C. ${text}`);
    const danger = !over && shownTemp() < G.DANGER_AT;
    box.classList.toggle('danger', danger || (over && !allDone()));
    box.classList.toggle('cold', !danger && shownTemp() < 36.0);
    box.classList.toggle('critical', !over && n <= 2);
  }

  function renderBoard() {
    const c = coldness();
    B.setPrizes(S.items);
    B.setCarry(S.players);
    B.placePawns(S.players, S.cur, S.phase !== 'setup' && S.phase !== 'over' && S.phase !== 'moving');
    B.setWorn(S.delivered);
    const won = S.phase === 'over' && allDone();
    B.setCold(c, won ? 0 : c > 0.85 ? 3 : c > 0.55 ? 2 : c > 0.3 ? 1 : 0);
    B.setTemp(S.temp);
    $('stage').style.setProperty('--cold', c.toFixed(3));
  }
  function renderTargets() {
    if (S.phase !== 'choose') { B.clearTargets(); return; }
    B.showTargets([1, -1].map((dir) => ({ i: describeDest(dir).to, text: dir === 1 ? 'Clockwise →' : '← Anticlockwise' })));
  }
  function render() {
    renderPanel();
    renderBoard();
    renderTargets();
  }

  // ---------- Rivalry ----------
  function floatAt(world, text, cls = '') {
    const p = G.toScreen(world, B.camera);
    const el = document.createElement('div');
    el.className = 'float-text ' + cls;
    el.textContent = text;
    el.style.left = p.x + 'px';
    el.style.top = p.y + 'px';
    $('stage').appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }
  function currentLeader() {
    if (S.players.length < 2) return null;
    const top = Math.max(...S.players.map((q) => q.score));
    const at = S.players.map((q, j) => (q.score === top ? j : -1)).filter((j) => j >= 0);
    return top > 0 && at.length === 1 ? at[0] : null;
  }
  function award(k, pts) {
    const p = S.players[k];
    const before = p.score;
    p.score = Math.max(0, p.score + pts);
    const gained = p.score - before;
    if (gained) {
      floatAt(B.pawnWorld(k).add(new THREE.Vector3(0, 1.4, 0)), `${gained > 0 ? '+' : ''}${gained} ★`, gained > 0 ? 'good' : 'bad');
      if (gained > 0) Sound.play('star');
    }
    const lead = currentLeader();
    if (lead !== S.leader) {
      S.leader = lead;
      B.setCrown(lead);
      if (lead !== null) {
        const n = S.players[lead].name;
        setTimeout(() => say(pick([`Ooh, ${n}, you're my favourite now.`, `${n}'s top of the list today.`, `Don't tell the others, ${n}, but you're my favourite.`, `${n}! That's my favourite grandchild, that is.`])), 900);
      }
    }
    render();
  }

  async function maybePinch(p, k) {
    if (S.players.length < 2) return;
    const victims = S.players.map((q, j) => ({ q, j })).filter(({ q, j }) => j !== k && q.pos === p.pos && q.carry.length);
    if (!victims.length) return;
    const { q: victim, j } = pick(victims);
    const key = pick(victim.carry);
    S.phase = 'pinch';
    render();
    const yes = await askPinch(`${victim.name} is standing right here holding Grandad's ${G.ITEMS[key].name}. Pinch it? You'll get the points when you hand it over, but Grandad might be watching.`);
    if (!yes) {
      log('news', `${p.name} leaves ${victim.name}'s ${G.ITEMS[key].name} alone. Very noble.`);
      S.phase = 'moving';
      render();
      return;
    }
    victim.carry.splice(victim.carry.indexOf(key), 1);
    p.carry.push(key);
    S.items[key].by = k;
    B.setCarry(S.players);
    Sound.play('whoosh');
    await B.passItem(key, j, k);
    B.setCarry(S.players);
    if (Math.random() < 0.5) {
      S.watching = true;
      say(pick(['I saw that!', `Oi! Give that back to ${victim.name}!`, 'Cheeky monkey. I had my eye on you.']));
      log('pinch', `${p.name} pinches the ${G.ITEMS[key].name} off ${victim.name}. Grandad saw everything, and he's reaching for his paper...`);
    } else {
      say('Hmm? What are you two whispering about?');
      log('pinch', `${p.name} pinches the ${G.ITEMS[key].name} off ${victim.name} while Grandad isn't looking.`);
    }
    S.phase = 'moving';
    render();
    await sleep(G.ms(500));
  }
  let pinchResolve = null;
  function askPinch(text) {
    return new Promise((resolve) => {
      $('pinchText').textContent = text;
      $('pinchBox').hidden = false;
      pinchResolve = (v) => { pinchResolve = null; $('pinchBox').hidden = true; resolve(v); };
    });
  }

  // ---------- Turn flow ----------
  async function startTurn() {
    if (S.phase === 'over') return;
    const g = S;
    const p = curP();
    S.roll = null;
    if (S.players.length > 1) { toast(`${p.name}'s go`); Sound.play('turn'); }
    if (p.skip) {
      p.skip = false;
      S.phase = 'moving';
      render();
      log('dazed', `${p.name} is still recovering and misses this go.`);
      await sleep(1300);
      if (S !== g) return;
      return endTurn();
    }
    S.phase = 'roll';
    render();
  }

  async function doRoll(isReroll) {
    if (busy) return;
    if (!(S.phase === 'roll' || (isReroll && S.phase === 'choose'))) return;
    busy = true;
    S.phase = 'rolling';
    render();
    Sound.play('dice');
    const v = 1 + rnd(6);
    await B.rollDie(v);
    S.roll = v;
    S.phase = 'choose';
    busy = false;
    render();
  }

  function reroll() {
    const p = curP();
    if (busy || S.phase !== 'choose' || p.biscuits < 1) return;
    p.biscuits--;
    Sound.play('munch');
    log('biscuit', `${p.name} eats a custard cream and rolls again.`);
    doRoll(true);
  }

  async function choose(dir) {
    if (busy || S.phase !== 'choose') return;
    busy = true;
    const g = S;
    const p = curP();
    const k = S.cur;
    S.phase = 'moving';
    render();
    await moveSteps(p, k, dir, S.roll);
    B.placePawns(S.players, S.cur, false);
    if (allDone()) { busy = false; return win(); }
    await resolveLanding(p, k, dir);
    if (S !== g) return;
    // a rummage can send you on past a door, which might have been the last delivery
    if (allDone()) { busy = false; return win(); }
    if (!frozen()) await maybeSwat(p, k);
    busy = false;
    endTurn();
  }

  // hop the pawn along, handing things over at any door on the way; stops once everything's delivered
  async function moveSteps(p, k, dir, n) {
    for (let s = 0; s < n; s++) {
      const from = p.pos;
      p.pos = G.wrap(p.pos + dir);
      Sound.play('step');
      await B.hop(S.players, k, from);
      if (G.DOORS.includes(p.pos) && p.carry.length) {
        await deliver(p, k);
        if (allDone()) return;
      }
    }
  }

  // Every delivery is a little cutscene: the camera swoops in, the item puts itself on Grandad and he cheers.
  async function deliver(p, k) {
    const g = S;
    const keys = p.carry.splice(0);
    B.setCarry(S.players);
    await Cine.begin(keys[0]);
    for (const [j, key] of keys.entries()) {
      if (j) { B.cineShot(key); Cine.hideCard(); }
      await B.deliveryShow(key, k, () => {
        const it = S.items[key];
        it.state = 'done';
        it.by = null;
        S.delivered.push(key);
        setTemp(S.temp + G.ITEMS[key].warmth);
        render();
        Sound.play('fanfare');
        Cine.flash();
        Cine.card(key, p);
        if (Cine.talk) say(G.ITEMS[key].thanks, 3800);
        log('deliver', `${p.name} hands Grandad the ${G.ITEMS[key].name}. +${G.ITEMS[key].warmth.toFixed(2)}°C, and he'll cool more slowly now.`);
      });
      await B.cineHold(j < keys.length - 1 ? 1700 : 2600);
      if (S !== g) { Cine.end(); return; }
    }
    // the last thing: win() carries the cutscene on into the fireworks
    if (allDone()) { award(k, POINTS.deliver * keys.length); return; }
    Cine.end();
    await sleep(G.ms(450));
    award(k, POINTS.deliver * keys.length);
    await sleep(G.ms(300));
  }

  // ---------- Cutscenes ----------
  const TITLES = {
    slippers: 'Toasty toes!', tea: 'A proper cuppa!', blanket: 'Tucked in!', scarf: 'Wrapped up warm!',
    hwb: 'Hot water bottle!', cardigan: 'Cardigan on!', hat: 'Bobble hat on!', logs: "The fire's lit!",
  };
  const WIN_LINE = "Well... thank you, love. Now shush, I'm reading.";
  const MILESTONES = { 1: 'The first one!', 4: 'Halfway there!', 7: 'Just one more thing!', 8: "That's everything!" };
  let barH = 0;
  const Cine = {
    active: false,
    async begin(key) {
      this.active = true;
      clearTimeout(this.hintTimer);
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      const el = $('cine');
      el.hidden = false;
      el.classList.remove('in', 'finale', 'hint');
      // wide screens: card beside Grandad and his speech bubble above; upright ones put his words in the card
      this.side = B.cineSide();
      this.talk = this.side && G.E.h >= 520;
      el.classList.toggle('side', this.side);
      if (!this.talk) $('bubble').classList.add('quiet');
      $('cineCard').classList.remove('show');
      void el.offsetWidth;
      el.classList.add('in');
      barH = el.querySelector('.cine-bar').offsetHeight;
      this.hintTimer = setTimeout(() => el.classList.add('hint'), 900);
      B.cineIn(key);
      await B.cineWait(450);
    },
    card(key, p) {
      const n = S.delivered.length;
      const it = G.ITEMS[key];
      const slower = Math.round(it.ins * 100);
      const multi = S.players.length > 1;
      $('cineIcon').innerHTML = ICON[key];
      $('cineKicker').textContent = MILESTONES[n] || `${n} of ${G.ITEM_KEYS.length} delivered`;
      $('cineTitle').textContent = TITLES[key] || `${it.name}!`;
      $('cineSub').textContent = this.talk
        ? `+${it.warmth.toFixed(2)}°C · he'll cool ${slower}% slower · ★ +${POINTS.deliver}${multi ? ` for ${p.name}` : ''}`
        : `“${it.thanks}”`;
      $('cineSub').classList.toggle('quote', !this.talk);
      $('cineSlots').innerHTML = G.DISTRICTS.map((d) => {
        const k = d.item;
        const cls = k === key ? 'got new' : S.delivered.includes(k) ? 'got' : '';
        return `<span class="${cls}" title="${esc(G.ITEMS[k].name)}">${ICON[k]}</span>`;
      }).join('');
      const c = $('cineCard');
      c.classList.remove('show');
      void c.offsetWidth;
      c.classList.add('show');
      $('cine').classList.toggle('milestone', !!MILESTONES[n]);
    },
    hideCard() { $('cineCard').classList.remove('show'); },
    finale() {
      const el = $('cine');
      el.classList.add('finale');
      $('cineIcon').innerHTML = CROWN;
      $('cineKicker').textContent = `All ${G.ITEM_KEYS.length} delivered`;
      $('cineTitle').textContent = "Grandad's saved!";
      $('cineSub').textContent = this.talk ? `${S.temp.toFixed(1)}°C and warming up nicely` : `“${WIN_LINE}”`;
      $('cineSub').classList.toggle('quote', !this.talk);
      $('cineSlots').querySelectorAll('span').forEach((sp, j) => { sp.className = 'got dance'; sp.style.animationDelay = j * 0.08 + 's'; });
      const c = $('cineCard');
      c.classList.remove('show');
      void c.offsetWidth;
      c.classList.add('show');
    },
    flash() {
      const f = $('warmFlash');
      f.classList.remove('on');
      void f.offsetWidth;
      f.classList.add('on');
    },
    skip() { if (this.active) B.cineSkip(); },
    end() {
      if (!this.active) return;
      this.active = false;
      clearTimeout(this.hintTimer);
      const el = $('cine');
      el.classList.remove('in', 'hint');
      $('cineCard').classList.remove('show');
      setTimeout(() => { if (!Cine.active) el.hidden = true; }, 450);
      B.cineOut();
      render();
    },
  };

  async function resolveLanding(p, k, dir, hopped = false) {
    const sp = G.SPACES[p.pos];
    if (sp.type === 'corner') await cornerEffect(p, k, sp);
    else if (sp.type === 'door') log('news', `${p.name} lingers in the doorway. Grandad peers over his paper...`);
    else if (G.SPACE_FX[p.pos]) await spaceEffect(p, G.SPACE_FX[p.pos]);
    if (frozen()) return;
    await maybePinch(p, k);
    const d = prizeAt(p.pos);
    if (d) await playStall(p, k, d);
    // rummage returns true when it sent you on somewhere else, which has already been dealt with
    else if (canRummage(p.pos) && await rummage(p, k, dir, hopped)) return;
    render();
  }

  // ---------- Rummaging ----------
  // Rooms whose prize has already been won always have something to find.
  const FIND_TONE = { star: 'good', biscuit: 'good', warm: 'good', charm: 'good', nap: 'good', hop: 'good', dud: 'dud', cold: 'bad' };
  const FIND_ICON = {
    mystery: '<svg viewBox="0 0 48 48"><path d="M6 18l18-8 18 8-18 8z" fill="#e3b77a" stroke="#2b1a10" stroke-width="2" stroke-linejoin="round"/><path d="M6 18v18l18 8V26zM42 18v18l-18 8V26z" fill="#c9985a" stroke="#2b1a10" stroke-width="2" stroke-linejoin="round"/><text x="24" y="21.5" text-anchor="middle" font-family="Shrikhand, Georgia, serif" font-size="11" fill="#7a3b1d">?</text><path d="M13 30l4 2M31 32l4-2" stroke="#7a3b1d" stroke-width="2" stroke-linecap="round"/></svg>',
    star: '<svg viewBox="0 0 48 48"><path d="M24 4l6 13 14 1.5-10.5 9.5 3 14L24 35l-12.5 7 3-14L4 18.5 18 17z" fill="#e0a526" stroke="#2b1a10" stroke-width="2.4" stroke-linejoin="round"/><path d="M18 20l3-1" stroke="#fff3c4" stroke-width="2.5" stroke-linecap="round"/></svg>',
    biscuit: '<svg viewBox="0 0 48 48"><rect x="6" y="12" width="36" height="24" rx="4" fill="#e8c068" stroke="#2b1a10" stroke-width="2.2"/><rect x="11" y="17" width="26" height="14" rx="3" fill="none" stroke="#b8862c" stroke-width="2"/><path d="M16 24c3-4 5 4 8 0s5 4 8 0" fill="none" stroke="#b8862c" stroke-width="2" stroke-linecap="round"/></svg>',
    warm: '<svg viewBox="0 0 48 48"><path d="M17 11c-2-3 2-5 0-8M24 11c-2-3 2-5 0-8M31 11c-2-3 2-5 0-8" fill="none" stroke="#c9531f" stroke-width="2" stroke-linecap="round"/><path d="M24 44S7 33 7 23a8.5 8.5 0 0 1 17-2 8.5 8.5 0 0 1 17 2c0 10-17 21-17 21z" fill="#e0667a" stroke="#2b1a10" stroke-width="2.2" stroke-linejoin="round"/></svg>',
    cold: '<svg viewBox="0 0 48 48"><g stroke="#3f8fa0" stroke-width="3.2" stroke-linecap="round"><path d="M24 5v38M7.5 14.5l33 19M7.5 33.5l33-19"/><path d="M19 8l5 4 5-4M19 40l5-4 5 4M8 21l6-1-2-6M40 27l-6 1 2 6M8 27l6 1-2 6M40 21l-6-1 2-6"/></g></svg>',
    charm: '<svg viewBox="0 0 48 48"><path d="M10 10v14a14 14 0 0 0 28 0V10h-8v14a6 6 0 0 1-12 0V10z" fill="#b9bfc4" stroke="#2b1a10" stroke-width="2.2" stroke-linejoin="round"/><path d="M10 10h8v4h-8zM30 10h8v4h-8z" fill="#8a9096" stroke="#2b1a10" stroke-width="2"/><g fill="#2b1a10"><circle cx="13" cy="21" r="1.4"/><circle cx="35" cy="21" r="1.4"/><circle cx="16" cy="30" r="1.4"/><circle cx="32" cy="30" r="1.4"/></g></svg>',
    nap: '<svg viewBox="0 0 48 48"><g font-family="Shrikhand, Georgia, serif" fill="#2a7a8c" stroke="#2b1a10" stroke-width=".8"><text x="6" y="40" font-size="22">Z</text><text x="21" y="28" font-size="16">z</text><text x="33" y="17" font-size="12">z</text></g></svg>',
    hop: '<svg viewBox="0 0 48 48"><g fill="#c9531f" stroke="#2b1a10" stroke-width="2.2" stroke-linejoin="round"><path d="M6 12l12 12-12 12h9l12-12-12-12z"/><path d="M22 12l12 12-12 12h9l12-12-12-12z"/></g></svg>',
    boiler: '<svg viewBox="0 0 48 48"><rect x="10" y="5" width="28" height="38" rx="3" fill="#e8e2d2" stroke="#2b1a10" stroke-width="2.2"/><rect x="16" y="22" width="16" height="14" rx="2" fill="#2b1a10"/><path d="M24 34c-4 0-5-3-3-6 1 2 2 2 2 0 0-3 2-4 3-5 0 3 3 4 3 7 0 2-2 4-5 4z" fill="#f7a933"/><circle cx="17" cy="12" r="2.5" fill="#c9531f"/><circle cx="24" cy="12" r="2.5" fill="#2a9d8f"/><path d="M29 12h5" stroke="#2b1a10" stroke-width="2"/></svg>',
    cat: '<svg viewBox="0 0 48 48"><path d="M9 20L8 5l10 8h12l10-8-1 15c3 4 3 10 0 14-3 5-9 8-15 8s-12-3-15-8c-3-4-3-10 0-14z" fill="#e0a526" stroke="#2b1a10" stroke-width="2.2" stroke-linejoin="round"/><path d="M13 12l2 4M35 12l-2 4" stroke="#b8862c" stroke-width="2"/><ellipse cx="18" cy="25" rx="2.4" ry="3.4" fill="#2b1a10"/><ellipse cx="30" cy="25" rx="2.4" ry="3.4" fill="#2b1a10"/><path d="M22 31h4l-2 2.5z" fill="#e0667a"/><path d="M24 33.5c-1 2-4 2.5-5 1M24 33.5c1 2 4 2.5 5 1M4 29l9 1M4 34l9-1M44 29l-9 1M44 34l-9-1" fill="none" stroke="#2b1a10" stroke-width="1.5" stroke-linecap="round"/></svg>',
    dud: '<svg viewBox="0 0 48 48"><path d="M17 4h14v22l-2 4c-2 5-7 12-15 12-5 0-8-4-7-8 1-5 7-6 10-9z" fill="#a9c1d1" stroke="#2b1a10" stroke-width="2.2" stroke-linejoin="round"/><path d="M17 9h14M17 15h14" stroke="#e8432f" stroke-width="3"/><path d="M11 36c1 2 3 3 5 3" fill="none" stroke="#2b1a10" stroke-width="1.6"/></svg>',
  };
  let forcedFind = null;
  // once a room's prize has been won, every square in it without its own effect is a rummage
  const canRummage = (pos) => {
    const sp = G.SPACES[pos];
    return sp.type === 'room' && !G.SPACE_FX[pos] && !prizeAt(pos) && (sp.stall || !!G.RUMMAGE[pos]);
  };
  function drawFind(pos, hopped) {
    const sp = G.SPACES[pos];
    const table = sp.stall ? G.RUMMAGE_STALL : G.RUMMAGE[pos].finds;
    // never the same thing twice running on one square, and never two lawnmower chases in a row
    let options = table.map((f, i) => ({ f, i })).filter(({ f, i }) => !(hopped && f[0] === 'hop') && i !== S.lastFind[pos]);
    if (forcedFind) { const m = options.filter(({ f }) => f[0] === forcedFind); if (m.length) options = m; }
    const total = options.reduce((a, o) => a + G.FIND_WEIGHT[o.f[0]], 0);
    let r = Math.random() * total;
    const got = options.find((o) => (r -= G.FIND_WEIGHT[o.f[0]]) < 0) || options[0];
    S.lastFind[pos] = got.i;
    const [fx, text, pts = 1] = got.f;
    const title = sp.stall ? G.Mini.GAMES[G.stallOf(districtAt(pos))].title : sp.name;
    const where = sp.stall ? `You look round the back of the ${title} stall...` : G.RUMMAGE[pos].where;
    return { fx, text, pts, where, title };
  }
  function applyFind(p, k, f) {
    switch (f.fx) {
      case 'star': award(k, f.pts); return `+${f.pts} ★ favourite point${f.pts === 1 ? '' : 's'}`;
      case 'biscuit':
        if (p.biscuits >= 3) { award(k, 1); return 'Pockets full, so +1 ★ instead'; }
        p.biscuits++;
        Sound.play('munch');
        return '+1 custard cream';
      case 'warm': setTemp(S.temp + 0.1); Sound.play('warm'); return 'Grandad +0.1°C';
      case 'cold': setTemp(S.temp - 0.1); return 'Grandad −0.1°C';
      case 'charm':
        if (p.charm) { award(k, 1); return 'Already got one, so +1 ★ instead'; }
        p.charm = true;
        return 'Lucky charm: his next paper misses';
      case 'nap': S.nap = true; B.setNap(true); Sound.play('snore'); return 'He nods off: no newspaper';
      case 'hop': return 'Two squares on!';
      default: return 'Nothing. Nothing at all.';
    }
  }
  async function rummage(p, k, dir, hopped) {
    const g = S;
    const find = drawFind(p.pos, hopped);
    const tone = FIND_TONE[find.fx];
    Sound.play('rustle');
    B.rummage(k);
    await Reveal.open(find);
    if (S !== g) return true;
    const chip = applyFind(p, k, find);
    Reveal.show(find, chip, tone);
    B.findFx(k, tone);
    Sound.play(tone === 'good' ? 'find' : tone === 'bad' ? 'draught' : 'boing');
    if (find.fx === 'nap') say('Zzzz... hmm? I wasn\'t asleep. Zzzz...', 3000);
    log(tone === 'good' ? (find.fx === 'charm' ? 'charm' : find.fx === 'nap' ? 'nap' : 'find') : tone === 'bad' ? 'findbad' : 'dud',
      `${p.name} has a rummage. ${find.where} ${find.text} (${chip.replace(/\.$/, '')})`);
    render();
    await Reveal.wait(2200, false);
    Reveal.close();
    if (S !== g) return true;
    if (find.fx !== 'hop' || frozen()) return false;
    await sleep(G.ms(250));
    await moveSteps(p, k, dir, 2);
    B.placePawns(S.players, S.cur, false);
    if (!allDone()) await resolveLanding(p, k, dir, true);
    return true;
  }
  // the reveal card: a wobbling parcel, then what was inside. A tap or Space hurries it along.
  const Reveal = {
    active: false,
    skip: null,
    // scale: false for reading time, which reduced motion shouldn't cut short
    wait(ms, scale = true) {
      return new Promise((resolve) => {
        const done = () => { clearTimeout(timer); Reveal.skip = null; resolve(); };
        const timer = setTimeout(done, scale ? G.ms(ms) : ms);
        Reveal.skip = done;
      });
    },
    open(find) {
      this.active = true;
      const el = $('find');
      el.className = 'find';
      $('findBox').innerHTML = FIND_ICON.mystery;
      $('findKicker').textContent = `Rummage · ${find.title}`;
      $('findWhere').textContent = find.where;
      $('findWhat').textContent = '';
      $('findChip').textContent = '';
      el.hidden = false;
      void el.offsetWidth;
      el.classList.add('in', 'shake');
      return this.wait(1000);
    },
    // a card for corners and special squares: no parcel to open, it just says what happened
    event({ icon, kicker, title, text = '', chip = '', tone = 'good' }) {
      this.active = true;
      const el = $('find');
      el.className = 'find';
      $('findBox').innerHTML = FIND_ICON[icon] || '';
      $('findKicker').textContent = kicker;
      $('findWhere').textContent = title;
      $('findWhat').textContent = text;
      $('findChip').textContent = chip;
      el.hidden = false;
      void el.offsetWidth;
      el.classList.add('in', 'open', tone);
      return this.wait(2400, false).then(() => this.close());
    },
    show(find, chip, tone) {
      const el = $('find');
      el.classList.remove('shake');
      el.classList.add('open', tone);
      $('findBox').innerHTML = FIND_ICON[find.fx];
      $('findWhat').textContent = find.text;
      $('findChip').textContent = chip;
    },
    close() {
      this.active = false;
      this.skip = null;
      $('find').classList.remove('in');
      setTimeout(() => { if (!Reveal.active) $('find').hidden = true; }, 320);
    },
  };

  async function playStall(p, k, d) {
    const stall = G.stallOf(d);
    const title = G.Mini.GAMES[stall].title;
    S.phase = 'fair';
    render();
    S.stalls++;
    log('fair', `${p.name} steps up to the ${title} stall in the ${d.name}.`);
    say(pick(['Go on then, win me something.', `A ${title}? In my ${d.name}?`, "Don't come back empty-handed!", 'Win me me ' + G.ITEMS[d.item].name.toLowerCase() + '!']));
    await B.focusTile(d.idx[1]);
    const won = await G.Mini.play(stall, { diff: S.diff, prizeKey: d.item, playerName: p.name });
    B.unfocus();
    render();
    if (won) {
      S.stallWins++;
      Sound.play('pickup');
      await B.prizeToPawn(d.item, k);
      const it = S.items[d.item];
      it.state = 'carried';
      it.by = k;
      p.carry.push(d.item);
      p.won++;
      award(k, POINTS.stall);
      log('won', `${p.name} wins the ${G.ITEMS[d.item].name} at the ${title} stall! Take it to one of Grandad's doors.`);
      say(pick(['Well done! Now bring it here.', 'Ooh, that looks warm. Hurry up!', 'About time somebody won something.']));
    } else {
      log('lost', `No luck at the ${title} stall. The ${G.ITEMS[d.item].name} stays there for another go.`);
      say(pick(['Useless! In my day we won everything.', 'Hmph. Try again, then.', "It's rigged, those stalls."]));
    }
    S.phase = 'moving';
    render();
    await sleep(G.ms(400));
  }

  async function boiler(p) {
    const k = S.players.indexOf(p);
    await sleep(G.ms(300));
    if (Math.random() < 0.5) {
      setTemp(S.temp + 0.3);
      Sound.play('boiler');
      B.flashBoiler();
      B.findFx(k, 'good');
      log('boiler', `${p.name} thumps the boiler. It coughs into life for a bit! Grandad +0.3°C.`);
      say('Ooh, is that the radiator ticking?');
      award(k, POINTS.boiler);
      render();
      await Reveal.event({ icon: 'boiler', kicker: 'Boiler Cupboard', title: 'You give the boiler a thump...', text: 'It coughs into life for a bit! The radiators start ticking.', chip: `Grandad +0.3°C · +${POINTS.boiler} ★`, tone: 'good' });
    } else {
      Sound.play('clank');
      log('boiler', `${p.name} thumps the boiler. Clank. Nothing. It's sulking.`);
      render();
      await Reveal.event({ icon: 'boiler', kicker: 'Boiler Cupboard', title: 'You give the boiler a thump...', text: "Clank. Nothing. It's sulking. Maybe next time.", chip: 'No luck this time', tone: 'dud' });
    }
  }

  async function cornerEffect(p, k, sp) {
    switch (sp.key) {
      case 'boiler':
        await boiler(p);
        break;
      case 'window':
        setTemp(S.temp - 0.2);
        Sound.play('draught');
        B.findFx(k, 'bad');
        say('Who opened that window?! Shut it!');
        log('draught', `${p.name} finds the window wide open. An icy blast! Grandad −0.2°C.`);
        render();
        await Reveal.event({ icon: 'cold', kicker: 'Open Window', title: 'Brrr! The window is wide open!', text: 'An icy blast blows through the house before you can shut it.', chip: 'Grandad −0.2°C', tone: 'bad' });
        break;
      case 'stairlift': {
        await Reveal.event({ icon: 'hop', kicker: 'Stairlift', title: "Wheee! Grandad's stairlift!", text: 'It whisks you all the way down to the Boiler Cupboard, where you can give the boiler a thump.', chip: 'Off to the boiler', tone: 'good' });
        Sound.play('stairlift');
        log('ride', `${p.name} rides Grandad's stairlift all the way down to the Boiler Cupboard.`);
        const from = p.pos;
        p.pos = 0;
        await B.ride(S.players, k, from);
        await boiler(p);
        break;
      }
      case 'cat':
        p.skip = true;
        Sound.play('meow');
        log('cat', `${p.name} trips over Tiddles the cat. Miss your next go.`);
        say('Mind the cat!');
        render();
        await Reveal.event({ icon: 'cat', kicker: "Tiddles' Basket", title: 'You trip over Tiddles!', text: 'Mrrrow! You go flying, and you need a sit down.', chip: 'Miss your next go', tone: 'bad' });
        break;
    }
  }

  async function spaceEffect(p, f) {
    const k = S.players.indexOf(p);
    const where = G.spaceName(p.pos);
    if (f.kind === 'draught') {
      setTemp(S.temp - f.amt);
      Sound.play('draught');
      B.findFx(k, 'bad');
      log('draught', f.text);
      if (f.line) say(f.line);
      render();
      await Reveal.event({ icon: 'cold', kicker: where, title: 'Draught!', text: f.card, chip: `Grandad −${f.amt}°C`, tone: 'bad' });
    } else if (f.kind === 'biscuit') {
      const full = p.biscuits >= 3;
      if (full) log('biscuit', `${p.name} spots more custard creams, but their pockets are full.`);
      else { p.biscuits++; Sound.play('munch'); B.findFx(k, 'good'); log('biscuit', f.text); }
      render();
      await Reveal.event({ icon: 'biscuit', kicker: where, title: 'Custard creams!', text: f.card, chip: full ? 'Pockets full, so you leave them' : '+1 custard cream (a re-roll)', tone: full ? 'dud' : 'good' });
    } else if (f.kind === 'warm') {
      setTemp(S.temp + f.amt);
      Sound.play('warm');
      B.findFx(k, 'good');
      log('warm', f.text);
      if (f.line) say(f.line);
      award(k, POINTS.warm);
      render();
      await Reveal.event({ icon: 'warm', kicker: where, title: 'A warm towel!', text: f.card, chip: `Grandad +${f.amt}°C · +${POINTS.warm} ★`, tone: 'good' });
    }
  }

  // ---------- The newspaper ----------
  let duckHandler = null;
  async function maybeSwat(p, k) {
    // forty winks: he can't throw his paper in his sleep
    if (S.nap) { S.watching = false; return; }
    const D = G.DIFFS[S.diff];
    const cold = clamp((D.start - S.temp) / (D.start - 35), 0, 1);
    const chance = 0.06 + 0.16 * cold + (G.DOORS.includes(p.pos) ? 0.2 : 0) + (S.watching ? 0.35 : 0);
    S.watching = false;
    if (Math.random() >= chance) return;
    S.swats++;
    if (p.charm) return luckyCharm(p, k);
    S.phase = 'dodge';
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    render();
    say(pick(G.SWAT_LINES));
    Sound.play('grumble');
    Sound.play('windup');
    B.windUp();
    const ducked = await dodgeMeter();
    await B.throwPaper(k, ducked, () => {
      if (ducked) Sound.play('whoosh');
      else { Sound.play('thwack'); burstAt(B.pawnWorld(k)); }
    });
    if (ducked) {
      S.ducks++;
      say(pick(G.DUCK_LINES));
      log('duck', `${p.name} ducked! The paper sails clean over their head.`);
      award(k, POINTS.duck);
    } else if (p.carry.length) {
      award(k, POINTS.hit);
      const key = p.carry.splice(rnd(p.carry.length), 1)[0];
      const d = G.DISTRICT_OF_ITEM[key];
      B.setCarry(S.players);
      await B.backToStall(key, k);
      const it = S.items[key];
      it.state = 'room';
      it.by = null;
      log('thwack', `THWACK! ${p.name} drops the ${G.ITEMS[key].name}, and it goes flying back to the ${G.Mini.GAMES[G.stallOf(d)].title} stall in the ${d.name}.`);
    } else {
      award(k, POINTS.hit);
      p.skip = true;
      log('thwack', `THWACK! ${p.name} is seeing stars and misses their next go.`);
    }
    S.phase = 'moving';
    render();
    await sleep(G.ms(500));
  }

  // a lucky charm turns the paper away without any ducking needed
  async function luckyCharm(p, k) {
    p.charm = false;
    say(pick(G.SWAT_LINES));
    Sound.play('grumble');
    Sound.play('windup');
    await B.windUp();
    await B.throwPaper(k, true, () => Sound.play('whoosh'));
    S.ducks++;
    toast('Lucky charm!');
    Sound.play('find');
    say(pick(["What the...? It went right past you!", 'Blooming lucky charms.', 'I never miss! Well, hardly ever.']));
    log('charm', `${p.name}'s lucky charm works! The paper sails clean past. The charm's used up now.`);
    render();
    await sleep(G.ms(500));
  }

  function dodgeMeter() {
    return new Promise((resolve) => {
      const D = G.DIFFS[S.diff];
      const w = D.zone;
      const z0 = 0.12 + Math.random() * (0.76 - w);
      const dodgeEl = $('dodge');
      $('zone').style.left = z0 * 100 + '%';
      $('zone').style.width = w * 100 + '%';
      $('dodgeMsg').textContent = G.isTouch ? 'Tap Duck! when the marker is in the green.' : 'Press Space (or tap Duck) when the marker is in the green.';
      dodgeEl.classList.remove('ok', 'bad');
      dodgeEl.hidden = false;
      const period = D.period * (G.reduceMotion ? 1.6 : 1);
      const t0 = performance.now() + 350;
      const limit = period * 2.5;
      let done = false;
      let raf = 0;
      const posAt = (t) => { const ph = (Math.max(0, t - t0) % period) / period; return ph < 0.5 ? ph * 2 : 2 - ph * 2; };
      const marker = $('marker');
      const finish = (ok, msg) => {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        duckHandler = null;
        dodgeEl.classList.add(ok ? 'ok' : 'bad');
        $('dodgeMsg').textContent = msg;
        setTimeout(() => { dodgeEl.hidden = true; resolve(ok); }, 550);
      };
      const frame = (t) => {
        if (done) return;
        marker.style.left = posAt(t) * 100 + '%';
        if (t - t0 > limit) finish(false, 'Too slow!');
        else raf = requestAnimationFrame(frame);
      };
      duckHandler = () => {
        const now = performance.now();
        if (now < t0) return;
        const x = posAt(now);
        marker.style.left = x * 100 + '%';
        const ok = x >= z0 && x <= z0 + w;
        finish(ok, ok ? 'Ducked!' : 'Missed the timing!');
      };
      raf = requestAnimationFrame(frame);
    });
  }

  async function endTurn() {
    if (S.phase === 'over') return;
    const g = S;
    S.turns++;
    const wasSafe = shownTemp() >= G.DANGER_AT;
    setTemp(S.temp - coolRate());
    if (wasSafe && shownTemp() < G.DANGER_AT && !frozen()) { toast('Danger zone!', 'danger'); Sound.play('heartbeat'); }
    if (S.nap) { S.nap = false; B.setNap(false); }
    render();
    if (frozen()) return lose();
    for (const w of G.COLD_WARNINGS) {
      if (S.temp <= w.at && !S.warned.includes(w.at)) { S.warned.push(w.at); say(w.line); Sound.play('grumble'); break; }
    }
    if (Math.random() < 0.14 && $('bubble').classList.contains('quiet')) say(pick(G.GRUMBLES));
    S.cur = (S.cur + 1) % S.players.length;
    if (S.cur === 0) S.round++;
    await sleep(G.ms(380));
    if (S !== g) return;
    startTurn();
  }

  // three stars if he ends up warmer than he started
  const stars = () => (S.temp >= G.DIFFS[S.diff].start ? 3 : S.temp >= 35.8 ? 2 : 1);
  async function win() {
    const g = S;
    S.turns++;
    S.phase = 'over';
    S.nap = false;
    B.setNap(false);
    render();
    if (!Cine.active) await Cine.begin();
    Cine.finale();
    $('stage').style.setProperty('--cold', '0');
    Sound.play('win');
    if (Cine.talk) say(WIN_LINE, 9000);
    await B.celebrate();
    Cine.end();
    if (S !== g) return;
    showEnd(true);
  }
  async function lose() {
    const g = S;
    S.phase = 'over';
    render();
    B.setFrozen(true);
    Sound.play('lose');
    say('B-b-b-brrrr...', 9000);
    await sleep(G.ms(2200));
    if (S !== g) return;
    showEnd(false);
  }
  function showEnd(won) {
    $('endKicker').textContent = won ? `${G.DIFFS[S.diff].name} · Grandad saved` : `${G.DIFFS[S.diff].name} · Grandad frozen`;
    const title = $('endTitle');
    title.textContent = won ? "Grandad's toasty!" : "Grandad's a grandsicle!";
    title.classList.toggle('cold', !won);
    const n = won ? stars() : 0;
    $('stars').innerHTML = won ? [1, 2, 3].map((s) => `<span class="${s <= n ? '' : 'off'}">★</span>`).join('') : '';
    $('stars').hidden = !won;
    $('endText').textContent = won
      ? (n === 3 ? 'Warm as toast, with time to spare. He even said thank you. Then he went straight back to his paper.'
        : n === 2 ? 'Snug in his cardigan and slippers. He grumbled a bit, but he always does.'
          : "That was close! His nose is still a bit blue, but he's thawing out nicely.")
      : `His temperature dropped to 35.0°C. Below that is hypothermia, so it's a blanket, a brew and a call to the doctor. You got ${S.delivered.length} of 8 things to him. Try again?`;
    const change = Math.round((S.temp - G.DIFFS[S.diff].start) * 10) / 10;
    $('statTemp').innerHTML = `${S.temp.toFixed(1)}°<small class="${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '▲ +' : '▼ −'}${Math.abs(change).toFixed(1)}° since the start</small>`;
    $('statTurns').textContent = S.turns;
    $('statStalls').textContent = `${S.stallWins}/${S.stalls}`;
    $('statDucks').textContent = `${S.ducks}/${S.swats}`;
    $('endRivalry').innerHTML = rivalrySummary(won);
    $('endOverlay').hidden = false;
    $('againBtn').focus();
  }

  function rivalrySummary(won) {
    if (S.players.length === 1) {
      const p = S.players[0];
      const bonus = won ? 5 + Math.round((S.temp - 35) * 5) : 0;
      const total = p.score + bonus;
      const best = settings.best || 0;
      const isBest = total > best;
      if (isBest) { settings.best = total; G.saveSettings(settings); }
      return `<p class="fav-kicker">Favourite points</p>
        <p class="fav-score">★ ${total}</p>
        <p class="fav-note">${bonus ? `${p.score} from the game + ${bonus} rescue bonus. ` : ''}${isBest ? (best ? `A new best! Your old best was ${best}.` : 'Your first score. Now beat it.') : `Your best is ${best}.`}</p>`;
    }
    const ranked = S.players.map((q, j) => ({ q, j })).sort((a, b) => b.q.score - a.q.score);
    const top = ranked[0].q.score;
    const winners = ranked.filter((r) => r.q.score === top);
    const head = top === 0
      ? '<p class="fav-kicker">Grandad\'s favourite</p><p class="fav-name">Nobody</p><p class="fav-note">Not a single point between you. He says he\'s disappointed in the lot of you.</p>'
      : winners.length > 1
        ? `<p class="fav-kicker">Grandad's favourite</p><p class="fav-name">${winners.map((r) => esc(r.q.name)).join(' and ')}</p><p class="fav-note">He can't choose. He says he loves you all the same. (He doesn't.)</p>`
        : `<p class="fav-kicker">Grandad's favourite</p><p class="fav-name">${CROWN}${esc(winners[0].q.name)}</p><p class="fav-note">${won ? "He'll deny it in front of the others." : 'Even frozen solid, he knows who his favourite is.'}</p>`;
    const rows = ranked.map((r) => `<li><span class="chip" style="background:${PAWN_CSS[r.j]}"></span><span>${esc(r.q.name)}</span><span class="fav-meta">${r.q.won} stall${r.q.won === 1 ? '' : 's'} won</span><b>★ ${r.q.score}</b></li>`).join('');
    return head + `<ol class="fav-table">${rows}</ol>`;
  }

  // ---------- Setup ----------
  function renderNames() {
    $('names').innerHTML = Array.from({ length: settings.count }, (_, k) => `
      <label><span class="chip" style="background:${PAWN_CSS[k]}"></span>
      <input type="text" id="name${k + 1}" maxlength="18" value="${esc(settings.names[k] || G.DEFAULT_NAMES[k])}" aria-label="Name for player ${k + 1}" autocomplete="off"></label>`).join('');
  }
  function syncSetupForm() {
    $('count' + settings.count).checked = true;
    ({ mild: $('diffMild'), chilly: $('diffChilly'), freeze: $('diffFreeze') })[settings.diff].checked = true;
    $('shuffleStalls').checked = settings.shuffle;
    renderNames();
  }
  function readNames() {
    for (let k = 0; k < settings.count; k++) {
      const el = $('name' + (k + 1));
      if (el) settings.names[k] = el.value.trim().slice(0, 18) || G.DEFAULT_NAMES[k];
    }
  }
  function openSetup() {
    syncSetupForm();
    $('resumeBtn').hidden = !(S && !['setup', 'over'].includes(S.phase));
    $('endOverlay').hidden = true;
    $('setup').hidden = false;
    $('startBtn').focus();
  }
  const settled = () => !busy && ['setup', 'roll', 'choose', 'over'].includes(S.phase);
  async function beginGame() {
    Sound.init();
    readNames();
    G.saveSettings(settings);
    const btns = [$('startBtn'), $('againBtn')];
    btns.forEach((b) => { b.disabled = true; });
    Cine.skip();
    while (!settled() || Cine.active) await sleep(100);
    btns.forEach((b) => { b.disabled = false; });
    $('setup').hidden = true;
    $('endOverlay').hidden = true;
    G.dealt = G.dealStalls(settings.shuffle);
    S = freshState();
    B.refreshTop();
    B.setCrown(null);
    B.setFrozen(false);
    B.setNap(false);
    B.setPlayers(S.players);
    log('news', 'COLDEST NIGHT SINCE 1963. Boiler packs in. Travelling fair sets up in Grandad\'s house. Grandad refuses to leave his chair.');
    say(S.players.length > 1 ? "May the best grandchild win. I'll be keeping score, mind." : 'Is it me, or is it parky in here?');
    S.phase = 'roll';
    startTurn();
  }
  async function practice(gameKey) {
    Sound.init();
    readNames();
    G.saveSettings(settings);
    $('setup').hidden = true;
    await G.Mini.play(gameKey, { diff: settings.diff, prizeKey: null, practice: true });
    openSetup();
  }

  // ---------- Controls ----------
  function setMuteButton() {
    const b = $('muteBtn');
    b.innerHTML = (Sound.muted ? SPEAKER_OFF : SPEAKER_ON) + `<span>${Sound.muted ? 'Sound off' : 'Sound on'}</span>`;
    b.setAttribute('aria-pressed', String(Sound.muted));
  }
  function toggleMute() {
    Sound.muted = !Sound.muted;
    settings.muted = Sound.muted;
    G.saveSettings(settings);
    Sound.init();
    setMuteButton();
  }

  function bindControls() {
    $('rollBtn').addEventListener('click', () => { Sound.init(); doRoll(false); });
    $('cwBtn').addEventListener('click', () => choose(1));
    $('acwBtn').addEventListener('click', () => choose(-1));
    $('rerollBtn').addEventListener('click', reroll);
    $('duckBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); if (duckHandler) duckHandler(); });
    $('duckBtn').addEventListener('click', () => { if (duckHandler) duckHandler(); });
    $('muteBtn').addEventListener('click', toggleMute);
    $('newBtn').addEventListener('click', openSetup);
    $('viewBtn').addEventListener('click', () => B.resetView());
    $('resumeBtn').addEventListener('click', () => { $('setup').hidden = true; });
    $('againBtn').addEventListener('click', beginGame);
    $('changeBtn').addEventListener('click', openSetup);
    $('setupForm').addEventListener('submit', (e) => { e.preventDefault(); beginGame(); });
    $('countSeg').addEventListener('change', (e) => {
      if (e.target.name !== 'count') return;
      readNames();
      settings.count = +e.target.value;
      renderNames();
    });
    document.querySelectorAll('input[name="diff"]').forEach((el) => el.addEventListener('change', () => { settings.diff = el.value; }));
    $('fairGrid').innerHTML = Object.entries(G.Mini.GAMES).map(([key, g]) => `<button type="button" class="btn fair-btn" data-game="${key}" style="--dc:${g.c1}" title="${esc(g.blurb)}"><b>${g.title}</b></button>`).join('');
    $('shuffleStalls').addEventListener('change', (e) => { settings.shuffle = e.target.checked; G.saveSettings(settings); });
    $('pinchYes').addEventListener('click', () => { if (pinchResolve) pinchResolve(true); });
    // on small touch screens the players, needs and news cards pop up as sheets over the board
    const setSheet = (name) => {
      if (name) document.body.dataset.sheet = name; else delete document.body.dataset.sheet;
      document.querySelectorAll('.sheet-tabs .tab').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.sheet === name)));
    };
    document.querySelectorAll('.sheet-tabs .tab').forEach((t) => t.addEventListener('click', () => setSheet(document.body.dataset.sheet === t.dataset.sheet ? null : t.dataset.sheet)));
    document.addEventListener('pointerdown', (e) => {
      if (document.body.dataset.sheet && !e.target.closest('#team, .needs, .news, .sheet-tabs')) setSheet(null);
    }, true);
    // stop iOS Safari zooming the whole page when you pinch the board
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    $('pinchNo').addEventListener('click', () => { if (pinchResolve) pinchResolve(false); });
    $('fairGrid').addEventListener('click', (e) => { const b = e.target.closest('[data-game]'); if (b) practice(b.dataset.game); });
    B.onTileClick = (i) => {
      if (!S || S.phase !== 'choose') return;
      if (i === describeDest(1).to) choose(1);
      else if (i === describeDest(-1).to) choose(-1);
    };

    window.addEventListener('keydown', (e) => {
      if (G.Mini.active) { if (G.Mini.keyDown) G.Mini.keyDown(e); if (e.key === ' ') e.preventDefault(); return; }
      if (!S) return;
      if (e.target.closest && e.target.closest('input, textarea, select')) return;
      if (!$('setup').hidden || !$('endOverlay').hidden) return;
      const key = e.key;
      if (Reveal.active) {
        if (key === ' ' || key === 'Enter' || key === 'Escape') { e.preventDefault(); if (Reveal.skip) Reveal.skip(); }
        else if (key === 'm' || key === 'M') toggleMute();
        return;
      }
      if (Cine.active) {
        if (key === ' ' || key === 'Enter' || key === 'Escape') { e.preventDefault(); Cine.skip(); }
        else if (key === 'm' || key === 'M') toggleMute();
        return;
      }
      if (S.phase === 'dodge') {
        if (key === ' ' || key === 'Enter') { e.preventDefault(); if (!e.repeat && duckHandler) duckHandler(); }
        return;
      }
      if (S.phase === 'pinch') {
        if (pinchResolve && (key === 'y' || key === 'Y')) pinchResolve(true);
        if (pinchResolve && (key === 'n' || key === 'N' || key === 'Escape')) pinchResolve(false);
        return;
      }
      const onButton = e.target.closest && e.target.closest('button');
      if ((key === ' ' || key === 'Enter') && !onButton) {
        if (S.phase === 'roll') { e.preventDefault(); Sound.init(); doRoll(false); } else if (key === ' ') e.preventDefault();
      } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        if (S.phase === 'choose') { e.preventDefault(); choose(1); }
      } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        if (S.phase === 'choose') { e.preventDefault(); choose(-1); }
      } else if (key === 'r' || key === 'R') reroll();
      else if (key === 'm' || key === 'M') toggleMute();
    });
    window.addEventListener('keyup', (e) => { if (G.Mini.active && G.Mini.keyUp) G.Mini.keyUp(e); });

    // Grandad's speech bubble follows his head around the screen
    // (in a close-up his head is near the top, so keep the bubble below the letterbox bar)
    G.onFrame(() => {
      if (G.Mini.active || G.E.scene !== B.scene) return;
      const p = G.toScreen(B.headWorld(), B.camera);
      const b = $('bubble');
      const minTop = Cine.active ? barH + b.offsetHeight + 22 : 0;
      const half = b.offsetWidth / 2 + 8;
      b.style.left = clamp(p.x, half, Math.max(half, G.E.w - half)) + 'px';
      b.style.top = Math.max(p.y, minTop) + 'px';
    });
    $('stage').addEventListener('pointerdown', () => {
      if (Cine.active) Cine.skip();
      else if (Reveal.active && Reveal.skip) Reveal.skip();
    });
  }

  // ---------- Boot ----------
  async function boot() {
    const stage = $('stage');
    try {
      G.initEngine(stage, $('view'));
    } catch (e) {
      $('loading').innerHTML = '<p>This game needs 3D graphics (WebGL), and this browser has it switched off. Try Safari or Chrome.</p>';
      return;
    }
    if (document.fonts && document.fonts.load) {
      await Promise.race([
        Promise.all([document.fonts.load(`40px ${G.FONT_DISPLAY}`), document.fonts.load('800 30px Karla'), document.fonts.load('bold 20px "Courier Prime"')]).catch(() => {}),
        sleep(2500),
      ]);
    }
    G.dealt = G.dealStalls(settings.shuffle);
    B.init();
    B.show();
    if (document.fonts && document.fonts.addEventListener) {
      let refreshed = false;
      document.fonts.addEventListener('loadingdone', () => { if (!refreshed) { refreshed = true; B.refreshTop(); } });
    }
    bindControls();
    setMuteButton();
    S = freshState();
    B.setPlayers(S.players);
    B.setTemp(S.temp, true);
    log('news', 'COLDEST NIGHT SINCE 1963. Boiler packs in. Travelling fair sets up in Grandad\'s house. Grandad refuses to leave his chair.');
    render();
    syncSetupForm();
    $('loading').hidden = true;
    $('setup').hidden = false;
    say('Is it me, or is it parky in here?', 60000);
  }

  // test hook (used by the automated playthrough; harmless for players)
  window.GCS_TEST = {
    state: () => S,
    autoMini: (v) => { G.Mini.autoResult = v; },
    cine: () => Cine.active,
    skipCine: () => Cine.skip(),
    forceFind: (fx) => { forcedFind = fx; },
    render: () => render(),
    reveal: () => Reveal.active,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.GCS);
