import * as curriculumModel from '../models/Curriculum.js';

export const addEvent = async (req, res) => {
    const { days, course_id, id } = req.body;

    const scienceGroupIds = [];
    const courseIds = [];
    const types = [];
    const daysOfWeek = [];
    const classrooms = [];
    const slotIds = [];

    days.forEach(day => {
        scienceGroupIds.push(id);
        courseIds.push(course_id);
        types.push(day.type || 'default_type');
        daysOfWeek.push(day.day || 0);
        classrooms.push(day.classroom || 'default_classroom');
        slotIds.push(day.slot_id || 0);
    });

    try {
        await curriculumModel.addEvent({
            days, scienceGroupIds, courseIds, types, daysOfWeek, classrooms, slotIds
        });
        res.status(200).json({ message: 'Successfully added' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error adding events');
    }
};

export const deleteCurriculum = async (req, res) => {
    const { id } = req.body;
    try {
        await curriculumModel.deleteCurriculum(id);
        res.status(200).json({ message: 'Deleted curriculum' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getAcademicGroupSchedule = async (req, res) => {
    try {
        const result = await curriculumModel.getAcademicGroupSchedule(req.query.group_id);
        res.status(200).json({ result: result.rows });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getStudentTimetable = async (req, res) => {
    try {
        const result = await curriculumModel.getStudentTimetable(req.query.start_date,
            req.query.group_id, req.query.teacher_id);
        res.status(200).json({ result: result.rows});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getTeacherTimetable = async (req, res) => {
    try {
        const result = await curriculumModel.getTeacherTimetable( req.query.teacher_id);
        res.status(200).json({ result: result.rows});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const getGroup = async (req, res) => {
    try {
        const result = await curriculumModel.getGroup();
        res.status(200).json({ groups: result.rows });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
