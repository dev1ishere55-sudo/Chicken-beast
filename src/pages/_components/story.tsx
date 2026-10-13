import { useState } from "react";
import { useAction } from "convex/react";
import { Authenticated } from "convex/react";
import { toast } from "sonner";
import { Copy, Send } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { errMsg } from "../_lib/err-msg.ts";

const CA = "GBFHyayakxkcTWUXHEJKTnWY82f5C8MpoRzB6YBopump";

const FACTS = [
  { title: "Launch", body: "Just under 2 billion tokens, launched with pump.fun mayhem mode." },
  { title: "Long-term fuel", body: "Project wallets hold about 34% to help develop the project over time." },
  { title: "Holder rewards", body: "Pump.fun token rewards for any wallet holding more than $20, per pump.fun info." },
  { title: "The joke", body: "A play on the industrial farm complex: chicken dips, smoked, BBQ, spicy, hot sauce and wing joints." },
  { title: "The message", body: "We are not against the food industry. We are here to support it and help make it better." },
  { title: "Partners", body: "Wing chains, sauce companies and chicken restaurants are all welcome future partners." },
];

export default function Story() {
  const connect = useAction(api.telegram.connect);
  const [busy, setBusy] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(CA);
    toast.success("Contract address copied");
  };

  const link = async () => {
    setBusy(true);
    try {
      const res = await connect({});
      toast.success(`Telegram bot @${res.username} is live`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="font-serif text-3xl">THE STORY</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {FACTS.map((f) => (
          <div key={f.title} className="rounded-2xl border bg-card p-5">
            <Badge variant="secondary">{f.title}</Badge>
            <p className="mt-3 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border-2 border-primary bg-card p-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Contract address</div>
          <div className="break-all font-mono text-sm">{CA}</div>
        </div>
        <Button onClick={copy}><Copy className="size-4" /> Copy CA</Button>
        <Authenticated>
          <Button variant="secondary" disabled={busy} onClick={link}><Send className="size-4" /> Sync Telegram</Button>
        </Authenticated>
      </div>
    </section>
  );
}
