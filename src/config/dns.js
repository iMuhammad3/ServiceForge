import dns from "node:dns";

export function configureDevelopmentDNS() {
  if (process.env.USE_GOOGLE_DNS === "true") {
    dns.setServers(["8.8.8.8"]);
    console.log("Using Google DNS for development");
  }
}