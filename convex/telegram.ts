import { ConvexError } from "convex/values";
import { action } from "./_generated/server";

type TgResult = { ok: boolean; description?: string; result?: { username?: string } };

// Verifies the bot token and points Telegram at our webhook (safe to run repeatedly)
export const connect = action({
  args: {},
  handler: async (ctx): Promise<{ username: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const site = process.env.CONVEX_SITE_URL;
    if (!token || !site) throw new ConvexError({ message: "Bot token missing", code: "BAD_REQUEST" });

    const me = (await (await fetch(`https://api.telegram.org/bot${token}/getMe`)).json()) as TgResult;
    if (!me.ok) throw new ConvexError({ message: "Telegram rejected the token", code: "EXTERNAL_SERVICE_ERROR" });

    const hook = (await (
      await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `${site}/telegram`, allowed_updates: ["message"] }),
      })
    ).json()) as TgResult;
    if (!hook.ok) throw new ConvexError({ message: "Could not set webhook", code: "EXTERNAL_SERVICE_ERROR" });
    return { username: me.result?.username ?? "bot" };
  },
});
