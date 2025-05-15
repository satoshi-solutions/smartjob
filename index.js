const express = require("express");
const cron = require("node-cron");
const { syncJobSeekersToZoho, syncJobSeekersToBrazen } = require("./controllers/syncController");
const { registerCandidate } = require("./controllers/syncController");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "API is running",
    version: "1.0.0",
    documentation: "See README.md for API documentation",
  });
});


// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Run the sync job every minute
cron.schedule("*/1 * * * *", async () => {
  try {
    console.log(`Running job seeker sync at ${new Date().toISOString()}`);
    await syncJobSeekersToZoho();
  } catch (error) {
    console.error("Scheduled sync error:", error.message);
  }
});

// cron.schedule('*/1 * * * *', async () => {
//   try {
//     console.log(`Running Brazen sync at ${new Date().toISOString()}`);
//     await registerCandidate();
//   } catch (error) {
//     console.error('Brazen sync error:', error.message);
//   }
// });