const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const BRAZEN_API_BASE = process.env.BRAZEN_API_BASE || 'https://api.brazen.com/v1'; // Replace with actual Brazen API base URL
const BRAZEN_API_KEY = process.env.BRAZEN_API_KEY; // Store in .env
const BRAZEN_EVENT_ID = process.env.BRAZEN_EVENT_ID; // Static event ID from .env

/**
 * Push job seekers to Brazen for the static event
 * @param {Array} jobSeekers - Array of job seeker data with resumes
 * @returns {Object} Sync results
 */
async function pushJobSeekersToBrazen(jobSeekers) {
  try {
    console.log(`Pushing ${jobSeekers.length} job seekers to Brazen for event ${BRAZEN_EVENT_ID}`);
    
    if (!BRAZEN_API_KEY || !BRAZEN_EVENT_ID) {
      throw new Error('Missing Brazen API key or event ID in environment variables');
    }

    const results = {
      success: true,
      total: jobSeekers.length,
      created: 0,
      updated: 0,
      registered: 0,
      failed: 0,
      errors: []
    };

    for (const jobSeeker of jobSeekers) {
      try {
        if (!jobSeeker.email) {
          throw new Error('Job seeker missing email');
        }

        // Create or update candidate in Brazen
        const candidateId = await createOrUpdateBrazenCandidate(jobSeeker);
        const isNewCandidate = !candidateId.existed;

        // Upload resume if available
        let resumeUploaded = false;
        if (jobSeeker.resume?.data) {
          resumeUploaded = await uploadResumeToBrazen(candidateId.id, jobSeeker.resume);
        }

        // Register for the event (skip if already registered)
        const registered = await registerForBrazenEvent(candidateId.id, BRAZEN_EVENT_ID);

        // Update results
        if (isNewCandidate) {
          results.created++;
        } else {
          results.updated++;
        }
        if (registered) {
          results.registered++;
        }

        console.log(`Processed ${jobSeeker.email}: ${isNewCandidate ? 'created' : 'updated'}, ${resumeUploaded ? 'resume uploaded, ' : ''}${registered ? 'registered' : 'already registered'} for event ${BRAZEN_EVENT_ID}`);
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: jobSeeker.email || 'Unknown',
          error: error.message
        });
        console.error(`Failed to process ${jobSeeker.email} for Brazen:`, error.message);
      }
    }

    console.log(`Brazen sync completed: ${results.created} created, ${results.updated} updated, ${results.registered} registered, ${results.failed} failed`);
    return results;
  } catch (error) {
    console.error('Brazen sync failed:', error.message);
    return {
      success: false,
      error: error.message,
      total: jobSeekers.length,
      created: 0,
      updated: 0,
      registered: 0,
      failed: jobSeekers.length
    };
  }
}

/**
 * Create or update a candidate in Brazen
 * @param {Object} jobSeeker - Job seeker data
 * @returns {Object} { id: string, existed: boolean }
 */
async function createOrUpdateBrazenCandidate(jobSeeker) {
  try {
    // Check if candidate exists by email
    const existingCandidate = await findBrazenCandidateByEmail(jobSeeker.email);

    const candidateData = {
      email: jobSeeker.email,
      first_name: jobSeeker.full_name?.split(' ')[0] || '',
      last_name: jobSeeker.full_name?.split(' ').slice(1).join(' ') || '',
      phone: jobSeeker.custom_fields?.find(f => f.name === 'Phone')?.value || '',
      address: {
        street: jobSeeker.custom_fields?.find(f => f.name === 'Address')?.value || '',
        city: jobSeeker.custom_fields?.find(f => f.name === 'City')?.value || '',
        state: jobSeeker.custom_fields?.find(f => f.name === 'State')?.value || '',
        zip: jobSeeker.custom_fields?.find(f => f.name === 'Zip Code')?.value || ''
      },
      source: 'Smart Job Board'
      // Add other fields as required by Brazen
    };

    if (existingCandidate) {
      // Update existing candidate
      await makeBrazenRequest({
        method: 'put',
        url: `${BRAZEN_API_BASE}/candidates/${existingCandidate.id}`,
        data: candidateData
      });
      console.log(`Updated Brazen candidate ${existingCandidate.id}`);
      return { id: existingCandidate.id, existed: true };
    } else {
      // Create new candidate
      const response = await makeBrazenRequest({
        method: 'post',
        url: `${BRAZEN_API_BASE}/candidates`,
        data: candidateData
      });
      const candidateId = response.data.id; // Adjust based on Brazen's response structure
      console.log(`Created Brazen candidate ${candidateId}`);
      return { id: candidateId, existed: false };
    }
  } catch (error) {
    console.error(`Error creating/updating Brazen candidate for ${jobSeeker.email}:`, error.message);
    throw error;
  }
}

/**
 * Find a Brazen candidate by email
 * @param {string} email - Candidate email
 * @returns {Object|null} Candidate data or null if not found
 */
async function findBrazenCandidateByEmail(email) {
  try {
    const response = await makeBrazenRequest({
      method: 'get',
      url: `${BRAZEN_API_BASE}/candidates?email=${encodeURIComponent(email)}`
    });
    return response.data.candidates?.[0] || null; // Adjust based on Brazen's response structure
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error(`Error finding Brazen candidate by email ${email}:`, error.message);
    throw error;
  }
}

/**
 * Upload resume to Brazen
 * @param {string} candidateId - Brazen candidate ID
 * @param {Object} resume - Resume data
 * @returns {boolean} Success status
 */
async function uploadResumeToBrazen(candidateId, resume) {
  try {
    // Validate file size (assume 20MB limit, adjust per Brazen's docs)
    const fileSizeMB = Buffer.byteLength(resume.data) / (1024 * 1024);
    if (fileSizeMB > 20) {
      console.error(`Resume size (${fileSizeMB}MB) exceeds assumed limit for candidate ${candidateId}`);
      return false;
    }

    const form = new FormData();
    form.append('file', resume.data, {
      filename: resume.fileName || `resume_${candidateId}.pdf`,
      contentType: resume.contentType || 'application/pdf'
    });

    await makeBrazenRequest({
      method: 'post',
      url: `${BRAZEN_API_BASE}/candidates/${candidateId}/documents`,
      headers: form.getHeaders(),
      data: form
    });

    console.log(`Uploaded resume for Brazen candidate ${candidateId}`);
    return true;
  } catch (error) {
    console.error(`Failed to upload resume for Brazen candidate ${candidateId}:`, error.message);
    return false;
  }
}

/**
 * Register candidate for a Brazen event
 * @param {string} candidateId - Brazen candidate ID
 * @param {string} eventId - Brazen event ID
 * @returns {boolean} True if registered, false if already registered
 */
async function registerForBrazenEvent(candidateId, eventId) {
  try {
    // Check if already registered
    const registrations = await makeBrazenRequest({
      method: 'get',
      url: `${BRAZEN_API_BASE}/events/${eventId}/registrations?candidate_id=${candidateId}`
    });

    if (registrations.data.registrations?.length > 0) {
      console.log(`Candidate ${candidateId} already registered for event ${eventId}`);
      return false;
    }

    await makeBrazenRequest({
      method: 'post',
      url: `${BRAZEN_API_BASE}/events/${eventId}/registrations`,
      data: { candidate_id: candidateId }
    });

    console.log(`Registered candidate ${candidateId} for Brazen event ${eventId}`);
    return true;
  } catch (error) {
    if (error.response?.status === 409) { // Conflict, likely already registered
      console.log(`Candidate ${candidateId} already registered for event ${eventId}`);
      return false;
    }
    console.error(`Failed to register candidate ${candidateId} for event ${eventId}:`, error.message);
    throw error;
  }
}

/**
 * Make an authenticated API request to Brazen
 * @param {Object} options - Axios request options
 * @returns {Promise<Object>} API response
 */
async function makeBrazenRequest(options) {
  try {
    const requestOptions = {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${BRAZEN_API_KEY}`, // Adjust per Brazen's auth method
        'Content-Type': 'application/json'
      }
    };

    console.log(`Making Brazen API request to: ${requestOptions.url}`);
    const response = await axios(requestOptions);
    console.log(`Brazen API request successful: ${requestOptions.url}`);
    return response;
  } catch (error) {
    console.error(`Brazen API request failed: ${options.url}, Status: ${error.response?.status}, Error: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

module.exports = { pushJobSeekersToBrazen };