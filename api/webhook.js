const express = require('express');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
app.use(express.json());

// --- Configuration ---
// It is REQUIRED to set these as environment variables in Vercel
const EVALUAGENT_ACCESS_KEY_ID = process.env.EVALUAGENT_ACCESS_KEY_ID;
const EVALUAGENT_SECRET_KEY = process.env.EVALUAGENT_SECRET_KEY;
// Use the correct regional API URL for your Evaluagent account
const EVALUAGENT_API_URL = process.env.EVALUAGENT_API_URL || 'https://api.evaluagent.com/v1';


app.post('/api/webhook', async (req, res) => {
    console.log('Webhook received:', JSON.stringify(req.body, null, 2));

    // --- Data Mapping for Wildix 'call:completed' Payload ---

    // Ensure the essential 'data' and 'flows' arrays exist
    if (!req.body.data || !req.body.data.flows || req.body.data.flows.length === 0) {
        console.log("Webhook received, but it's missing the 'data.flows' array.");
        return res.status(200).send("Webhook received, but essential data is missing.");
    }

    const flow = req.body.data.flows[0];

    // Ensure the 'recordingsData' array exists and is not empty
    if (!flow.recordingsData || flow.recordingsData.length === 0 || !flow.recordingsData[0].url) {
        console.log('No recording URL found in the webhook payload.');
        return res.status(200).send('Webhook received, but no recording to process.');
    }

    // Extract data from the payload using the correct paths
    const callId = req.body.id;
    const agentEmail = flow.caller.email;
    // Convert the Unix timestamp (in milliseconds) to an ISO 8601 string
    const callStartTime = new Date(flow.startTime).toISOString();
    const recordingUrl = flow.recordingsData[0].url;
    const recordingFileName = flow.recordingsData[0].fileName;

    if (!agentEmail) {
        console.log('Agent email is missing from the payload.');
        return res.status(400).send('Cannot process webhook without agent email.');
    }
    
    try {
        // 1. Download the audio file from the Wildix URL
        console.log(`Downloading audio from: ${recordingUrl}`);
        const audioResponse = await axios({
            method: 'get',
            url: recordingUrl,
            responseType: 'stream',
        });

        // 2. Upload the audio to Evaluagent
        console.log('Uploading audio to Evaluagent...');
        const formData = new FormData();
        // Use the original file name from the payload
        formData.append('audio_file', audioResponse.data, recordingFileName);

        const authHeader = `Basic ${Buffer.from(`${EVALUAGENT_ACCESS_KEY_ID}:${EVALUAGENT_SECRET_KEY}`).toString('base64')}`;

        const uploadResponse = await axios.post(
            `${EVALUAGENT_API_URL}/quality/imported-contacts/upload-audio`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': authHeader,
                },
            }
        );

        const audioFilePath = uploadResponse.data.path;
        console.log(`Audio uploaded successfully. Path: ${audioFilePath}`);


        // 3. Create the Imported Contact in Evaluagent
        console.log('Creating imported contact in Evaluagent...');
        const importedContactPayload = {
            data: {
                reference: callId,
                agent_email: agentEmail,
                contact_date: callStartTime,
                channel: "Telephony", // Ensure this channel exists in your Evaluagent account
                audio_file_path: audioFilePath,
            },
        };

        const createContactResponse = await axios.post(
            `${EVALUAGENT_API_URL}/quality/imported-contacts`,
            importedContactPayload,
            {
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log('Imported contact created successfully:', createContactResponse.data);
        res.status(200).send('Webhook processed successfully.');

    } catch (error) {
        const errorMessage = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
        console.error('Error processing webhook:', errorMessage);
        res.status(500).send('Error processing webhook.');
    }
});

module.exports = app;
