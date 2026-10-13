import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

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
