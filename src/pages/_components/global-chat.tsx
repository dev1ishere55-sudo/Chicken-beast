import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Flame, Heart, Send, Trophy } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";
import { formatTime } from "../_lib/format-time.ts";
import { errMsg } from "../_lib/err-msg.ts";

type Kind = "flame" | "muscle" | "heart";
const REACTIONS = [
  { kind: "flame", icon: <Flame className="size-3.5" /> },
  { kind: "muscle", icon: <Trophy className="size-3.5" /> },
  { kind: "heart", icon: <Heart className="size-3.5" /> },
] satisfies { kind: Kind; icon: React.ReactNode }[];

type Props = { onOpenDm: (id: Id<"profiles">) => void };

export default function GlobalChat({ onOpenDm }: Props) {
  const feed = useQuery(api.chat.feed, {});
  const me = useQuery(api.chat.me, {});
  const send = useMutation(api.chat.send);
  const react = useMutation(api.chat.react);
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const count = feed?.length ?? 0;

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [count]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await send({ body: text });
      setText("");
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  if (feed === undefined) return <Skeleton className="h-96 w-full rounded-2xl" />;

  return (
    <div className="flex h-[28rem] flex-col rounded-2xl border bg-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {feed.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Flame /></EmptyMedia>
              <EmptyTitle>The coop is quiet</EmptyTitle>
              <EmptyDescription>Say something. Rank-ups show up here too.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {feed.map((m) =>
          m.kind === "rankup" ? (
            <div key={m._id} className="rounded-xl border border-accent bg-accent/10 px-3 py-2 text-center text-sm font-bold text-accent">
              {m.body}
            </div>
          ) : (
            <div key={m._id} className="space-y-1">
              <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
                {me?.id === m.authorId ? (
                  <span className="font-bold text-primary">{m.authorName} (you)</span>
                ) : (
                  <button className="cursor-pointer font-bold text-primary hover:underline" onClick={() => onOpenDm(m.authorId)}>
                    {m.authorName}
                  </button>
                )}
                <span>{formatTime(m._creationTime)}</span>
              </div>
              <p className="break-words text-sm">{m.body}</p>
              <div className="flex gap-1">
                {REACTIONS.map((r) => (
                  <button
                    key={r.kind}
                    onClick={() => react({ messageId: m._id, kind: r.kind })}
                    className={cn(
                      "flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                      m.mine.includes(r.kind) && "border-primary bg-primary/15 text-primary",
                    )}
                  >
                    {r.icon}
                    {m.counts[r.kind] > 0 && m.counts[r.kind]}
                  </button>
                ))}
              </div>
            </div>
          ),
        )}
        <div ref={bottom} />
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t p-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={280} placeholder="Flex in the coop..." />
        <Button type="submit" size="icon" aria-label="Send"><Send className="size-4" /></Button>
      </form>
    </div>
  );
}
