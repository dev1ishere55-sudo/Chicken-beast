import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel.d.ts";
import {
  applyTaps,
  buyUpgrade,
  collectPassive,
  newPlayer,
  startBoost,
  type PlayerState,
} from "./lib/gameRules.ts";

const stateValidator = v.object({
  bp: v.number(),
  total: v.number(),
  whey: v.number(),
  creatine: v.number(),
  preworkout: v.number(),
  stamina: v.number(),
  staminaAt: v.number(),
  boostUntil: v.number(),
  collectAt: v.number(),
});

const toState = (p: Doc<"players">): PlayerState => ({
  bp: p.bp,
  total: p.total,
  whey: p.whey,
  creatine: p.creatine,
  preworkout: p.preworkout,
  stamina: p.stamina,
  staminaAt: p.staminaAt,
  boostUntil: p.boostUntil,
  collectAt: p.collectAt,
});

async function requireToken(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
  return identity.tokenIdentifier;
}

async function loadPlayer(ctx: MutationCtx, token: string): Promise<Doc<"players">> {
  const existing = await ctx.db
    .query("players")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", token))
    .unique();
  if (existing) return existing;
  const id = await ctx.db.insert("players", { tokenIdentifier: token, ...newPlayer(Date.now()) });
  const created = await ctx.db.get("players", id);
  if (!created) throw new ConvexError({ message: "Could not create player", code: "NOT_FOUND" });
  return created;
}

export const me = query({
  args: {},
  returns: v.union(stateValidator, v.null()),
  handler: async (ctx) => {
    const token = await requireToken(ctx);
    const p = await ctx.db
      .query("players")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", token))
      .unique();
    return p ? toState(p) : null;
  },
});

export const sync = mutation({
  args: { taps: v.number(), frenzyTaps: v.number() },
  returns: stateValidator,
  handler: async (ctx, args) => {
    const p = await loadPlayer(ctx, await requireToken(ctx));
    const next = applyTaps(toState(p), args.taps, args.frenzyTaps, Date.now());
    await ctx.db.patch("players", p._id, next);
    return next;
  },
});

export const buy = mutation({
  args: { key: v.union(v.literal("whey"), v.literal("creatine"), v.literal("preworkout")) },
  returns: stateValidator,
  handler: async (ctx, args) => {
    const p = await loadPlayer(ctx, await requireToken(ctx));
    const next = buyUpgrade(toState(p), args.key, Date.now());
    if (!next) throw new ConvexError({ message: "Cannot buy this upgrade", code: "BAD_REQUEST" });
    await ctx.db.patch("players", p._id, next);
    return next;
  },
});

export const boost = mutation({
  args: {},
  returns: stateValidator,
  handler: async (ctx) => {
    const p = await loadPlayer(ctx, await requireToken(ctx));
    const next = startBoost(toState(p), Date.now());
    if (!next) throw new ConvexError({ message: "Cannot start boost", code: "BAD_REQUEST" });
    await ctx.db.patch("players", p._id, next);
    return next;
  },
});

export const collect = mutation({
  args: {},
  returns: stateValidator,
  handler: async (ctx) => {
    const p = await loadPlayer(ctx, await requireToken(ctx));
    const next = collectPassive(toState(p), Date.now());
    await ctx.db.patch("players", p._id, next);
    return next;
  },
});
