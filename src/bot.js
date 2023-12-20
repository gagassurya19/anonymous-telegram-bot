import logger from './logger.js';
import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { Command, CommandButtons } from "./command.js";
import {
  animationMessage,
  documentMessage,
  locationMessage,
  photoMessage,
  stickerMessage,
  textMessage,
  videoMessage,
  voiceMessage,
} from "./message.js";
import { middleware } from "./middleware.js";
import { partnerId } from "./helper.js";
import { findChatActive } from "./db.js";

export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const handleMessage = async (ctx, messageType) => {
  try {
    if (ctx.from.is_bot) {
      return await ctx.reply(
        "You've been detected as a bot, please stop spamming!"
      );
    }

    const chat = await findChatActive(ctx.userData.id);
    if(!chat){
      return await ctx.reply(`You don't have a partner yet, type /search to start a conversation.`)
    }

    switch (messageType) {
      case "text":
        await textMessage(ctx, partnerId(ctx));
        break;
      case "sticker":
        await stickerMessage(ctx, partnerId(ctx));
        break;
      case "voice":
        await voiceMessage(ctx, partnerId(ctx));
        break;
      case "photo":
        await photoMessage(ctx, partnerId(ctx));
        break;
      case "video":
        await videoMessage(ctx, partnerId(ctx));
        break;
      case "document":
        await documentMessage(ctx, partnerId(ctx));
        break;
      case "animation":
        await animationMessage(ctx, partnerId(ctx));
        break;
      case "location":
        await locationMessage(ctx, partnerId(ctx));
        break;
      default:
        await ctx.telegram.sendMessage(
          ctx.from.id,
          `⚠️ Unsupported message type! please send another message.`,
          { reply_to_message_id: ctx.message.message_id }
        );
    }
  } catch (err) {
    logger.error(`🚀 ~ file: bot.js ~ handleMessage ~ err: ${err}`)
  }
};

bot.use(middleware);

// Register commands dynamically
Object.keys(Command).forEach((command) => {
  bot.command(command, async (ctx) => {
    if (ctx.from.is_bot) {
      return await ctx.reply("Bot can't send message to bot");
    }
    Command[command](ctx);
  });
});

// Register buttons dynamically
Object.keys(CommandButtons).forEach((button) => {
  bot.action(button, async (ctx) => {
    if (ctx.from.is_bot) {
      return await ctx.reply("Bot can't send message to bot");
    }
    CommandButtons[button](ctx);
  });
});

// message handlers
const messageTypes = [
  "text",
  "sticker",
  "voice",
  "photo",
  "video",
  "document",
  "animation",
  "location",
  "contact",
  "poll",
  "audio",
  "game",
  "forward",
];
messageTypes.forEach((type) => {
  bot.on(message(type), async (ctx) => {
    if (ctx.from.is_bot) {
      return await ctx.reply(
        "You've been detected as a bot, please stop spamming!"
      );
    }
    await handleMessage(ctx, type);
  });
});
