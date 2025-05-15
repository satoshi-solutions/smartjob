const {
  fetchJobSeekerProfileDetails,
  fetchJobApplications,
  fetchResumeById,
} = require('../services/fetchJobSeekers');
const { pushJobSeekersToZoho } = require('../services/pushToZoho');
const { fetchJobDetails } = require('../services/fetchJobSeekers');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

/**
 * Sync job seekers from Smart Job Board to Zoho Recruit
 */
async function syncJobSeekersToZoho() {
  try {
    console.log("Starting SJB to Zoho sync...");

    // Fetch all applications
    const applications = await fetchJobApplications();
    console.log(`Retrieved ${applications.length} applications`);

    if (applications.length === 0) {
      console.log("No applications found to sync.");
      return { success: true, count: 0 };
    }

    // Map to store unique job seekers
    const jobSeekerMap = new Map();

    // Process each application and enrich with job seeker details and resume
    for (const application of applications) {
      try {
        if (!application.jobseeker_id) continue;

        const jobSeeker = await fetchJobSeekerProfileDetails(application.jobseeker_id);
        if (!jobSeeker || !jobSeeker.email) continue;

        if (!jobSeekerMap.has(jobSeeker.email)) {
          jobSeekerMap.set(jobSeeker.email, {
            ...jobSeeker,
            applications: []
          });
        }

        const currentJobSeeker = jobSeekerMap.get(jobSeeker.email);

        // Fetch job details using listing_id
        const jobDetails = await fetchJobDetails(application.listing_id);
        currentJobSeeker.applications.push({
          ...application,
          job: {
            id: jobDetails.id,
            title: jobDetails.title,
            description: jobDetails.description
          }
        });

        // Fetch resume
        if (application.resume_id && !currentJobSeeker.resume) {
          try {
            const resume = await fetchResumeById(application.resume_id);
            currentJobSeeker.resume = resume;
            console.log(`Retrieved resume for job seeker: ${jobSeeker.email}`);
          } catch (resumeError) {
            console.error(`Failed to fetch resume for job seeker ${jobSeeker.email}:`, resumeError.message);
          }
        }

        jobSeekerMap.set(jobSeeker.email, currentJobSeeker);
        console.log(`Added/updated job seeker in map: ${jobSeeker.email}`);
      } catch (appError) {
        console.error(`Error processing application:`, appError.message);
      }
    }

    // Convert map to array of job seekers
    const enrichedJobSeekers = Array.from(jobSeekerMap.values());
    console.log(`Prepared ${enrichedJobSeekers.length} enriched job seekers for Zoho sync`);
    console.log('enrichedJobSeekers', enrichedJobSeekers);

    if (enrichedJobSeekers.length === 0) {
      console.log("No job seekers to push to Zoho after processing.");
      return { success: true, count: 0 };
    }

    // Push to Zoho
    const zohoResult = await pushJobSeekersToZoho(enrichedJobSeekers);
    console.log(`Zoho sync result:`, zohoResult);

    return {
      success: zohoResult.success,
      count: enrichedJobSeekers.length,
      created: zohoResult.created,
      updated: zohoResult.updated,
      failed: zohoResult.failed
    };

  } catch (error) {
    console.error("Zoho sync error:", error.message);
    throw error;
  }
}



module.exports = {
  syncJobSeekersToZoho,
};