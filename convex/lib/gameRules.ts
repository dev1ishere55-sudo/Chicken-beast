// Pure game rules shared by the backend (authoritative) and the frontend (practice mode + optimistic UI).

export type UpgradeKey = "whey" | "creatine" | "preworkout";

export type PlayerState = {
  bp: number;
  total: number;
  whey: number;
  creatine: number;
  preworkout: number;
  stamina: number;
  staminaAt: number;
  boostUntil: number;
  collectAt: number;
};

export const MAX_LEVEL = 50;
export const BOOST_MS = 10 * 60 * 1000;
export const PASSIVE_CAP_HOURS = 8;
export const FRENZY_TAPS = 12;
export const FRENZY_WINDOW_MS = 8000;
export const FRENZY_MS = 8000;
export const FRENZY_COOLDOWN_MS = 30000;
export const MAX_TAPS_PER_SYNC = 2000;

export const RANKS = [
  { name: "Scrawny Chick", min: 0 },
  { name: "Barnyard Broiler", min: 10_000 },
  { name: "Free-Range Chad", min: 100_000 },
  { name: "Giga-Rooster", min: 1_000_000 },
  { name: "Apex Beast", min: 10_000_000 },
] as const;

export const UPGRADES = [
  { key: "whey", name: "Whey Corn", desc: "More power. Every single rep.", base: 100 },
  { key: "creatine", name: "Creatine Coop", desc: "Gains while you're off the grid.", base: 300 },
  { key: "preworkout", name: "Pre-Workout Cluck", desc: "Bigger tank. Faster recovery.", base: 500 },
] as const satisfies readonly { key: UpgradeKey; name: string; desc: string; base: number }[];

export const tapPower = (l: number) => l;
export const hourlyRate = (l: number) => 50 + 25 * l;
export const maxStamina = (l: number) => 750 + 250 * l;
export const regenMs = (l: number) => (30 * 60 * 1000) / (1 + 0.1 * (l - 1));
export const passiveCap = (l: number) => hourlyRate(l) * PASSIVE_CAP_HOURS;
export const upgradeCost = (base: number, level: number) => Math.round(base * Math.pow(1.6, level - 1));
export const boostCost = (whey: number) => tapPower(whey) * 350;

export const rankIndexFor = (total: number) =>
  RANKS.reduce((acc, r, i) => (total >= r.min ? i : acc), 0);

export function newPlayer(now: number): PlayerState {
  return { bp: 0, total: 0, whey: 1, creatine: 1, preworkout: 1, stamina: 1000, staminaAt: now, boostUntil: 0, collectAt: now };
}

export function settle(s: PlayerState, now: number): PlayerState {
  const max = maxStamina(s.preworkout);
  const elapsed = Math.max(0, now - s.staminaAt);
  const stamina = Math.min(max, s.stamina + (elapsed / regenMs(s.preworkout)) * max);
  return { ...s, stamina, staminaAt: now };
}

export function pendingPassive(s: PlayerState, now: number): number {
  const hours = Math.max(0, now - s.collectAt) / 3_600_000;
  return Math.min(passiveCap(s.creatine), hours * hourlyRate(s.creatine));
}

export function applyTaps(s: PlayerState, taps: number, frenzyTaps: number, now: number): PlayerState {
  const settled = settle(s, now);
  const n = Math.max(0, Math.min(Math.floor(taps), MAX_TAPS_PER_SYNC, Math.floor(settled.stamina)));
  const f = Math.max(0, Math.min(Math.floor(frenzyTaps), n));
  const boost = settled.boostUntil > now ? 2 : 1;
  const gain = tapPower(settled.whey) * (n + f) * boost;
  return { ...settled, bp: settled.bp + gain, total: settled.total + gain, stamina: settled.stamina - n };
}

export function buyUpgrade(s: PlayerState, key: UpgradeKey, now: number): PlayerState | null {
  const def = UPGRADES.find((u) => u.key === key);
  if (!def || s[key] >= MAX_LEVEL) return null;
  const cost = upgradeCost(def.base, s[key]);
  if (s.bp < cost) return null;
  return { ...settle(s, now), bp: s.bp - cost, [key]: s[key] + 1 };
}

export function startBoost(s: PlayerState, now: number): PlayerState | null {
  const cost = boostCost(s.whey);
  if (s.bp < cost || s.boostUntil > now) return null;
  return { ...settle(s, now), bp: s.bp - cost, boostUntil: now + BOOST_MS };
}

export function collectPassive(s: PlayerState, now: number): PlayerState {
  const amt = Math.floor(pendingPassive(s, now));
  return { ...s, bp: s.bp + amt, total: s.total + amt, collectAt: now };
}
