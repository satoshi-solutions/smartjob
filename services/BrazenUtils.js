const axios = require("axios");
require("dotenv").config();

const { BRAZEN_API_BASE, BRAZEN_EVENT_ID, BRAZEN_CLIENT_ID, BRAZEN_CLIENT_SECRET } = process.env;

async function getAuthToken(){
    const url = `${BRAZEN_API_BASE}/oauth2/token`;
    const params = {
        "client_id": BRAZEN_CLIENT_ID,
        "client_secret": BRAZEN_CLIENT_SECRET,
        "grant_type": "client_credentials"
    }

    const response = await axios.post(url, params);
    return response.data.access_token;
}
async function createBrazenRegistration(application, authToken) {
    try {
        const url = `${BRAZEN_API_BASE}/events/${BRAZEN_EVENT_ID}/registrations`;
        const params = {
            "email": application.job_seeker.email,
            "event_code": BRAZEN_EVENT_ID,
            "data": "Branch+of+service=Air+Force&Have+You+Served+on+Active+Duty%3F=Yes&End+of+Active+Duty+Service+Date=6%2F01%2F2010&Military+Rank+%28at+discharge%29=O-4&Honorable+Discharge=Yes&Job+Title=IT+PM%2FCyber+Manager&Highest+Education+Level=Masters+Degree&Security+Clearance=Top+Secret&Certifications%2FLicenses=PMP%2C+CISSP%2C+Security+Plus&Country=US&City=Panama+City+Beach&State+or+Province=FL&Zip+Code=32444&U.S+Citizen=Yes&Gender=Male&Ethnicity=White&Availability+Date=6%2F16%2F2025&LinkedIn+Profile+link=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fcertmonster%2F&Summary=&What+types+of+positions+are+you+looking+for%3F=Highly+Cleared+Tech+%28TS%2FSCI+and+above%29&Are+you+willing+to+relocate%3F=Yes&Geographic+Preference=Southeast&Geographic+Preference%2FRelocation+Notes=&Occupational+Preference=Information+Technology&Mobile+Number=%2B18503574400",
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

module.exports = {
    getAuthToken,
    createBrazenRegistration
}