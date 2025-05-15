const { getAuthToken, createBrazenRegistration } = require("../services/BrazenUtils")
const { mapJobSeekerToZohoCandidate } = require("../services/DataTransformUtils")
const { fetchJobApplications } = require("../services/SJBUtils")
const { getZohoAccessToken, getUsers, getZohoAccessTokenFromRefresh, getCandidates, createCandidateInZoho } = require("../services/ZohoUtils")

async function OneWork() {
    
    const applications = await fetchJobApplications()
    // const accessToken = await getZohoAccessToken()
    const accessToken = await getZohoAccessTokenFromRefresh()
    console.log("Access Token: ", accessToken)
    const brazenToken = await getAuthToken()
    console.log("Brazen Token: ", brazenToken)

    for (const application of applications) {
        console.log("Application: ", application)
        try {
            const candidateData = mapJobSeekerToZohoCandidate(application)
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