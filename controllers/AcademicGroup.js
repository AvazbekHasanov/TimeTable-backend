import * as academicModel from '../models/AcademicGroup.js';

export const addGroup = async (req, res) => {
    const { course_id, name } = req.body;
    try {
        const group = await academicModel.addGroup(course_id, name);
        await academicModel.addStudentToGroup(group.id);
        res.status(200).json({
            message: 'Group added successfully',
            teacher: group,
        });
    } catch (error) {
        console.error('Error adding group:', error.message);
        res.status(500).json({ error: 'Failed to add group' });
    }
};

export const getGroups = async (req, res) => {
    try {
        const groups = await academicModel.getAllGroups();
        res.status(200).json({ result: groups });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const addMultipleTeachers = async (req, res) => {
    const { science_group_id, teachers, course_lesson_type } = req.body;
    try {
        await academicModel.updateTeacherState(science_group_id, course_lesson_type);
        const insertedRows = await academicModel.insertTeachers(science_group_id, teachers, course_lesson_type);
        res.status(200).json({
            message: "Teachers updated and added successfully",
            insertedRows: insertedRows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const addTeacher = async (req, res) => {
    const { science_group_id, teacher_id, course_lesson_type } = req.body;
    try {
        const result = await academicModel.addTeacher(science_group_id, teacher_id, course_lesson_type);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json(err);
    }
};

export const removeTeacher = async (req, res) => {
    const { id, course_lesson_type } = req.body;
    try {
        const rowsUpdated = await academicModel.removeTeacher(id, course_lesson_type);
        res.status(200).json({
            message: 'Teacher removed successfully',
            rowsUpdated: rowsUpdated,
        });
    } catch (error) {
        console.error('Error removing teacher:', error.message);
        res.status(500).json({ error: 'Failed to remove teacher' });
    }
};

export const getTeacherAndGroupData = async (req, res) => {
    try {
        const data = await academicModel.getTeacherAndGroupData();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
