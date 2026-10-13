import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel.d.ts";

async function requireProfile(ctx: MutationCtx): Promise<Doc<"profiles">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
  const p = await ctx.db
    .query("profiles")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!p) throw new ConvexError({ message: "Create your gym card first", code: "NOT_FOUND" });
  return p;
}

async function leaveCurrent(ctx: MutationCtx, p: Doc<"profiles">): Promise<void> {
  if (!p.clanId) return;
  const clan = await ctx.db.get("clans", p.clanId);
  await ctx.db.patch("profiles", p._id, { clanId: undefined });
  if (!clan) return;
  if (clan.memberCount <= 1) {
    await ctx.db.delete("clans", clan._id);
    return;
  }
  // Hand ownership to another member if the owner leaves
  const patch: Partial<Doc<"clans">> = { memberCount: clan.memberCount - 1 };
  if (clan.ownerId === p._id) {
    const rest = await ctx.db.query("profiles").withIndex("by_clanId", (q) => q.eq("clanId", clan._id)).take(5);
    const next = rest.find((m) => m._id !== p._id);
    if (next) patch.ownerId = next._id;
  }
  await ctx.db.patch("clans", clan._id, patch);
}

export const leaderboard = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const mine = identity
      ? await ctx.db
          .query("profiles")
          .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
          .unique()
      : null;
    const clans = await ctx.db.query("clans").withIndex("by_totalBp").order("desc").take(20);
    return {
      myClanId: mine?.clanId ?? null,
      clans: clans.map((c, i) => ({
        _id: c._id,
        rank: i + 1,
        name: c.name,
        memberCount: c.memberCount,
        totalBp: c.totalBp,
      })),
    };
  },
});

export const members = query({
  args: { clanId: v.id("clans") },
  handler: async (ctx, args) => {
    const list = await ctx.db.query("profiles").withIndex("by_clanId", (q) => q.eq("clanId", args.clanId)).take(50);
    return list.map((m) => ({ _id: m._id, nickname: m.nickname }));
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const p = await requireProfile(ctx);
    const name = args.name.trim();
    if (name.length < 3 || name.length > 24) {
      throw new ConvexError({ message: "Clan name must be 3-24 characters", code: "BAD_REQUEST" });
    }
    const clash = await ctx.db.query("clans").withIndex("by_name", (q) => q.eq("name", name)).first();
    if (clash) throw new ConvexError({ message: "That clan name is taken", code: "CONFLICT" });
    await leaveCurrent(ctx, p);
    const clanId = await ctx.db.insert("clans", { name, ownerId: p._id, memberCount: 1, totalBp: 0 });
    await ctx.db.patch("profiles", p._id, { clanId });
    return null;
  },
});

export const join = mutation({
  args: { clanId: v.id("clans") },
  handler: async (ctx, args): Promise<null> => {
    const p = await requireProfile(ctx);
    if (p.clanId === args.clanId) return null;
    const clan = await ctx.db.get("clans", args.clanId);
    if (!clan) throw new ConvexError({ message: "Clan not found", code: "NOT_FOUND" });
    await leaveCurrent(ctx, p);
    await ctx.db.patch("clans", clan._id, { memberCount: clan.memberCount + 1 });
    await ctx.db.patch("profiles", p._id, { clanId: clan._id });
    return null;
  },
});

export const leave = mutation({
  args: {},
  handler: async (ctx): Promise<null> => {
    await leaveCurrent(ctx, await requireProfile(ctx));
    return null;
  },
});
