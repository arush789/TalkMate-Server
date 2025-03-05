const mongoose = require("mongoose");

const friendsReqSchema = new mongoose.Schema(
  {
    sender: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
      },
      username: {
        type: String,
        required: true,
      },
    },
    receiver: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
      },
      username: {
        type: String,
        required: true,
      },
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("FriendsReq", friendsReqSchema);
