import logger from './logger.js';

export const textMessage = async (ctx, userId) => {
  try {
    if (ctx.message.reply_to_message) {
      await ctx.telegram.sendMessage(userId, ctx.message.text, {
        reply_to_message_id: ctx.message.reply_to_message.message_id - 1,
      });
    } else {
      await ctx.telegram.sendMessage(userId, ctx.message.text);
    }
  } catch (err) {
    logger.error(`[MESSAGE]textMessage: ${err}`);
  }
};

export const stickerMessage = async (ctx, userId) => {
  try {
    if (ctx.message.reply_to_message) {
      await ctx.telegram.sendSticker(userId, ctx.message.sticker.file_id, {
        reply_to_message_id: ctx.message.reply_to_message.message_id - 1,
      });
    } else {
      await ctx.telegram.sendSticker(userId, ctx.message.sticker.file_id);
    }
  } catch (err) {
    logger.error(`[MESSAGE]stickerMessage: ${err}`);
  }
};

export const voiceMessage = async (ctx, userId) => {
  try {
    if (ctx.message.reply_to_message) {
      await ctx.telegram.sendVoice(userId, ctx.message.voice.file_id, {
        reply_to_message_id: ctx.message.reply_to_message.message_id - 1,
        protect_content: true,
      });
    } else {
      await ctx.telegram.sendVoice(userId, ctx.message.voice.file_id, {
        protect_content: true,
      });
    }
  } catch (err) {
    logger.error(`[MESSAGE]voiceMessage: ${err}`);
  }
};

export const photoMessage = async (ctx, userId) => {
  try {
    if (ctx.message.reply_to_message) {
      await ctx.telegram.sendPhoto(userId, ctx.message.photo[0].file_id, {
        reply_to_message_id: ctx.message.reply_to_message.message_id - 1,
        protect_content: true,
      });
    } else {
      await ctx.telegram.sendPhoto(userId, ctx.message.photo[0].file_id, {
        caption: ctx.message.caption ? ctx.message.caption : null,
        protect_content: true,
      });
    }
  } catch (err) {
    logger.error(`[MESSAGE]photoMessage: ${err}`);
  }
};

export const videoMessage = async (ctx, userId) => {
  try {
    if (ctx.message.reply_to_message) {
      await ctx.telegram.sendVideo(userId, ctx.message.video.file_id, {
        reply_to_message_id: ctx.message.reply_to_message.message_id - 1,
        protect_content: true,
      });
    } else {
      await ctx.telegram.sendVideo(userId, ctx.message.video.file_id, {
        caption: ctx.message.caption ? ctx.message.caption : null,
        protect_content: true,
      });
    }
  } catch (err) {
    logger.error(`[MESSAGE]videoMessage: ${err}`);
  }
};

export const documentMessage = async (ctx, userId) => {
  try {
    if (ctx.message.reply_to_message) {
      await ctx.telegram.sendDocument(userId, ctx.message.document.file_id, {
        reply_to_message_id: ctx.message.reply_to_message.message_id - 1,
        protect_content: true,
      });
    } else {
      await ctx.telegram.sendDocument(userId, ctx.message.document.file_id, {
        caption: ctx.message.caption ? ctx.message.caption : null,
        protect_content: true,
      });
    }
  } catch (err) {
    logger.error(`[MESSAGE]documentMessage: ${err}`);
  }
};

export const animationMessage = async (ctx, userId) => {
  try {
    if (ctx.message.reply_to_message) {
      await ctx.telegram.sendAnimation(userId, ctx.message.animation.file_id, {
        reply_to_message_id: ctx.message.reply_to_message.message_id - 1,
        protect_content: true,
      });
    } else {
      await ctx.telegram.sendAnimation(userId, ctx.message.animation.file_id, {
        caption: ctx.message.caption ? ctx.message.caption : null,
        protect_content: true,
      });
    }
  } catch (err) {
    logger.error(`[MESSAGE]animationMessage: ${err}`);
  }
};

export const locationMessage = async (ctx, userId) => {
  try {
    if (ctx.message.reply_to_message) {
      await ctx.telegram.sendLocation(
        userId,
        ctx.message.location.latitude,
        ctx.message.location.longitude,
        {
          reply_to_message_id: ctx.message.reply_to_message.message_id - 1,
          protect_content: true,
        }
      );
    } else {
      await ctx.telegram.sendLocation(
        userId,
        ctx.message.location.latitude,
        ctx.message.location.longitude,
        {
          caption: ctx.message.caption ? ctx.message.caption : null,
          protect_content: true,
        }
      );
      await ctx.telegram.sendMessage(
        userId,
        ctx.message.venue.title + "\n" + ctx.message.venue.address,
        {
          caption: ctx.message.caption ? ctx.message.caption : null,
          protect_content: true,
        }
      );
    }
  } catch (err) {
    logger.error(`[MESSAGE]locationMessage: ${err}`);
  }
};
