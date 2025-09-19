import mongoose from "mongoose";
import { Comment } from "../models/comment.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { Video } from "../models/video.models.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!videoId) {
    throw new ApiError(400, "videoId is required");
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  const videoComments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $skip: (parseInt(page) - 1) * parseInt(limit),
    },
    {
      $limit: parseInt(limit),
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "commentOwner",
      },
    },
    {
      $unwind: "$commentOwner",
    },
    {
      $lookup: {
        from: "likes",
        let: { commentId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$comment", "$$commentId"] },
                  {
                    $eq: [
                      "$likedBy",
                      new mongoose.Types.ObjectId(req.user._id),
                    ],
                  },
                ],
              },
            },
          },
        ],
        as: "likedByUser",
      },
    },
    {
      $addFields: {
        liked: { $gt: [{ $size: "$likedByUser" }, 0] },
      },
    },
    {
      $lookup: {
        from: "likes",
        let: { commentId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$comment", "$$commentId"],
              },
            },
          },
        ],
        as: "commentLikes",
      },
    },
    {
      $addFields: {
        likeCount: { $size: "$commentLikes" },
      },
    },
    {
      $project: {
        content: 1,
        liked: 1,
        likeCount: 1,
        owner: {
          fullname: "$commentOwner.fullname",
          username: "$commentOwner.username",
          avatar: "$commentOwner.avatar",
        },
      },
    },
  ]);
  if (!videoComments || videoComments.length === 0) {
    throw new ApiError(404, "No comments found for this video");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, videoComments, "comments fetched successfully!")
    );
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;
  const userId = req.user._id;

  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  if (!content || content.trim() === "") {
    throw new ApiError(400, "comment field is required");
  }

  const comment = await Comment.create({
    content,
    owner: userId,
    video: videoId,
  });

  if (!comment) {
    throw new ApiError(500, "something went wrong while adding comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "comment added successfully!"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!commentId) {
    throw new ApiError(400, "commentId is required");
  }
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  if (!content || content.trim() === "") {
    throw new ApiError(400, "content field is required");
  }
  const comment = await Comment.findById(
    new mongoose.Types.ObjectId(commentId)
  );
  if (comment.owner.toString() != req.user._id.toString()) {
    throw new ApiError(403, "You are not authorised to update this comment!");
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    new mongoose.Types.ObjectId(commentId),
    {
      content,
    },
    { new: true }
  );

  if (!updatedComment) {
    throw new ApiError(500, "something went wrong while updating comment!");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedComment, "comment updated successfully!")
    );
  // TODO: update a comment
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!commentId) {
    throw new ApiError(400, "commentId is required");
  }
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment Id");
  }
  const comment = await Comment.findById(
    new mongoose.Types.ObjectId(commentId)
  );
  if (comment.owner.toString() != req.user._id.toString()) {
    throw new ApiError(403, "You are not authorised to delete this comment!");
  }
  const deletedComment = await Comment.findByIdAndDelete(
    new mongoose.Types.ObjectId(commentId)
  );

  if (!deletedComment) {
    throw new ApiError(500, "something went wrong while deleting comment!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "comment deleted successfully!"));
  // TODO: delete a comment
});

export { getVideoComments, addComment, updateComment, deleteComment };
