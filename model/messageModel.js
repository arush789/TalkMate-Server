const mongoose = require("mongoose");

const messagesSchema = new mongoose.Schema(
  {
    message: {
      text: {
        type: String,
        required: false,
      },
    },
    images: {
      type: String,
      default: "",
    },
    users: Array,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Messages", messagesSchema);
