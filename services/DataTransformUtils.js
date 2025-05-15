function mapJobSeekerToZohoCandidate(application) {
    const jobSeeker = application.job_seeker;
    const resume = application.resume.resume;

    return {
            "First_Name": jobSeeker.full_name.split(" ")[0],
            "Last_Name": jobSeeker.full_name.split(" ")[1]?jobSeeker.full_name.split(" ")[1]:"",
            "Email": jobSeeker.email,
            "Phone": jobSeeker.phone,
            "Resume": resume,
            "Country": jobSeeker.country,
            "City": jobSeeker.city,
            "State": jobSeeker.state,
            "Zip_Code": jobSeeker.zip_code,
    };
}

module.exports = {
    mapJobSeekerToZohoCandidate
}