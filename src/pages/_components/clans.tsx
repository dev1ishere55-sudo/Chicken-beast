import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Shield, Users } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";
import { errMsg } from "../_lib/err-msg.ts";

export default function Clans() {
  const data = useQuery(api.clans.clans.leaderboard, {});
  const create = useMutation(api.clans.clans.create);
  const join = useMutation(api.clans.clans.join);
  const leave = useMutation(api.clans.clans.leave);
  const [name, setName] = useState("");

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await act(() => create({ name }), "Clan founded");
    setName("");
  };

  if (data === undefined) return <Skeleton className="h-64 w-full rounded-2xl" />;

  return (
    <section className="space-y-4">
      <h2 className="font-serif text-3xl">CLUCK CLANS</h2>
      <p className="text-sm text-muted-foreground">Mine together. Every BP you mine while in a clan counts toward its pool.</p>
      <form onSubmit={submit} className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="Found a new clan, e.g. Wing Warriors" />
        <Button type="submit">Create</Button>
      </form>
      {data.clans.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Shield /></EmptyMedia>
            <EmptyTitle>No clans yet</EmptyTitle>
            <EmptyDescription>Be the first to found one.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="divide-y rounded-2xl border bg-card">
          {data.clans.map((c) => {
            const mine = data.myClanId === c._id;
            return (
              <div key={c._id} className={cn("flex items-center gap-3 p-4", mine && "bg-primary/10")}>
                <span className="w-8 font-serif text-xl text-primary">#{c.rank}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{c.name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="size-3" /> {c.memberCount} · {Math.floor(c.totalBp).toLocaleString()} BP
                  </div>
                </div>
                {mine ? (
                  <>
                    <Badge>Your clan</Badge>
                    <Button size="sm" variant="secondary" onClick={() => act(() => leave({}), "Left clan")}>Leave</Button>
                  </>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => act(() => join({ clanId: c._id }), `Joined ${c.name}`)}>Join</Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
