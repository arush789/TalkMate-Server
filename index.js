const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const socket = require("socket.io");
const userModel = require("./model/userModel");
const conversationModel = require("./model/conversationModel");
const messageModel = require("./model/messageModel");
const axios = require("axios");

const app = express();
require("dotenv").config();

app.use(cors());
app.use(express.json());

app.use("/api/auth", userRoutes);
app.use("/api/messages", messageRoutes);

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("DB Connection Succesfully");
  })
  .catch((err) => {
    console.log(err.message);
  });

const server = app.listen(process.env.PORT, () => {
  console.log(`Server Started on port ${process.env.PORT}`);
});

const io = socket(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

global.onlineUsers = new Map();
global.activeChats = new Map();

io.on("connection", (socket) => {
  global.chatSocket = socket;

  socket.on("add-user", async (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit("onlineUser", userId);
  });

  socket.on("set-active-chat", async ({ userId, activeChat }) => {
    activeChats.set(userId, activeChat);

    const conversation = await conversationModel
      .findOne({
        participants: { $all: [userId, activeChat] },
      })
      .populate("pendingRead");

    if (!conversation) return;

    const otherUserId = activeChat;

    if (activeChats.has(otherUserId)) {
      conversation.pendingRead = [];
      socket.emit("messageSeen", {
        userId: userId,
        contactId: activeChat,
      });
      await conversation.save();
    }
  });

  socket.on("lastMsg", (data) => {
    socket.broadcast.emit("lastMsgRecieve", data);
  });

  socket.on("send-msg", async (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    const activeChat = activeChats.get(data.to);

    if (sendUserSocket && activeChat === data.from) {
      socket.to(sendUserSocket).emit("msg-recieve", data);
    } else {
      const conversation = await conversationModel.findOne({
        participants: { $all: [data.from, data.to] },
      });

      if (!conversation.pendingRead) {
        conversation.pendingRead = [];
      }

      const newPendingRead = {
        message: data.message || data.image || data.gif,
        sender: data.from,
      };

      conversation.pendingRead.push(newPendingRead);

      await conversation.save();
    }
  });

  socket.on("delete-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    const activeChat = activeChats.get(data.to);

    if (sendUserSocket && activeChat === data.from) {
      socket.to(sendUserSocket).emit("msg-deleted", data);
    }
  });
});
