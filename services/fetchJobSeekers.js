const axios = require("axios");
require("dotenv").config();

async function fetchJobSeekersFromSJB() {
  const { SJB_API_KEY } = process.env;
  const baseUrl = "https://absolutelyamerican.mysmartjobboard.com/api/jobseekers";

  // Include API key as query parameter instead of header
  const params = {
    api_key: SJB_API_KEY,
    page: 1,
    limit: 5
  };

  try {
    console.log(`Fetching job seekers from SJB`);
    const response = await axios.get(baseUrl, {
      params,
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.data?.jobseekers) {
      console.warn("Unexpected response format from SJB API:", response.data);
      return [];
    }

    let jobSeekers = response.data.jobseekers;
    console.log(`Retrieved ${jobSeekers.length} job seekers`);

    // Handle pagination if supported
    if (response.data.total && response.data.total > params.limit) {
      const totalPages = Math.ceil(response.data.total / params.limit);
      for (let page = 2; page <= totalPages; page++) {
        const pageResponse = await axios.get(baseUrl, {
          params: { ...params, page },
          headers: { "Content-Type": "application/json" }
        });
        console.log('pageResponse', pageResponse.data.jobseekers);
        jobSeekers = jobSeekers.concat(pageResponse.data.jobseekers || []);
      }
    }
    console.log('jobseekers', jobSeekers);
    return jobSeekers;
  } catch (error) {
    console.error("SJB fetch error:", error.response?.data || error.message);
    throw error;
  }
}

// In fetchJobSeekers.js
async function fetchJobDetails(listingId) {
  const { SJB_API_KEY } = process.env;
  const url = `https://absolutelyamerican.mysmartjobboard.com/api/jobs/${listingId}`; // Verify endpoint

  try {
    console.log(`Fetching job details for listing ID: ${listingId}`);
    const response = await axios.get(url, {
      params: { api_key: SJB_API_KEY },
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`Raw job response for listing ID ${listingId}:`, JSON.stringify(response.data, null, 2));

    // if (!response.data?.job) {
    //   console.warn(`No job data found for listing ID: ${listingId}`);
    //   return { id: listingId, title: 'Unknown Job', description: 'No description available' };
    // }

    console.log(`Retrieved job details for listing ID: ${listingId}`);
    return {
      id: response.data.id || listingId,
      title: response.data.title || 'Unknown Job',
      description: response.data.description || 'No description available'
    };
  } catch (error) {
    console.error(`Error fetching job details for listing ID ${listingId}:`, error.response?.data || error.message);
    return { id: listingId, title: 'Unknown Job', description: 'No description available' };
  }
}

/**
 * Fetch full profile details including resume for a job seeker
 * @param {string} userId - Job seeker ID
 * @returns {Promise<Object>} Detailed profile information
 */
async function fetchJobSeekerProfileDetails(userId) {
  if (!userId) {
    console.error("No userId provided to fetchJobSeekerProfileDetails");
    throw new Error("User ID is required");
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
    console.error(`SJB profile fetch error for ID ${userId}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Fetch job applications
 * @param {Object} options - Optional parameters like job_id, email, etc.
 * @returns {Promise<Array>} List of job applications
 */
async function fetchJobApplications(options = {}) {
  const { SJB_API_KEY } = process.env;
  const baseUrl = "https://absolutelyamerican.mysmartjobboard.com/api/jobs/108270/applications";

  // Build query parameters
  const params = {
    api_key: SJB_API_KEY,
    page: options.page || 1,
    limit: options.limit || 100,
    ...options // Include any additional filter parameters
  };

  try {
    console.log(`Fetching job applications with options:`, options);
    const response = await axios.get(baseUrl, {
      params,
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.data || !response.data.applications) {
      console.warn("Unexpected response format from applications API:", response.data);
      return [];
    }

    const applications = response.data.applications;

    // Handle pagination if supported
    if (response.data.total && response.data.total > params.limit) {
      console.log('first', response.data.total);
      const totalPages = Math.ceil(response.data.total / params.limit);
      for (let page = 2; page <= totalPages; page++) {
        const pageResponse = await axios.get(baseUrl, {
          params: { ...params, page },
          headers: { "Content-Type": "application/json" }
        });

        if (pageResponse.data && pageResponse.data.applications) {
          const pageApplications = pageResponse.data.applications;
          console.log(`Retrieved ${pageApplications.length} more applications from page ${page}`);
          applications = applications.concat(pageApplications);
        }
      }
    }

    return applications;
  } catch (error) {
    console.error("Applications fetch error:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * Fetch a job seeker's photo by ID
 * @param {string} userId - Job seeker ID
 * @returns {Promise<Object|null>} Photo data or null if not available
 */
async function fetchJobSeekerPhoto(userId) {
  if (!userId) {
    console.error('No userId provided to fetchJobSeekerPhoto');
    throw new Error('User ID is required');
  }

  try {
    // Check custom_fields in job seeker profile
    const profile = await fetchJobSeekerProfileDetails(userId);
    const photoField = profile.custom_fields?.find(f => f.name.toLowerCase() === 'photo' || f.name.toLowerCase() === 'profile_picture');

    if (photoField?.value) {
      // Assume photoField.value is a URL
      console.log(`Fetching photo from URL for job seeker ID: ${userId}`);
      const response = await axios.get(photoField.value, {
        responseType: 'arraybuffer'
      });

      const contentType = response.headers['content-type'] || 'image/jpeg';
      console.log(`Retrieved photo for job seeker ID: ${userId}, size: ${Buffer.byteLength(response.data)} bytes, contentType: ${contentType}`);

      return {
        data: response.data,
        contentType: contentType,
        fileName: `photo_${userId}.${contentType.split('/')[1] || 'jpg'}`
      };
    }

    console.log(`No photo available for job seeker ID: ${userId}`);
    return null;
  } catch (error) {
    console.warn(`Failed to fetch photo for job seeker ID ${userId}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Fetch a specific resume by ID
 * @param {string} resumeId - Resume ID
 * @returns {Promise<Object>} Resume data
 */
async function fetchResumeById(resumeId) {
  if (!resumeId) {
    console.error('No resumeId provided to fetchResumeById');
    throw new Error('Resume ID is required');
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

    if (!metadataResponse.data?.resume) {
      console.error(`No resume URL found in metadata for resume ID: ${resumeId}`);
      throw new Error('Resume URL not found in API response');
    }

    const resumeUrl = metadataResponse.data.resume;
    console.log(`Fetching resume file from URL: ${resumeUrl}`);

    // Fetch the actual resume file
    const fileResponse = await axios.get(resumeUrl, {
      params: { api_key: SJB_API_KEY }, // Include API key if required
      responseType: 'arraybuffer',
      headers: { 'Content-Type': 'application/json' }
    });

    const contentType = fileResponse.headers['content-type'] || 'application/pdf';
    console.log(`Retrieved resume with ID: ${resumeId}, size: ${Buffer.byteLength(fileResponse.data)} bytes, contentType: ${contentType}`);

    if (contentType === 'application/json') {
      console.warn(`Unexpected JSON response from resume URL for ID: ${resumeId}`);
      throw new Error(`Received JSON instead of binary data: ${Buffer.from(fileResponse.data).toString()}`);
    }

    return {
      data: fileResponse.data,
      contentType: contentType,
      fileName: fileResponse.headers['content-disposition']
        ? fileResponse.headers['content-disposition'].split('filename=')[1].replace(/"/g, '')
        : `resume_${resumeId}.pdf`
    };
  } catch (error) {
    console.error(`Resume fetch error for ID ${resumeId}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Fetch job applications for a specific email
 * @param {string} email - Job seeker's email
 * @returns {Promise<Array>} List of job applications
 */
async function fetchApplicationsByEmail(email) {
  if (!email) {
    console.error("No email provided to fetchApplicationsByEmail");
    throw new Error("Email is required");
  }

  return fetchJobApplications({ email });
}

/**
 * Fetch job applications for a specific job ID
 * @param {string} jobId - Job ID
 * @returns {Promise<Array>} List of job applications
 */
async function fetchApplicationsByJobId(jobId) {
  if (!jobId) {
    console.error("No jobId provided to fetchApplicationsByJobId");
    throw new Error("Job ID is required");
  }

  return fetchJobApplications({ job_id: jobId });
}

/**
 * Fetch resume data for a job seeker
 * @param {string} userId - Job seeker ID
 * @returns {Promise<Object>} Resume data, content type, and filename
 */
async function fetchJobSeekerResume(userId) {
  if (!userId) {
    console.error("No userId provided to fetchJobSeekerResume");
    throw new Error("User ID is required");
  }

  const { SJB_API_KEY } = process.env;
  const url = `https://absolutelyamerican.mysmartjobboard.com/api/jobseekers/${userId}/resume`;

  try {
    console.log(`Fetching resume for job seeker ID: ${userId}`);

    const response = await axios.get(url, {
      params: {
        api_key: SJB_API_KEY
      },
      responseType: 'arraybuffer' // For binary data like PDFs
    });

    console.log(`Retrieved resume for job seeker ID: ${userId}`);

    return {
      data: response.data,
      contentType: response.headers['content-type'],
      fileName: response.headers['content-disposition']
        ? response.headers['content-disposition'].split('filename=')[1].replace(/"/g, '')
        : `resume_${userId}.pdf`
    };
  } catch (error) {
    console.error(`SJB resume fetch error for ID ${userId}:`, error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  fetchJobSeekersFromSJB,
  fetchJobSeekerProfileDetails,
  fetchJobSeekerResume,
  fetchJobApplications,
  fetchResumeById,
  fetchApplicationsByEmail,
  fetchApplicationsByJobId,
  fetchJobDetails,
  fetchJobSeekerPhoto,
};