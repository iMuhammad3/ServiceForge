
import "dotenv/config";
import { configureDevelopmentDNS } from "../config/dns.js";

configureDevelopmentDNS();

const { default: connectDB } = await import("../config/database.js");
const { default: User } = await import("../models/User.js");

const email = process.argv[2]?.trim().toLowerCase();

async function promoteAdmin() {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(
      "Usage: node src/scripts/promoteAdmin.js user@example.com"
    );
    process.exitCode = 1;
    return;
  }

  try {
    await connectDB();

    const user = await User.findOneAndUpdate(
      { email },
      { $set: { role: "admin" } },
      { new: true, runValidators: true }
    );

    if (!user) {
      console.error(
        "User not found. Register the account before promoting it."
      );
      process.exitCode = 1;
      return;
    }

    console.log(`Promoted ${user.email} to admin.`);
  } catch (error) {
    console.error("Admin promotion failed:", error.message);
    process.exitCode = 1;
  } finally {
    const mongoose = await import("mongoose");
    await mongoose.default.disconnect();
  }
}

await promoteAdmin();
