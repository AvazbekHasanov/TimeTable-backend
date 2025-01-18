// controllers/teacherController.js
import * as teacherModel from "../models/Teacher.js";

export const addTeacher = async (req, res) => {
    const { degree, teacher_name } = req.body;
    try {
        const teacher = await teacherModel.addTeacher(degree, teacher_name);
        res.status(201).json({
            message: 'Teacher added successfully',
            teacher: teacher,
        });
    } catch (error) {
        console.error('Error adding teacher:', error.message);
        res.status(500).json({ error: 'Failed to add teacher' });
    }
};

export const getTeachersAdmin = async (req, res) => {
    try {
        const teachers = await teacherModel.getAllTeachersAdmin();
        res.status(200).json(teachers);
    } catch (error) {
        console.error('Error fetching teachers:', error.message);
        res.status(500).json({ error: 'Failed to fetch teachers' });
    }
};

export const getTeachers = async (req, res) => {
    try {
        const teachers = await teacherModel.getAllTeachers();
        res.status(200).json(teachers);
    } catch (error) {
        console.error('Error fetching teachers:', error.message);
        res.status(500).json({ error: 'Failed to fetch teachers' });
    }
};
