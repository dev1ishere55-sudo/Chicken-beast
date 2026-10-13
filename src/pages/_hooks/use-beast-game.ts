import { useCallback, useEffect, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import {
  FRENZY_COOLDOWN_MS,
  FRENZY_MS,
  FRENZY_TAPS,
  FRENZY_WINDOW_MS,
  RANKS,
  applyTaps,
  boostCost,
  buyUpgrade,
  collectPassive,
  maxStamina,
  newPlayer,
  passiveCap,
  pendingPassive,
  rankIndexFor,
  settle,
  startBoost,
  type PlayerState,
  type UpgradeKey,
} from "@/convex/lib/gameRules.ts";

export default function useBeastGame() {
  const { isAuthenticated } = useConvexAuth();
  const server = useQuery(api.game.me, isAuthenticated ? {} : "skip");
  const syncTaps = useMutation(api.game.sync);
  const buyMut = useMutation(api.game.buy);
  const boostMut = useMutation(api.game.boost);
  const collectMut = useMutation(api.game.collect);

  const [s, setS] = useState<PlayerState>(() => newPlayer(Date.now()));
  const hydratedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [frenzyUntil, setFrenzyUntil] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [streak, setStreak] = useState(0);

  const sRef = useRef(s);
  const tapTimes = useRef<number[]>([]);
  const pendingTaps = useRef(0);
  const pendingFrenzy = useRef(0);
  const frenzyRef = useRef(0);
  const cooldownRef = useRef(0);

  const commit = useCallback((next: PlayerState) => {
    sRef.current = next;
    setS(next);
  }, []);

  // Load the saved player once after sign-in
  useEffect(() => {
    if (!isAuthenticated || server === undefined || hydratedRef.current) return;
    hydratedRef.current = true;
    // Deferred so the saved state lands before batch-sync starts
    queueMicrotask(() => {
      if (server) commit(server);
      setReady(true);
    });
  }, [isAuthenticated, server, commit]);

  // Heartbeat for timers and stamina recharge
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      commit(settle(sRef.current, t));
    }, 1000);
    return () => clearInterval(id);
  }, [commit]);

  // Batch taps to the server every 2s while signed in
  useEffect(() => {
    if (!isAuthenticated || !ready) return;
    const id = setInterval(() => {
      const taps = pendingTaps.current;
      if (taps <= 0) return;
      const frenzyTaps = pendingFrenzy.current;
      pendingTaps.current = 0;
      pendingFrenzy.current = 0;
      syncTaps({ taps, frenzyTaps })
        .then((res) => {
          // Skip overwrite if more taps arrived meanwhile to avoid visible rollback
          if (pendingTaps.current === 0) commit(res);
        })
        .catch(() => toast.error("Could not save your gains. Retrying..."));
    }, 2000);
    return () => clearInterval(id);
  }, [isAuthenticated, ready, syncTaps, commit]);

  const tap = useCallback((): number => {
    const t = Date.now();
    const cur = sRef.current;
    if (settle(cur, t).stamina < 1) return 0;
    const inFrenzy = frenzyRef.current > t;
    tapTimes.current = [...tapTimes.current.filter((x) => t - x < FRENZY_WINDOW_MS), t];
    setStreak(Math.min(FRENZY_TAPS, tapTimes.current.length));
    if (!inFrenzy && cooldownRef.current <= t && tapTimes.current.length >= FRENZY_TAPS) {
      frenzyRef.current = t + FRENZY_MS;
      cooldownRef.current = t + FRENZY_MS + FRENZY_COOLDOWN_MS;
      setFrenzyUntil(frenzyRef.current);
      setCooldownUntil(cooldownRef.current);
      tapTimes.current = [];
    }
    const next = applyTaps(cur, 1, inFrenzy ? 1 : 0, t);
    pendingTaps.current += 1;
    if (inFrenzy) pendingFrenzy.current += 1;
    commit(next);
    return next.bp - cur.bp;
  }, [commit]);

  const run = useCallback(
    async (local: PlayerState | null, remote: () => Promise<PlayerState>) => {
      if (!local) return;
      const before = sRef.current;
      commit(local);
      if (!isAuthenticated) return;
      try {
        commit(await remote());
      } catch {
        commit(before);
        toast.error("That didn't go through. Try again.");
      }
    },
    [commit, isAuthenticated],
  );

  const buy = useCallback(
    (key: UpgradeKey) => run(buyUpgrade(sRef.current, key, Date.now()), () => buyMut({ key })),
    [run, buyMut],
  );
  const boost = useCallback(
    () => run(startBoost(sRef.current, Date.now()), () => boostMut({})),
    [run, boostMut],
  );
  const collect = useCallback(
    () => run(collectPassive(sRef.current, Date.now()), () => collectMut({})),
    [run, collectMut],
  );

  const rankIndex = rankIndexFor(s.total);

  return {
    ...s,
    isAuthenticated,
    now,
    boosted: s.boostUntil > now,
    boostLeft: Math.max(0, s.boostUntil - now),
    boostCost: boostCost(s.whey),
    frenzy: frenzyUntil > now,
    cooldown: cooldownUntil > now && frenzyUntil <= now,
    streak: frenzyUntil > now ? FRENZY_TAPS : streak,
    rank: RANKS[rankIndex],
    next: RANKS[rankIndex + 1],
    maxStamina: maxStamina(s.preworkout),
    pending: pendingPassive(s, now),
    passiveCap: passiveCap(s.creatine),
    tap,
    buy,
    boost,
    collect,
  };
}
