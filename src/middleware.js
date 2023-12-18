import { prisma, findUser, createUser, findChatActive } from "./db.js";
import { dateNow } from "./helper.js";

export const middleware = async (ctx, next) => {
  try {
    const start = new Date();

    let user = await findUser(ctx.from.id);
    if (!user) {
      await createUser(ctx);
      user = await findUser(ctx.from.id);
    }
    const chat = await findChatActive(user.id);
    ctx.chatData = chat;
    ctx.userData = user;

    await next();

    const ms = new Date() - start;
    console.log(
      "[MIDDLEWARE]: ",
      dateNow(),
      "|",
      ctx?.chatData?.id || "-",
      "|",
      ctx?.from?.first_name || "-",
      "|",
      ctx?.message != null
        ? ctx?.message?.entities &&
          ctx?.message?.entities[0]?.type == "bot_command"
          ? ctx?.message?.text
          : "-"
        : ctx?.update?.callback_query?.data || "-",
      "|",
      ms,
      "ms",
      "|",
      ctx.userData.telegram_user_id
    );
  } catch (err) {
    console.log("[MIDDLEWARE]: ", err.message);
  }
};
