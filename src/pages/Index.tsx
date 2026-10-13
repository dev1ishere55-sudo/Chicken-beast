import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Authenticated, Unauthenticated } from "convex/react";
import { Zap, Timer, Flame, Dumbbell, TrendingUp, Egg } from "lucide-react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import useBeastGame from "./_hooks/use-beast-game.ts";
import GymCard from "./_components/gym-card.tsx";
import Coop from "./_components/coop.tsx";
import { captureReferral } from "./_lib/referral.ts";
import { UPGRADES, tapPower, hourlyRate, maxStamina, upgradeCost, MAX_LEVEL, type UpgradeKey } from "@/convex/lib/gameRules.ts";

captureReferral();

const HERO = "https://hercules-cdn.com/file_vY4JzdHddGyQrxB8RqbBYJU8";
const fmt = (n: number) => Math.floor(n).toLocaleString();

type Pop = { id: number; x: number; y: number; v: number };

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

export default function Index() {
  const g = useBeastGame();
  const [pops, setPops] = useState<Pop[]>([]);

  const levelOf = (k: UpgradeKey) => g[k];
  const effect = (k: UpgradeKey) => {
    const l = levelOf(k);
    if (k === "whey") return `+${tapPower(l)} → +${tapPower(l + 1)} BP / tap`;
    if (k === "creatine") return `${hourlyRate(l)} → ${hourlyRate(l + 1)} BP / hr`;
    return `${fmt(maxStamina(l))} → ${fmt(maxStamina(l + 1))} stamina`;
  };

  const onTap = (e: React.MouseEvent<HTMLButtonElement>) => {
    const v = g.tap();
    if (!v) return;
    const r = e.currentTarget.getBoundingClientRect();
    const pop = { id: Date.now() + Math.random(), x: e.clientX - r.left, y: e.clientY - r.top, v };
    setPops((p) => [...p.slice(-12), pop]);
    setTimeout(() => setPops((p) => p.filter((q) => q.id !== pop.id)), 800);
  };

  const maxSt = g.maxStamina;
  const rankPct = g.next ? ((g.total - g.rank.min) / (g.next.min - g.rank.min)) * 100 : 100;
  const mins = Math.floor(g.boostLeft / 60000);
  const secs = Math.floor((g.boostLeft % 60000) / 1000);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Dumbbell className="size-5" />
            </div>
            <span className="font-serif text-lg tracking-tight">CHICKENBEAST</span>
            <Badge className="hidden sm:inline-flex">$CBEAST</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border px-3 py-1 text-sm whitespace-nowrap font-bold tabular-nums">
              <span className="text-primary">{fmt(g.bp)}</span> BP
            </div>
            <Unauthenticated>
              <SignInButton />
            </Unauthenticated>
            <Authenticated>
              <SignInButton />
            </Authenticated>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="grid items-center gap-8 md:grid-cols-2"
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">SEASON 01 · BULKING SEASON</Badge>{g.frenzy && <Badge className="bg-accent text-accent-foreground">FRENZY 2x</Badge>}{!g.isAuthenticated && <Badge variant="secondary">PRACTICE SESSION</Badge>}</div>
            <h1 className="font-serif text-5xl leading-[0.95] text-balance sm:text-7xl">
              TOO JACKED <span className="text-primary">TO RUG.</span>
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Tap. Flex. Hatch gains while you sleep. Never skip cluck day.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Stat icon={<Zap className="size-3" />} label="Tap" value={`+${tapPower(g.whey)}`} />
              <Stat icon={<Egg className="size-3" />} label="Per hr" value={fmt(hourlyRate(g.creatine))} />
              <Stat icon={<TrendingUp className="size-3" />} label="Rank" value={g.rank.name.split(" ")[0]} />
            </div>
            <div className="space-y-2 rounded-2xl border bg-card p-4">
              <div className="flex justify-between text-sm">
                <span className="font-bold">{g.rank.name}</span>
                <span className="text-muted-foreground">
                  {g.next ? `Next: ${g.next.name} · ${fmt(g.total)} / ${fmt(g.next.min)}` : "Max rank"}
                </span>
              </div>
              <Progress value={rankPct} />
            </div>
          </div>

          <div className="relative flex flex-col items-center gap-4">
            <div className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-3xl" />
            <button
              onClick={onTap}
              className={`relative aspect-square w-full max-w-sm cursor-pointer select-none overflow-hidden rounded-[2.5rem] border-2 bg-black transition-transform active:scale-95 ${g.frenzy ? "border-accent shadow-[0_0_60px_var(--accent)]" : "border-primary"}`}
              aria-label="Tap the chicken"
            >
              <img src={HERO} alt="Muscular chicken flexing" className="size-full object-cover" draggable={false} />
              <AnimatePresence>
                {pops.map((p) => (
                  <motion.span
                    key={p.id}
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: -80 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{ left: p.x, top: p.y }}
                    className="pointer-events-none absolute font-serif text-2xl text-primary"
                  >
                    +{p.v}
                  </motion.span>
                ))}
              </AnimatePresence>
            </button>
            <div className="w-full max-w-sm space-y-1">
              <div className="flex justify-between text-xs uppercase tracking-widest text-muted-foreground">
                <span>Stamina</span>
                <span className="tabular-nums">
                  {fmt(g.stamina)} / {fmt(maxSt)}
                </span>
              </div>
              <Progress value={(g.stamina / maxSt) * 100} />
              <div className="flex justify-between pt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Flame className="size-3 text-accent" /> {g.frenzy ? "FRENZY!" : g.cooldown ? "Cooling down" : `Streak ${g.streak}/12`}
                </span>
                <span>1 tap = 1 stamina</span>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-4 md:grid-cols-2">
          <Authenticated>
            <GymCard rankName={g.rank.name} total={g.total} whey={g.whey} creatine={g.creatine} preworkout={g.preworkout} />
          </Authenticated>
          <Unauthenticated>
            <div className="flex flex-col items-start justify-center gap-3 rounded-2xl border-2 border-primary bg-card p-6">
              <h3 className="font-serif text-2xl">YOUR GYM CARD</h3>
              <p className="text-sm text-muted-foreground">
                Sign in to get your card: rank badge, total mined, referral link and wallet.
              </p>
              <SignInButton />
            </div>
          </Unauthenticated>
        </section>

        <Authenticated>
          <Coop />
        </Authenticated>

        <section className="space-y-4">
          <h2 className="font-serif text-3xl">SUPPLEMENT STACK</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {UPGRADES.map((u) => {
              const cost = upgradeCost(u.base, levelOf(u.key));
              return (
                <div key={u.key} className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">{u.name}</h3>
                    <Badge variant="secondary">LVL {levelOf(u.key)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{u.desc}</p>
                  <p className="text-sm font-medium text-primary">{effect(u.key)}</p>
                  <Button className="mt-auto" disabled={g.bp < cost || levelOf(u.key) >= MAX_LEVEL} onClick={() => g.buy(u.key)}>
                    Upgrade · {fmt(cost)} BP
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl border-2 border-accent bg-card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-2xl">MEGA FLEX BOOST</h3>
              <span className="font-serif text-4xl text-accent">2×</span>
            </div>
            <p className="text-sm text-muted-foreground">Double the earnings. Ten minutes. Zero excuses.</p>
            <Button
              variant="secondary"
              className="w-full"
              disabled={g.boosted || g.bp < g.boostCost}
              onClick={g.boost}
            >
              {g.boosted ? (
                <>
                  <Timer className="size-4" /> {mins}:{String(secs).padStart(2, "0")} left
                </>
              ) : (
                `Unleash the beast · ${g.boostCost} BP`
              )}
            </Button>
          </div>

          <div className="space-y-3 rounded-2xl border bg-card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-2xl">PASSIVE INCUBATION</h3>
              <Badge variant="secondary">8 HR CAP</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Let your gains hatch. Collect before the coop fills up.
            </p>
            <Progress value={(g.pending / g.passiveCap) * 100} />
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold tabular-nums">{fmt(g.pending)} BP</span>
              <Button disabled={g.pending < 1} onClick={g.collect}>
                Collect gains
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <p>Practice gains stay in this session. Sign in to join the coop.</p>
        <p>Beast Points are game points, not tokens. © {new Date().getFullYear()} CHICKENBEAST</p>
      </footer>
    </div>
  );
}
