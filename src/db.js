import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const createUser = async (ctx) => {
  try {
    const user = await prisma.user.create({
      data: {
        telegram_user_id: ctx.from.id.toString(),
        first_name: ctx.from.first_name || null,
        username: ctx.from.username || null,
        language: ctx.from.language_code,
      },
    });
    return user;
  } catch (err) {
    console.log("[DB]createUser: ", err.message);
  }
};

export const updateUser = async (id, ctx) => {
  try {
    const user = await prisma.user.update({
      where: {
        telegram_user_id: id.toString(),
      },
      data: {
        telegram_user_id: ctx.from.id.toString(),
        first_name: ctx.from.first_name || null,
        username: ctx.from.username || null,
        language: ctx.from.language_code,
      },
    });
    return user;
  } catch (err) {
    console.log("[DB]updateUser: ", err.message);
  }
};

export const findUser = async (id) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        telegram_user_id: id.toString(),
      },
    });
    return user;
  } catch (err) {
    console.log("[DB]findUser: ", err.message);
  }
};

export const findUserByIdDB = async (id) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: id,
      },
    });
    return user;
  } catch (err) {
    console.log("[DB]findUserByIdDB: ", err.message);
  }
};

export const userRegisterOrUpdate = async (ctx) => {
  try {
    await prisma.$transaction(async (prisma) => {
      let userExist = await findUser(ctx.from.id);
      if (!userExist) {
        await createUser(ctx);
      } else {
        await updateUser(ctx.from.id, ctx);
        userExist = await findUser(ctx.from.id);
      }
      ctx.userData = userExist;
    });
  } catch (err) {
    console.log("[DB]userRegisterOrUpdate: ", err.message);
    return null;
  }
};

export const findChatActive = async (userId) => {
  try {
    const chat = await prisma.chat.findFirst({
      where: {
        OR: [{ user_id: userId }, { partner_id: userId }],
        status: "ACTIVE",
      },
      include: {
        user: true,
        partner: true,
      },
    });
    return chat;
  } catch (err) {
    console.log("[DB]findChat: ", err.message);
  }
};
