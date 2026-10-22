
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    serviceName: {
      type: String,
      required: true,
      trim: true,
    },

    startingPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },

    customerPhone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },

    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    scheduledAt: {
      type: Date,
      required: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "in-progress",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({ scheduledAt: 1, status: 1 });
bookingSchema.index({ customerEmail: 1, createdAt: -1 });

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
