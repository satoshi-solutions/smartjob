const express = require("express");
const cron = require("node-cron");
const { OneWork } = require("./controllers/OneWorkController");
const { SecondWork } = require("./controllers/SecondWorkController");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Run the sync job every minute
cron.schedule("*/3 * * * *", async () => {
  try {
    console.log(`Running job seeker sync at ${new Date().toISOString()}`);
    // await OneWork();
    await SecondWork();
  } catch (error) {
    console.error("Scheduled sync error:", error.message);
  }
});


