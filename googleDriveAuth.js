const { google } = require('googleapis');

// Function to authorize using the service account from an environment variable
async function authorize() {
    console.log('Starting authorization process...');
    try {
        // Retrieve and decode the environment variable containing the Base64-encoded credentials
        const base64Credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
        console.log('Base64 credentials retrieved from environment variable.');

        const jsonCredentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        console.log('Credentials decoded from Base64.');

        const credentials = JSON.parse(jsonCredentials);
        console.log('Credentials parsed successfully.');

        const { client_email, private_key } = credentials;
        console.log('Client email and private key extracted from credentials.');

        const auth = new google.auth.JWT(
            client_email,
            null,
            private_key,
            ['https://www.googleapis.com/auth/drive.file']
        );

        console.log('JWT client created. Authenticating...');
        await auth.authorize(); // This authenticates and prepares the JWT client
        console.log('Authentication successful.');

        const drive = google.drive({ version: 'v3', auth });
        console.log('Google Drive client initialized.');
        return drive; // Returns a Drive API client
    } catch (error) {
        console.error('Authorization failed:', error);
        return null; // Return null to indicate authorization failure
    }
}

module.exports = { authorize };
