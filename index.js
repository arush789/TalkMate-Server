const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const socket = require("socket.io");
const userModel = require("./model/userModel");

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
    await userModel.findByIdAndUpdate(userId, { status: true });
    io.emit("onlineUser", userId);
  });

  socket.on("disconnect", async () => {
    const userId = [...onlineUsers.entries()].find(
      ([key, value]) => value === socket.id
    )?.[0];
    if (userId) {
      onlineUsers.delete(userId);
      await userModel.findByIdAndUpdate(userId, { status: false });
      io.emit("offlineUser", userId);
      console.log("user disconnected", socket.id, userId);
    }
  });

  socket.on("set-active-chat", ({ userId, activeChat }) => {
    activeChats.set(userId, activeChat);
  });

  socket.on("send-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    const activeChat = activeChats.get(data.to);

    if (sendUserSocket && activeChat === data.from) {
      socket.to(sendUserSocket).emit("msg-recieve", data);
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
