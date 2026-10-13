import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { ArrowLeft, Coins, Send } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";
import { formatTime } from "../_lib/format-time.ts";
import { errMsg } from "../_lib/err-msg.ts";

type Props = { otherId: Id<"profiles">; onBack: () => void };

export default function DmThread({ otherId, onBack }: Props) {
  const thread = useQuery(api.chat.thread, { otherId });
  const sendDm = useMutation(api.chat.sendDm);
  const tip = useMutation(api.chat.tip);
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("100");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await sendDm({ toId: otherId, body: text });
      setText("");
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const doTip = async () => {
    try {
      await tip({ toId: otherId, amount: Number(amount) });
      toast.success(`Tipped ${amount} BP`);
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  if (thread === undefined) return <Skeleton className="h-96 w-full rounded-2xl" />;

  return (
    <div className="flex h-[28rem] flex-col rounded-2xl border bg-card">
      <div className="flex items-center gap-2 border-b p-3">
        <Button size="icon" variant="secondary" onClick={onBack} aria-label="Back"><ArrowLeft className="size-4" /></Button>
        <span className="font-bold">{thread.nickname}</span>
        <Badge variant="secondary">{thread.rank}</Badge>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {thread.messages.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Send /></EmptyMedia>
              <EmptyTitle>No messages yet</EmptyTitle>
              <EmptyDescription>Say hi or send a tip.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {thread.messages.map((m) => (
          <div key={m._id} className={cn("flex flex-col", m.mine ? "items-end" : "items-start")}>
            <div
              className={cn(
                "max-w-[80%] break-words rounded-2xl px-3 py-2 text-sm",
                m.tip !== null ? "bg-accent text-accent-foreground font-bold" : m.mine ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {m.tip !== null ? `${m.mine ? "You tipped" : "Tipped you"} ${m.tip} BP` : m.body}
            </div>
            <span className="text-[10px] text-muted-foreground">{formatTime(m._creationTime)}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t p-3">
        <Coins className="size-4 text-accent" />
        <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-24" />
        <Button variant="secondary" onClick={doTip}>Tip BP</Button>
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t p-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={280} placeholder="Message..." />
        <Button type="submit" size="icon" aria-label="Send"><Send className="size-4" /></Button>
      </form>
    </div>
  );
}
