import express from 'express';

import cors from 'cors';
import AcademicGroup from "./routes/AcademicGroup.js";
import Classroom from "./routes/Classroom.js";
import Course from "./routes/Course.js";
import Curriculum from "./routes/Curriculum.js";
import Overall from "./routes/Overall.js";
import Teacher from "./routes/Teacher.js";


const app = express();
app.use(express.json());


const corsOptions = {
    origin: '*',
    methods: 'GET,POST', // Allow only these methods
    allowedHeaders: ['Content-Type', 'Authorization'] // Allow only these headers
};

app.use(cors(corsOptions));


app.use(express.json());

app.use('/api', AcademicGroup);
app.use('/api', Classroom);
app.use('/api', Course);
app.use('/api', Curriculum);
app.use('/api', Overall);
app.use('/api', Teacher);
app.get('/api', function (req, res) {
    res.status(200).send('Hello world');
})


const PORT = 3000;
const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

server.timeout = 120000; // 120,000 milliseconds = 2 minutes


