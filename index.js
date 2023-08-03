const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const util = require('util');
const paypal = require('paypal-rest-sdk');

const app = express();
const PORT = 3030; // Change this to the desired port number

// Use bodyParser middleware to parse incoming request bodies as JSON
app.use(bodyParser.json());

// Configure the PayPal SDK with your client ID and secret
paypal.configure({
  mode: 'sandbox', // Change to 'live' for production
  client_id: 'AYmClw1seDfFBoKbkIu1tKgSS7JCpNvJFe2fucNRZ3AKN_MqchDC3TcWthS6xVFrpdEDTN5ZCywTZDkv',
  client_secret: 'EGLvCnjMt4Yo4k7GI-dEck-BwWJkAfJQYskop5w4ywc9SAIxD3pD6bg9GF_5WmN1TuYBMCQjP9zFvZ3i',
});

// Function to call the API and fetch data
async function fetchDataFromAPI(accessToken) {
  try {
    // Replace 'YOUR_API_ENDPOINT' with the actual API endpoint URL
    const apiUrl = 'https://api-m.sandbox.paypal.com/v1/oauth2/token';

    // Set the 'Authorization' header with the token
    const axiosConfig = {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    };

    // Make the API request using axios
    const response = await axios.get(apiUrl, axiosConfig);

    // Return the data received from the API
    return response.data;
  } catch (error) {
    // Handle any errors that occurred during the request
    console.error('Error:', error.message);
    return null; // Or handle the error in a way that suits your needs
  }
}

// Endpoint to handle incoming webhook notifications
app.post('/webhook', (req, res) => {
  // Process the incoming webhook data
  const webhookData = req.body;

  // Do something with the webhook data, e.g., save it to a database or trigger some action
  console.log('Received webhook data:', webhookData);

  // Respond with a 200 status code to acknowledge receipt of the webhook
  res.sendStatus(200);
});

// Function to get the access token
async function getAccessToken() {
  const clientId = 'AYmClw1seDfFBoKbkIu1tKgSS7JCpNvJFe2fucNRZ3AKN_MqchDC3TcWthS6xVFrpdEDTN5ZCywTZDkv';
  const clientSecret = 'EGLvCnjMt4Yo4k7GI-dEck-BwWJkAfJQYskop5w4ywc9SAIxD3pD6bg9GF_5WmN1TuYBMCQjP9zFvZ3i';
  const tokenEndpoint = 'https://api-m.sandbox.paypal.com/v1/oauth2/token';
  const authorizationCode = 'FIX_THIS';
  const redirectUri = 'YOUR_REDIRECT_URI';

  try {
    const response = await axios.post(tokenEndpoint, {
      grant_type: 'authorization_code',
      code: authorizationCode,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    });

    const accessToken = response.data.access_token;
    console.log('Access Token:', accessToken);
    return accessToken;
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

// Endpoint to handle OAuth callback
app.get('/oauth-callback', async (req, res) => {
  const authorizationCode = req.query.code;
  console.log('Authorization Code:', authorizationCode);
  
  // Now you have the authorizationCode, you can exchange it for an access token.
  const accessToken = await getAccessToken();
  if (accessToken) {
    // Call the API and fetch data using the access token
    const data = await fetchDataFromAPI(accessToken);

    // Do something with the fetched data
    console.log(data);

    // You can now display or use the fetched data on your dashboard

    // Respond with a success message
    res.send('Authorization Code Received Successfully!');
  } else {
    // Respond with an error message
    res.status(500).send('Error: Unable to get access token.');
  }
});

// Create a webhook and subscribe it to transaction events
const createWebhook = () => {
  const webhookData = {
    url: `http://localhost:${PORT}/webhook`, // Replace with your live server URL for production
    event_types: [
      {
        name: 'PAYMENT.SALE.COMPLETED',
      },
      {
        name: 'PAYMENT.SALE.DENIED',
      },
      // Add more event types as needed
    ],
  };

  const axiosInstance = axios.create({
    baseURL: 'https://api-m.sandbox.paypal.com',
    headers: {
      'Content-Type': 'application/json',
      // Add any other required headers here, such as authentication headers if needed
    },
  });

  const createWebhookPromise = util.promisify(axiosInstance.post); // Convert to a promise-based function
  createWebhookPromise('/v1/notifications/webhooks', webhookData)
    .then((response) => {
      console.log('Webhook created successfully:', response.data.id);
    })
    .catch((error) => {
      console.error('Error creating webhook:', error.message);
    });
};

// Call the function to create the webhook
createWebhook();

// Start the server and call createWebhook function inside the listen callback
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  createWebhook(); // Call the function to create the webhook after
});