const conversationModel = require("../model/conversationModel");

module.exports.getConversations = async (req, res, next) => {
  try {
    const { userId } = req.body;

    const conversations = await conversationModel
      .find({
        participants: userId,
      })
      .populate("messages")
      .populate("participants");

    res.json(conversations);
  } catch (error) {
    next(error);
  }
};
