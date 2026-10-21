
import express from "express";
import serviceRoutes from "./routes/serviceRoutes.js";

const app = express();

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "ServiceForge API is running",
  });
});

app.use("/api/services", serviceRoutes);

app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

export default app;
