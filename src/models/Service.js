
import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
      maxlength: 100,
    },

    slug: {
      type: String,
      required: [true, "Service slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    category: {
      type: String,
      required: [true, "Service category is required"],
      enum: ["plumbing", "electrical", "air-conditioning"],
    },

    description: {
      type: String,
      required: [true, "Service description is required"],
      trim: true,
      maxlength: 1000,
    },

    startingPrice: {
      type: Number,
      required: [true, "Starting price is required"],
      min: 0,
    },

    estimatedDuration: {
      type: String,
      required: [true, "Estimated duration is required"],
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Service = mongoose.model("Service", serviceSchema);

export default Service;
