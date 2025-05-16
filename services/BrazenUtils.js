const axios = require("axios");
require("dotenv").config();
const { fetchJobDetail } = require("./SJBUtils");

const { BRAZEN_API_BASE, BRAZEN_EVENT_ID, BRAZEN_CLIENT_ID, BRAZEN_CLIENT_SECRET, SJB_JOB_ID } = process.env;

async function getAuthToken() {
    const url = `${BRAZEN_API_BASE}/oauth2/token`;
    const params = {
        "client_id": BRAZEN_CLIENT_ID,
        "client_secret": BRAZEN_CLIENT_SECRET,
        "grant_type": "client_credentials"
    }

    const response = await axios.post(url, params);
    return response.data.access_token;
}

function buildBrazenFormData(application, jobData) {
    const seeker = application.job_seeker;
    const resume = application.resume;

    // Convert custom_fields to an object
    const customFieldMap = {};
    for (const field of seeker.custom_fields || []) {
        customFieldMap[field.name] = Array.isArray(field.value) ? field.value.join(", ") : field.value;
    }

    const formEntries = {
        "Branch of service": customFieldMap["Branch of service"] || "",
        "Have You Served on Active Duty?": customFieldMap["Activated At"] ? "Yes" : "No",
        "End of Active Duty Service Date": customFieldMap["End of Active Duty Service Date"] || "",
        "Military Rank (at discharge)": customFieldMap["Military Rank (at discharge)"] || "",
        "Honorable Discharge": customFieldMap["Discharge Type"] || "",
        "Job Title": jobData?.title || "",
        "Highest Education Level": customFieldMap["Education Level"] || "",
        "Security Clearance": customFieldMap["Security Clearance"] || "",
        "Certifications/Licenses": resume?.certifications?.join(", ") || "",
        "Country": seeker.country || "US",
        "City": customFieldMap["City"] || "",
        "State or Province": customFieldMap["State"] || "",
        "Zip Code": customFieldMap["Zip Code"] || "",
        "U.S Citizen": customFieldMap["U.S Citizen"] || "",
        "Gender": customFieldMap["Gender"] || "",
        "Ethnicity": customFieldMap["Ethnicity"] || "",
        "Availability Date": customFieldMap["Activated At"] || "",
        "LinkedIn Profile link": customFieldMap["LinkedIn Handle"] || "",
        "Summary": resume?.summary || "",
        "What types of positions are you looking for?": customFieldMap["Occupational Preference"] || "",
        "Are you willing to relocate?": customFieldMap["Willing to Relocate"] || "",
        "Geographic Preference": customFieldMap["Geographic Preference"] || "",
        "Geographic Preference/Relocation Notes": "",
        "Occupational Preference": customFieldMap["Occupational Preference"] || "",
        "Mobile Number": customFieldMap["Phone"] || seeker.Phone || "",
        "Resume": resume?.resume || "",
    };

    return Object.entries(formEntries)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join("&");
}



async function createBrazenRegistration(application, authToken) {
    try {
        const jobData = await fetchJobDetail(SJB_JOB_ID);
        const url = `${BRAZEN_API_BASE}/events/${BRAZEN_EVENT_ID}/registrations`;
        const formData = buildBrazenFormData(application, jobData);
        console.log('formData---------------', formData)
        const params = {
            "email": application.job_seeker.email,
            "event_code": BRAZEN_EVENT_ID,
            "data": formData,
            "first_name": application.job_seeker.full_name.split(" ")[0],
            "last_name": application.job_seeker.full_name.split(" ")[1],
        }

        const response = await axios.post(url, params, {
            headers: {
                "Authorization": `Bearer ${authToken}`,
                "Content-Type": "application/json"
            }
        });

        console.log("Brazen registration response:", response.data);
        return response.data
    }
    catch (error) {
        console.error("Error creating Brazen registration:", error.response ? error.response.data : error.message);
    }
}

async function getBrazenRegistration(authToken) {
    try {
        const url = `${BRAZEN_API_BASE}/events/${BRAZEN_EVENT_ID}/registrations`;
        const response = await axios.get(url, {
            headers: {
                "Authorization": `Bearer ${authToken}`,
                "Content-Type": "application/json"
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error getting Brazen registration:", error.response ? error.response.data : error.message);
    }
}

async function getBrazenRegistrationDetail(authToken, registration_id) {
    try {
        const url = `${BRAZEN_API_BASE}/events/${BRAZEN_EVENT_ID}/registrations/${registration_id}`;
        const response = await axios.get(url, {
            headers: {
                "Authorization": `Bearer ${authToken}`,
                "Content-Type": "application/json"
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error getting Brazen registration detail:", error.response ? error.response.data : error.message);
    }
}


module.exports = {
    getAuthToken,
    createBrazenRegistration,
    getBrazenRegistration,
    getBrazenRegistrationDetail
}