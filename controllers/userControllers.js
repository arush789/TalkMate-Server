const friendRequestModel = require("../model/friendRequestModel");
const User = require("../model/userModel");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const userModel = require("../model/userModel");

module.exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const usernameCheck = await User.findOne({ username });
    if (usernameCheck)
      return res.json({ msg: "Username already used", status: false });
    const emailCheck = await User.findOne({ email });
    if (emailCheck)
      return res.json({ msg: "Email already used", status: false });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      username,
      password: hashedPassword,
    });
    delete user.password;
    return res.json({ status: true, user });
  } catch (error) {
    next(error);
  }
};

module.exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user)
      return res.json({ msg: "Incorrect username or password", status: false });
    const passwordIsValid = await bcrypt.compare(password, user.password);
    if (!passwordIsValid)
      return res.json({
        msg: "Incorrect username or password",
        status: false,
      });
    delete user.password;
    return res.json({ status: true, user });
  } catch (error) {
    next(error);
  }
};

module.exports.setAvatar = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const avatarImage = req.body.image;
    const userData = await User.findByIdAndUpdate(userId, {
      isAvatarImageSet: true,
      avatarImage,
    });
    return res.json({
      isSet: userData.isAvatarImageSet,
      image: userData.avatarImage,
    });
  } catch (error) {
    next(error);
  }
};

module.exports.sendRequest = async (req, res, next) => {
  try {
    const { from, to, senderName, receiverName } = req.body;

    const existingRequest = await friendRequestModel.findOne({
      $or: [
        {
          "sender.id": from,
          "receiver.id": to,
        },
        {
          "sender.id": to,
          "receiver.id": from,
        },
      ],
    });

    if (existingRequest) {
      return res.status(400).json({
        msg: "Friend request already exists between these users.",
        status: false,
      });
    }

    const friendRequest = await friendRequestModel.create({
      sender: {
        id: from,
        username: senderName,
      },
      receiver: {
        id: to,
        username: receiverName,
      },
      status: "pending",
    });

    return res.status(200).json({
      msg: "Friend request sent successfully.",
      status: true,
      request: friendRequest,
    });
  } catch (error) {
    console.error("Error sending friend request:", error);
    next(error);
  }
};

module.exports.getRequests = async (req, res, next) => {
  try {
    const { from } = req.query;

    if (!mongoose.Types.ObjectId.isValid(from)) {
      return res.status(400).json({
        msg: "Invalid user ID. It must be a 24-character hex string.",
        status: false,
      });
    }

    const fromObjectId = new mongoose.Types.ObjectId(from);

    const requests = await friendRequestModel.find({
      $or: [{ "sender.id": fromObjectId }, { "receiver.id": fromObjectId }],
    });

    if (requests.length === 0) {
      return res.status(404).json({
        msg: "No friend requests found for this user.",
        status: false,
      });
    }

    return res.status(200).json({
      msg: "Friend requests found successfully.",
      status: true,
      requests,
    });
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    return res.status(500).json({
      msg: "Internal server error.",
      status: false,
    });
    next(error);
  }
};

module.exports.acceptRequest = async (req, res, next) => {
  try {
    const { from, to } = req.body;

    const fromObjectId = new mongoose.Types.ObjectId(from);
    const toObjectId = new mongoose.Types.ObjectId(to);

    const friendRequest = await friendRequestModel.findOneAndDelete({
      $or: [{ "sender.id": fromObjectId }, { "receiver.id": toObjectId }],
    });

    if (!friendRequest) {
      return res.status(404).json({
        msg: "Friend request not found.",
        status: false,
      });
    }

    await userModel.findByIdAndUpdate(from, {
      $addToSet: { friends: to },
    });

    await userModel.findByIdAndUpdate(to, {
      $addToSet: { friends: from },
    });

    return res.status(200).json({
      msg: "Friend request accepted successfully.",
      status: true,
    });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return res.status(500).json({
      msg: "Internal server error.",
      status: false,
    });
  }
};

module.exports.rejectRequest = async (req, res, next) => {
  try {
    const { from, to } = req.body;

    const fromObjectId = new mongoose.Types.ObjectId(from);
    const toObjectId = new mongoose.Types.ObjectId(to);

    const friendRequest = await friendRequestModel.findOneAndDelete({
      $or: [{ "sender.id": fromObjectId }, { "receiver.id": toObjectId }],
    });

    if (!friendRequest) {
      return res.status(404).json({
        msg: "Friend request not found.",
        status: false,
      });
    }

    return res.status(200).json({
      msg: "Friend request rejected successfully.",
      status: true,
    });
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    return res.status(500).json({
      msg: "Internal server error.",
      status: false,
    });
  }
};

module.exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ _id: { $ne: req.params.id } }).select([
      "email",
      "username",
      "avatarImage",
      "friends",
      "requests",
      "_id",
    ]);
    return res.json(users);
  } catch (error) {
    next(error);
  }
};

module.exports.getFriends = async (req, res, next) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).populate("friends", [
      "username",
      "avatarImage",
      "_id",
    ]);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    return res.json(user.friends);
  } catch (error) {
    console.error("Error fetching friends:", error);
    return res.status(500).json({ msg: "Internal server error" });
    next(error);
  }
};
