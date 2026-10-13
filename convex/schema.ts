import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  profiles: defineTable({
    tokenIdentifier: v.string(),
    nickname: v.string(),
    wallet: v.optional(v.string()),
    referralCode: v.string(),
    referredBy: v.optional(v.string()),
    referralCount: v.number(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_referralCode", ["referralCode"]),

  chatMessages: defineTable({
    authorId: v.id("profiles"),
    kind: v.union(v.literal("text"), v.literal("rankup")),
    body: v.string(),
  }),

  chatReactions: defineTable({
    messageId: v.id("chatMessages"),
    profileId: v.id("profiles"),
    kind: v.union(v.literal("flame"), v.literal("muscle"), v.literal("heart")),
  })
    .index("by_message", ["messageId"])
    .index("by_message_and_profile_and_kind", ["messageId", "profileId", "kind"]),

  dms: defineTable({
    pairKey: v.string(),
    fromId: v.id("profiles"),
    toId: v.id("profiles"),
    body: v.string(),
    tip: v.optional(v.number()),
  })
    .index("by_pair", ["pairKey"])
    .index("by_from", ["fromId"])
    .index("by_to", ["toId"]),

  players: defineTable({
    tokenIdentifier: v.string(),
    bp: v.number(),
    total: v.number(),
    whey: v.number(),
    creatine: v.number(),
    preworkout: v.number(),
    stamina: v.number(),
    staminaAt: v.number(),
    boostUntil: v.number(),
    collectAt: v.number(),
  }).index("by_token", ["tokenIdentifier"]),
});
