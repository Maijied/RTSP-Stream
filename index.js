const Stream = require('node-rtsp-stream');
const express = require('express');
const { spawn } = require('child_process');
const app = express();

let recordingProcess = null;

app.use(express.static('public'));
app.use(express.json()); // Middleware to parse JSON requests

let stream;  // Declare the stream variable outside to manage it dynamically

app.post('/start-recording', (req, res) => {
    if (recordingProcess) {
        return res.status(409).send('Already recording!');
    }

    const rtspLink = req.body.rtspLink;

    if (!rtspLink) {
        return res.status(400).send('RTSP link is missing');
    }

    // If a stream is already running, stop it before starting a new one
    if (stream) {
        stream.stop();
    }

    stream = new Stream({
        name: 'name',
        streamUrl: rtspLink,
        wsPort: 9999,
        ffmpegOptions: {
            '-stats': '',
            '-r': 30
        }
    });

    const outputPath = `./recordings/${Date.now()}.mp4`; // Dynamic filename based on timestamp
    recordingProcess = spawn('ffmpeg', [
        '-i', rtspLink,
        '-acodec', 'copy',
        '-vcodec', 'copy',
        outputPath
    ]);

    recordingProcess.on('exit', code => {
        console.log(`ffmpeg exited with code ${code}`);
        recordingProcess = null;
    });

    return res.send(`Started recording to ${outputPath}`);
});

app.get('/stop-recording', (req, res) => {
    if (!recordingProcess) {
        return res.status(409).send('Not currently recording.');
    }

    recordingProcess.kill('SIGINT'); // Sends an interrupt signal, allowing ffmpeg to finish gracefully
    return res.send('Stopped recording.');
});

app.listen(3000, () => {
    console.log('Node server started on http://localhost:3000');
});
