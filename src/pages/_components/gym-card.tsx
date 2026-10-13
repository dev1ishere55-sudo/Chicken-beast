import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Copy, Pencil, Users, Wallet } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { clearReferral, readReferral } from "../_lib/referral.ts";

type SolanaProvider = { connect: () => Promise<{ publicKey: { toString: () => string } }> };
type WalletWindow = Window & { solana?: SolanaProvider; solflare?: SolanaProvider };

type Props = {
  rankName: string;
  total: number;
  whey: number;
  creatine: number;
  preworkout: number;
};

const fmt = (n: number) => Math.floor(n).toLocaleString();

function errorMessage(e: unknown): string {
  if (e instanceof ConvexError) return (e.data as { message: string }).message;
  return "Something went wrong";
}

export default function GymCard({ rankName, total, whey, creatine, preworkout }: Props) {
  const profile = useQuery(api.profile.get, {});
  const ensure = useMutation(api.profile.ensure);
  const update = useMutation(api.profile.update);
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState("");
  const [wallet, setWallet] = useState("");
  const ensured = useRef(false);

  useEffect(() => {
    if (profile !== null || ensured.current) return;
    ensured.current = true;
    const referralCode = readReferral();
    ensure({ referralCode })
      .then(() => clearReferral())
      .catch(() => toast.error("Could not create your gym card"));
  }, [profile, ensure]);

  if (profile === undefined || profile === null) return <Skeleton className="h-72 w-full rounded-2xl" />;

  const link = `${window.location.origin}/?ref=${profile.referralCode}`;

  const startEdit = () => {
    setNickname(profile.nickname);
    setWallet(profile.wallet ?? "");
    setEditing(true);
  };

  const save = async (nextWallet = wallet) => {
    try {
      await update({ nickname, wallet: nextWallet });
      setEditing(false);
      toast.success("Gym card saved");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const connectWallet = async () => {
    const w = window as WalletWindow;
    const provider = w.solana ?? w.solflare;
    if (!provider) {
      toast.error("No Phantom or Solflare found. Paste your address instead.");
      return;
    }
    try {
      const res = await provider.connect();
      const addr = res.publicKey.toString();
      setWallet(addr);
      await update({ nickname: editing ? nickname : profile.nickname, wallet: addr });
      toast.success("Wallet connected");
    } catch (e) {
      toast.error(e instanceof ConvexError ? errorMessage(e) : "Wallet connection cancelled");
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    toast.success("Referral link copied");
  };

  const stats = [
    { label: "Whey", value: whey },
    { label: "Creatine", value: creatine },
    { label: "Pre-Workout", value: preworkout },
  ];

  return (
    <div className="space-y-5 rounded-2xl border-2 border-primary bg-card p-6">
      <div className="flex items-center gap-4">
        <Avatar className="size-16 border-2 border-primary">
          <AvatarFallback className="bg-primary font-serif text-2xl text-primary-foreground">
            {profile.nickname.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          {editing ? (
            <Input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} />
          ) : (
            <h3 className="truncate font-serif text-2xl">{profile.nickname}</h3>
          )}
          <Badge className="mt-1">{rankName}</Badge>
        </div>
        {!editing && (
          <Button size="icon" variant="secondary" onClick={startEdit} aria-label="Edit gym card">
            <Pencil className="size-4" />
          </Button>
        )}
      </div>

      <div className="rounded-xl bg-muted p-4">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Total mined</div>
        <div className="font-serif text-3xl text-primary tabular-nums">{fmt(total)} BP</div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border p-3 text-center">
            <div className="text-xl font-bold tabular-nums">{s.value}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label} LVL</div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Users className="size-3" /> Referrals · {profile.referralCount} recruited
        </div>
        <div className="flex gap-2">
          <Input readOnly value={link} className="text-xs" />
          <Button size="icon" onClick={copy} aria-label="Copy referral link">
            <Copy className="size-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">You get 1,000 BP per recruit. They get 500 BP.</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Wallet className="size-3" /> Solana wallet
        </div>
        {editing ? (
          <Input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="Paste Solana address" />
        ) : (
          <p className="truncate text-sm">{profile.wallet ?? "Not connected"}</p>
        )}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={connectWallet}>
            Connect Phantom / Solflare
          </Button>
          {editing && (
            <Button className="flex-1" onClick={() => save()}>
              Save
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
