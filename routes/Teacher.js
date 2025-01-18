// routes/teacherRoutes.js
import { Router } from "express";
import * as teacherController from "../controllers/Teacher.js";

const router = Router();

router.post('/teacher/add', teacherController.addTeacher);
router.get('/teacher/list/admin', teacherController.getTeachersAdmin);
router.get('/teacher/list', teacherController.getTeachers);

export default router;
