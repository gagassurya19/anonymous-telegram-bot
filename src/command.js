import logger from "./logger.js";
import { prisma, userRegisterOrUpdate, findUserByIdDB } from "./db.js";
import {
  generateInlineButton,
  generateInlineKeyboardButton,
  partnerId,
  partnerIdDB,
} from "./helper.js";

const buttons = {
  menu: [
    [
      {
        text: "Daftar blokir",
        callback_data: "list_block",
      },
      // {
      //   text: "Daftar teman",
      //   callback_data: "list_friend",
      // },
    ],
    [
      // {
      //   text: "Ubah profile",
      //   callback_data: "change_profile",
      // },
    ],
    [
      {
        text: "❌ Cancel",
        callback_data: "cancel",
      },
    ],
  ],
  options: [
    [
      {
        text: "Block user",
        callback_data: "block_user",
      },
      // {
      //   text: "Add friends",
      //   callback_data: "add_friend",
      // },
    ],
    [
      {
        text: "Send Username",
        callback_data: "send_username",
      },
    ],
    [
      {
        text: "❌ Cancel",
        callback_data: "cancel",
      },
    ],
  ],
  cancelSearch: [
    [
      {
        text: "Cancel",
        callback_data: "cancelSearch",
      },
    ],
  ],
  cancel: [
    [
      {
        text: "Cancel",
        callback_data: "cancel",
      },
    ],
  ],
  block: [
    [
      {
        text: "Unblock All",
        callback_data: "unblock_all",
      },
      {
        text: "❌ Close",
        callback_data: "cancel",
      },
    ],
  ],
};

// command
export const Command = {
  start: async (ctx) => {
    try {
      // update data user
      await userRegisterOrUpdate(ctx);

      const name = ctx.from.username
        ? `@${ctx.from.username}`
        : ctx.from.first_name;
      await ctx.telegram.sendMessage(
        ctx.from.id,
        `Hi ${name} Welcome to the ${ctx.botInfo.first_name}, type /search to start a conversation.`
      );
    } catch (err) {
      logger.error(`[CMD]start: ${err}`);
    }
  },
  search: async (ctx) => {
    try {
      if (ctx.chatData) {
        return await ctx.reply(`💬 You are already in chat!`);
      }

      let countChatActive = await prisma.chat.count({
        where: { status: "ACTIVE" },
      });
      let countUser = await prisma.user.count();

      // Start looking for a new partner
      const startMessage = await ctx.reply(
        `🚀 Start looking for a partner for you... \n\nTotal chats active: ${countChatActive} \nTotal users active: ${countUser}`,
        generateInlineKeyboardButton(buttons.cancelSearch)
      );

      await userRegisterOrUpdate(ctx);

      let chat = await prisma.chat.findFirst({
        where: {
          status: "WAITING",
          user_id: { not: ctx.userData.id },
        },
      });

      // check if user is blocked by partner or partner blocked by user
      const blockUser = await prisma.block.findMany({
        where: {
          OR: [
            {
              user_id: ctx.userData.id,
              user_blocked_id: partnerIdDB(ctx),
            },
            {
              user_id: partnerIdDB(ctx),
              user_blocked_id: ctx.userData.id,
            },
          ],
        },
      });

      if (chat && blockUser.length === 0) {
        // Update chat status to active
        await prisma.chat.update({
          where: { id: chat.id },
          data: { partner_id: ctx.userData.id, status: "ACTIVE" },
        });

        const partner = await findUserByIdDB(chat.user_id);

        // Send messages to user and partner
        await Promise.all([
          ctx.reply(
            `✨ It's a match! ✨ \n 💬 #${partner.telegram_user_id.slice(
              0,
              -3
            )}`
          ),
          ctx.telegram.sendMessage(
            partner.telegram_user_id,
            `✨ It's a match! ✨ \n 💬 #${ctx.userData.telegram_user_id.slice(
              0,
              -3
            )}`
          ),
        ]);

        // Delete the start message
        await ctx.telegram.deleteMessage(ctx.chat.id, startMessage.message_id);

        // Delete the partner's start message
        let success = true;
        try {
          await ctx.telegram.deleteMessage(
            partner.telegram_user_id,
            ctx.message.message_id + 1
          );
        } catch (err) {
          success = false;
        }
        if (!success) {
          await ctx.telegram.deleteMessage(
            partner.telegram_user_id,
            ctx.message.message_id - 1
          );
        }
      } else {
        // Check if the user has already created a chat
        chat = await prisma.chat.findFirst({
          where: { user_id: ctx.userData.id, status: "WAITING" },
        });

        if (!chat) {
          // Create a chat
          chat = await prisma.chat.create({
            data: { user_id: ctx.userData.id, status: "WAITING" },
          });
        }
      }

      ctx.chatData = chat;
    } catch (err) {
      logger.error(`[CMD]search: ${err}`);
    }
  },

  next: async (ctx) => {
    try {
      // Check if the user is in an active chat
      let chat = await prisma.chat.findFirst({
        where: {
          OR: [{ user_id: ctx.userData.id }, { partner_id: ctx.userData.id }],
          status: "ACTIVE",
        },
      });

      if (!chat) {
        await ctx.reply(`⭕ You are already out of chat!`);
        await Command.search(ctx);
        return;
      }

      // Update chat status to inactive
      await prisma.chat.update({
        where: { id: chat.id },
        data: { status: "INACTIVE" },
      });

      // Send messages to user and partner
      const userMessage = `🛑 You have closed the conversation, type /search to start another one.`;
      const partnerMessage = `🛑 Your partner closed the conversation, type /search to start another one.`;

      await Promise.all([
        ctx.reply(userMessage),
        ctx.telegram.sendMessage(partnerId(ctx), partnerMessage),
      ]);

      let countChatActive = await prisma.chat.count({
        where: { status: "ACTIVE" },
      });
      let countUser = await prisma.user.count();

      // Start looking for a new partner
      const startMessage = await ctx.reply(
        `🚀 Start looking for a partner for you... \n\nTotal chats active: ${countChatActive} \nTotal users active: ${countUser}`,
        generateInlineKeyboardButton(buttons.cancelSearch)
      );

      // Update user data
      await userRegisterOrUpdate(ctx);

      // Check for a waiting chat
      chat = await prisma.chat.findFirst({
        where: {
          status: "WAITING",
          user_id: { not: ctx.userData.id },
        },
      });

      // check if user is blocked by partner or partner blocked by user
      const blockUser = await prisma.block.findMany({
        where: {
          OR: [
            {
              user_id: ctx.userData.id,
              user_blocked_id: partnerIdDB(ctx),
            },
            {
              user_id: partnerIdDB(ctx),
              user_blocked_id: ctx.userData.id,
            },
          ],
        },
      });

      if (chat && blockUser.length === 0) {
        // Update chat status to active
        await prisma.chat.update({
          where: { id: chat.id },
          data: { partner_id: ctx.userData.id, status: "ACTIVE" },
        });

        const partner = await findUserByIdDB(chat.user_id);

        // Send messages to user and partner
        await Promise.all([
          ctx.reply(
            `✨ It's a match! ✨ \n 💬 #${partner.telegram_user_id.slice(
              0,
              -3
            )}`
          ),
          ctx.telegram.sendMessage(
            partner.telegram_user_id,
            `✨ It's a match! ✨ \n 💬 #${ctx.userData.telegram_user_id.slice(
              0,
              -3
            )}`
          ),
        ]);

        // Delete the start message
        await ctx.telegram.deleteMessage(ctx.chat.id, startMessage.message_id);

        // Delete the partner's start message
        let success = true;
        try {
          await ctx.telegram.deleteMessage(
            partner.telegram_user_id,
            ctx.message.message_id - 1
          );
        } catch (err) {
          success = false;
          logger.error(err);
        }
        if (!success) {
          await ctx.telegram.deleteMessage(
            partner.telegram_user_id,
            ctx.message.message_id + 1
          );
        }
      } else {
        // Check if the user already created a chat
        chat = await prisma.chat.findFirst({
          where: { user_id: ctx.userData.id, status: "WAITING" },
        });

        if (!chat) {
          // Create a chat
          chat = await prisma.chat.create({
            data: { user_id: ctx.userData.id, status: "WAITING" },
          });
        }
      }

      // Update chat data
      ctx.chatData = chat;
    } catch (err) {
      logger.error(`[CMD]next: ${err}`);
    }
  },

  end: async (ctx) => {
    try {
      if (!ctx.chatData) {
        return await ctx.reply(`⭕ You are already out of chat!`);
      }

      const chatId = ctx.chatData.id;

      // Update chat status to inactive
      await prisma.chat.update({
        where: { id: chatId },
        data: { status: "INACTIVE" },
      });

      // Send messages to user and partner
      const userMessage = `🛑 You have closed the conversation, type /search to start another one.`;
      const partnerMessage = `🛑 Your partner closed the conversation, type /search to start another one.`;

      await Promise.all([
        ctx.reply(userMessage),
        ctx.telegram.sendMessage(partnerId(ctx), partnerMessage),
      ]);

      // Reset chatData
      ctx.chatData = null;
    } catch (err) {
      logger.error(`[CMD]end: ${err}`);
    }
  },

  options: async (ctx) => {
    try {
      await ctx.deleteMessage();

      if (!ctx.chatData) {
        return await ctx.reply(
          `⚠️ You don't have a partner yet, type /search to start a conversation.`
        );
      }

      const partnerShortId = partnerId(ctx)?.toString().substring(0, 7);
      await ctx.reply(
        `💬 #${partnerShortId} Options:`,
        generateInlineKeyboardButton(buttons.options)
      );
    } catch (err) {
      logger.error(`[CMD]options: ${err}`);
    }
  },

  settings: async (ctx) => {
    try {
      await ctx.deleteMessage();
      await ctx.reply(
        "Choose a button:",
        generateInlineKeyboardButton(buttons.menu)
      );
    } catch (err) {
      logger.error(`[CMD]Settings: ${err}`);
    }
  },

  unsend: async (ctx) => {
    try {
      const repliedToMessage = ctx.message.reply_to_message;
      if (repliedToMessage) {
        const messageId = repliedToMessage.message_id + 1;
        await ctx.telegram.deleteMessage(partnerId(ctx), messageId);
        await ctx.reply("✅ Message unsended successfully!");
      } else {
        await ctx.reply(
          "⚠️ No message to unsend. Reply to a message and use /unsend."
        );
      }
    } catch (err) {
      logger.error(`[CMD]unsend: ${err}`);
    }
  },

  edit: async (ctx) => {
    try {
      const repliedToMessage = ctx.message.reply_to_message;
      if (repliedToMessage && repliedToMessage.text) {
        const messageId = repliedToMessage.message_id + 1;

        // ctx.message.text contain "/edit" so we need to remove it
        const messageText = ctx.message.text.replace("/edit", "");

        await ctx.telegram.editMessageText(
          partnerId(ctx),
          messageId,
          null,
          messageText
        );
        await ctx.reply("✅ Message edited successfully!");
      } else {
        await ctx.reply(
          "⚠️ No message to edit. Reply to a message and use /edit."
        );
      }
    } catch (err) {
      logger.error(`[CMD]editMessage: ${err}`);
    }
  },

  // make function for broadcast message to all user
  broadcast: async (ctx) => {
    let countUserSuccess = 0;
    let countUser = 0;
    try {
      // check if user is admin
      const adminId = process.env.TELEGRAM_WHITE_LIST_USER_ID.split(",");
      if (adminId.includes(ctx.from.id.toString())) {
        // get all user
        const users = await prisma.user.findMany();
        // split /broadcast from message
        let message = ctx.message.text.split("/broadcast");
        message.unshift("⚠️ Broadcast Message ⚠️");
        message.push(
          `\n-----------------------\nAnonymous bot. Admin bot tidak akan menyimpan chat, voice, image, video, sticker yang terkirim pada bot ini. Semua pesan terkirim secara end-to-end dan ter-enkripsi oleh Telegram.\n\nFrom admin`
        );
        message = message.join("\n");
        // send message to all user
        await Promise.all(
          users.map(async (user) => {
            try {
              await ctx.telegram.sendMessage(user.telegram_user_id, message);
              countUserSuccess++;
            } catch (err) {
              // logger.error("[CMD]broadcast: ", err);
            }
            countUser++;
          })
        );
        await ctx.reply(
          "✅ Message broadcasted successfully to " +
            countUserSuccess +
            " user" +
            (countUserSuccess > 1 ? "s" : "") +
            " out of " +
            countUser +
            " user" +
            (countUser > 1 ? "s" : "") +
            "!"
        );
      }
    } catch (err) {
      logger.error(`[CMD]brodcast: ${err}`);
    }
  },

  // make function to know the user info right now
  userinfo: async (ctx) => {
    try {
      const adminId = process.env.TELEGRAM_WHITE_LIST_USER_ID.split(",");
      if (adminId.includes(ctx.from.id.toString())) {
        if (ctx.chatData) {
          const partner = await prisma.user.findFirst({
            where: {
              telegram_user_id: partnerId(ctx),
            },
          });
          const message = `info:\n🆔 Telegram ID: ${partner.telegram_user_id}\n👤 Username: ${partner.username}\n👤 First Name: ${partner.first_name}\n🌏 Language: ${partner.language_code}\n📆 Created at:\n${partner.createdAt}\n📆 Updated at:\n${partner.updatedAt}`;
          await ctx.reply(message);
        }
      }
    } catch (err) {
      logger.error(`[CMD]userinfo: ${err}`);
    }
  },

  // make function to know the stats of bot
  stats: async (ctx) => {
    try {
      const start = new Date();
      const adminId = process.env.TELEGRAM_WHITE_LIST_USER_ID.split(",");
      if (adminId.includes(ctx.from.id.toString())) {
        const messageWait = await ctx.reply("📊 Stats: waiting...");
        let countChatActive = await prisma.chat.count({
          where: { status: "ACTIVE" },
        });
        let countUser = await prisma.user.count();
        const date = new Date();
        date.setMinutes(date.getMinutes() - 15);
        const countUserActive = await prisma.user.count({
          where: {
            updatedAt: {
              gte: date,
            },
          },
        });
        await ctx.telegram.deleteMessage(ctx.chat.id, messageWait.message_id);
        const ms = new Date() - start; // ms
        const message = `📊 Stats:\n👤 Total users: ${countUser}\n👤 Total users active: ${countUserActive}\n💬 Total chats active: ${countChatActive}\n\nProcess Time: ${ms}ms`;
        await ctx.reply(message);
      }
    } catch (err) {
      logger.error(`[CMD]stats: ${err}`);
    }
  },

  // help
  help: async (ctx) => {
    try {
      let message = `
      📖 <b><u>${ctx.botInfo.first_name.toUpperCase()} HELP!</u></b> 📖
      \n🔧 /search - Find a partner
      \n🔧 /next - Find a new partner
      \n🔧 /end - End the conversation
      \n🔧 /options - Options for your partner
      \n🔧 /settings - Settings your profile
      \n🔧 /help - Help
      \n<b>UNSEND & EDIT MESSAGE</b>
      <pre>🔧/unsend - Unsend a message\nreply to your message that you want to unsend
      \n🔧/edit - Edit a message\nreply to your message that you want to edit</pre>
      \n <b>FORMAT MESSAGE</b>
      \n 📌 Hide:\n#f | HIDE | \u27A1 <span class="tg-spoiler">HIDE</span>
      \n 📌 Underline:\n#f _UNDERLINE_ \u27A1 <u>UNDERLINE</u>
      \n 📌 Strikethrough:\n#f ~STRIKE~ \u27A1 <s>strikethrough</s>
      \n <b>📖 <u>ABOUT</u></b> 📖
      \nAnonymous bot. Admin bot tidak akan menyimpan chat, voice, image, video, sticker yang terkirim pada bot ini. Semua pesan terkirim secara end-to-end dan ter-enkripsi oleh Telegram.
      \nCreated with ☕ Copyrigth 2023
      `;
      const adminId = process.env.TELEGRAM_WHITE_LIST_USER_ID.split(",");
      if (adminId.includes(ctx.from.id.toString())) {
        message = `
        📖 <b><u>ADMIN PANEL</u></b> 📖
        \n 🔧 /broadcast
        \n 🔧 /userinfo
        \n 🔧 /stats
        \n
        \n📖 <b><u>${ctx.botInfo.first_name.toUpperCase()} HELP!</u></b> 📖
        \n🔧 /search - Find a partner
        \n🔧 /next - Find a new partner
        \n🔧 /end - End the conversation
        \n🔧 /options - Options for your partner
        \n🔧 /settings - Settings your profile
        \n🔧 /help - Help
        \n<b>UNSEND & EDIT MESSAGE</b>
        <pre>🔧/unsend - Unsend a message\nreply to your message that you want to unsend
        \n🔧/edit - Edit a message\nreply to your message that you want to edit</pre>
        \n <b>FORMAT MESSAGE</b>
        \n 📌 Hide:\n#f | HIDE | \u27A1 <span class="tg-spoiler">HIDE</span>
        \n 📌 Underline:\n#f _UNDERLINE_ \u27A1 <u>UNDERLINE</u>
        \n 📌 Strikethrough:\n#f ~STRIKE~ \u27A1 <s>strikethrough</s>
        \n <b>📖 <u>ABOUT</u></b> 📖
        \nAnonymous bot. Admin bot tidak akan menyimpan chat, voice, image, video, sticker yang terkirim pada bot ini. Semua pesan terkirim secara end-to-end dan ter-enkripsi oleh Telegram.
        \nCreated with ☕ Copyrigth 2023
        `;
      }
      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (err) {
      logger.error(`[CMD]help: ${err}`);
    }
  },
};

// command buttons
export const CommandButtons = {
  change_profile: async (ctx) => {
    try {
      await ctx.deleteMessage();
      await ctx.reply(`🔧 Change profile - coming soon`);
    } catch (err) {
      logger.error(`[CMD]change_profile: ${err}`);
    }
  },

  list_friend: async (ctx) => {
    try {
      await ctx.deleteMessage();
      await ctx.reply(`🔧 List friend - coming soon`);
    } catch (err) {
      logger.error(`[CMD]list_friend: ${err}`);
    }
  },

  list_block: async (ctx) => {
    try {
      await ctx.deleteMessage();
      // get block user from db by user id
      const blockUser = await prisma.block.findMany({
        where: {
          user_id: ctx.userData.id,
        },
      });
      // if block user is empty
      if (blockUser.length === 0) {
        await ctx.reply(`⚠️ You don't have a block user yet.`);
      } else {
        // if block user is not empty
        let message = `🔧 List block user:\n`;
        blockUser.map((user) => {
          message += `👤 ${user.user_blocked_id}\n`;
        });
        await ctx.reply(message, generateInlineKeyboardButton(buttons.block));
      }
    } catch (err) {
      logger.error(`[CMD]list_block: ${err}`);
    }
  },

  unblock_all: async (ctx) => {
    try {
      await ctx.deleteMessage();
      // get block user from db by user id
      const blockUser = await prisma.block.findMany({
        where: {
          user_id: ctx.userData.id,
        },
      });
      // if block user is empty
      if (blockUser.length === 0) {
        // if block user is not empty
        await ctx.reply(`⚠️ You don't have a block user yet.`);
      } else {
        // delete all block user
        await prisma.block.deleteMany({
          where: {
            user_id: ctx.userData.id,
          },
        });
        await ctx.reply(`✅ Unblock all user successfully!`);
      }
    } catch (err) {
      logger.error(`[CMD]unblock_all: ${err}`);
    }
  },

  block_user: async (ctx) => {
    try {
      await ctx.deleteMessage();
      // insert partner id to block table
      await prisma.block.create({
        data: {
          user_id: ctx.userData.id,
          user_blocked_id: partnerIdDB(ctx),
        },
      });
      await ctx.reply(`✅ Block user successfully!`);
      Command.end(ctx);
    } catch (err) {
      logger.error(`[CMD]block_user: ${err}`);
    }
  },

  add_friend: async (ctx) => {
    try {
      await ctx.deleteMessage();
      await ctx.reply(`🔧 Add friend - coming soon`);
    } catch (err) {
      logger.error(`[CMD]add_friend: ${err}`);
    }
  },

  send_username: async (ctx) => {
    try {
      await ctx.deleteMessage();

      if (!ctx.userData.username) {
        await ctx.reply(
          "⚠️ You don't have a username yet. Set one by going to Settings > Username."
        );
      } else {
        await ctx.reply("✅ You have sent your username to your partner.");
        const partnerUsername = `💬 Your partner's username: @${ctx.userData.username}`;
        await ctx.telegram.sendMessage(partnerId(ctx), partnerUsername);
      }
    } catch (err) {
      logger.error(`[CMD]send_username: ${err}`);
    }
  },

  cancel: async (ctx) => {
    try {
      await ctx.deleteMessage();
    } catch (err) {
      logger.error(`[CMD]cancel: ${err}`);
    }
  },

  cancelSearch: async (ctx) => {
    try {
      await ctx.deleteMessage();

      // Find the chat
      const chat = await prisma.chat.findFirst({
        where: {
          user_id: ctx.userData.id,
          status: "WAITING",
        },
      });

      if (!chat) {
        // return await ctx.reply(`⚠️ Type /search to start a conversation.`);
        return;
      }

      // Delete the chat
      await prisma.chat.delete({
        where: {
          id: chat.id,
        },
      });

      await ctx.reply(
        `🛑 You have canceled the conversation, type /search to start another one.`
      );
    } catch (err) {
      logger.error(`[CMD]cancelSearch: ${err}`);
    }
  },
};
