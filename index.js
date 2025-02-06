import express from 'express';
import winston from 'winston';
import fs from 'fs';

import cors from 'cors';
import AcademicGroup from "./routes/AcademicGroup.js";
import Classroom from "./routes/Classroom.js";
import Course from "./routes/Course.js";
import Curriculum from "./routes/Curriculum.js";
import Overall from "./routes/Overall.js";
import Teacher from "./routes/Teacher.js";
import Group from "./routes/Group.js";


const app = express();
app.use(express.json());
app.use(express.static('public'));  // Assuming your HTML files are in 'public' folder



const corsOptions = {
    origin: '*',
    methods: 'GET,POST', // Allow only these methods
    allowedHeaders: ['Content-Type', 'Authorization'] // Allow only these headers
};

app.use(cors(corsOptions));


app.use(express.json());


const MAX_RESPONSE_SIZE = 128 * 100; // 100 KB limit for logging

// Initialize Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'app.log' })
    ]
});

// Middleware to log requests and responses
app.use((req, res, next) => {
    // Mask sensitive headers (e.g., Authorization, Cookies)
    const maskSensitiveHeaders = (headers) => {
        const maskedHeaders = { ...headers };
        if (maskedHeaders.authorization) maskedHeaders.authorization = '***MASKED***';
        if (maskedHeaders.cookie) maskedHeaders.cookie = '***MASKED***';
        return maskedHeaders;
    };

    // Mask sensitive request body fields (extend as needed)
    const maskSensitiveBody = (body) => {
        if (!body || typeof body !== 'object') return body;
        const maskedBody = { ...body };
        if (maskedBody.password) maskedBody.password = '***MASKED***';
        if (maskedBody.token) maskedBody.token = '***MASKED***';
        return maskedBody;
    };

    // Log the incoming request
    logger.info({
        message: 'Incoming Request',
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        headers: maskSensitiveHeaders(req.headers),
        body: maskSensitiveBody(req.body)
    });

    // Store the original send method to capture the response body
    const originalSend = res.send;
    let responseBody;

    res.send = function (body) {
        responseBody = body;
        return originalSend.call(this, body);
    };

    res.on('finish', () => {
        const responseSize = Buffer.byteLength(JSON.stringify(responseBody), 'utf8');

        if (responseSize > MAX_RESPONSE_SIZE) {
            logger.warn('Response too large, skipping logging.', {
                timestamp: new Date().toISOString(),
                status: res.statusCode,
                url: req.url,
                size: responseSize
            });
        } else {
            const logData = {
                timestamp: new Date().toISOString(),
                status: res.statusCode,
                headers: res.getHeaders(),
                body: responseBody
            };

            if (res.statusCode >= 400) {
                logger.error('Response Log With Error:', logData);
            } else {
                logger.info('Response Log:', logData);
            }
        }
    });

    next();
});


app.use('/api', AcademicGroup);
app.use('/api', Classroom);
app.use('/api', Course);
app.use('/api', Curriculum);
app.use('/api', Overall);
app.use('/api', Group);
app.use('/api', Teacher);
app.get('/api', function (req, res) {
    res.status(200).send('Hello world');
})


app.get('/logs', (req, res) => {
    const logFilePath = 'app.log';

    // Read logs from file
    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Could not read log file' });
        }

        // Convert log entries into an array
        const logs = data.trim().split('\n').map(line => {
            try {
                return JSON.parse(line); // Parse each log line as JSON
            } catch (error) {
                return { message: line }; // Return plain text if parsing fails
            }
        });

        res.json(logs.reverse()); // Return latest logs first
    });
});


const PORT = 3000;
const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

server.timeout = 120000; // 120,000 milliseconds = 2 minutes


