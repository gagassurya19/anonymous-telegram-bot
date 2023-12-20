import logger from './logger.js';

export const generateInlineButton = (buttons) => {
  return {
    reply_markup: {
      keyboard: buttons,
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };
};

export const generateInlineKeyboardButton = (buttons) => {
  return {
    reply_markup: {
      inline_keyboard: buttons,
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };
};

export const sendMessageToPartner = async (ctx, message, options = {}) => {
  try {
    await ctx.telegram.sendMessage(
      ctx.chatData.partner.telegram_user_id,
      message,
      options
    );
  } catch (err) {
    logger.error(`[BOT]sendMessageToPartner: ${err}`);
  }
};

export const sendMessageToUser = async (ctx, message) => {
  try {
    await ctx.reply(message, options);
  } catch (err) {
    logger.error(`[BOT]sendMessageToUser: ${err}`);
  }
};

// get partner id
export const partnerId = (ctx) => {
  try {
    const id =
      ctx?.userData?.id == ctx?.chatData?.user_id
        ? ctx?.chatData?.partner?.telegram_user_id
        : ctx?.chatData?.user?.telegram_user_id;

    return id;
  } catch (err) {
    logger.error(`[HELPER]partnerId: ${err}`);
  }
};

export const dateNow = () => {
  // date is like: 2021-07-04 12:00:00
  let date = new Date();
  date = date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  date = date.split(", ");
  date = date[0].split("/");
  date = `${date[2]}-${date[0]}-${date[1]}`;
  date = `${date} ${new Date().toLocaleTimeString("en-US", {
    timeZone: "Asia/Jakarta",
  })}`;
  return date;
};
