import mongoose from "mongoose";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const subscriberId = req.user._id;
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "ChannelId is invalid");
  }
  const channelObjectId = new mongoose.Types.ObjectId(channelId);
  const subscriberObjectId = new mongoose.Types.ObjectId(subscriberId);

  const isSubscribed = await Subscription.exists({
    channel: channelObjectId,
    subscriber: subscriberObjectId,
  });

  if (!isSubscribed) {
    const newSubscriber = await Subscription.create({
      channel: channelObjectId,
      subscriber: subscriberObjectId,
    });
  } else {
    const unsubscribe = await Subscription.findByIdAndDelete(isSubscribed._id);
  }

  const user = await User.aggregate([
    {
      $match: {
        _id: subscriberObjectId,
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        isSubscribed: {
          $cond: {
            if: {
              $in: [
                channelObjectId,
                {
                  $map: {
                    input: "$subscribedTo",
                    as: "sub",
                    in: "$$sub.channel",
                  },
                },
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        username: 1,
        fullname: 1,
        avatar: 1,
        isSubscribed: 1,
      },
    },
  ]);

  if (!user) {
    throw new ApiError(500, "something went wrong !");
  }

  console.log(user);

  return res
    .status(200)
    .json(
      new ApiResponse(200, user, "toggled subscription status successfully!")
    );

  // TODO: toggle subscription
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!channelId) {
    throw new ApiError(404, "subscriberId is not found");
  }
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(403, "subscriberId is not valid");
  }
  //   console.log("Starting aggregation pipeline");

  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "subscriber",
              foreignField: "_id",
              as: "subscriberInfo",
            },
          },
          {
            $unwind: "$subscriberInfo",
          },
          {
            $project: {
              _id: 0,
              fullname: "$subscriberInfo.fullname",
              username: "$subscriberInfo.username",
              avatar: "$subscriberInfo.avatar",
            },
          },
        ],
      },
    },
    {
      $addFields: {
        subscriberCount: {
          $size: "$subscribers",
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        avatar: 1,
        subscribers: 1,
        subscriberCount: 1,
      },
    },
  ]);

  if (!user || user.length === 0) {
    throw new ApiError(500, "Something went wrong!");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].subscribers,
        "SubscriberList fetched successfully!"
      )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  if (!subscriberId) {
    throw new ApiError(404, "subscriberId not found");
  }
  if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
    throw new ApiError(403, "subscriberId is not valid");
  }

  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedChannels",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "channel",
              foreignField: "_id",
              as: "channelInfo",
            },
          },
          {
            $unwind: "$channelInfo",
          },
          {
            $project: {
              // _id: 1,
              _id: 0,
              id: "$channelInfo._id",
              fullname: "$channelInfo.fullname",
              username: "$channelInfo.username",
              avatar: "$channelInfo.avatar",
            },
          },
        ],
      },
    },

    {
      $project: {
        username: 1,
        fullname: 1,
        avatar: 1,
        subscribedChannels: 1,
      },
    },
  ]);

  if (!user || user.length === 0) {
    throw new ApiError(500, "Something went wrong!");
  }

  console.log(user[0].subscribedChannels);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].subscribedChannels,
        "subscription list fetched successfully!"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
