import express from "express";

const app = express();

// Parse incoming JSON request bodies.
app.use(express.json());

// Health-check endpoint.
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "ServiceForge API is running",
  });
});

export default app;