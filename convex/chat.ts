import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import { rankIndexFor, RANKS } from "./lib/gameRules.ts";

const MAX_BODY = 280;
const FEED_SIZE = 50;
const reactionKind = v.union(v.literal("flame"), v.literal("muscle"), v.literal("heart"));

async function requireProfile(ctx: QueryCtx | MutationCtx): Promise<Doc<"profiles">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!profile) throw new ConvexError({ message: "Create your gym card first", code: "NOT_FOUND" });
  return profile;
}

async function rankNameOf(ctx: QueryCtx, token: string): Promise<string> {
  const p = await ctx.db
    .query("players")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", token))
    .unique();
  return RANKS[rankIndexFor(p?.total ?? 0)].name;
}

function cleanBody(raw: string): string {
  const body = raw.trim();
  if (body.length < 1 || body.length > MAX_BODY) {
    throw new ConvexError({ message: `Message must be 1-${MAX_BODY} characters`, code: "BAD_REQUEST" });
  }
  return body;
}

const pairKeyOf = (a: Id<"profiles">, b: Id<"profiles">) => (a < b ? `${a}_${b}` : `${b}_${a}`);

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const p = await ctx.db
      .query("profiles")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    return p ? { id: p._id, nickname: p.nickname } : null;
  },
});

export const feed = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    const msgs = await ctx.db.query("chatMessages").order("desc").take(FEED_SIZE);
    const out = await Promise.all(
      msgs.map(async (m) => {
        const author = await ctx.db.get("profiles", m.authorId);
        const reactions = await ctx.db
          .query("chatReactions")
          .withIndex("by_message", (q) => q.eq("messageId", m._id))
          .take(200);
        const counts = { flame: 0, muscle: 0, heart: 0 };
        const mine: string[] = [];
        for (const r of reactions) {
          counts[r.kind] += 1;
          if (r.profileId === me._id) mine.push(r.kind);
        }
        return {
          _id: m._id,
          _creationTime: m._creationTime,
          kind: m.kind,
          body: m.body,
          authorId: m.authorId,
          authorName: author?.nickname ?? "Unknown",
          counts,
          mine,
        };
      }),
    );
    return out.reverse();
  },
});

export const send = mutation({
  args: { body: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const me = await requireProfile(ctx);
    await ctx.db.insert("chatMessages", { authorId: me._id, kind: "text", body: cleanBody(args.body) });
    return null;
  },
});

export const react = mutation({
  args: { messageId: v.id("chatMessages"), kind: reactionKind },
  handler: async (ctx, args): Promise<null> => {
    const me = await requireProfile(ctx);
    const existing = await ctx.db
      .query("chatReactions")
      .withIndex("by_message_and_profile_and_kind", (q) =>
        q.eq("messageId", args.messageId).eq("profileId", me._id).eq("kind", args.kind),
      )
      .unique();
    if (existing) await ctx.db.delete("chatReactions", existing._id);
    else await ctx.db.insert("chatReactions", { messageId: args.messageId, profileId: me._id, kind: args.kind });
    return null;
  },
});

export const conversations = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    const [sent, received] = await Promise.all([
      ctx.db.query("dms").withIndex("by_from", (q) => q.eq("fromId", me._id)).order("desc").take(100),
      ctx.db.query("dms").withIndex("by_to", (q) => q.eq("toId", me._id)).order("desc").take(100),
    ]);
    const latest = new Map<Id<"profiles">, { body: string; time: number }>();
    for (const m of [...sent, ...received].sort((a, b) => b._creationTime - a._creationTime)) {
      const other = m.fromId === me._id ? m.toId : m.fromId;
      if (!latest.has(other)) latest.set(other, { body: m.tip ? `Tip: ${m.tip} BP` : m.body, time: m._creationTime });
    }
    return await Promise.all(
      [...latest.entries()].map(async ([id, last]) => {
        const p = await ctx.db.get("profiles", id);
        return { id, nickname: p?.nickname ?? "Unknown", lastBody: last.body, lastTime: last.time };
      }),
    );
  },
});

export const thread = query({
  args: { otherId: v.id("profiles") },
  handler: async (ctx, args) => {
    const me = await requireProfile(ctx);
    const other = await ctx.db.get("profiles", args.otherId);
    if (!other) throw new ConvexError({ message: "Player not found", code: "NOT_FOUND" });
    const msgs = await ctx.db
      .query("dms")
      .withIndex("by_pair", (q) => q.eq("pairKey", pairKeyOf(me._id, args.otherId)))
      .order("desc")
      .take(100);
    return {
      nickname: other.nickname,
      rank: await rankNameOf(ctx, other.tokenIdentifier),
      messages: msgs.reverse().map((m) => ({
        _id: m._id,
        _creationTime: m._creationTime,
        mine: m.fromId === me._id,
        body: m.body,
        tip: m.tip ?? null,
      })),
    };
  },
});

export const sendDm = mutation({
  args: { toId: v.id("profiles"), body: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const me = await requireProfile(ctx);
    if (args.toId === me._id) throw new ConvexError({ message: "You cannot message yourself", code: "BAD_REQUEST" });
    if (!(await ctx.db.get("profiles", args.toId))) {
      throw new ConvexError({ message: "Player not found", code: "NOT_FOUND" });
    }
    await ctx.db.insert("dms", {
      pairKey: pairKeyOf(me._id, args.toId),
      fromId: me._id,
      toId: args.toId,
      body: cleanBody(args.body),
    });
    return null;
  },
});

export const tip = mutation({
  args: { toId: v.id("profiles"), amount: v.number() },
  handler: async (ctx, args): Promise<null> => {
    const me = await requireProfile(ctx);
    const amount = Math.floor(args.amount);
    if (!(amount >= 1) || amount > 1_000_000) {
      throw new ConvexError({ message: "Enter a tip between 1 and 1,000,000 BP", code: "BAD_REQUEST" });
    }
    if (args.toId === me._id) throw new ConvexError({ message: "You cannot tip yourself", code: "BAD_REQUEST" });
    const to = await ctx.db.get("profiles", args.toId);
    if (!to) throw new ConvexError({ message: "Player not found", code: "NOT_FOUND" });

    const [from, dest] = await Promise.all([
      ctx.db.query("players").withIndex("by_token", (q) => q.eq("tokenIdentifier", me.tokenIdentifier)).unique(),
      ctx.db.query("players").withIndex("by_token", (q) => q.eq("tokenIdentifier", to.tokenIdentifier)).unique(),
    ]);
    if (!from || from.bp < amount) throw new ConvexError({ message: "Not enough BP", code: "BAD_REQUEST" });
    if (!dest) throw new ConvexError({ message: "That player has not started mining yet", code: "BAD_REQUEST" });

    // Tips move spendable BP only; the receiver's "total mined" is untouched so rank can't be farmed
    await ctx.db.patch("players", from._id, { bp: from.bp - amount });
    await ctx.db.patch("players", dest._id, { bp: dest.bp + amount });
    await ctx.db.insert("dms", {
      pairKey: pairKeyOf(me._id, args.toId),
      fromId: me._id,
      toId: args.toId,
      body: `Tipped ${amount} BP`,
      tip: amount,
    });
    return null;
  },
});
