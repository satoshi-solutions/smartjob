const axios = require('axios');
const qs = require('qs'); // To stringify the form data
const { mapJobSeekerToZohoCandidate } = require('./DataTransformUtils');
require('dotenv').config();
const FormData = require('form-data');

const {
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REFRESH_TOKEN,
  ZOHO_CODE,
} = process.env;
const ZOHO_RECRUIT_API_BASE = 'https://recruit.zoho.com/recruit/v2';

async function getZohoAccessToken() {
  const url =  `https://accounts.zoho.com/oauth/v2/token`;
  const params = {
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
    code: ZOHO_CODE,
    grant_type: 'authorization_code',
    redirect_uri: "https://www.corporategray.com/"
  };

  const response = await axios.post(url, qs.stringify(params), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return response.data
}

async function getZohoAccessTokenFromRefresh() {
   const url =  `https://accounts.zoho.com/oauth/v2/token`;
  const params = {
    refresh_token: ZOHO_REFRESH_TOKEN,
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token',
  };

  const response = await axios.post(url, qs.stringify(params), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return response.data
}
async function getUsers(accessToken) {
  const response = await axios.get(`${ZOHO_RECRUIT_API_BASE}/users`, {
    headers: {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data;
}

async function createCandidateInZoho(accessToken, jobSeeker) {
  try {
    // Map job seeker data to Zoho candidate fields
    // Create candidate in Zoho
    const response = await axios.post(`${ZOHO_RECRUIT_API_BASE}/Candidates`, {
       data: [jobSeeker]
    }, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Extract candidate ID from response
    if (response.data &&
      response.data.data &&
      response.data.data[0] &&
      response.data.data[0].details &&
      response.data.data[0].details.id) {

      const candidateId = response.data.data[0].details.id;

      await uploadCandidateResume(accessToken, candidateId, jobSeeker.Resume);

      console.log(`Successfully created candidate in Zoho (ID: ${candidateId})`);
      return candidateId;
    } else {
      console.error('Unexpected Zoho response format:', response.data.data[0].details);
    }
  } catch (error) {
    console.error('Error creating candidate in Zoho:', error.message);
    if (error.response && error.response.data) {
      console.error('Zoho response:', error.response.data);
    }
  }
}

async function uploadCandidateResume(accessToken, candidateId, resume) {
  const url = `${ZOHO_RECRUIT_API_BASE}/Candidates/${candidateId}/Attachments?attachments_category=Resume&attachment_url=${resume}`;
  
   const fileResponse = await axios.get(resume, { responseType: 'stream' });

  const form = new FormData();
  console.log("Resume: ", resume);
  console.log("CandidateId: ",candidateId);
  form.append('attachmentUrl', resume);
 
  const response = await axios.post(url, form, {
    headers: {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data
}


async function getCandidates(accessToken) {
  const url = "https://recruit.zoho.com/recruit/v2/Candidates";
  const response = await axios.get(url, {
    headers: {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data
}

async function getSpecificCandidates(accessToken, candidateId) {
  const url = `https://recruit.zoho.com/recruit/v2/Candidates/${candidateId}`;
  const response = await axios.get(url, {
    headers: {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data
}

module.exports = {
  getZohoAccessToken,
  getUsers,
  createCandidateInZoho,
  getZohoAccessTokenFromRefresh,
  getCandidates,
  getSpecificCandidates
};