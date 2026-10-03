#!/usr/bin/env node
/*
 * Grandad's Cold Snap: Monte Carlo re-tune of the round limits (G.ROUNDS in js/core.js)
 * for the new stall-prize economy. Plain Node, no dependencies.
 *
 * THE MODEL (a "steady player" bot; both rule sets)
 *   - 32 squares in a loop, one d6 per go, always clockwise. A round = every player has one go.
 *     The game is lost when round R ends without the goal; it is won the moment the goal is
 *     reached (after a go, or mid-go as soon as an item is gained).
 *   - Squares: 0 boiler (+1 on landing, +1 for walking past without stopping), 8 open window,
 *     24 cat, 7/15 draughts (lose tokens, never below 0), 16 stairlift (ride to 0, +1, no pass
 *     token), doors 4/12/20/28 (+1), 19 airing cupboard (+1), 10 stalls, 11 rummage squares.
 *   - Rummage: weighted find token 20 (+1, or +2 w.p. 0.15), charm 9, nap 8, hop 8, dud 9, lose 7.
 *     A hop moves 2 more squares and resolves that landing, with hop left out of the draw there.
 *   - Newspaper at the end of each go unless napped: p = 0.06 + 0.16*roundsDone/R (+0.2 on a door).
 *     A charm blocks it (used up); otherwise duck w.p. 0.85/0.70/0.55 (mild/chilly/freeze);
 *     otherwise lose `paper` tokens, or miss the next go if you have none.
 *   - Minigame skill: a stall attempt scores t ~ Binomial(3, s), s calibrated per difficulty.
 *   - No pinching between players. Versus: everyone fills their own set, success = someone finishes.
 *
 *   OLD rules: a stall pays t tokens; items cost 3; buy whenever you can at the end of a go.
 *   NEW rules: each stall displays a prize item (distinct, dealt from the "wanted" pool). On a stall
 *     whose prize you still need, t == 3 wins the item (no tokens); otherwise you get t tokens.
 *     Items cost 4 (shop prefers items not on a stall). Roller skates (move roll+1/roll-1) and lucky
 *     dice (re-roll) are bought at the Fair Shop at the end of a go and carried (one of each) until
 *     used. Each player's first of each costs 1 token, and every one after that a token more than
 *     their last. The bot buys them with tokens left over after shopping for items, skates while
 *     they cost up to --skatesMax (default 2) and dice up to --diceMax (default 1). It uses skates
 *     when they reach a prize it needs, and the dice when a roll misses one and skates can't fix it.
 *     When a stall's prize is won it is restocked with a different wanted item if one is free
 *     (falling back to the same item in Versus if someone else still lacks it and nothing else is free).
 *
 * THE PROCEDURE
 *   1. Calibrate s per difficulty so the OLD rules at the current G.ROUNDS reproduce the design
 *      targets: chilly = 0.90 averaged over all 28 configs; mild = 0.98 and freeze = 0.60 on the
 *      mean of (solo goal 6, all-config average).
 *   2. With those s, find for every config the smallest R where the NEW rules give chilly >= 0.90,
 *      and report mild/freeze at that R, plus diagnostics for chilly solo goal 6.
 *   Everything uses a seeded PRNG (sfc32). Each game gets its own stream, seeded from the config,
 *   difficulty and game number but not s or R, so runs at nearby s/R replay the same dice (common
 *   random numbers): searches are smooth and the whole run is reproducible.
 *
 * USAGE
 *   node simulate.js                     full run (calibrate, search, report)
 *   node simulate.js --games=20000 --search=4000 --s=0.62,0.55,0.50 (skip calibration with given s)
 *   node simulate.js --s=0.754,0.634,0.517   the skill it calibrated when the prizes went in (quicker)
 *   node simulate.js --skatesMax=3 --diceMax=2 --itemCost=3   try other buying habits or shop prices
 *   node simulate.js --json=out.json     also write all numbers to a JSON file
 */
'use strict';

// ---------------------------------------------------------------- settings
const ARGS = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const FINAL_GAMES = +(ARGS.games || 20000);   // games per config/difficulty point for reported numbers
const SEARCH_GAMES = +(ARGS.search || 4000);  // games per point while bisecting / bracketing
const TARGET = { mild: 0.98, chilly: 0.90, freeze: 0.60 };
// the bot's limits for buying extras at the Fair Shop (new rules)
const SKATES_MAX = +(ARGS.skatesMax || 2);
const DICE_MAX = +(ARGS.diceMax || 1);
// what Grandad's things cost at the Fair Shop under the new rules
const ITEM_COST = +(ARGS.itemCost || 4);

// The limits from before the stall prizes. The old rules were tuned to these, so they're what the
// stall skill is calibrated against (step 1). The new limits it found are the ones in js/core.js.
const OLD_ROUNDS = {
  coop:   { 1: { 3: 15, 6: 27, 9: 37, 12: 48 }, 2: { 3: 9, 6: 14, 9: 20, 12: 25 }, 3: { 3: 6, 6: 10, 9: 14, 12: 18 }, 4: { 3: 5, 6: 8, 9: 11, 12: 14 } },
  versus: { 2: { 3: 11, 6: 22, 9: 32, 12: 42 }, 3: { 3: 10, 6: 20, 9: 30, 12: 39 }, 4: { 3: 9, 6: 19, 9: 28, 12: 38 } },
};

const DIFFS = {
  mild:   { duck: 0.85, loss: { window: 1, draught: 1, cat: 1, find: 1, paper: 1 } },
  chilly: { duck: 0.70, loss: { window: 2, draught: 1, cat: 2, find: 1, paper: 1 } },
  freeze: { duck: 0.55, loss: { window: 3, draught: 2, cat: 2, find: 2, paper: 2 } },
};
const DIFF_KEYS = ['mild', 'chilly', 'freeze'];

const GOALS = [3, 6, 9, 12];
const CONFIGS = [];
for (const goal of GOALS) CONFIGS.push({ mode: 'coop', players: 1, goal, label: `solo g${goal}` });
for (const n of [2, 3, 4]) for (const goal of GOALS) CONFIGS.push({ mode: 'coop', players: n, goal, label: `co-op ${n}p g${goal}` });
for (const n of [2, 3, 4]) for (const goal of GOALS) CONFIGS.push({ mode: 'versus', players: n, goal, label: `versus ${n}p g${goal}` });
const SOLO6 = CONFIGS.findIndex((c) => c.players === 1 && c.goal === 6);

// ---------------------------------------------------------------- seeded PRNG
// cyrb128 string hash -> sfc32 generator; returns floats in [0, 1).
function seedFrom(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4; h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}
// game `index` of a batch gets its own stream, so game i sees the same dice whatever s or R is
function makeRng(str, index = 0) {
  let [a, b, c, d] = seedFrom(str);
  a ^= Math.imul(index + 1, 0x9e3779b9);
  d ^= index;
  const next = () => {
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  for (let i = 0; i < 20; i++) next();
  return next;
}

// ---------------------------------------------------------------- board
const N = 32;
const SQ = { BOILER: 0, WINDOW: 1, STAIRLIFT: 2, CAT: 3, DOOR: 4, DRAUGHT: 5, AIRING: 6, STALL: 7, RUMMAGE: 8 };
const BOARD = new Array(N).fill(-1);
BOARD[0] = SQ.BOILER; BOARD[8] = SQ.WINDOW; BOARD[16] = SQ.STAIRLIFT; BOARD[24] = SQ.CAT;
for (const i of [4, 12, 20, 28]) BOARD[i] = SQ.DOOR;
for (const i of [7, 15]) BOARD[i] = SQ.DRAUGHT;
BOARD[19] = SQ.AIRING;
const STALLS = [2, 5, 6, 10, 11, 14, 18, 22, 26, 30];
for (const i of STALLS) BOARD[i] = SQ.STALL;
for (const i of [1, 3, 9, 13, 17, 21, 23, 25, 27, 29, 31]) BOARD[i] = SQ.RUMMAGE;
if (BOARD.includes(-1)) throw new Error('board has an unassigned square');
const STALL_OF = new Int8Array(N).fill(-1);
STALLS.forEach((sq, k) => { STALL_OF[sq] = k; });

const N_ITEMS = 12;                   // slippers, tea, blanket, scarf, hwb, cardigan, hat, logs, mittens, earmuffs, soup, heater
const ALL_ITEMS = (1 << N_ITEMS) - 1; // items are bits 0..11 of a mask

// rummage finds, by weight
const FINDS = [['token', 20], ['charm', 9], ['nap', 8], ['hop', 8], ['dud', 9], ['lose', 7]];
const FIND_TOTAL = FINDS.reduce((a, f) => a + f[1], 0);
const FIND_TOTAL_NO_HOP = FIND_TOTAL - 8;

function popcount(m) { let c = 0; while (m) { m &= m - 1; c++; } return c; }

// ---------------------------------------------------------------- one game
class Game {
  // o: { rules: 'old'|'new', mode, players, goal, diff, s, rounds }
  constructor(o, rng, stats) {
    this.rng = rng;
    this.stats = stats || null;
    this.isNew = o.rules === 'new';
    this.versus = o.mode === 'versus';
    this.P = o.players;
    this.goal = o.goal;
    this.R = o.rounds;
    this.s = o.s;
    this.D = DIFFS[o.diff];
    this.cost = this.isNew ? ITEM_COST : 3;
    this.pos = new Int32Array(this.P);
    this.tokens = new Int32Array(this.P);
    this.charm = new Uint8Array(this.P);
    // extras carried (one of each), and how many of each this player has bought (the next costs one more)
    this.skates = new Uint8Array(this.P);
    this.dice = new Uint8Array(this.P);
    this.skatesBought = new Int32Array(this.P);
    this.diceBought = new Int32Array(this.P);
    this.skip = new Uint8Array(this.P);
    this.have = new Int32Array(this.P); // Versus: each player's own set
    this.delivered = 0;                 // Co-op: the shared list
    this.prize = new Int8Array(STALLS.length).fill(-1);
    this.nap = false;
    this.cold = 0;
    if (this.isNew) for (let k = 0; k < STALLS.length; k++) this.restock(k, 0);
  }

  d6() { return 1 + Math.floor(this.rng() * 6); }
  stallScore() { const r = this.rng, s = this.s; return (r() < s) + (r() < s) + (r() < s); }
  pickBit(mask) {
    let n = popcount(mask), j = Math.floor(this.rng() * n);
    for (let b = 0; b < N_ITEMS; b++) if (mask & (1 << b)) { if (j-- === 0) return b; }
    return -1;
  }

  // ----- items
  setOf(p) { return this.versus ? this.have[p] : this.delivered; }
  needs(p, item) { return !(this.setOf(p) & (1 << item)); }
  finished(p) { return popcount(this.setOf(p)) >= this.goal; }
  // wanted pool: co-op = not yet delivered; versus = at least one player still lacks it
  pool() {
    if (!this.versus) return ALL_ITEMS & ~this.delivered;
    let all = ALL_ITEMS;
    for (let p = 0; p < this.P; p++) all &= this.have[p];
    return ALL_ITEMS & ~all;
  }
  displayed() { let m = 0; for (let k = 0; k < this.prize.length; k++) if (this.prize[k] >= 0) m |= 1 << this.prize[k]; return m; }
  // put a fresh prize on stall k, avoiding `avoid` if anything else is free
  restock(k, avoid) {
    this.prize[k] = -1;
    const free = this.pool() & ~this.displayed();
    const m = (free & ~avoid) || free;
    this.prize[k] = m ? this.pickBit(m) : -1;
  }
  gainItem(p, item, viaStall) {
    const bit = 1 << item;
    if (this.versus) this.have[p] |= bit; else this.delivered |= bit;
    if (this.stats) { if (viaStall) this.stats.stallItems++; else this.stats.shopItems++; }
    // an item nobody wants any more comes off every stall showing it
    if (this.isNew && !(this.pool() & bit)) {
      for (let k = 0; k < this.prize.length; k++) if (this.prize[k] === item) this.restock(k, 0);
    }
  }
  isPrizeSquare(p, sq) {
    const k = STALL_OF[sq];
    return k >= 0 && this.prize[k] >= 0 && this.needs(p, this.prize[k]);
  }

  // ----- tokens
  lose(p, n) { this.tokens[p] = Math.max(0, this.tokens[p] - n); }

  // ----- moving
  move(p, n) {
    for (let step = 0; step < n; step++) {
      this.pos[p] = (this.pos[p] + 1) % N;
      if (this.pos[p] === 0 && step < n - 1) this.tokens[p]++; // walked past the boiler
    }
  }

  // NEW rules: use the roller skates or lucky dice you're carrying, right after the roll.
  // Returns the distance to move.
  extras(p, roll) {
    const at = (r) => (this.pos[p] + r) % N;
    const trySkates = () => {
      if (!this.skates[p]) return false;
      let d = 0;
      if (this.isPrizeSquare(p, at(roll + 1))) d = 1;
      else if (roll - 1 >= 1 && this.isPrizeSquare(p, at(roll - 1))) d = -1;
      if (!d) return false;
      this.skates[p] = 0; roll += d;
      if (this.stats) this.stats.skates++;
      return true;
    };
    if (this.isPrizeSquare(p, at(roll))) return roll;
    if (trySkates()) return roll;
    if (this.dice[p]) {
      this.dice[p] = 0;
      if (this.stats) this.stats.dice++;
      roll = this.d6();
      if (!this.isPrizeSquare(p, at(roll))) trySkates();
    }
    return roll;
  }
  // NEW rules: extras at the Fair Shop with whatever's left after buying items
  buyExtras(p) {
    const skatesPrice = 1 + this.skatesBought[p];
    if (!this.skates[p] && skatesPrice <= SKATES_MAX && this.tokens[p] >= skatesPrice) {
      this.tokens[p] -= skatesPrice; this.skates[p] = 1; this.skatesBought[p]++;
      if (this.stats) this.stats.skatesBought++;
    }
    const dicePrice = 1 + this.diceBought[p];
    if (!this.dice[p] && dicePrice <= DICE_MAX && this.tokens[p] >= dicePrice) {
      this.tokens[p] -= dicePrice; this.dice[p] = 1; this.diceBought[p]++;
      if (this.stats) this.stats.diceBought++;
    }
  }

  // resolve the square the player is standing on; returns true if the goal was reached mid-go
  landing(p, hopped) {
    const L = this.D.loss;
    switch (BOARD[this.pos[p]]) {
      case SQ.BOILER: case SQ.DOOR: case SQ.AIRING: this.tokens[p]++; return false;
      case SQ.WINDOW: this.lose(p, L.window); return false;
      case SQ.CAT: this.lose(p, L.cat); return false;
      case SQ.DRAUGHT: this.lose(p, L.draught); return false;
      case SQ.STAIRLIFT: this.pos[p] = 0; this.tokens[p]++; return false;
      case SQ.STALL: return this.stall(p);
      case SQ.RUMMAGE: return this.rummage(p, hopped);
    }
    return false;
  }

  stall(p) {
    const t = this.stallScore();
    const k = STALL_OF[this.pos[p]];
    const item = this.prize[k];
    if (this.stats) { this.stats.stallVisits++; if (this.isNew && item >= 0 && this.needs(p, item)) this.stats.prizeStallVisits++; }
    if (this.isNew && item >= 0 && this.needs(p, item) && t === 3) {
      this.prize[k] = -1;
      this.gainItem(p, item, true);
      this.restock(k, 1 << item);
      return this.finished(p);
    }
    this.tokens[p] += t;
    return false;
  }

  rummage(p, hopped) {
    let r = this.rng() * (hopped ? FIND_TOTAL_NO_HOP : FIND_TOTAL);
    let fx = 'dud';
    for (const [name, w] of FINDS) {
      if (hopped && name === 'hop') continue;
      if ((r -= w) < 0) { fx = name; break; }
    }
    switch (fx) {
      case 'token': this.tokens[p] += this.rng() < 0.15 ? 2 : 1; break;
      case 'lose': this.lose(p, this.D.loss.find); break;
      case 'charm': if (this.charm[p]) this.tokens[p]++; else this.charm[p] = 1; break;
      case 'nap': this.nap = true; break;
      case 'hop':
        this.move(p, 2);
        return this.landing(p, true);
    }
    return false;
  }

  newspaper(p) {
    if (this.nap) return;
    const chance = 0.06 + 0.16 * this.cold + (BOARD[this.pos[p]] === SQ.DOOR ? 0.2 : 0);
    if (this.rng() >= chance) return;
    if (this.charm[p]) { this.charm[p] = 0; return; }
    if (this.rng() < this.D.duck) return;
    if (this.tokens[p] > 0) this.lose(p, this.D.loss.paper);
    else this.skip[p] = 1;
  }

  // end-of-go shopping; returns true once the goal is reached
  shop(p) {
    while (this.tokens[p] >= this.cost && !this.finished(p)) {
      const need = ALL_ITEMS & ~this.setOf(p);
      const m = this.isNew ? ((need & ~this.displayed()) || need) : need;
      this.tokens[p] -= this.cost;
      this.gainItem(p, this.pickBit(m), false);
    }
    if (this.finished(p)) return true;
    if (this.isNew) this.buyExtras(p);
    return false;
  }

  // one go for player p; returns true if the game is won
  go(p) {
    if (this.skip[p]) { this.skip[p] = 0; return false; }
    const st = this.stats;
    if (st) {
      st.goes++;
      let shown = 0, wanted = 0;
      for (let k = 0; k < this.prize.length; k++) if (this.prize[k] >= 0) { shown++; if (this.needs(p, this.prize[k])) wanted++; }
      st.shownSum += shown; st.wantedSum += wanted;
    }
    this.nap = false;
    let roll = this.d6();
    if (st && this.isPrizeSquare(p, (this.pos[p] + roll) % N)) st.rawPrizeRolls++;
    if (this.isNew) roll = this.extras(p, roll);
    this.move(p, roll);
    if (st && this.isPrizeSquare(p, this.pos[p])) st.prizeLandings++;
    if (this.landing(p, false)) return true;
    this.newspaper(p);
    return this.shop(p);
  }

  // play it out: returns the round the goal was reached in, or 0 if Grandad froze
  play() {
    for (let r = 0; r < this.R; r++) {
      this.cold = r / this.R;
      for (let p = 0; p < this.P; p++) if (this.go(p)) return r + 1;
    }
    return 0;
  }
}

// ---------------------------------------------------------------- running many games
function newStats() {
  return { games: 0, goes: 0, stallItems: 0, shopItems: 0, skates: 0, dice: 0, skatesBought: 0, diceBought: 0, shownSum: 0, wantedSum: 0,
    prizeLandings: 0, rawPrizeRolls: 0, stallVisits: 0, prizeStallVisits: 0 };
}
// success rate for one config / difficulty / skill / round limit.
// Seeds depend only on the config, difficulty and game number (not s or R), so the 4,000-game
// search batches are the first 4,000 games of the 20,000-game batches.
function rate(rules, cfg, diff, s, rounds, games, stats) {
  const key = `${rules}|${cfg.mode}|${cfg.players}|${cfg.goal}|${diff}`;
  let wins = 0;
  for (let g = 0; g < games; g++) {
    const game = new Game({ rules, mode: cfg.mode, players: cfg.players, goal: cfg.goal, diff, s, rounds }, makeRng(key, g), stats);
    if (game.play()) wins++;
    if (stats) stats.games++;
  }
  return wins / games;
}
const oldR = (cfg) => OLD_ROUNDS[cfg.mode][cfg.players][cfg.goal];
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
// all 28 configs under the OLD rules at the current limits
function oldTable(diff, s, games) { return CONFIGS.map((c) => rate('old', c, diff, s, oldR(c), games)); }
function groupMeans(rates) {
  const pick = (f) => mean(rates.filter((_, i) => f(CONFIGS[i])));
  return { solo: pick((c) => c.players === 1), coop: pick((c) => c.players > 1 && c.mode === 'coop'), versus: pick((c) => c.mode === 'versus'), all: mean(rates) };
}
// the number each difficulty is calibrated on
function objective(diff, rates) {
  const all = mean(rates);
  return diff === 'chilly' ? all : (rates[SOLO6] + all) / 2;
}

// ---------------------------------------------------------------- step 1: calibrate s
function calibrate(diff) {
  let lo = 0.05, hi = 0.999;
  for (let it = 0; it < 16; it++) {
    const mid = (lo + hi) / 2;
    if (objective(diff, oldTable(diff, mid, FINAL_GAMES)) < TARGET[diff]) lo = mid; else hi = mid;
  }
  return Math.round(((lo + hi) / 2) * 1000) / 1000;
}

// ---------------------------------------------------------------- step 2: new round limits
function findRounds(cfg, s) {
  const ok = (R, games) => rate('new', cfg, 'chilly', s, R, games) >= TARGET.chilly;
  // bracket quickly, starting from the old limit
  let R = oldR(cfg);
  if (ok(R, SEARCH_GAMES)) { while (R > 1 && ok(R - 1, SEARCH_GAMES)) R--; } else { do R++; while (!ok(R, SEARCH_GAMES)); }
  // confirm with the full number of games
  while (!ok(R, FINAL_GAMES)) R++;
  while (R > 1 && ok(R - 1, FINAL_GAMES)) R--;
  return R;
}

// ---------------------------------------------------------------- reporting helpers
const pct = (x) => (x * 100).toFixed(1).padStart(5);
const pad = (s, n) => String(s).padEnd(n);
function roundsObject(get) {
  const out = { coop: {}, versus: {} };
  for (const c of CONFIGS) { (out[c.mode][c.players] = out[c.mode][c.players] || {})[c.goal] = get(c); }
  return out;
}
function formatRounds(obj) {
  const line = (mode, keys) => `    ${mode}:${mode === 'coop' ? '  ' : ''} { ${keys.map((n) => `${n}: { ${GOALS.map((g) => `${g}: ${obj[mode][n][g]}`).join(', ')} }`).join(', ')} },`;
  return `  G.ROUNDS = {\n${line('coop', [1, 2, 3, 4])}\n${line('versus', [2, 3, 4])}\n  };`;
}
const t0 = Date.now();
const elapsed = () => `${((Date.now() - t0) / 1000).toFixed(0)}s`;
const note = (msg) => process.stderr.write(`[${elapsed()}] ${msg}\n`);

// ---------------------------------------------------------------- main
function main() {
  const out = { finalGames: FINAL_GAMES, searchGames: SEARCH_GAMES };

  // 1. calibration
  let S;
  if (ARGS.s) {
    const [m, c, f] = String(ARGS.s).split(',').map(Number);
    S = { mild: m, chilly: c, freeze: f };
  } else {
    S = {};
    for (const d of DIFF_KEYS) { note(`calibrating s_${d}...`); S[d] = calibrate(d); }
  }
  out.s = S;
  note(`s = ${JSON.stringify(S)}; old-rules table at ${FINAL_GAMES} games...`);
  const oldRates = {};
  for (const d of DIFF_KEYS) oldRates[d] = oldTable(d, S[d], FINAL_GAMES);
  out.old = oldRates;

  console.log(`\n=== 1. Calibration (OLD rules at current G.ROUNDS, ${FINAL_GAMES} games per cell) ===`);
  console.log(`s_mild = ${S.mild}   s_chilly = ${S.chilly}   s_freeze = ${S.freeze}   (stall pays Binomial(3, s); P(3 tokens) = s^3: ` +
    DIFF_KEYS.map((d) => `${d} ${pct(S[d] ** 3).trim()}%`).join(', ') + ')');
  console.log(`${pad('config', 16)} ${pad('R', 4)}  mild chilly freeze`);
  CONFIGS.forEach((c, i) => console.log(`${pad(c.label, 16)} ${pad(oldR(c), 4)} ${DIFF_KEYS.map((d) => pct(oldRates[d][i])).join('  ')}`));
  for (const d of DIFF_KEYS) {
    const g = groupMeans(oldRates[d]);
    const r = oldRates[d];
    console.log(`${pad(d, 7)} mean all ${pct(g.all)} | solo ${pct(g.solo)} co-op ${pct(g.coop)} versus ${pct(g.versus)} | solo g6 ${pct(r[SOLO6])} | range ${pct(Math.min(...r))}-${pct(Math.max(...r)).trim()} | objective ${pct(objective(d, r))} (target ${pct(TARGET[d])})`);
  }

  // 2. new round limits
  note('searching NEW-rules round limits (chilly >= 0.90)...');
  const newR = {};
  CONFIGS.forEach((c, i) => { newR[i] = findRounds(c, S.chilly); note(`  ${c.label}: R = ${newR[i]}`); });
  note('scoring mild/chilly/freeze at the new limits...');
  const rows = CONFIGS.map((c, i) => {
    const R = newR[i];
    return {
      label: c.label, oldR: oldR(c), R,
      chilly: rate('new', c, 'chilly', S.chilly, R, FINAL_GAMES),
      chillyBelow: R > 1 ? rate('new', c, 'chilly', S.chilly, R - 1, FINAL_GAMES) : null,
      mild: rate('new', c, 'mild', S.mild, R, FINAL_GAMES),
      freeze: rate('new', c, 'freeze', S.freeze, R, FINAL_GAMES),
    };
  });
  out.newRows = rows;
  out.newRounds = roundsObject((c) => newR[CONFIGS.indexOf(c)]);

  console.log(`\n=== 2. NEW rules: smallest R with chilly >= 90% (${FINAL_GAMES} games per cell) ===`);
  console.log(`${pad('config', 16)} oldR newR  chilly@R  chilly@R-1  mild@R  freeze@R`);
  for (const r of rows) {
    console.log(`${pad(r.label, 16)} ${pad(r.oldR, 4)} ${pad(r.R, 4)}  ${pct(r.chilly)}     ${r.chillyBelow == null ? '  -  ' : pct(r.chillyBelow)}      ${pct(r.mild)}   ${pct(r.freeze)}`);
  }
  for (const d of ['mild', 'chilly', 'freeze']) {
    const v = rows.map((r) => r[d]);
    const g = groupMeans(v);
    console.log(`${pad(d, 7)} mean all ${pct(g.all)} | solo ${pct(g.solo)} co-op ${pct(g.coop)} versus ${pct(g.versus)} | range ${pct(Math.min(...v))}-${pct(Math.max(...v)).trim()}`);
  }
  console.log('\nPaste into js/core.js:');
  console.log(formatRounds(out.newRounds));

  // 3. diagnostics
  const solo6 = CONFIGS[SOLO6];
  const diag = (rules, R) => {
    const st = newStats();
    const win = rate(rules, solo6, 'chilly', S.chilly, R, FINAL_GAMES, st);
    return { win, st };
  };
  const dn = diag('new', newR[SOLO6]);
  const dOld = diag('old', oldR(solo6));
  out.diagnostics = { new: dn, old: dOld };
  const per = (st, k) => (st[k] / st.games).toFixed(2);
  console.log(`\n=== 3. Diagnostics: chilly solo goal 6 (${FINAL_GAMES} games; NEW at R=${newR[SOLO6]}, OLD at R=${oldR(solo6)}) ===`);
  const st = dn.st;
  console.log(`NEW: success ${pct(dn.win)}%, goes/game ${per(st, 'goes')}`);
  console.log(`  items per game: won at stalls ${per(st, 'stallItems')}, bought in shop ${per(st, 'shopItems')} (stall share ${pct(st.stallItems / (st.stallItems + st.shopItems))}%)`);
  console.log(`  extras per game: roller skates bought ${per(st, 'skatesBought')}, used ${per(st, 'skates')}; lucky dice bought ${per(st, 'diceBought')}, used ${per(st, 'dice')}`);
  console.log(`  prize stalls displayed (avg at start of a go): ${(st.shownSum / st.goes).toFixed(2)} of 10 (needed by the mover: ${(st.wantedSum / st.goes).toFixed(2)})`);
  console.log(`  per go: landed on a prize square ${pct(st.prizeLandings / st.goes)}% (raw roll would have: ${pct(st.rawPrizeRolls / st.goes)}%)`);
  console.log(`  stall visits per game ${per(st, 'stallVisits')}, of which on a prize stall ${per(st, 'prizeStallVisits')}; P(win prize | prize stall) = s^3 = ${pct(S.chilly ** 3)}%`);
  console.log(`OLD: success ${pct(dOld.win)}%, goes/game ${per(dOld.st, 'goes')}, stall visits/game ${per(dOld.st, 'stallVisits')}, items bought ${per(dOld.st, 'shopItems')}`);

  if (ARGS.json) require('fs').writeFileSync(String(ARGS.json), JSON.stringify(out, null, 2));
  note('done');
}

main();
