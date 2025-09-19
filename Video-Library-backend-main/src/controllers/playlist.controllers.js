import mongoose from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name || !description) {
    throw new ApiError(404, "These are required fields");
  }
  const existingPlaylist = await Playlist.findOne({
    title: name,
    owner: req.user._id,
  });
  if (existingPlaylist) {
    throw new ApiError(409, "Playlist with this name already exists");
  }
  const playlist = await Playlist.create({
    title: name,
    description,
    owner: req.user._id,
  });

  if (!playlist) {
    throw new ApiError(500, "something went wrong while creating playlist");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist created successfully!"));
  //TODO: create playlist
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user Id");
  }
  const userPlaylists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "playlistVideos",
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerInfo",
      },
    },
    {
      $unwind: "$ownerInfo",
    },
    {
      $project: {
        title: 1,
        description: 1,
        owner: {
          id: "$ownerInfo._id",
          fullname: "$ownerInfo.fullname",
          username: "$ownerInfo.username",
          avatar: "$ownerInfo.avatar",
        },
        playlistVideos: {
          $map: {
            input: "$playlistVideos",
            as: "video",
            in: {
              title: "$$video.title",
              thumbnail: "$$video.thumbnail",
              duration: "$$video.duration",
              videofile: "$$video.videofile",
            },
          },
        },
      },
    },
  ]);
  if (!userPlaylists || userPlaylists.length === 0) {
    throw new ApiError(404, "No playlists found for this user");
  }
  // console.log(userPlaylists);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        userPlaylists,
        "User Playlistes fetched successfully!"
      )
    );
  //TODO: get user playlists
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!playlistId) {
    throw new ApiError(400, "Playlist ID is required");
  }
  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }
  const playlist = await Playlist.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(playlistId) } },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "playlistVideos",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerInfo",
      },
    },
    {
      $unwind: "$ownerInfo",
    },
    {
      $project: {
        title: 1,
        description: 1,
        owner: {
          fullname: "$ownerInfo.fullname",
          username: "$ownerInfo.username",
          avatar: "$ownerInfo.avatar",
        },
        playlistVideos: {
          $map: {
            input: "$playlistVideos",
            as: "video",
            in: {
              id: "$$video._id",
              title: "$$video.title",
              thumbnail: "$$video.thumbnail",
              duration: "$$video.duration",
              videofile: "$$video.videofile",
            },
          },
        },
      },
    },
  ]);

  if (!playlist || playlist.length === 0) {
    throw new ApiError(404, "playlist not found");
  }
  console.log(playlist[0]);

  return res
    .status(200)
    .json(new ApiResponse(200, playlist[0], "playlist fetched successfully"));
  //TODO: get playlist by id
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!playlistId || !videoId) {
    throw new ApiError(400, "these fields are required");
  }
  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  const playlistObjectId = new mongoose.Types.ObjectId(playlistId);
  const videoObjectId = new mongoose.Types.ObjectId(videoId);
  const existingPlaylist = await Playlist.findById(playlistObjectId);
  if (!existingPlaylist) {
    throw new ApiError(404, "Playlist not found");
  }
  if (existingPlaylist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to add videos to this playlist"
    );
  }

  if (existingPlaylist.videos.includes(videoObjectId)) {
    throw new ApiError(404, "Video already in this playlist");
  }
  const updatedPlaylist = await Playlist.updateOne(
    { _id: playlistObjectId },
    { $addToSet: { videos: videoObjectId } }
  );
  const playlist = await Playlist.aggregate([
    { $match: { _id: playlistObjectId } },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "playlistVideos",
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerInfo",
      },
    },
    {
      $unwind: "$ownerInfo",
    },
    {
      $project: {
        title: 1,
        description: 1,
        owner: {
          fullname: "$ownerInfo.fullname",
          username: "$ownerInfo.username",
          avatar: "$ownerInfo.avatar",
        },
        playlistVideos: {
          $map: {
            input: "$playlistVideos",
            as: "video",
            in: {
              title: "$$video.title",
              thumbnail: "$$video.thumbnail",
              duration: "$$video.duration",
              videofile: "$$video.videofile",
            },
          },
        },
      },
    },
  ]);
  if (!playlist || playlist.length === 0) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist[0], "Video added to playlist successfully")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!playlistId || !videoId) {
    throw new ApiError(400, "these fields are required");
  }
  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  const playlistObjectId = new mongoose.Types.ObjectId(playlistId);
  const videoObjectId = new mongoose.Types.ObjectId(videoId);
  const existingPlaylist = await Playlist.findById(playlistObjectId);
  if (!existingPlaylist) {
    throw new ApiError(404, "Playlist not found");
  }
  if (existingPlaylist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to remove videos to this playlist"
    );
  }

  if (!existingPlaylist.videos.includes(videoObjectId)) {
    throw new ApiError(404, "Video not found in this playlist");
  }
  const updatedPlaylist = await Playlist.updateOne(
    { _id: playlistObjectId },
    { $pull: { videos: videoObjectId } }
  );
  const playlist = await Playlist.aggregate([
    { $match: { _id: playlistObjectId } },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "playlistVideos",
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerInfo",
      },
    },
    {
      $unwind: "$ownerInfo",
    },
    {
      $project: {
        title: 1,
        description: 1,
        owner: {
          fullname: "$ownerInfo.fullname",
          username: "$ownerInfo.username",
          avatar: "$ownerInfo.avatar",
        },
        playlistVideos: {
          $map: {
            input: "$playlistVideos",
            as: "video",
            in: {
              title: "$$video.title",
              thumbnail: "$$video.thumbnail",
              duration: "$$video.duration",
              videofile: "$$video.videofile",
            },
          },
        },
      },
    },
  ]);
  if (!playlist || playlist.length === 0) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        playlist[0],
        "Video removed from playlist successfully"
      )
    );
  // TODO: remove video from playlist
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!playlistId) {
    throw new ApiError(400, "Playlist ID is required");
  }
  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }

  const deletedPlaylist = await Playlist.findByIdAndDelete(
    new mongoose.Types.ObjectId(playlistId)
  );
  if (!deletedPlaylist) {
    throw new ApiError(404, "Playlist not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist deleted successfully!"));
  // TODO: delete playlist
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  if (!playlistId) {
    throw new ApiError(400, "Playlist ID is required");
  }
  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }

  if (!name || !description) {
    throw new ApiError(400, "Name and description are required fields");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    new mongoose.Types.ObjectId(playlistId),
    { title: name, description },
    { new: true }
  );
  if (!updatedPlaylist) {
    throw new ApiError(404, "Playlist not found");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    );
  //TODO: update playlist
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
