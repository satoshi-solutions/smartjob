function extractField(customFields, fieldName) {
    const field = customFields.find(f => f.name === fieldName);
    if (!field) return null;
    if (Array.isArray(field.value)) return field.value[0] || null;
    return field.value || null;
}

function formToJSON(fields, label) {
    const value = extractField(fields, label);
    return value ? [value] : [];
}

function mapJobSeekerToZohoCandidate(application, jobData) {
    const jobSeeker = application.job_seeker;
    const resume = application.resume?.resume || '';
    const fields = jobSeeker.custom_fields || [];

    const [firstName = '', lastName = ''] = jobSeeker.full_name?.split(' ') || [];

    const zohoCandidate = {
        "Origin": "Sourced",

        "First_Name": firstName,
        "Last_Name": extractField(fields, "Last Name") || lastName,
        "Middle_Name": extractField(fields, "Middle Name"),

        "Email": jobSeeker.email,
        "Phone": extractField(fields, "Phone") || jobSeeker.phone || "",

        "Resume": resume,

        "Gender": extractField(fields, "Gender"),
        "Ethnicity": extractField(fields, "Ethnicity"),
        "Branch_of_service": extractField(fields, "Branch of service"),
        "Highest_Qualification_Held": extractField(fields, "Education Level"),
        "Occupational_Preference": extractField(fields, "Occupational Preference"),
        "Security_Clearance": extractField(fields, "Security Clearance"),
        "Willing_to_relocate": extractField(fields, "Willing to Relocate"),
        "Geographic_Preference": extractField(fields, "Geographic Preference"),
        "U_S_Citizen": extractField(fields, "U.S Citizen"),
        "End_of_Active_Duty_Service_Date": extractField(fields, "End of Active Duty Service Date"),
        "Military_Rank_at_discharge": formToJSON(fields, "Military Rank (at discharge)"),
        "LinkedIn_Handle": extractField(fields, "LinkedIn Handle"),

        "Country": jobSeeker.country || null,
        "City": extractField(fields, "City"),
        "State": extractField(fields, "State"),
        "Zip_Code": jobSeeker.zip_code,

        "Availability_Date": null,
        "Candidate_Status": "New",
        "Candidate_Stage": "New",
        "Fresh_Candidate": true,
        "Source": "Imported using Resume Extractor",

        "Skill_Set": jobData.categories?.join(", ") || "",
        "Current_Employer": null,
        "Current_Job_Title": jobData.title || null,

        "Have_You_Served_on_Active_Duty": "Yes",
        "Email_Opt_Out": false,
        "Is_Locked": false,
        "Is_Unqualified": false,
        "Is_Attachment_Present": true,
        "Associated_any_Social_Profiles": false,
        "Career_Page_Invite_Status": "To-be-invited"
    };

    return zohoCandidate;
}

function normalizeDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]; // "YYYY-MM-DD"
}

function formatToZohoDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date)) return null;
    return date.toISOString().split('T')[0]; // "YYYY-MM-DD"
}

function mapBrazenJobSeekerToZohoCandidate(jobData) {

    console.log('jobData-------------------', jobData)
    const decodeFormData = (dataStr) => {
        const params = new URLSearchParams(dataStr);
        const fields = {};
        for (const [key, value] of params.entries()) {
            fields[decodeURIComponent(key.replace(/\+/g, " "))] = decodeURIComponent(value.replace(/\+/g, " "));
        }
        return fields;
    };

    const fields = decodeFormData(jobData.data);

    // STEP 2: Helper function to safely extract fields
    const extractField = (fields, key) => fields?.[key] || null;

    // Optional: Use resume or jobSeeker data
    const resume = {
        // Assuming you have this
        certifications: ["Project Management", "Data Science"],
        summary: "15+ years in data analysis...",
        resume: "https://link.to/resume.pdf"
    };

    const jobSeeker = {
        email: jobData.email,
        phone: extractField(fields, "Mobile Number"),
        country: extractField(fields, "Country"),
        zip_code: extractField(fields, "Zip Code")
    };

    const firstName = jobData.first_name;
    const lastName = jobData.last_name;
    console.log('extractField(fields, "End of Active Duty Service Date")', extractField(fields, "End of Active Duty Service Date"))

    // STEP 3: Final zohoCandidate object
    const zohoCandidate = {
        "Origin": "Sourced",

        "First_Name": firstName,
        "Last_Name": extractField(fields, "Last Name") || lastName,
        "Middle_Name": extractField(fields, "Middle Name"),

        "Email": jobSeeker.email,
        "Phone": extractField(fields, "Phone") || jobSeeker.phone || "",

        "Resume": resume.resume || "",

        "Gender": extractField(fields, "Gender"),
        "Ethnicity": extractField(fields, "Ethnicity"),
        "Branch_of_service": extractField(fields, "Branch of service"),
        "Highest_Qualification_Held": extractField(fields, "Highest Education Level"),
        "Occupational_Preference": extractField(fields, "Occupational Preference"),
        "Security_Clearance": extractField(fields, "Security Clearance"),
        "Willing_to_relocate": extractField(fields, "Are you willing to relocate?"),
        "Geographic_Preference": extractField(fields, "Geographic Preference"),
        "U_S_Citizen": extractField(fields, "U.S Citizen"),
        "End_of_Active_Duty_Service_Date": normalizeDate(extractField(fields, "End of Active Duty Service Date")),
        "Military_Rank_at_discharge": [extractField(fields, "Military Rank (at discharge)")].filter(Boolean),
        "LinkedIn_Handle": extractField(fields, "LinkedIn Profile link"),

        "Country": jobSeeker.country || null,
        "City": extractField(fields, "City"),
        "State": extractField(fields, "State or Province"),
        "Zip_Code": jobSeeker.zip_code,

        "Availability_Date": formatToZohoDate(extractField(fields, "Availability Date")),
        "Candidate_Status": "New",
        "Candidate_Stage": "New",
        "Fresh_Candidate": true,
        "Source": "Imported using Resume Extractor",

        "Skill_Set": jobData.categories?.join(", ") || "",
        "Current_Employer": null,
        "Current_Job_Title": jobData.title || null,

        "Have_You_Served_on_Active_Duty": extractField(fields, "Have You Served on Active Duty?") || "No",
        "Email_Opt_Out": false,
        "Is_Locked": false,
        "Is_Unqualified": false,
        "Is_Attachment_Present": !!resume.resume,
        "Associated_any_Social_Profiles": false,
        "Career_Page_Invite_Status": "To-be-invited"
    };

    return zohoCandidate;
}

module.exports = {
    mapJobSeekerToZohoCandidate,
    mapBrazenJobSeekerToZohoCandidate
};
