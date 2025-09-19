import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asynchandler.js";
import {
  deleteFromCloudinary,
  getCloudinaryPublicId,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { User } from "../models/user.models.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
// delete old image of user avatar and cover

const generateAccessAndRefreshToken = async (userid) => {
  try {
    const user = await User.findById(userid);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullname, password } = req.body;

  if (
    [username, email, fullname, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  //   console.log("step 1 done");

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "Username or email already exists");
  }
  //   console.log("step 2 done");

  //   console.log(req.files.avatar[0]);

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  //   console.log(avatarLocalPath);

  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  //   console.log(coverImageLocalPath);

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }
  let coverImage = null;
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (avatarLocalPath === coverImageLocalPath) {
    coverImage = avatar;
  } else {
    coverImage = await uploadOnCloudinary(coverImageLocalPath);
  }

  // const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  //   console.log(avatar);
  if (!avatar) {
    throw new ApiError(400, "Avatar is required");
  }
  //   console.log("step 4 done");

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullname,
    password,
    avatar: avatar.url,
    coverimage: coverImage?.url || "",
  });
  //   console.log("step 5 done");
  const createdUser = await User.findById(user._id).select(
    "-password -refreshtoken"
  );
  //   console.log(createdUser);

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user");
  }

  res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const userLogin = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username && !email) {
    return new ApiError(400, "it is required");
  }
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  // console.log("user found");

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Password is not correct");
  }
  // console.log("user password is correct");

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  // console.log("access and refresh token generated");

  const loggedinUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  // console.log("logged in user");

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  };
  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedinUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const userLogout = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "refresh token not found");
  }
  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );
  const user = await User.findById(decodedToken._id);
  if (!user) {
    throw new ApiError(401, "Invalid refresh token");
  }
  if (incomingRefreshToken !== user.refreshToken) {
    throw new ApiError(401, "refresh token is invalid or expired");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken,
        },
        "Access Token refreshed successfully"
      )
    );
});

const changeUserPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  if (!oldPassword || !newPassword || !confirmPassword) {
    throw new ApiError(400, "All fields are required");
  }
  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "New password and confirm password do not match");
  }
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const isPasswordValid = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Password");
  }
  user.password = newPassword;
  const updatedUser = await user.save({ validateBeforeSave: false });
  // .select("-password -refreshToken"); because .save returns an document and .select only applis on query

  (updatedUser.password = undefined), (updatedUser.refreshToken = undefined);

  if (!updatedUser) {
    throw new ApiError(500, "Something went wrong while updating password");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Password updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { email, fullname } = req.body;
  if (!email && !fullname) {
    throw new ApiError(400, "Email and Fullname are required");
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        email,
        fullname,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar) {
    throw new ApiError(500, "something went wrong while uploading avatar");
  }

  const loggedinUser = await User.findById(req.user._id);

  if (loggedinUser.avatar) {
    const oldAvatarUrl = loggedinUser.avatar;
    const publicId = getCloudinaryPublicId(oldAvatarUrl);
    await deleteFromCloudinary(publicId);
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage) {
    throw new ApiError(500, "something went wrong while uploading avatar");
  }
  const loggedinUser = await User.findById(req.user._id);

  if (loggedinUser.coverimage) {
    const oldAvatarUrl = loggedinUser.coverimage;
    const publicId = getCloudinaryPublicId(oldAvatarUrl);
    await deleteFromCloudinary(publicId);
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverimage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User coverImage updated successfully"));
});

const getUserChannel = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username) {
    throw new ApiError(400, "User does not exist");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
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
        subscriberCount: {
          $size: "$subscribers",
        },
        subscribedChannels: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        subscribedChannels: 1,
        subscriberCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverimage: 1,
      },
    },
  ]);
  console.log(channel);

  if (!channel) {
    throw new ApiError(500, "something went wrong while finding the channel");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "channel loaded successfully"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("watchhistory");
  console.log(user);

  if (!user || !user.watchhistory || user.watchhistory.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No watch history found"));
  }

  console.log("not break");

  const history = await Video.aggregate([
    {
      $match: {
        _id: {
          $in: user.watchhistory.map((id) => new mongoose.Types.ObjectId(id)),
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $unwind: "$owner",
    },
    {
      $project: {
        thumbnail: 1,
        title: 1,
        description: 1,
        duration: 1,
        views: 1,
        "owner.username": 1,
        "owner.fullname": 1,
        "owner.avatar": 1,
      },
    },
  ]);
  console.log(history);

  return res
    .status(200)
    .json(
      new ApiResponse(200, history, "Users watch history fetched successfully")
    );
});

export {
  registerUser,
  userLogin,
  userLogout,
  generateAccessAndRefreshToken,
  refreshAccessToken,
  changeUserPassword,
  getCurrentUser,
  updateUserDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannel,
  getWatchHistory,
};
