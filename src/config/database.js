import mongoose from "mongoose";

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  

  if (!uri) {
    throw new Error("MONGODB_URI is missing from environment variables");
  }

  await mongoose.connect(uri);

  console.log("MongoDB connected successfully");
}

export default connectDB;