const axios = require('axios');
require('dotenv').config();

// Zoho API credentials from environment variables
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;

// In-memory token cache
let cachedToken = null;
let tokenExpiry = null;

/**
 * Get a Zoho access token
 * @returns {Promise<string|null>} The access token or null if failed
 */
async function getZohoAccessToken() {
  try {
    // Check if we have a valid cached token
    if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
      console.log('Using cached Zoho token (expires in:', Math.floor((tokenExpiry - new Date()) / 1000), 'seconds)');
      return cachedToken;
    }

    // Validate required environment variables
    if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
      console.error('Missing required Zoho credentials in environment variables');
      return null;
    }

    console.log('Requesting new Zoho access token...');
    console.log(`Using Client ID starting with: ${ZOHO_CLIENT_ID.substring(0, 5)}...`);
    console.log(`Using Refresh Token starting with: ${ZOHO_REFRESH_TOKEN.substring(0, 5)}...`);

    // Create the full URL with query parameters properly encoded
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      refresh_token: ZOHO_REFRESH_TOKEN
    });

    const url = `https://accounts.zoho.com/oauth/v2/token?${params.toString()}`;
    
    const response = await axios.post(url);
    
    if (!response.data || !response.data.access_token) {
      console.error('Invalid response from Zoho:', response.data);
      return null;
    }

    // Cache the token with expiry (subtract 5 minutes for safety)
    cachedToken = response.data.access_token;
    const expiresInSeconds = response.data.expires_in || 3600; // Default to 1 hour if not specified
    tokenExpiry = new Date(Date.now() + (expiresInSeconds * 1000) - (5 * 60 * 1000));
    
    console.log(`Successfully obtained Zoho access token, expires in ${expiresInSeconds} seconds`);
    console.log(`Token starts with: ${cachedToken.substring(0, 10)}...`);
    
    return cachedToken;
  } catch (error) {
    console.error('Error obtaining Zoho access token:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    return null;
  }
}

// Simple function to test the token acquisition
async function testZohoConnection() {
  try {
    const token = await getZohoAccessToken();
    if (token) {
      console.log('✅ Zoho connection test successful');
      return true;
    } else {
      console.error('❌ Zoho connection test failed: Could not obtain access token');
      return false;
    }
  } catch (error) {
    console.error('❌ Zoho connection test failed with error:', error.message);
    return false;
  }
}

module.exports = {
  getZohoAccessToken,
  testZohoConnection
};