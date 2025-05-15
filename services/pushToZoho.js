const axios = require('axios');
const { getZohoAccessToken } = require('./zohoAuth');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Base Zoho Recruit API URL
const ZOHO_RECRUIT_API_BASE = 'https://recruit.zoho.com/recruit/v2';

/**
 * Push job seeker data to Zoho Recruit
 * @param {Array} jobSeekers - Array of job seeker data with applications and resumes
 * @returns {Object} Response with success and counts
 */
async function pushJobSeekersToZoho(jobSeekers) {
  try {
    console.log(`Pushing ${jobSeekers.length} job seekers to Zoho`);
    const accessToken = await getZohoAccessToken();
    if (!accessToken) {
      throw new Error('Failed to get Zoho access token');
    }

    const results = {
      success: true,
      total: jobSeekers.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    for (const jobSeeker of jobSeekers) {
      try {
        if (!jobSeeker.email) {
          throw new Error('Job seeker missing email');
        }

        // Find or create candidate
        const existingCandidate = await findCandidateByEmail(accessToken, jobSeeker.email);
        let candidateId;

        if (existingCandidate) {
          await updateCandidateInZoho(accessToken, existingCandidate.id, jobSeeker);
          candidateId = existingCandidate.id;
          results.updated++;
        } else {
          candidateId = await createCandidateInZoho(accessToken, jobSeeker);
          results.created++;
        }

        // Process applications
        if (jobSeeker.applications?.length > 0) {
          const appResults = await addApplicationsToCandidate(accessToken, candidateId, jobSeeker.applications);
          console.log(`Processed ${appResults.added}/${jobSeeker.applications.length} applications for candidate ${candidateId}`);
        }

        // Upload resume
        if (jobSeeker.resume?.data) {
          const resumeUploaded = await uploadResumeToZoho(accessToken, candidateId, jobSeeker.resume);
          if (!resumeUploaded) {
            console.warn(`Failed to upload resume for candidate ${candidateId}`);
          }
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: jobSeeker.email || 'Unknown',
          error: error.message
        });
        console.error(`Failed to process job seeker ${jobSeeker.email}:`, error.message);
      }
    }

    console.log(`Zoho sync completed: ${results.created} created, ${results.updated} updated, ${results.failed} failed`);
    return results;
  } catch (error) {
    console.error('Zoho sync failed:', error.message);
    return { success: false, error: error.message, total: jobSeekers.length, created: 0, updated: 0, failed: jobSeekers.length };
  }
}

/**
 * Make an authenticated API request to Zoho
 * @param {string} accessToken - Zoho access token
 * @param {Object} options - Request options
 * @param {boolean} retry - Whether this is a retry attempt
 * @returns {Promise<Object>} API response
 */
async function makeZohoRequest(accessToken, options, retry = true) {
  try {
    if (!accessToken) {
      throw new Error('No access token provided to makeZohoRequest');
    }

    // Add authorization header
    const requestOptions = {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Zoho-oauthtoken ${accessToken}`
      }
    };

    // Make the request
    console.log(`Making Zoho API request to: ${requestOptions.url}`);
    const response = await axios(requestOptions);

    // Log success (but not the full response which might be large)
    console.log(`Zoho API request successful: ${requestOptions.url}`);
    return response;
  } catch (error) {
    const statusCode = error.response?.status;
    const errorCode = error.response?.data?.code;
    const errorMessage = error.response?.data?.message || error.message;

    console.error(`Zoho API request failed: ${options.url}, Status: ${statusCode}, Error: ${errorCode}, Message: ${errorMessage}`);

    // If the error is due to an invalid token or scope mismatch and this is not a retry
    if (retry &&
      error.response &&
      statusCode === 401 &&
      (errorCode === 'INVALID_TOKEN' ||
        errorCode === 'INVALID_OAUTH' ||
        errorCode === 'OAUTH_SCOPE_MISMATCH' ||
        errorMessage.includes('token'))) {

      console.log('Token error detected, refreshing token and retrying...');

      // Get a fresh token
      const newToken = await getZohoAccessToken();
      if (!newToken) {
        throw new Error('Failed to refresh token for retry. Authentication to Zoho failed.');
      }

      // Retry the request with the new token (but don't allow another retry)
      console.log('Retrying request with new token...');
      return makeZohoRequest(newToken, options, false);
    }

    // Otherwise, rethrow the error
    throw error;
  }
}

/**
 * Find a candidate in Zoho by email
 * @param {string} accessToken - Zoho access token
 * @param {string} email - Candidate email
 * @returns {Object|null} Candidate data or null if not found
 */
async function findCandidateByEmail(accessToken, email) {
  try {
    console.log(`Searching for candidate with email: ${email}`);

    // Use Zoho search API to find the candidate by email
    const response = await makeZohoRequest(accessToken, {
      method: 'get',
      url: `${ZOHO_RECRUIT_API_BASE}/Candidates/search?criteria=(Email:equals:${encodeURIComponent(email)})`
    });

    if (response.data && response.data.data && response.data.data.length > 0) {
      console.log(`Found existing candidate with email ${email} (ID: ${response.data.data[0].id})`);
      return {
        id: response.data.data[0].id,
        ...response.data.data[0]
      };
    }

    console.log(`No existing candidate found with email ${email}`);
    return null;
  } catch (error) {
    console.error(`Error finding candidate by email ${email}:`, error.message);
    if (error.response && error.response.data) {
      console.error('Zoho response:', error.response.data);
    }
    return null;
  }
}

/**
 * Create a new candidate in Zoho
 * @param {string} accessToken - Zoho access token
 * @param {Object} jobSeeker - Job seeker data
 * @returns {string} New candidate ID
 */
async function createCandidateInZoho(accessToken, jobSeeker) {
  try {
    console.log(`Creating new candidate in Zoho: ${jobSeeker.id || jobSeeker.email}`);

    // Map job seeker data to Zoho candidate fields
    const candidateData = mapJobSeekerToZohoCandidate(jobSeeker);

    // Create candidate in Zoho
    const response = await makeZohoRequest(accessToken, {
      method: 'post',
      url: `${ZOHO_RECRUIT_API_BASE}/Candidates`,
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        data: [candidateData]
      }
    });

    // Extract candidate ID from response
    if (response.data &&
      response.data.data &&
      response.data.data[0] &&
      response.data.data[0].details &&
      response.data.data[0].details.id) {

      const candidateId = response.data.data[0].details.id;
      console.log(`Successfully created candidate in Zoho (ID: ${candidateId})`);
      return candidateId;
    } else {
      console.error('Unexpected Zoho response format:', response.data);
      throw new Error('Failed to create candidate in Zoho: unexpected response format');
    }
  } catch (error) {
    console.error('Error creating candidate in Zoho:', error.message);
    if (error.response && error.response.data) {
      console.error('Zoho response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Update an existing candidate in Zoho
 * @param {string} accessToken - Zoho access token
 * @param {string} candidateId - Zoho candidate ID
 * @param {Object} jobSeeker - Job seeker data
 * @returns {boolean} Success status
 */
async function updateCandidateInZoho(accessToken, candidateId, jobSeeker) {
  try {
    console.log(`Updating candidate in Zoho (ID: ${candidateId})`);

    // Map job seeker data to Zoho candidate fields
    const candidateData = mapJobSeekerToZohoCandidate(jobSeeker);

    // Update candidate in Zoho
    const response = await makeZohoRequest(accessToken, {
      method: 'put',
      url: `${ZOHO_RECRUIT_API_BASE}/Candidates/${candidateId}`,
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        data: [candidateData]
      }
    });

    console.log(`Successfully updated candidate in Zoho (ID: ${candidateId})`);
    return true;
  } catch (error) {
    console.error(`Error updating candidate in Zoho (ID: ${candidateId}):`, error.message);
    if (error.response && error.response.data) {
      console.error('Zoho response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Map job seeker data to Zoho candidate fields
 * @param {Object} jobSeeker - Job seeker data
 * @returns {Object} Zoho candidate data
 */
function mapJobSeekerToZohoCandidate(jobSeeker) {
  const getCustomField = (fields, fieldName) => {
    const field = fields.find(f => f.name === fieldName);
    return field?.value ? String(field.value) : ''; // Convert to string
  };

  const customFields = jobSeeker.custom_fields || [];
  console.log('-------------jobSeeker-------------', jobSeeker);

  const educationDetails = {
    Level: jobSeeker.education || getCustomField(customFields, 'Education Level') || '',
    Institution: getCustomField(customFields, 'Education Institution') || '',
    Graduation_Year: getCustomField(customFields, 'Graduation Year') || ''
  };

  // Map experience details (assumes custom fields exist in Smart Job Board)
  const experienceDetails = {
    Years_of_Experience: getCustomField(customFields, 'Experience in Years') || jobSeeker.years_of_experience || '',
    Previous_Employer: getCustomField(customFields, 'Previous Employer') || '',
    Previous_Job_Title: getCustomField(customFields, 'Previous Job Title') || ''
  };

  const candidateData = {
    Email: jobSeeker.email || '',
    First_Name: jobSeeker.full_name || '',
    Last_Name: getCustomField(customFields, 'Last Name'),
    Mobile: getCustomField(customFields, 'Phone'),
    Street: getCustomField(customFields, 'Address') || '',
    City: getCustomField(customFields, 'City'),
    State: getCustomField(customFields, 'State'),
    Zip_Code: getCustomField(customFields, 'Zip Code'),
    Current_Employer: jobSeeker.current_employer || '',
    Current_Job_Title: jobSeeker.current_title || '',
    Experience_in_Years: jobSeeker.years_of_experience || '',
    Educational_Qualification: jobSeeker.education || getCustomField(customFields, 'Education Level'),
    Source: 'Smart Job Board',
    Candidate_Status: 'New',
    Educational_Details: JSON.stringify(educationDetails), // Store as JSON string in Zoho custom field
    Experience_Details: JSON.stringify(experienceDetails)
  };

  if (jobSeeker.sjb_candidate_id) {
    candidateData.SJB_Candidate_ID = jobSeeker.sjb_candidate_id;
  }

  if (jobSeeker.skills && Array.isArray(jobSeeker.skills) && jobSeeker.skills.length > 0) {
    candidateData.Skills = jobSeeker.skills.join(', ');
  }

  console.log('candidateData', candidateData);
  return candidateData;
}
/**
 * Upload resume to Zoho
 * @param {string} accessToken - Zoho access token
 * @param {string} candidateId - Zoho candidate ID
 * @param {Object} resume - Resume data with buffer, contentType and filename
 * @returns {boolean} Success status
 */

async function uploadResumeToZoho(accessToken, candidateId, resume) {
  try {
    console.log(`Uploading resume for candidate (ID: ${candidateId})`);

    if (!resume?.data) {
      console.warn('No resume data available for upload');
      return false;
    }

    const fileSizeMB = Buffer.byteLength(resume.data) / (1024 * 1024);
    if (fileSizeMB > 20) {
      console.error(`Resume size (${fileSizeMB}MB) exceeds Zoho limit for candidate ${candidateId}`);
      return false;
    }

    const fileExtension = path.extname(resume.fileName || '').toLowerCase();
    if (fileExtension === '.exe') {
      console.error(`Unsupported file type (.exe) for candidate ${candidateId}`);
      return false;
    }

    const form = new FormData();
    form.append('file', resume.data, {
      filename: resume.fileName || `resume_${candidateId}.pdf`,
      contentType: resume.contentType || 'application/pdf'
    });
    form.append('attachments_category', 'Resume');

    const response = await makeZohoRequest(accessToken, {
      method: 'post',
      url: `${ZOHO_RECRUIT_API_BASE}/Candidates/${candidateId}/Attachments`,
      headers: { ...form.getHeaders() },
      data: form
    });

    console.log(`Successfully uploaded resume for candidate (ID: ${candidateId})`);
    return true;
  } catch (error) {
    console.error(`Error uploading resume to Zoho (Candidate ID: ${candidateId}):`, error.message);
    if (error.response?.data) {
      console.error('Zoho response:', error.response.data);
    }
    return false;
  }
}

// Helper to identify transient errors (e.g., rate limits, network issues)
function isTransientError(error) {
  const status = error.response?.status;
  return status === 429 || // Rate limit
    status >= 500 || // Server errors
    error.code === 'ECONNRESET' || // Network issues
    error.code === 'ETIMEDOUT';
}

/**
 * Add applications as associated jobs to a candidate in Zoho
 * @param {string} accessToken - Zoho access token
 * @param {string} candidateId - Zoho candidate ID
 * @param {Array} applications - Applications data
 * @returns {Object} Results with counts
 */
async function addApplicationsToCandidate(accessToken, candidateId, applications) {
  try {
    console.log(`Adding ${applications.length} applications for candidate (ID: ${candidateId})`);

    const results = {
      total: applications.length,
      added: 0,
      failed: 0,
      errors: []
    };

    const existingAssociations = await getExistingAssociations(accessToken, candidateId);

    for (const application of applications) {
      try {
        if (!application.listing_id && !application.job.title) {
          console.warn(`Skipping application with missing job ID and title for candidate ${candidateId}`);
          results.failed++;
          results.errors.push({ error: 'Missing job ID and title' });
          continue;
        }

        let jobOpeningId = application.listing_id
          ? await findJobOpeningByExternalId(accessToken, application.listing_id)
          : null;

        if (!jobOpeningId) {
          jobOpeningId = await findOrCreateJobOpening(accessToken, {
            id: application.listing_id,
            title: application.job.title || 'Unknown Job',
            description: application.job.description || 'No description available'
          });
        }

        if (existingAssociations.includes(jobOpeningId)) {
          console.log(`Candidate ${candidateId} already associated with job ${jobOpeningId}`);
          results.added++;
          continue;
        }

        const success = await associateCandidateWithJob(
          accessToken,
          candidateId,
          jobOpeningId,
          application
        );

        if (success) {
          results.added++;
        } else {
          results.failed++;
          results.errors.push({ error: 'Failed to associate job' });
        }
      } catch (appError) {
        results.failed++;
        results.errors.push({ error: appError.message });
        console.error(`Error adding application for candidate ${candidateId}:`, appError.message);
      }
    }

    console.log(`Application sync results for candidate ${candidateId}: ${results.added} added, ${results.failed} failed`);
    return results;
  } catch (error) {
    console.error(`Error adding applications for candidate ${candidateId}:`, error.message);
    return { total: applications.length, added: 0, failed: applications.length, errors: [error.message] };
  }
}

/**
 * Get existing job associations for a candidate
 * @param {string} accessToken - Zoho access token
 * @param {string} candidateId - Zoho candidate ID
 * @returns {Array} Array of job opening IDs
 */
async function getExistingAssociations(accessToken, candidateId) {
  try {
    console.log(`Getting existing job associations for candidate (ID: ${candidateId})`);

    const response = await makeZohoRequest(accessToken, {
      method: 'get',
      url: `${ZOHO_RECRUIT_API_BASE}/Candidates/${candidateId}/associatejob`
    });

    if (response.data?.data?.length > 0) {
      const jobIds = response.data.data.map(assoc => assoc.Job_Opening_ID);
      console.log(`Found ${jobIds.length} existing job associations for candidate (ID: ${candidateId})`);
      return jobIds;
    }

    return [];
  } catch (error) {
    console.error(`Error getting existing associations for candidate (ID: ${candidateId}):`, error.message);
    return [];
  }
}

/**
 * Find a job opening in Zoho by external ID
 * @param {string} accessToken - Zoho access token
 * @param {string} externalId - External job ID
 * @returns {string|null} Job opening ID or null if not found
 */
async function findJobOpeningByExternalId(accessToken, externalId) {
  try {
    console.log(`Searching for job opening with external ID: ${externalId}`);

    const response = await makeZohoRequest(accessToken, {
      method: 'get',
      url: `${ZOHO_RECRUIT_API_BASE}/JobOpenings/search?criteria=(SJB_Job_ID:equals:${encodeURIComponent(externalId)})`
    });

    if (response.data?.data?.length > 0) {
      const jobId = response.data.data[0].id;
      console.log(`Found existing job opening with external ID ${externalId} (ID: ${jobId})`);
      return jobId;
    }

    console.log(`No job opening found with external ID: ${externalId}`);
    return null;
  } catch (error) {
    console.error(`Error finding job opening by external ID ${externalId}:`, error.response?.data || error.message);
    return null;
  }
}

async function findOrCreateJobOpening(accessToken, jobData) {
  try {
    console.log(`Finding or creating job opening: ${jobData.title}`);

    // Skip search by Posting_Title, create directly if external ID not found
    let jobOpeningId = jobData.id ? await findJobOpeningByExternalId(accessToken, jobData.id) : null;

    if (jobOpeningId) {
      console.log(`Found existing job opening with ID: ${jobOpeningId}`);
      return jobOpeningId;
    }

    console.log(`Creating new job opening: ${jobData.title}`);

    const jobOpeningData = {
      Job_Opening_Name: jobData.title || 'Unknown Job',
      Client_Name: 'Smart Job Board',
      Job_Description: jobData.description || 'No description available',
      Job_Opening_Status: 'Open',
      Number_of_Positions: 1,
      Date_Opened: new Date().toISOString().split('T')[0]
    };

    if (jobData.id) {
      jobOpeningData.SJB_Job_ID = jobData.id;
    }

    const createResponse = await makeZohoRequest(accessToken, {
      method: 'post',
      url: `${ZOHO_RECRUIT_API_BASE}/JobOpenings`,
      headers: { 'Content-Type': 'application/json' },
      data: { data: [jobOpeningData] }
    });

    if (createResponse.data?.data?.[0]?.details?.id) {
      const jobId = createResponse.data.data[0].details.id;
      console.log(`Successfully created job opening: ${jobData.title} (ID: ${jobId})`);
      return jobId;
    }

    throw new Error('Failed to create job opening in Zoho: unexpected response format');
  } catch (error) {
    console.error(`Error finding or creating job opening for "${jobData.title}":`, error.message);
    if (error.response?.data) {
      console.error('Zoho response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Associate candidate with job opening in Zoho
 * @param {string} accessToken - Zoho access token
 * @param {string} candidateId - Zoho candidate ID
 * @param {string} jobOpeningId - Zoho job opening ID
 * @param {Object} application - Application data
 * @returns {boolean} Success status
 */
async function associateCandidateWithJob(accessToken, candidateId, jobOpeningId, application) {
  try {
    console.log(`Associating candidate (ID: ${candidateId}) with job opening (ID: ${jobOpeningId})`);

    const associateData = {
      Candidate_ID: candidateId,
      Job_Opening_ID: jobOpeningId,
      Associate_Status: 'Applied',
      Submission_Date: application.application_date || new Date().toISOString().split('T')[0]
    };

    if (application.cover_letter) {
      associateData.Submission_Comment = application.cover_letter;
    } else if (application.comments) {
      associateData.Submission_Comment = application.comments;
    } else {
      associateData.Submission_Comment = 'Applied through Smart Job Board';
    }

    if (application.id) {
      associateData.SJB_Application_ID = application.id;
    }

    const response = await makeZohoRequest(accessToken, {
      method: 'post',
      url: `${ZOHO_RECRUIT_API_BASE}/Associate_Candidates`,
      headers: { 'Content-Type': 'application/json' },
      data: { data: [associateData] }
    });

    console.log(`Successfully associated candidate (ID: ${candidateId}) with job opening (ID: ${jobOpeningId})`);
    return true;
  } catch (error) {
    console.error(`Error associating candidate (ID: ${candidateId}) with job (ID: ${jobOpeningId}):`, error.message);
    throw error;
  }
}

module.exports = {
  pushJobSeekersToZoho
};