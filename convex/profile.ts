import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel.d.ts";
import { newPlayer } from "./lib/gameRules.ts";

const REFERRER_BONUS = 1000;
const NEW_PLAYER_BONUS = 500;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
// Solana addresses are base58, 32-44 chars
const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

async function requireToken(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
  return identity.tokenIdentifier;
}

async function findByToken(ctx: QueryCtx, token: string): Promise<Doc<"profiles"> | null> {
  return await ctx.db
    .query("profiles")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", token))
    .unique();
}

async function uniqueCode(ctx: MutationCtx): Promise<string> {
  for (let i = 0; i < 10; i++) {
    let code = "";
    for (let j = 0; j < 6; j++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    const clash = await ctx.db
      .query("profiles")
      .withIndex("by_referralCode", (q) => q.eq("referralCode", code))
      .first();
    if (!clash) return code;
  }
  throw new ConvexError({ message: "Could not create referral code", code: "CONFLICT" });
}

async function grantBp(ctx: MutationCtx, token: string, amount: number) {
  const p = await ctx.db
    .query("players")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", token))
    .unique();
  if (p) {
    await ctx.db.patch("players", p._id, { bp: p.bp + amount, total: p.total + amount });
  } else {
    const base = newPlayer(Date.now());
    await ctx.db.insert("players", { tokenIdentifier: token, ...base, bp: amount, total: amount });
  }
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    const token = await requireToken(ctx);
    const profile = await findByToken(ctx, token);
    if (!profile) return null;
    return {
      nickname: profile.nickname,
      wallet: profile.wallet ?? null,
      referralCode: profile.referralCode,
      referralCount: profile.referralCount,
      referred: profile.referredBy !== undefined,
    };
  },
});

// Creates the profile on first visit; optionally credits the referrer.
export const ensure = mutation({
  args: { referralCode: v.optional(v.string()) },
  handler: async (ctx, args): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    const token = identity.tokenIdentifier;
    if (await findByToken(ctx, token)) return null;

    let referredBy: string | undefined;
    if (args.referralCode) {
      const code = args.referralCode.trim().toUpperCase();
      const referrer = await ctx.db
        .query("profiles")
        .withIndex("by_referralCode", (q) => q.eq("referralCode", code))
        .unique();
      if (referrer && referrer.tokenIdentifier !== token) {
        referredBy = referrer.tokenIdentifier;
        await ctx.db.patch("profiles", referrer._id, { referralCount: referrer.referralCount + 1 });
        await grantBp(ctx, referrer.tokenIdentifier, REFERRER_BONUS);
      }
    }

    await ctx.db.insert("profiles", {
      tokenIdentifier: token,
      nickname: (identity.name ?? "Rookie Rooster").slice(0, 20),
      referralCode: await uniqueCode(ctx),
      referredBy,
      referralCount: 0,
    });
    if (referredBy) await grantBp(ctx, token, NEW_PLAYER_BONUS);
    return null;
  },
});

export const update = mutation({
  args: { nickname: v.string(), wallet: v.optional(v.string()) },
  handler: async (ctx, args): Promise<null> => {
    const token = await requireToken(ctx);
    const profile = await findByToken(ctx, token);
    if (!profile) throw new ConvexError({ message: "Profile not found", code: "NOT_FOUND" });
    const nickname = args.nickname.trim();
    if (nickname.length < 2 || nickname.length > 20) {
      throw new ConvexError({ message: "Nickname must be 2-20 characters", code: "BAD_REQUEST" });
    }
    const wallet = args.wallet?.trim() || undefined;
    if (wallet && !WALLET_RE.test(wallet)) {
      throw new ConvexError({ message: "That is not a valid Solana address", code: "BAD_REQUEST" });
    }
    await ctx.db.patch("profiles", profile._id, { nickname, wallet });
    return null;
  },
});
