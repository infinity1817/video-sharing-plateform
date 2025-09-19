# 📻 **Video Library Backend API**

This is a Node.js backend application built with **Express.js** and **MongoDB**. The app offers a comprehensive API for a media-sharing platform, supporting features such as videos, playlists, comments, likes, tweets, user management, and subscriptions.

---
## 🚀 Live Site

👉 [Visit Deployed Website](https://vlib-frontend.vercel.app/)

---

## 🔗 Frontend Repository

Looking for the frontend code?

👉 [Frontend GitHub Repo](https://github.com/bajpaisatvic/VLIB-frontend)

---

## 🚀 **Features**

✅ **User Management**

* Register, login, logout, refresh tokens
* Update profile, avatar, cover image
* Change password
* View current user details
* Watch history

✅ **Video Management**

* Publish, update, delete videos
* Fetch all videos, videos by ID, videos by channel
* Toggle publish status

✅ **Playlist Management**

* Create, update, delete playlists
* Add/remove videos in playlists
* Get playlists by user or ID

✅ **Comment System**

* Add, update, delete comments on videos
* Fetch comments with pagination

✅ **Like System**

* Toggle likes on videos, comments, and tweets
* Retrieve liked videos

✅ **Subscription System**

* Subscribe/unsubscribe to channels
* Get channel subscribers
* Get subscribed channels

✅ **Tweet Management**

* Post, update, delete tweets
* Fetch user tweets

✅ **Dashboard Stats**

* Get channel stats (views, videos, likes, subscribers)

✅ **Health Check**

* Simple health check endpoint

---

## 📂 **Project Structure**

```
├── src/
│   ├── controllers/      # All API controllers
│   ├── models/           # Mongoose models
│   ├── utils/            # Utility functions (e.g., ApiError, asyncHandler)
│   ├── routes/           # (Assumed) API routes definitions
├── public/               # Public files (if any)
├── .gitignore
├── package.json
├── .prettierrc
```

---

## ⚙️ **Installation**

```bash
git clone <your-repo-url>
cd <project-folder>
npm install
```

---

## 🏁 **Run the Server**

```bash
npm start
# or
npm run dev
```

---

## ⚡ **Environment Variables**

Create a `.env` file:

```
PORT=3000
MONGODB_URI=your_mongo_uri
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 🔑 **Sample API Endpoints**

| Resource     | Method | Endpoint                              | Description          |
| ------------ | ------ | ------------------------------------- | -------------------- |
| User         | POST   | `/api/v1/auth/register`               | Register user        |
| User         | POST   | `/api/v1/auth/login`                  | Login user           |
| Video        | POST   | `/api/v1/videos/`                     | Publish a video      |
| Video        | GET    | `/api/v1/videos/`                     | Get all videos       |
| Playlist     | POST   | `/api/v1/playlists/`                  | Create playlist      |
| Comment      | POST   | `/api/v1/comments/:videoId`           | Add comment to video |
| Like         | POST   | `/api/v1/likes/video/:videoId`        | Toggle video like    |
| Subscription | POST   | `/api/v1/subscriptions/:channelId`    | Toggle subscription  |
| Tweet        | POST   | `/api/v1/tweets/`                     | Post a tweet         |
| Dashboard    | GET    | `/api/v1/dashboard/stats?channelId=X` | Get channel stats    |
| Health       | GET    | `/api/v1/health`                      | Health check         |

---

##
