# Wildix to Evaluagent Webhook Integration

This project is a serverless function, designed to be hosted on Vercel, that acts as a webhook handler to integrate Wildix with Evaluagent. It automatically processes completed call recordings from Wildix and uploads them to Evaluagent for quality analysis.

## Overview

The core workflow is as follows:

1.  **Wildix `call:completed` Event:** A call is completed in Wildix, which triggers a pre-configured webhook.
2.  **Vercel Function Receives Webhook:** The Vercel-hosted function receives the `POST` request from Wildix containing the call data.
3.  **Download Audio:** The function extracts the recording URL from the webhook payload and downloads the audio file.
4.  **Upload to Evaluagent:** The audio file is uploaded to Evaluagent's `/upload-audio` endpoint.
5.  **Create Imported Contact:** The function then creates an "Imported Contact" in Evaluagent, linking the call metadata (agent email, call time, etc.) to the newly uploaded audio file.

## Project Structure

```
.
├── api/
│   └── webhook.js      # The core serverless function logic
├── .gitignore          # Specifies files for Git to ignore
├── package.json        # Project dependencies and scripts
└── vercel.json         # Vercel deployment configuration
```

## Setup and Deployment

Follow these steps to deploy your own instance of this integration.

### Prerequisites

*   A [GitHub](https://github.com/) account.
*   A [Vercel](https://vercel.com/) account (Hobby/Free tier is sufficient).
*   [Node.js](https://nodejs.org/) installed on your local machine.
*   [Git](https://git-scm.com/) installed on your local machine.
*   **Evaluagent API Credentials**: Your `Access Key ID` and `Secret Key`.
*   **Wildix Admin Access**: To configure webhooks.

### Step 1: Set Up the Repository

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/happyarmadillo/wildix-evaluagent-webhook.git
    cd wildix-evaluagent-webhook
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

### Step 2: Deploy to Vercel

1.  **Import Project:** Go to your [Vercel Dashboard](https://vercel.com/dashboard), click **Add New... > Project**, and import your forked/cloned GitHub repository.

2.  **Configure Environment Variables:** During the import process, expand the **Environment Variables** section. This is the most critical step for configuration. Add the following:
    *   `EVALUAGENT_ACCESS_KEY_ID`: Your Evaluagent Access Key ID.
    *   `EVALUAGENT_SECRET_KEY`: Your Evaluagent Secret Key.
    *   `EVALUAGENT_API_URL`: The regional API URL for your Evaluagent account (e.g., `https://api.evaluagent.com/v1`).

3.  **Deploy:** Click the **Deploy** button. Vercel will build and deploy the function. Once complete, you will be given a **Production URL** (e.g., `https://your-project-name.vercel.app`).

### Step 3: Configure the Wildix Webhook

1.  Log in to your Wildix admin panel.
2.  Navigate to the webhooks section.
3.  Create a new webhook for the **`call:completed`** event.
4.  In the URL field, paste your Vercel production URL, adding `/api/webhook` to the end.
    > **Example:** `https://your-project-name.vercel.app/api/webhook`
5.  Save the configuration. Your integration is now live.

---

## How to Customize the Code

This integration is designed to be easily amended for different use cases. All logic is contained within `api/webhook.js`.

### Changing the Webhook Data Mapping

If the Wildix payload structure changes in the future, you only need to edit one section of `api/webhook.js`.

Locate the **"Data Mapping"** block at the top of the `app.post` function. You must update the paths to point to the correct data in the new payload.

```javascript
// --- Data Mapping for Wildix 'call:completed' Payload ---

// ... (safety checks)

// This is the section to edit:
const callId = req.body.id;
const agentEmail = req.body.data.flows[0].caller.email;
const callStartTime = new Date(req.body.data.flows[0].startTime).toISOString();
const recordingUrl = req.body.data.flows[0].recordingsData[0].url;
const recordingFileName = req.body.data.flows[0].recordingsData[0].fileName;

// ...
```

### Changing Default Values

If you want to change the default channel sent to Evaluagent, modify the `importedContactPayload` object:

```javascript
// ...

const importedContactPayload = {
    data: {
        // ...
        channel: "Telephony", // <-- You can change this value
        // ...
    },
};

// ...
```

### Testing and Troubleshooting

*   **Vercel Logs:** The primary tool for troubleshooting is the **Logs** tab in your Vercel project dashboard. All `console.log()` statements and any errors from the function will appear here in real-time.
*   **Common Errors:**
    *   **401 Unauthorized:** Check that your `EVALUAGENT_ACCESS_KEY_ID` and `EVALUAGENT_SECRET_KEY` are correct in Vercel's environment variables.
    *   **400 Bad Request:** This often means the data being sent to Evaluagent is in the wrong format or is missing required fields. Check the Vercel logs for a more detailed error message from the Evaluagent API.
    *   **500 Internal Server Error:** This could be an issue with downloading the file, a problem with the script itself, or a temporary issue with one of the services. The Vercel logs are essential for diagnosing this.
