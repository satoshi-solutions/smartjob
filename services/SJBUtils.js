const axios = require("axios");
require("dotenv").config();
async function fetchJobApplications(options = {}) {
  const { SJB_API_KEY, SJB_JOB_ID } = process.env;
  const baseUrl = `https://absolutelyamerican.mysmartjobboard.com/api/jobs/${SJB_JOB_ID}/applications`;

  console.log(SJB_JOB_ID);
  // Build query parameters
  const params = {
    api_key: SJB_API_KEY,
    page: options.page || 1,
    limit: options.limit || 100,
    ...options // Include any additional filter parameters
  };

  const response = await axios.get(baseUrl, {
    params,
    headers: {
      "Content-Type": "application/json"
    }
  });

  const applications = response.data.applications;

  for (const application of applications) {
    const job_seeker = await fetchJobSeekerProfileDetails(application.jobseeker_id);
    const resume = await fetchResumeById(application.resume_id);
    application.job_seeker = job_seeker;
    application.resume = resume;
  }

  return applications;

}

async function fetchJobSeekerProfileDetails(userId) {
  if (!userId) {
    console.error("No userId provided to fetchJobSeekerProfileDetails");
  }

  const { SJB_API_KEY } = process.env;
  const url = `https://absolutelyamerican.mysmartjobboard.com/api/jobseekers/${userId}`;

  try {
    console.log(`Fetching detailed profile for job seeker ID: ${userId}`);

    const response = await axios.get(url, {
      params: {
        api_key: SJB_API_KEY
      },
      headers: {
        "Content-Type": "application/json"
      }
    });

    console.log(`Retrieved detailed profile for job seeker ID: ${userId}`);
    return response.data;
  } catch (error) {
    console.error(
      `SJB profile fetch error for ID ${userId}:`,
      error.response?.data || error.message
    );
  }
}

async function fetchResumeById(resumeId) {
  if (!resumeId) {
    console.error('No resumeId provided to fetchResumeById');
  }

  const { SJB_API_KEY } = process.env;
  const url = `https://absolutelyamerican.mysmartjobboard.com/api/resumes/${resumeId}`;

  try {
    console.log(`Fetching resume metadata with ID: ${resumeId}`);

    // Fetch resume metadata
    const metadataResponse = await axios.get(url, {
      params: { api_key: SJB_API_KEY },
      headers: { 'Content-Type': 'application/json' }
    });
    return metadataResponse.data
  } catch (error) {
    console.error(`Resume fetch error for ID ${resumeId}:`, error.response?.data || error.message);
  }
}

async function fetchJobDetail(listenId) {
  if (!listenId) {
    console.error('No jobs provided to fetchJobDetail');
  }

  const { SJB_API_KEY } = process.env;
  const url = `https://absolutelyamerican.mysmartjobboard.com/api/jobs/${listenId}`;

  try {
    console.log(`Fetching jobs metadata with ID: ${listenId}`);

    // Fetch resume metadata
    const metadataResponse = await axios.get(url, {
      params: { api_key: SJB_API_KEY },
      headers: { 'Content-Type': 'application/json' }
    });
    return metadataResponse.data
  } catch (error) {
    console.error(`Jobs fetch error for ID ${listenId}:`, error.response?.data || error.message);
  }
}

async function fetchJobSeekerWithEmail(email) {
  if (!email) {
    console.error('No email provided to fetchJobSeekerWithEmail');
  }

  const { SJB_API_KEY } = process.env;
  const url = `https://absolutelyamerican.mysmartjobboard.com/api/jobseekers?page=&limit=&email=${email}&order=asc`;

  try {
    console.log(`Fetching jobs metadata with ID: ${email}`);

    // Fetch resume metadata
    const metadataResponse = await axios.get(url, {
      params: {
        api_key: SJB_API_KEY,
      },
      headers: { 'Content-Type': 'application/json' }
    });
    return metadataResponse.data;
  } catch (error) {
    console.error(`Jobs fetch error for ID ${email}:`, error.response?.data || error.message);
  }
}

async function createNewJobSeeker(jobSeeker) {

  if (!jobSeeker) {
    console.error('No jobSeeker provided to createNewJobSeeker');
  }

  const { SJB_API_KEY } = process.env;
  const url = `https://absolutelyamerican.mysmartjobboard.com/api/jobseekers`;

  try {
    console.log(`Fetching jobs metadata with ID: ${jobSeeker}`);

    // Fetch resume metadata
    const metadataResponse = await axios.post(url, jobSeeker, {
      params: {
        api_key: SJB_API_KEY,
      },
      headers: { 'Content-Type': 'application/json' }
    });
    return metadataResponse.data;
  } catch (error) {
    console.error(`Jobs fetch error for ID ${jobSeeker}:`, error.response?.data || error.message);
  }
}

module.exports = {
  fetchJobApplications,
  fetchJobDetail,
  fetchJobSeekerWithEmail,
  createNewJobSeeker,
};
