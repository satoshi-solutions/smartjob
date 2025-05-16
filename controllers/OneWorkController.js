const { getAuthToken, createBrazenRegistration } = require("../services/BrazenUtils")
const { mapJobSeekerToZohoCandidate } = require("../services/DataTransformUtils")
const { fetchJobApplications, fetchJobDetail } = require("../services/SJBUtils")
const { getZohoAccessTokenFromRefresh, createCandidateInZoho } = require("../services/ZohoUtils")
const { SJB_JOB_ID } = process.env;

async function OneWork() {
    
    const applications = await fetchJobApplications()
    const accessToken = await getZohoAccessTokenFromRefresh()
    const brazenToken = await getAuthToken()

    for (const application of applications) {
        console.log("Application: ", application)
        try {
            const jobData = await fetchJobDetail(SJB_JOB_ID);
            const candidateData = mapJobSeekerToZohoCandidate(application, jobData)
            const candidateId = await createCandidateInZoho(accessToken.access_token, candidateData)
            console.log("Candidate ID: ", candidateId)

            await createBrazenRegistration(application, brazenToken)
        }
        catch (e) {
            console.log("Error Occurred: ")
        }
        
    }

    // const users = await getCandidates(accessToken.access_token)
    // console.log("Users: ", users)
    
   
}

module.exports = {
    OneWork
}