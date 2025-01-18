import { Router } from "express";
import * as courseController from "../controllers/Course.js";

const router = Router();

// Route to add a course
router.post('/course/add', courseController.addCourseController);

// Route to get list of courses for admin
router.get('/course/list/admin', courseController.getCoursesController);

export default router;
