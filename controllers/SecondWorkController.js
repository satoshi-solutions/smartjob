const { getAuthToken, createBrazenRegistration, getBrazenRegistration, getBrazenRegistrationDetail } = require("../services/BrazenUtils")
const { mapJobSeekerToZohoCandidate } = require("../services/DataTransformUtils")
const { fetchJobApplications, fetchJobDetail, fetchJobSeekerWithEmail, createNewJobSeeker } = require("../services/SJBUtils")
const { getZohoAccessTokenFromRefresh, createCandidateInZoho, getCandidates, getSpecificCandidates } = require("../services/ZohoUtils")
const { SJB_JOB_ID } = process.env;

async function SecondWork() {

    // const brazenToken = await getAuthToken();
    // const brazenEvents = await getBrazenRegistration(brazenToken);


    const accessToken = await getZohoAccessTokenFromRefresh();
    console.log('accessToken', accessToken.access_token)
    const users = await getCandidates(accessToken.access_token);

    // for (const brazenEvent of brazenEvents) {
    //     try {
    //--------------------------Send data to Smart Job Board--------------------------------
    // const isAlreadySeeker = await fetchJobSeekerWithEmail(brazenEvent?.data?.email);
    // if (isAlreadySeeker.jobseekers.length != 0) {
    //     //Upload only Resume
    // }
    // else {
    //     console.log('brazenEvent', brazenEvent)
    //     const detailedBrazen = await getBrazenRegistrationDetail(brazenToken, brazenEvent.data.id);
    //     const formattedData = formatSeekerData(detailedBrazen);
    //     const result = await createNewJobSeeker(formattedData);
    //     console.log('---Result---', result)
    // }

    //--------------------------Send data to Zoho--------------------------------
    // for(const user of users.data) {
    //     if (user.email == brazenEvent?.data?.email) {
    //         console.log("User already exists in Zoho: ", user.email)
    //         continue;
    //     }
    // }
    // const zohoCandidate = await mapJobSeekerToZohoCandidate(formattedData);
    // const zohoCandidateId = await createCandidateInZoho(accessToken.access_token, zohoCandidate);
    // }
    // catch (e) {
    //     console.log("Error Occurred: ")
    // }

    // }


}

function formatSeekerData(jobseeker) {
    const parsedData = Object.fromEntries(new URLSearchParams(jobseeker.data));

    const getVal = (key, fallback = '') => parsedData[key] || fallback;

    const validEducationLevels = [
        "High School or GED",
        "Associates Degree",
        "Bachelors Degree or Higher",
        "Unspecified"
    ];

    const validBranches = [
        "Army",
        "Navy",
        "Air Force",
        "Marine Corps",
        "Coast Guard",
        "Army Reserve",
        "Navy Reserve",
        "Air Force Reserve",
        "Army National Guard",
        "Marine Corps Reserve",
        "Coast Guard Reserve",
        "Air National Guard",
        "Other",
        "Unspecified"
    ];

    const validSecurityClearanceMap = [
        "Secret",
        "Top Secret",
        "None",
        "Unspecified"
    ];

    const relocateMap = ["Yes", "No"];

    const newJobSeeker = {
        registration_date: jobseeker.registered_on,
        active: 1,
        Phone: getVal("Mobile Number", null),
        email: jobseeker.email,
        password: jobseeker.email,
        full_name: `${jobseeker.first_name || ""} ${jobseeker.last_name || ""}`.trim(),
        custom_fields: [
            { name: "Military Rank (at discharge)", value: null }, // changed from [] → null
            { name: "Activated At", value: null },
            { name: "First Name", value: jobseeker.first_name || null },
            { name: "Last Name", value: jobseeker.last_name || null },
            { name: "Gender", value: getVal("Gender") || null },
            { name: "Ethnicity", value: getVal("Ethnicity") || null },
            { name: "Phone", value: getVal("Mobile Number", null) },
            {
                name: "Branch of service",
                value: validBranches.includes(getVal("Branch of service")) ? getVal("Branch of service") : "Unspecified"
            },
            {
                name: "Education Level",
                value: validEducationLevels.includes(getVal("Highest Education Level")) ? getVal("Highest Education Level") : "Unspecified"
            },
            {
                name: "Occupational Preference",
                value: getVal("Occupational Preference") || null
            },
            {
                name: "Security Clearance",
                value: validSecurityClearanceMap.includes(getVal("Security Clearance")) ? getVal("Security Clearance") : "Unspecified"
            },
            {
                name: "Willing to Relocate",
                value: relocateMap.includes(getVal("Willing to Relocate")) ? getVal("Willing to Relocate") : "Yes"
            },
            { name: "State", value: getVal("State or Province", null) },
            { name: "City", value: getVal("City", null) },
            { name: "Zip Code", value: getVal("Zip Code", null) },
            {
                name: "Geographic Preference",
                value: getVal("Geographic Preference/Relocation Notes") || null
            },
            { name: "U.S Citizen", value: getVal("U.S Citizen") || null },
            { name: "End of Active Duty Service Date", value: null },
            { name: "Discharge Type", value: null }, // changed from [] → null
            { name: "LinkedIn Handle", value: getVal("LinkedIn Profile link") || null },
            { name: "Middle Name", value: null }
        ]
    };

    return newJobSeeker;
}



module.exports = {
    SecondWork
}



