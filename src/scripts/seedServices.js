
import "dotenv/config";
import { configureDevelopmentDNS } from "../config/dns.js";

configureDevelopmentDNS();

const { default: connectDB } = await import("../config/database.js");
const { default: Service } = await import("../models/Service.js");

const services = [
  {
    name: "Plumbing Repairs",
    slug: "plumbing-repairs",
    category: "plumbing",
    description:
      "Diagnosis and repair of leaking pipes, faulty taps, blocked drains, and other common plumbing problems.",
    startingPrice: 10000,
    estimatedDuration: "1–2 hours",
  },
  {
    name: "Pipe Installation",
    slug: "pipe-installation",
    category: "plumbing",
    description:
      "Installation and replacement of water supply and drainage pipes for residential properties.",
    startingPrice: 20000,
    estimatedDuration: "2–4 hours",
  },
  {
    name: "Electrical Repairs",
    slug: "electrical-repairs",
    category: "electrical",
    description:
      "Inspection and repair of faulty switches, sockets, wiring, and common household electrical issues.",
    startingPrice: 12000,
    estimatedDuration: "1–3 hours",
  },
  {
    name: "Light Fixture Installation",
    slug: "light-fixture-installation",
    category: "electrical",
    description:
      "Professional installation or replacement of indoor and outdoor light fixtures.",
    startingPrice: 8000,
    estimatedDuration: "1–2 hours",
  },
  {
    name: "AC Servicing",
    slug: "ac-servicing",
    category: "air-conditioning",
    description:
      "Routine air-conditioner cleaning, inspection, and maintenance to help maintain efficient operation.",
    startingPrice: 15000,
    estimatedDuration: "1–2 hours",
  },
  {
    name: "AC Installation",
    slug: "ac-installation",
    category: "air-conditioning",
    description:
      "Installation of residential air-conditioning units, including basic setup and operational checks.",
    startingPrice: 30000,
    estimatedDuration: "2–4 hours",
  },
  {
    name: "AC Fault Diagnosis",
    slug: "ac-fault-diagnosis",
    category: "air-conditioning",
    description:
      "Inspection to identify air-conditioning problems such as poor cooling, unusual noises, or failure to start.",
    startingPrice: 10000,
    estimatedDuration: "1 hour",
  },
  {
    name: "Emergency Plumbing",
    slug: "emergency-plumbing",
    category: "plumbing",
    description:
      "Priority assistance for urgent leaks, burst pipes, and other time-sensitive plumbing problems.",
    startingPrice: 20000,
    estimatedDuration: "Depends on the issue",
  },
];

async function seedServices() {
  try {
    await connectDB();

    const operations = services.map((service) => ({
      updateOne: {
        filter: { slug: service.slug },
        update: { $set: service },
        upsert: true,
      },
    }));

    const result = await Service.bulkWrite(operations);

    console.log("Service catalogue seeded successfully.");
    console.log(`Inserted: ${result.upsertedCount}`);
    console.log(`Updated: ${result.modifiedCount}`);
  } catch (error) {
    console.error("Failed to seed services:", error.message);
    process.exitCode = 1;
  } finally {
    const mongoose = await import("mongoose");
    await mongoose.default.disconnect();
  }
}

seedServices();
