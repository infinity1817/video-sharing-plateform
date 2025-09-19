import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {
  changeUserPassword,
  getCurrentUser,
  getUserChannel,
  getWatchHistory,
  refreshAccessToken,
  registerUser,
  updateUserAvatar,
  updateUserCoverImage,
  updateUserDetails,
  userLogin,
  userLogout,
} from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
router.route("/login").post(userLogin);

// Secured Routes
router.route("/logout").post(verifyJWT, userLogout);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/update-password").post(verifyJWT, changeUserPassword);
router.route("/get-user").get(verifyJWT, getCurrentUser);
router.route("/update-details").patch(verifyJWT, updateUserDetails);
router
  .route("/update-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router
  .route("/update-cover")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
router.route("/channel/:username").get(verifyJWT, getUserChannel);
router.route("/history").get(verifyJWT, getWatchHistory);

export { router };
