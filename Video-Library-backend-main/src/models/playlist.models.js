import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema(
  {
    videos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    title: {
      type: String,
      req: true,
    },
    description: {
      type: String,
      req: true,
    },
  },
  { timestamps: true }
);

export const Playlist = mongoose.model("Playlist", playlistSchema);
