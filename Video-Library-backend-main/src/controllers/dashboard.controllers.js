import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const channelId = req.query.channelId || req.user._id;
  if (!mongoose.isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }
  const [videoStats] = await Video.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
    {
      $group: {
        _id: null,
        totalVideos: { $sum: 1 },
        totalViews: { $sum: "$views" }, // Assuming `views` field exists
      },
    },
  ]);

  const totalLikes = await Like.countDocuments({
    video: {
      $in: await Video.find({
        owner: new mongoose.Types.ObjectId(channelId),
      }).distinct("_id"),
    },
  });
  const totalSubscribers = await Subscription.countDocuments({
    channel: new mongoose.Types.ObjectId(channelId),
  });
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalVideos: videoStats?.totalVideos || 0,
        totalViews: videoStats?.totalViews || 0,
        totalLikes,
        totalSubscribers,
      },
      "Channel stats fetched successfully"
    )
  );
});
// TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

const getChannelVideos = asyncHandler(async (req, res) => {
  const { channelId } = req.query || req.user._id;
  if (!mongoose.isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }
  const channelVideos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    {
      $unwind: "$ownerDetails",
    },
    {
      $project: {
        title: 1,
        duration: 1,
        views: 1,
        videofile: 1,
        thumbnail: 1,
        owner: {
          fullname: "$ownerDetails.fullname",
          username: "$ownerDetails.username",
          avatar: "$ownerDetails.avatar",
        },
      },
    },
  ]);
  if (!channelVideos || channelVideos.length === 0) {
    throw new ApiError(404, "No videos found for this channel");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channelVideos, "Videos fetched successfully"));
  // TODO: Get all the videos uploaded by the channel
});

export { getChannelStats, getChannelVideos };
