import dotenv from "dotenv";
import { app } from "./app.js";
import connectDB from "./db/index.js";

dotenv.config();
connectDB()
  .then(() => {
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server is running on port ${process.env.PORT || 3000}`);
    });
  })
  .catch((error) => {
    console.log(`MongoDB connection failed! Error: ${error}`);
  });

// import express from "express";

// const app = express();

// (async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGODDB_URI}/${DB_NAME}`);
// below code is for listening error before server starts
//     app.on("error", (error) => {
//       console.log("ERROR: ", error);
//       throw error;
//     });

//     app.listen(process.env.PORT, () => {
//       console.log(`Server is running on port ${process.env.PORT}`);
//     });
//   } catch (error) {
//     console.error("ERROR: ", error);
//     throw error;
//   }
// })();
