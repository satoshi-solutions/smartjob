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

function mapBrazenJobSeekerToZohoCandidate(application, jobData) {
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

module.exports = {
    mapJobSeekerToZohoCandidate,
    mapBrazenJobSeekerToZohoCandidate
};
