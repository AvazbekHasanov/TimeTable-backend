import { Router } from 'express';
import * as academicController from '../controllers/AcademicGroup.js';

const router = Router();

router.post('/academic/group/add', academicController.addGroup);
router.get('/academic/groups', academicController.getGroups);
router.post('/add/multiple-teachers', academicController.addMultipleTeachers);
router.post('/add-teacher', academicController.addTeacher);
router.post('/remove-teacher', academicController.removeTeacher);
router.get('/api/add/teacher', academicController.getTeacherAndGroupData);

export default router;
