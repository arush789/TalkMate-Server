const {
  register,
  login,
  setAvatar,
  getAllUsers,
  sendRequest,
  getRequests,
  acceptRequest,
  getFriends,
  rejectRequest,
} = require("../controllers/userControllers");

const router = require("express").Router();

router.post("/Register", register);
router.post("/Login", login);
router.get("/getFriends/:id", getFriends);
router.post("/sendRequest/", sendRequest);
router.get("/getRequest", getRequests);
router.post("/acceptRequest", acceptRequest);
router.post("/rejectRequest", rejectRequest);
router.post("/setAvatar/:id", setAvatar);
router.get("/allusers/:id", getAllUsers);

module.exports = router;
