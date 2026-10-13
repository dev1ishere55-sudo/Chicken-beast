import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

type Update = { message?: { chat: { id: number }; text?: string } };

const REPLY =
  "Welcome to CHICKENBEAST. TOO JACKED TO RUG.\nTap, flex and hatch gains on the site. Use /gains to see how it works.";
const GAINS =
  "Tap to earn Beast Points, buy Whey, Creatine and Pre-Workout, rank up from Scrawny Chick to Apex Beast, and recruit friends with your referral link.";

const http = httpRouter();

http.route({
  path: "/telegram",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const update = (await request.json()) as Update;
    const msg = update.message;
    if (token && msg?.text) {
      const text = msg.text.startsWith("/gains") ? GAINS : REPLY;
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: msg.chat.id, text }),
      });
    }
    return new Response("ok");
  }),
});

export default http;
