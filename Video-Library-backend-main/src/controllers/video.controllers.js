import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Like } from "../models/like.models.js";
import {
  deleteFromCloudinary,
  getCloudinaryPublicId,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import mongoose from "mongoose";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  const videos = await Video.aggregate([
    {
      $match: {
        $or: [
          {
            title: { $regex: query, $options: "i" },
          },
          {
            description: { $regex: query, $options: "i" },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "video_owner",
      },
    },
    {
      $unwind: "$video_owner",
    },
    {
      $project: {
        thumbnail: 1,
        videofile: 1,
        title: 1,
        description: 1,
        duration: 1,
        _id: 1,
        "video_owner.fullname": 1,
        "video_owner.username": 1,
        "video_owner.avatar": 1,
      },
    },
    {
      $sort: {
        [sortBy]: sortType == "asc" ? 1 : -1,
      },
    },
    {
      $skip: (parseInt(page) - 1) * parseInt(limit),
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  console.log(videos);
  return res
    .status(200)
    .json(new ApiResponse(200, videos, "videos fetched successfully"));
  //TODO: get all videos based on query, sort, pagination
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) {
    throw new ApiError(401, "Title and Description is required");
  }
  const videoLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoLocalPath) {
    throw new ApiError(401, " video not found");
  }
  if (!thumbnailLocalPath) {
    throw new ApiError(401, "thumbnail not found");
  }

  const videofile = await uploadOnCloudinary(videoLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videofile) {
    throw new ApiError(500, "something went wrong while uploading video file");
  }
  if (!thumbnail) {
    throw new ApiError(500, "something went wrong while uploading thumbnail");
  }

  //   console.log(videofile);
  const video = await Video.create({
    title,
    description,
    videofile: videofile.url,
    thumbnail: thumbnail.url,
    isPublished: true,
    owner: await User.findById(req.user._id).select("-password -refreshToken"),
    duration: videofile.duration,
  });

  console.log(video);

  if (!video) {
    throw new ApiError(500, "something went wrong while creating video");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video published succesfully"));
  // TODO: get video, upload to cloudinary, create video
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const viewerId = req.user?._id;
  if (!videoId) {
    throw new ApiError(404, "videoId not found");
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "VideoId is invalid");
  }

  const video = await Video.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(videoId) },
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
      $addFields: {
        "ownerDetails.password": "$$REMOVE", // remove sensitive fields
      },
    },
  ]);

  if (!video || !video[0]) {
    throw new ApiError(404, "Video not found");
  }

  const isSubscribed = await Subscription.exists({
    channel: new mongoose.Types.ObjectId(video[0].ownerDetails._id),
    subscriber: new mongoose.Types.ObjectId(viewerId),
  });
  const isLiked = await Like.exists({
    likedBy: new mongoose.Types.ObjectId(viewerId),
    video: new mongoose.Types.ObjectId(videoId),
  });

  video[0].isLiked = !!isLiked;
  await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { watchhistory: videoId },
  });
  video[0].isSubscribed = !!isSubscribed;
  // console.log(video[0]);

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "video fetched successfully"));
  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  if (!videoId) {
    throw new ApiError(404, "VideoId not found!");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(401, "VideoId is not valid");
  }

  const video = await Video.findById(videoId);
  if (video == null) {
    throw new ApiError(404, "Video not found");
  }

  let thumbnailUrl = video.thumbnail;

  if (req.file?.path) {
    const uploadedThumb = await uploadOnCloudinary(req.file.path);
    if (!uploadedThumb) {
      throw new ApiError(500, "Failed to upload new thumbnail");
    }

    await deleteFromCloudinary(getCloudinaryPublicId(video.thumbnail));
    thumbnailUrl = uploadedThumb.url;
  }

  // const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  // if (!thumbnail) {
  //   throw new ApiError(
  //     500,
  //     "something went wrong while uploading file on cloudinary"
  //   );
  // }
  // const oldThumbnail = video.thumbnail;

  // await deleteFromCloudinary(getCloudinaryPublicId(oldThumbnail));

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      title: title === "" ? video.title : title,
      description: description === "" ? video.description : description,
      thumbnail: thumbnailUrl,
    },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "video details upddated successfully")
    );

  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(404, "VideoId not found!");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(401, "VideoId is not valid");
  }

  const deletedVideo = await Video.findByIdAndDelete(videoId);
  if (!deletedVideo) {
    throw new ApiError(404, "Video not found");
  }

  await deleteFromCloudinary(deletedVideo.videofile);
  await deleteFromCloudinary(deletedVideo.thumbnail);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(404, "VideoId not found!");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(401, "VideoId is not valid");
  }

  const video = await Video.findById(videoId);

  video.isPublished = !video.isPublished;

  const updatedVideo = await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedVideo,
        "video publish status successfully toggled"
      )
    );
});

const getVideosByChannel = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const user = await User.findOne({ username });
  if (!user) throw new ApiError(404, "Channel not found");

  const videos = await Video.find({ owner: user._id });
  console.log(videos);

  return res.status(200).json(new ApiResponse(200, videos, "Videos fetched"));
});
export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  getVideosByChannel,
};
