import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // console.log(response);

    // file has been uploaded successfully
    console.log(`file is uploaded on cloudinary: ${response.url}`);
    fs.unlinkSync(localFilePath); //remove the locally saved temporary file as the upload operation got successful
    return response;
  } catch (error) {
    console.log("Error uploading file to Cloudinary:", error);

    fs.unlinkSync(localFilePath); //remove the locally saved temporary file as the upload operation got failed
    return null;
  }
};

const getCloudinaryPublicId = (url) => {
  const parts = url.split("/");
  const filename = parts.pop(); // e.g. "sample_image.jpg"
  const version = parts.pop().startsWith("v") ? parts.pop() : null; // remove v123456
  const publicIdWithExt =
    parts.slice(parts.indexOf("upload") + 1).join("/") + "/" + filename;
  return publicIdWithExt.replace(/\.(jpg|jpeg|png|webp|gif)$/, "");
};

const deleteFromCloudinary = async (filelink) => {
  try {
    await cloudinary.uploader.destroy(filelink);
    return console.log("File deleted successfully!");
  } catch (error) {
    console.log("something went wrong while deleting file from cloudinary");
  }
};

export { uploadOnCloudinary, deleteFromCloudinary, getCloudinaryPublicId };
