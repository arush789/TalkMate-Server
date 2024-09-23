const messageModel = require("../model/messageModel");

module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, messages, image } = req.body;

    if (!from || !to || (!messages && !image)) {
      return res.status(400).json({ msg: "Invalid input data" });
    }

    const messageObject = {
      message: { text: messages || "" },
      users: [from, to],
      sender: from,
    };

    if (image) {
      messageObject.images = image;
    }

    const data = await messageModel.create(messageObject);

    if (data) return res.json({ msg: "Message added successfully" });

    return res
      .status(500)
      .json({ msg: "Failed to add message to the database" });
  } catch (error) {
    console.error("Error in addMessage:", error);
    return res
      .status(500)
      .json({ msg: "Failed to add message", error: error.message });
  }
};

module.exports.getAllMessage = async (req, res, next) => {
  try {
    const { from, to } = req.body;
    const messages = await messageModel
      .find({
        users: {
          $all: [from, to],
        },
      })
      .sort({ updateAt: 1 });
    const projectedMessages = messages.map((msg) => {
      return {
        fromSelf: msg.sender.toString() === from,
        message: msg.message.text,
        image: msg.images,
      };
    });
    return res.json(projectedMessages);
  } catch (error) {
    next(error);
  }
};
