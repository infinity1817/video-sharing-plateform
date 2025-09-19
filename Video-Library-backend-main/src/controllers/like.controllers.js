import mongoose from "mongoose";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }
  const userId = req.user._id;
  const existingLike = await Like.findOne({
    likedBy: new mongoose.Types.ObjectId(userId),
    video: new mongoose.Types.ObjectId(videoId),
  });

  if (existingLike) {
    const deletedLike = await Like.findByIdAndDelete(existingLike._id);
    if (!deletedLike) {
      throw new ApiError(500, "something went wrong while toggling like");
    }
  } else {
    const newLike = await Like.create({
      likedBy: new mongoose.Types.ObjectId(userId),
      video: new mongoose.Types.ObjectId(videoId),
    });
    if (!newLike) {
      throw new ApiError(500, "something went wrong while toggling like");
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Like toggled successfully!"));

  //TODO: toggle like on video
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID format");
  }
  const userId = req.user._id;
  const existingLike = await Like.findOne({
    likedBy: new mongoose.Types.ObjectId(userId),
    comment: new mongoose.Types.ObjectId(commentId),
  });

  if (existingLike) {
    const deletedLike = await Like.findByIdAndDelete(existingLike._id);
    if (!deletedLike) {
      throw new ApiError(500, "something went wrong while toggling like");
    }
  } else {
    const newLike = await Like.create({
      likedBy: new mongoose.Types.ObjectId(userId),
      comment: new mongoose.Types.ObjectId(commentId),
    });
    if (!newLike) {
      throw new ApiError(500, "something went wrong while toggling like");
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Like toggled successfully!"));

  //TODO: toggle like on comment
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!mongoose.isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID format");
  }
  const userId = req.user._id;
  const existingLike = await Like.findOne({
    likedBy: new mongoose.Types.ObjectId(userId),
    tweet: new mongoose.Types.ObjectId(tweetId),
  });

  if (existingLike) {
    const deletedLike = await Like.findByIdAndDelete(existingLike._id);
    if (!deletedLike) {
      throw new ApiError(500, "something went wrong while toggling like");
    }
  } else {
    const newLike = await Like.create({
      likedBy: new mongoose.Types.ObjectId(userId),
      tweet: new mongoose.Types.ObjectId(tweetId),
    });
    if (!newLike) {
      throw new ApiError(500, "something went wrong while toggling like");
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Like toggled successfully!"));

  //TODO: toggle like on tweet
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const userObjectId = new mongoose.Types.ObjectId(req.user._id);
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: userObjectId,
        video: { $exists: true },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideo",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerDetails",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$likedVideo.ownerDetails",
        },
      },
    },
    {
      $project: {
        likedVideo: {
          $map: {
            input: "$likedVideo",
            as: "video",
            in: {
              title: "$$video.title",
              thumbnail: "$$video.thumbnail",
              duration: "$$video.duration",
              videofile: "$$video.videofile",
              owner: "$owner",
            },
          },
        },
      },
    },
  ]);
  if (!likedVideos || likedVideos.length === 0) {
    return res
      .status(404)
      .json(new ApiResponse(404, {}, "No liked videos found"));
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos[0], "Liked videos fetched successfully!")
    );
  //TODO: get all liked videos
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
