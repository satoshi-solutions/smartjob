# Smart Job Board to Zoho & Brazen Integration API

This backend API service provides seamless integration between Smart Job Board, Zoho Recruit, and Brazen Events, allowing job seekers to register for events through a streamlined process.

## Workflow

The integration follows this workflow:

1. Job seeker goes to Smart Job Board at https://app.brazenconnect.com/ 
2. Job seeker browses and clicks on a job posting
3. Job seeker registers/logs in to Smart Job Board and provides their information and resume
4. After registration, job seeker can see and click the "Event Registration" button
5. When clicked, Smart Job Board calls our API to get a pre-filled Brazen registration URL
6. Job seeker is redirected to Brazen with their data pre-filled from Smart Job Board
7. Job seeker data is also sent to Zoho Recruit (synced every minute)

## Setup Instructions

### Prerequisites

- Node.js 14.x or higher
- NPM or Yarn
- Zoho Recruit account with API access
- Smart Job Board account with API access
- Brazen Events account with API access

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with the following environment variables:
   ```
   ZOHO_CLIENT_ID=your_zoho_client_id
   ZOHO_CLIENT_SECRET=your_zoho_client_secret
   ZOHO_REFRESH_TOKEN=your_zoho_refresh_token
   SJB_API_KEY=your_sjb_api_key
   BRAZEN_CLIENT_ID=your_brazen_client_id
   BRAZEN_CLIENT_SECRET=your_brazen_client_secret
   ```

### Running the Application

Start the server using the included script:
```
./start.sh
```

Or manually:
```
npm install
node index.js
```

The server will run on port 5000 by default, or the port specified in the `PORT` environment variable.

## Testing

You can test the API using the included test script:
```
./test.sh
```

This will test all the API endpoints with sample data.

You can also test individual endpoints manually:

### Test API Status
```
curl http://localhost:5000/
```

### Test Webhook
```
curl -X POST http://localhost:5000/api/webhook/sjb-registration \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "phone": "1234567890",
    "resume_url": "https://example.com/resume.pdf"
  }'
```

### Test Event Link Generation
```
curl http://localhost:5000/api/brazen/event-link/event123?email=test@example.com
```

### Test Zoho Sync
```
curl -X POST http://localhost:5000/api/sync/zoho
```

### Smart Job Board API Testing

You can test the Smart Job Board API directly using the following curl commands:

### Get Job Seekers
```bash
curl "https://absolutelyamerican.mysmartjobboard.com/api/jobseekers?api_key=your_sjb_api_key&page=1&limit=10"
```

### Get Applications
```bash
curl "https://absolutelyamerican.mysmartjobboard.com/api/jobs/job/applications?api_key=your_sjb_api_key"
```

### Get Resume
```bash
curl "https://absolutelyamerican.mysmartjobboard.com/api/resumes/123?api_key=your_sjb_api_key" -o resume.pdf
```

## API Documentation

### Job Seekers

#### Get All Job Seekers
- **URL:** `/api/jobseekers`
- **Method:** `GET`
- **Description:** Returns a list of all job seekers from Smart Job Board.

### Applications

#### Get All Applications
- **URL:** `/api/applications`
- **Method:** `GET`
- **Query Params:** `job_id` (optional), `email` (optional), `page` (optional), `limit` (optional)
- **Description:** Returns a list of job applications. Can be filtered by job ID or applicant email.
- **Example:**
  ```
  GET /api/applications?job_id=123&limit=50
  ```

#### Get Applications by Job ID
- **URL:** `/api/applications/job/:jobId`
- **Method:** `GET`
- **Description:** Returns all applications for a specific job.
- **Example:**
  ```
  GET /api/applications/job/123
  ```

#### Get Applications by Email
- **URL:** `/api/applications/email/:email`
- **Method:** `GET`
- **Description:** Returns all applications submitted by a specific email address.
- **Example:**
  ```
  GET /api/applications/email/user@example.com
  ```

### Resumes

#### Get Resume by ID
- **URL:** `/api/resume/:resumeId`
- **Method:** `GET`
- **Description:** Returns a resume file by ID. The response is the binary file data with appropriate content type.
- **Example:**
  ```
  GET /api/resume/123
  ```

### Registration and Events

#### Generate Brazen Event Link
- **URL:** `/api/brazen/event-link/:eventId`
- **Method:** `GET`
- **Query Params:** `email` (required)
- **Description:** Generates a pre-filled Brazen registration link for the specified event. To be called by Smart Job Board when a user clicks an event registration button.
- **Example:**
  ```
  GET /api/brazen/event-link/event123?email=user@example.com
  ```

#### Prefill Brazen Registration
- **URL:** `/api/brazen/prefill`
- **Method:** `POST`
- **Body:** `{ "email": "user@example.com", "eventId": "event123" }`
- **Description:** Prefills a Brazen event registration form with job seeker data from SJB. This is typically called by Brazen's API.

### Smart Job Board Integration

#### Smart Job Board Registration Webhook
- **URL:** `/api/webhook/sjb-registration`
- **Method:** `POST`
- **Body:** Job seeker data from SJB
- **Description:** Webhook endpoint for Smart Job Board to call when a new job seeker registers or updates their profile.

### Zoho Integration

#### Zoho API Setup

To ensure proper integration with Zoho Recruit, follow these steps:

1. Create a Zoho Developer account at https://api-console.zoho.com/
2. Create a Self-Client application
3. Enable the Recruit API scope
4. Generate refresh token using your client ID and client secret
5. Add the required custom fields by running:
   ```
   ./setup-zoho-fields.js
   ```

This script will check if the required custom fields exist in your Zoho account and create them if needed:
- `SJB_Candidate_ID` in Candidates module
- `SJB_Job_ID` in JobOpenings module
- `SJB_Application_ID` in Associate_Candidates module

#### Testing Zoho Connection

To test your Zoho API connection:

```
./test-zoho.js
```

This script will verify that your Zoho credentials are correct and that you can obtain an access token.

#### Troubleshooting Zoho Authentication

If you encounter issues with Zoho authentication:

1. Verify that your `.env` file has the correct credentials:
   ```
   ZOHO_CLIENT_ID=your_client_id
   ZOHO_CLIENT_SECRET=your_client_secret
   ZOHO_REFRESH_TOKEN=your_refresh_token
   ```

2. Ensure that your refresh token is valid and hasn't expired
3. Check that you've granted the necessary API permissions (ZohoRecruit.*)
4. Run the `test-zoho.js` script to diagnose authentication issues

#### Manual Sync to Zoho
- **URL:** `/api/sync/zoho`
- **Method:** `POST`
- **Description:** Manually triggers a sync of job seekers from Smart Job Board to Zoho.

#### Sync Applications for Job
- **URL:** `/api/sync/applications/:jobId`
- **Method:** `POST`
- **Description:** Manually triggers a sync of applications for a specific job to Zoho.
- **Example:**
  ```
  POST /api/sync/applications/123
  ```

#### Sync Job Seeker by Email
- **URL:** `/api/sync/jobseeker/:email`
- **Method:** `POST`
- **Description:** Manually triggers a sync of a specific job seeker by email to Zoho.
- **Example:**
  ```
  POST /api/sync/jobseeker/user@example.com
  ```

## Smart Job Board Integration

### Webhook Configuration

To set up the webhook in Smart Job Board:

1. Go to your Smart Job Board admin dashboard
2. Navigate to Integrations > Webhooks
3. Add a new webhook with the URL: `https://yourdomain.com/api/webhook/sjb-registration`
4. Select the "Job Seeker Registration" event trigger
5. Enable the webhook

### Event Registration Button Integration

To add the integration to Smart Job Board's event registration button:

1. Use the Smart Job Board custom button feature to add a button to event pages
2. Set the button to call a JavaScript function when clicked
3. The function should call your API to get a Brazen registration link:
   ```javascript
   function registerForEvent(eventId, email) {
     fetch(`https://yourdomain.com/api/brazen/event-link/${eventId}?email=${encodeURIComponent(email)}`)
       .then(response => response.json())
       .then(data => {
         if (data.success && data.link) {
           window.location.href = data.link;
         } else {
           alert("Error generating registration link: " + (data.error || "Unknown error"));
         }
       })
       .catch(error => {
         console.error("Error:", error);
         alert("An error occurred. Please try again.");
       });
   }
   ```

## Scheduled Tasks

The application includes a cron job that syncs job seeker data from Smart Job Board to Zoho Recruit every minute to ensure data is up-to-date.

## Brazen Connect Integration

This integration is specifically designed to work with Brazen Connect (https://app.brazenconnect.com/). The API pulls job seeker data and resume from Smart Job Board and automatically loads it to the Brazen event registration page.

## Troubleshooting

- Check the console logs for error messages
- Verify that all API keys and credentials are correct in the `.env` file
- Ensure that the Zoho Refresh Token is valid and has the required permissions
- Make sure the Smart Job Board API key has access to the job seeker data
- Verify that the Brazen API credentials have access to create registrations

If you encounter specific errors, check the log messages for details about the issue. 