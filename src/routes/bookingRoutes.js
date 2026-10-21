
import { Router } from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import {
  authenticateToken,
  requireRole,
} from "../middleware/auth.js";

const router = Router();

const allowedTransitions = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["in-progress", "cancelled"],
  "in-progress": ["completed"],
  completed: [],
  cancelled: [],
};



router.post("/", async (req, res) => {
  try {
    const {
      serviceSlug,
      customerName,
      customerEmail,
      customerPhone,
      address,
      scheduledAt,
      notes = "",
    } = req.body;

    if (
      typeof serviceSlug !== "string" ||
      typeof customerName !== "string" ||
      typeof customerEmail !== "string" ||
      typeof customerPhone !== "string" ||
      typeof address !== "string" ||
      typeof scheduledAt !== "string" ||
      typeof notes !== "string"
    ) {
      return res.status(400).json({
        status: "error",
        message: "Missing or invalid booking fields",
      });
    }

    if (
      !serviceSlug.trim() ||
      !customerName.trim() ||
      !customerEmail.trim() ||
      !customerPhone.trim() ||
      !address.trim()
    ) {
      return res.status(400).json({
        status: "error",
        message: "Required fields cannot be empty",
      });
    }

    if (
      customerName.length > 100 ||
      customerEmail.length > 254 ||
      customerPhone.length > 30 ||
      address.length > 300 ||
      notes.length > 1000
    ) {
      return res.status(400).json({
        status: "error",
        message: "One or more fields exceed their maximum length",
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(customerEmail.trim())) {
      return res.status(400).json({
        status: "error",
        message: "A valid email address is required",
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        scheduledAt
      )
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "scheduledAt must be an ISO 8601 datetime with a timezone",
      });
    }

    const appointmentDate = new Date(scheduledAt);

    if (
      Number.isNaN(appointmentDate.getTime()) ||
      appointmentDate <= new Date()
    ) {
      return res.status(400).json({
        status: "error",
        message: "Appointment must be scheduled in the future",
      });
    }

    const service = await Service.findOne({
      slug: serviceSlug.trim(),
      isActive: true,
    });

    if (!service) {
      return res.status(404).json({
        status: "error",
        message: "Active service not found",
      });
    }

    const booking = await Booking.create({
      service: service._id,
      serviceName: service.name,
      startingPrice: service.startingPrice,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerPhone: customerPhone.trim(),
      address: address.trim(),
      scheduledAt: appointmentDate,
      notes: notes.trim(),
    });

    return res.status(201).json({
      status: "success",
      message: "Booking request submitted",
      data: { booking },
    });
  } catch (error) {
    console.error("Create booking error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Unable to create booking",
    });
  }
});

router.get(
  "/",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { status } = req.query;
      const validStatuses = [
        "pending",
        "confirmed",
        "in-progress",
        "completed",
        "cancelled",
      ];

      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid booking status",
          validStatuses,
        });
      }

      const filter = status ? { status } : {};

      const bookings = await Booking.find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("service", "name slug category");

      return res.status(200).json({
        status: "success",
        results: bookings.length,
        data: { bookings },
      });
    } catch (error) {
      console.error("List bookings error:", error.message);

      return res.status(500).json({
        status: "error",
        message: "Unable to retrieve bookings",
      });
    }
  }
);

router.patch(
    "/:id/status", 
    authenticateToken, 
    requireRole("admin"), 
    async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid booking ID",
      });
    }

    const validStatuses = Object.keys(allowedTransitions);

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid booking status",
        validStatuses,
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        status: "error",
        message: "Booking not found",
      });
    }

    if (!allowedTransitions[booking.status].includes(status)) {
      return res.status(409).json({
        status: "error",
        message: `Cannot change booking from ${booking.status} to ${status}`,
      });
    }

    booking.status = status;
    await booking.save();

    return res.status(200).json({
      status: "success",
      message: "Booking status updated",
      data: { booking },
    });
  } catch (error) {
    console.error("Update booking status error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Unable to update booking status",
    });
  }
});

export default router;
