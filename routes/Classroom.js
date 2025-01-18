import { Router } from "express";
import * as classroomController from "../controllers/Classroom.js";

const router = Router();

// Route to add a classroom
router.post('/add/classroom', classroomController.addClassroomController);

// Route to get list of classrooms for admin
router.get('/classroom/list/admin', classroomController.getClassroomsController);

export default router;
