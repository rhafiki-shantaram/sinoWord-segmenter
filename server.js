require('dotenv').config(); // Ensure this is the first line

const express = require("express");
const axios = require("axios");
const { PassThrough } = require("stream");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegStatic);
const { authorize } = require('./googleDriveAuth');
const app = express();

// Setting the port dynamically
const port = process.env.PORT || 3000;

async function uploadFileToDrive(stream, filename, folderId) {
    console.log('Starting upload to Google Drive...');
    const drive = await authorize();
    if (!drive) {
        console.error('Google Drive authentication failed.');
        throw new Error("Failed to authenticate with Google Drive.");
    }

    const fileMetadata = {
        name: filename,
        parents: [folderId]
    };
    console.log('File metadata created:', fileMetadata);

    const media = {
        mimeType: 'audio/mpeg',
        body: stream
    };
    console.log('Media stream prepared for upload.');

    try {
        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webContentLink'
        });
        console.log('File uploaded to Google Drive:', file.data);

        await drive.permissions.create({
            fileId: file.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });
        console.log('Permissions set for file:', file.data.id);

        return file.data.webContentLink;
    } catch (error) {
        console.error('Failed to upload file to Google Drive:', error);
        throw error;
    }
}

app.get("/process-audio", async (req, res) => {
    const { url, speed = 1.5, startTime = 0, duration = 5 } = req.query;
    const folderId = '1dcakZ4dVJ9wnMGrlOP_uZOg6xbkkP2wM';

    console.log('Received request to process audio:', { url, speed, startTime, duration });

    if (!url) {
        console.error('No URL provided in the request.');
        return res.status(400).send("Please provide a valid URL");
    }

    const filename = generateFilename();
    console.log('Generated filename:', filename);

    try {
        const response = await axios({
            url,
            method: "GET",
            responseType: "stream",
        });
        console.log('Audio stream fetched from URL.');

        const outputStream = new PassThrough();

        ffmpeg(response.data)
            .audioCodec('libmp3lame')
            .setStartTime(startTime)
            .duration(duration)
            .audioFilters(`atempo=${speed}`)
            .format('mp3')
            .on('end', async () => {
                console.log('Audio processing complete. Starting upload...');
                try {
                    const webContentLink = await uploadFileToDrive(outputStream, filename, folderId);
                    console.log('Audio uploaded successfully:', webContentLink);
                    res.send({ link: webContentLink });
                } catch (error) {
                    console.error('Failed to upload audio:', error);
                    res.status(500).send("Failed to upload audio to Google Drive");
                }
            })
            .on('error', (err) => {
                console.error('Error processing audio:', err);
                res.status(500).send('Error processing audio');
            })
            .pipe(outputStream, { end: true });
    } catch (error) {
        console.error('Error fetching audio:', error);
        res.status(500).send('Error fetching audio');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

function generateFilename() {
    const now = new Date();
    const dateString = now.toISOString().replace(/:/g, "-");
    console.log('Generating filename based on current date and time:', dateString);
    return `snippet-${dateString}.mp3`;
}
