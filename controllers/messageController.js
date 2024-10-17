const conversationModel = require("../model/conversationModel");
const messageModel = require("../model/messageModel");

module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, messages, image, messageId, gif } = req.body;

    let conversation = await conversationModel.findOne({
      participants: { $all: [from, to] },
    });

    if (!conversation) {
      conversation = await conversationModel.create({
        participants: [from, to],
      });
    }

    const newMessage = await messageModel.create({
      conversationId: conversation._id,
      sender: from,
      message: { text: messages || "" },
      images: image || "",
      gifs: gif || "",
      messageId,
    });

    conversation.messages.push(newMessage._id);
    conversation.lastMessage = newMessage._id;

    await conversation.save();

    res.json({ msg: "Message added successfully", newMessage });
  } catch (error) {
    next(error);
  }
};

module.exports.getAllMessage = async (req, res, next) => {
  try {
    const { from, to } = req.body;

    const conversation = await conversationModel
      .findOne({
        participants: { $all: [from, to] },
      })
      .populate("messages")
      .populate("lastMessage")
      .populate("pendingRead");

    if (!conversation) {
      return res.json([]);
    }

    const projectedMessages = conversation.messages.map((msg) => ({
      fromSelf: msg.sender.toString() === from,
      message: msg.message.text,
      image: msg.images,
      gif: msg.gifs,
      id: msg.messageId,
      time: msg.createdAt,
    }));

    res.json({
      messages: projectedMessages,
      lastMessage: conversation.lastMessage
        ? {
            fromSelf: conversation.lastMessage.sender.toString() === from,
            message: conversation.lastMessage.message.text,
            image: conversation.lastMessage.images,
            gif: conversation.lastMessage.gifs,
            id: conversation.lastMessage.messageId,
            time: conversation.lastMessage.createdAt,
          }
        : null,
      pendingRead: conversation.pendingRead.messageNum || 0,
    });
  } catch (error) {
    next(error);
  }
};

module.exports.deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.body;

    const message = await messageModel.findOne({ messageId });

    if (!message) {
      return res.status(404).json({ msg: "Message not found" });
    }

    const conversation = await conversationModel.findById(
      message.conversationId
    );

    if (!conversation) {
      return res.status(404).json({ msg: "Conversation not found" });
    }

    conversation.messages = conversation.messages.filter(
      (msgId) => msgId.toString() !== message._id.toString()
    );

    if (conversation.lastMessage.toString() === message._id.toString()) {
      conversation.lastMessage = conversation.messages.length
        ? conversation.messages[conversation.messages.length - 1]
        : null;
    }

    await conversation.save();

    await messageModel.findOneAndDelete({ messageId });

    return res.json({ msg: "Message deleted successfully" });
  } catch (error) {
    next(error);
  }
};
