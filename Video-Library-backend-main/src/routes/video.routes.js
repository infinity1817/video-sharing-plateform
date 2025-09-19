import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  publishAVideo,
  getAllVideos,
  getVideoById,
  deleteVideo,
  updateVideo,
  togglePublishStatus,
  getVideosByChannel,
} from "../controllers/video.controllers.js";
const router = Router();
router.use(verifyJWT);
router
  .route("/")
  .get(getAllVideos)
  .post(
    upload.fields([
      {
        name: "videoFile",
        maxCount: 1,
      },
      {
        name: "thumbnail",
        maxCount: 1,
      },
    ]),
    publishAVideo
  );

router
  .route("/:videoId")
  .get(getVideoById)
  .delete(deleteVideo)
  .patch(upload.single("thumbnail"), updateVideo);

router.route("/channel/:username").get(getVideosByChannel);

router.route("/toggle/publish/:videoId").patch(togglePublishStatus);

export { router };
