import express from 'express';
import * as curriculumController from '../controllers/Curriculum.js';

const router = express.Router();

router.post('/schedule/add-event', curriculumController.addEvent);
router.post('/delete/curriculum', curriculumController.deleteCurriculum);
router.get('/academic/group/schedule', curriculumController.getAcademicGroupSchedule);
router.get('/student/timetable', curriculumController.getStudentTimetable);

export default router;
