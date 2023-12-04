import { prisma, userRegisterOrUpdate, findUserByIdDB } from "./db.js";
import {
  generateInlineButton,
  generateInlineKeyboardButton,
  partnerId,
} from "./helper.js";

const buttons = {
  menu: [
    [
      {
        text: "Daftar blokir",
        callback_data: "list_block",
      },
      {
        text: "Daftar teman",
        callback_data: "list_friend",
      },
    ],
    [
      {
        text: "Ubah profile",
        callback_data: "change_profile",
      },
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
      {
        text: "Add friends",
        callback_data: "add_friend",
      },
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
      console.log("[CMD]start: ", err.message);
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
      await ctx.reply(
        `🚀 Start looking for a partner for you... \n\nTotal chats active: ${countChatActive} \nTotal users active: ${countUser}`,
        generateInlineKeyboardButton(buttons.cancelSearch)
      );

      await userRegisterOrUpdate(ctx);

      let chat;

      // Check for a chat with status waiting and not the same user id
      chat = await prisma.chat.findFirst({
        where: {
          status: "WAITING",
          user_id: { not: ctx.userData.id },
        },
      });

      if (chat) {
        // Update chat status to active
        await prisma.chat.update({
          where: { id: chat.id },
          data: { partner_id: ctx.userData.id, status: "ACTIVE" },
        });

        const partner = await findUserByIdDB(chat.user_id);

        // Batch delete messages
        await Promise.all([
          ctx.telegram.deleteMessage(
            ctx.message.from.id,
            ctx.message.message_id + 1
          ),
          ctx.telegram.deleteMessage(
            partner.telegram_user_id,
            ctx.message.message_id - 1
          ),
        ]);

        // Send messages to user and partner
        const userMessage = `✨ It's a match! ✨ \n 💬 #${partner.telegram_user_id.slice(
          0,
          -3
        )}`;
        const partnerMessage = `✨ It's a match! ✨ \n 💬 #${ctx.userData.telegram_user_id.slice(
          0,
          -3
        )}`;

        await Promise.all([
          ctx.reply(userMessage),
          ctx.telegram.sendMessage(partner.telegram_user_id, partnerMessage),
        ]);
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
      console.error("[CMD]search: ", err.message);
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
      await ctx.reply(
        `🚀 Start looking for a partner for you... \n
        Total chat active: ${countChatActive} \n
        Total user: ${countUser}`,
        generateInlineKeyboardButton(buttons.cancel)
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

      if (chat) {
        // Update chat status to active
        await prisma.chat.update({
          where: { id: chat.id },
          data: { partner_id: ctx.userData.id, status: "ACTIVE" },
        });

        const partner = await findUserByIdDB(chat.user_id);

        // Delete the current message
        await Promise.all([
          ctx.telegram.deleteMessage(
            ctx.message.from.id,
            ctx.message.message_id + 1
          ),
          ctx.telegram.deleteMessage(
            partner.telegram_user_id,
            ctx.message.message_id - 1
          ),
        ]);

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
      console.log("[CMD]next: ", err.message);
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
      console.log("[CMD]end: ", err.message);
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
      console.log("[CMD]options: ", err.message);
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
      console.log("[CMD]Settings: ", err.message);
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
      console.log("[CMD]unsend: ", err.message);
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
      console.log("[CMD]editMessage: ", err.message);
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
      console.log("[CMD]change_profile: ", err.message);
    }
  },

  list_friend: async (ctx) => {
    try {
      await ctx.deleteMessage();
      await ctx.reply(`🔧 List friend - coming soon`);
    } catch (err) {
      console.log("[CMD]list_friend: ", err.message);
    }
  },

  list_block: async (ctx) => {
    try {
      await ctx.deleteMessage();
      await ctx.reply(`🔧 List block - coming soon`);
    } catch (err) {
      console.log("[CMD]list_block: ", err.message);
    }
  },

  block_user: async (ctx) => {
    try {
      await ctx.reply(`🔧 Block user - coming soon`);
      await ctx.deleteMessage();
    } catch (err) {
      console.log("[CMD]block_user: ", err.message);
    }
  },

  add_friend: async (ctx) => {
    try {
      await ctx.deleteMessage();
      await ctx.reply(`🔧 Add friend - coming soon`);
    } catch (err) {
      console.log("[CMD]add_friend: ", err.message);
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
      console.log("[CMD]send_username: ", err.message);
    }
  },

  cancel: async (ctx) => {
    try {
      await ctx.deleteMessage();
    } catch (err) {
      console.log("[CMD]cancel: ", err.message);
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
        return await ctx.reply(`⚠️ Type /search to start a conversation.`);
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
      console.log("[CMD]cancelSearch: ", err.message);
    }
  },

  help: async (ctx) => {
    try {
      await ctx.deleteMessage();
      await ctx.reply(`🔧 Help - coming soon`);
    } catch (err) {
      console.log("[CMD]help: ", err.message);
    }
  },
};
