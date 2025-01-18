import * as classroomModel from "../models/Classroom.js";

export const addClassroomController = async (req, res) => {
    const { number, building, capacity } = req.body;
    try {
        const classroom = await classroomModel.addClassroom(number, building, capacity);
        res.status(200).json({
            message: 'Classroom added successfully',
            classroom,
        });
    } catch (error) {
        console.error('Error adding classroom:', error.message);
        res.status(500).json({ error: 'Failed to add classroom' });
    }
};

export const getClassroomsController = async (req, res) => {
    try {
        const classrooms = await classroomModel.getClassrooms();
        res.status(200).json({
            classrooms,
        });
    } catch (error) {
        console.error('Error getting classrooms:', error.message);
        res.status(500).json({ error: 'Failed to get classrooms' });
    }
};
