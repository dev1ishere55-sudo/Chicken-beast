import { useState } from "react";
import { useQuery } from "convex/react";
import { MessageCircle } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import GlobalChat from "./global-chat.tsx";
import DmThread from "./dm-thread.tsx";
import { formatTime } from "../_lib/format-time.ts";

function Inbox({ onOpen }: { onOpen: (id: Id<"profiles">) => void }) {
  const convos = useQuery(api.chat.conversations, {});
  if (convos === undefined) return <Skeleton className="h-40 w-full rounded-2xl" />;
  if (convos.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><MessageCircle /></EmptyMedia>
          <EmptyTitle>No DMs yet</EmptyTitle>
          <EmptyDescription>Tap a name in the global chat to message or tip them.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <div className="divide-y rounded-2xl border bg-card">
      {convos.map((c) => (
        <button key={c.id} onClick={() => onOpen(c.id)} className="flex w-full cursor-pointer flex-col gap-0.5 p-4 text-left hover:bg-muted">
          <div className="flex justify-between">
            <span className="font-bold">{c.nickname}</span>
            <span className="text-xs text-muted-foreground">{formatTime(c.lastTime)}</span>
          </div>
          <span className="truncate text-sm text-muted-foreground">{c.lastBody}</span>
        </button>
      ))}
    </div>
  );
}

export default function Coop() {
  const [tab, setTab] = useState("global");
  const [dmWith, setDmWith] = useState<Id<"profiles"> | null>(null);

  const openDm = (id: Id<"profiles">) => {
    setDmWith(id);
    setTab("dms");
  };

  return (
    <section className="space-y-4">
      <h2 className="font-serif text-3xl">THE COOP</h2>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="global">Global chat</TabsTrigger>
          <TabsTrigger value="dms">DMs</TabsTrigger>
        </TabsList>
        <TabsContent value="global">
          <GlobalChat onOpenDm={openDm} />
        </TabsContent>
        <TabsContent value="dms">
          {dmWith ? <DmThread otherId={dmWith} onBack={() => setDmWith(null)} /> : <Inbox onOpen={setDmWith} />}
        </TabsContent>
      </Tabs>
    </section>
  );
}
