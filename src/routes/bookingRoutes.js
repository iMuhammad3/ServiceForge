
import { Router } from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import {
  authenticateToken,
  requireRole,
} from "../middleware/auth.js";

const router = Router();

const validStatuses = [
  "pending",
  "confirmed",
  "in-progress",
  "completed",
  "cancelled",
];

const allowedTransitions = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["in-progress", "cancelled"],
  "in-progress": ["completed"],
  completed: [],
  cancelled: [],
};

function parsePagination(query) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);

  if (
    !Number.isInteger(page) ||
    !Number.isInteger(limit) ||
    page < 1 ||
    limit < 1 ||
    limit > 100
  ) {
    return null;
  }

  return { page, limit, skip: (page - 1) * limit };
}

function sendPaginated(res, bookings, total, page, limit) {
  return res.status(200).json({
    status: "success",
    results: bookings.length,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: { bookings },
  });
}

// Customer creates a booking for their own account.
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      serviceSlug,
      customerPhone,
      address,
      scheduledAt,
      notes = "",
    } = req.body ?? {};

    if (
      typeof serviceSlug !== "string" ||
      typeof customerPhone !== "string" ||
      typeof address !== "string" ||
      typeof scheduledAt !== "string" ||
      typeof notes !== "string"
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "serviceSlug, customerPhone, address, and scheduledAt are required",
      });
    }

    if (
      !serviceSlug.trim() ||
      !customerPhone.trim() ||
      !address.trim()
    ) {
      return res.status(400).json({
        status: "error",
        message: "Required fields cannot be empty",
      });
    }

    if (
      customerPhone.length > 30 ||
      address.length > 300 ||
      notes.length > 1000
    ) {
      return res.status(400).json({
        status: "error",
        message: "One or more fields exceed their maximum length",
      });
    }

    const isoDatePattern =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

    if (!isoDatePattern.test(scheduledAt)) {
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
      customer: req.user._id,
      service: service._id,
      serviceName: service.name,
      startingPrice: service.startingPrice,
      customerName: req.user.name,
      customerEmail: req.user.email,
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

// Customer sees only their own bookings; admins may also use this endpoint.
router.get("/mine", authenticateToken, async (req, res) => {
  try {
    const pagination = parsePagination(req.query);

    if (!pagination) {
      return res.status(400).json({
        status: "error",
        message: "page must be positive; limit must be between 1 and 100",
      });
    }

    const filter =
      req.user.role === "admin"
        ? { customer: { $exists: true } }
        : { customer: req.user._id };

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .populate("service", "name slug category"),
      Booking.countDocuments(filter),
    ]);

    return sendPaginated(
      res,
      bookings,
      total,
      pagination.page,
      pagination.limit
    );
  } catch (error) {
    console.error("List customer bookings error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve bookings",
    });
  }
});

// Admin booking list with optional status filtering and pagination.
router.get(
  "/",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const pagination = parsePagination(req.query);
      const { status } = req.query;

      if (!pagination) {
        return res.status(400).json({
          status: "error",
          message: "page must be positive; limit must be between 1 and 100",
        });
      }

      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid booking status",
          validStatuses,
        });
      }

      const filter = status ? { status } : {};

      const [bookings, total] = await Promise.all([
        Booking.find(filter)
          .sort({ createdAt: -1 })
          .skip(pagination.skip)
          .limit(pagination.limit)
          .populate("service", "name slug category")
          .populate("customer", "name email"),
        Booking.countDocuments(filter),
      ]);

      return sendPaginated(
        res,
        bookings,
        total,
        pagination.page,
        pagination.limit
      );
    } catch (error) {
      console.error("Admin list bookings error:", error.message);

      return res.status(500).json({
        status: "error",
        message: "Unable to retrieve bookings",
      });
    }
  }
);

// A customer can view their own booking; an admin can view any booking.
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid booking ID",
      });
    }

    const booking = await Booking.findById(req.params.id)
      .populate("service", "name slug category")
      .populate("customer", "name email");

    if (!booking) {
      return res.status(404).json({
        status: "error",
        message: "Booking not found",
      });
    }

    const isOwner =
      booking.customer &&
      booking.customer._id.toString() === req.user._id.toString();

    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "You cannot access this booking",
      });
    }

    return res.status(200).json({
      status: "success",
      data: { booking },
    });
  } catch (error) {
    console.error("Get booking error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve booking",
    });
  }
});

// Customers may cancel their own pending or confirmed bookings.
router.patch(
  "/:id/cancel",
  authenticateToken,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid booking ID",
        });
      }

      const booking = await Booking.findById(req.params.id);

      if (!booking) {
        return res.status(404).json({
          status: "error",
          message: "Booking not found",
        });
      }

      if (
        req.user.role !== "admin" &&
        booking.customer?.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          status: "error",
          message: "You cannot cancel this booking",
        });
      }

      if (!allowedTransitions[booking.status].includes("cancelled")) {
        return res.status(409).json({
          status: "error",
          message: `A ${booking.status} booking cannot be cancelled`,
        });
      }

      booking.status = "cancelled";
      await booking.save();

      return res.status(200).json({
        status: "success",
        message: "Booking cancelled",
        data: { booking },
      });
    } catch (error) {
      console.error("Cancel booking error:", error.message);

      return res.status(500).json({
        status: "error",
        message: "Unable to cancel booking",
      });
    }
  }
);

// Admin-only status transitions.
router.patch(
  "/:id/status",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid booking ID",
        });
      }

      const { status } = req.body ?? {};

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid booking status",
          validStatuses,
        });
      }

      const booking = await Booking.findById(req.params.id);

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
  }
);

export default router;
