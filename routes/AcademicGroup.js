import { Router } from 'express';
import * as academicController from '../controllers/AcademicGroup.js';

const router = Router();

router.post('/academic/group/add', academicController.addGroup);
router.get('/academic/groups', academicController.getGroups);
router.post('/add/multiple-teachers', academicController.addMultipleTeachers);
router.post('/add-teacher', academicController.addTeacher);
router.post('/remove-teacher', academicController.removeTeacher);
router.get('/add/teacher', academicController.getTeacherAndGroupData);
router.get('/required/data', academicController.getRequiredData)
router.get('/free/teacher/:academic_id', academicController.getFreeTeacher)


export default router;
