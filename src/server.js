import "dotenv/config";
import { configureDevelopmentDNS } from "./config/dns.js";

configureDevelopmentDNS();

const { default: app } = await import("./app.js");
const { default: connectDB } = await import("./config/database.js");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`ServiceForge API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start ServiceForge:", error.message);
    process.exit(1);
  }
}

startServer();