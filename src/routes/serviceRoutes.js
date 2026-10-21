
import { Router } from "express";
import Service from "../models/Service.js";

const router = Router();

const validCategories = [
  "plumbing",
  "electrical",
  "air-conditioning",
];

router.get("/", async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { isActive: true };

    if (category) {
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid service category",
          validCategories,
        });
      }

      filter.category = category;
    }

    if (search) {
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        {
          description: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
      ];
    }

    const services = await Service.find(filter).sort({
      category: 1,
      name: 1,
    });

    return res.status(200).json({
      status: "success",
      results: services.length,
      data: { services },
    });
  } catch (error) {
    console.error("List services error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve services",
    });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const service = await Service.findOne({
      slug: req.params.slug,
      isActive: true,
    });

    if (!service) {
      return res.status(404).json({
        status: "error",
        message: "Service not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: { service },
    });
  } catch (error) {
    console.error("Get service error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve service",
    });
  }
});

export default router;
