import type { MutationCtx } from "../_generated/server";

// Adds freshly mined BP to the player's clan pool (no-op if not in a clan)
export async function addToClan(ctx: MutationCtx, token: string, delta: number): Promise<void> {
  if (delta <= 0) return;
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", token))
    .unique();
  if (!profile?.clanId) return;
  const clan = await ctx.db.get("clans", profile.clanId);
  if (clan) await ctx.db.patch("clans", clan._id, { totalBp: clan.totalBp + delta });
}
