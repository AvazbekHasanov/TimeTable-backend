import * as courseModel from "../models/Course.js";

// Controller to handle adding a course
export const addCourseController = async (req, res) => {
    const { course_name, credit } = req.body;
    try {
        const course = await courseModel.addCourse(course_name, credit);
        res.status(201).json({
            message: 'Course added successfully',
            course,
        });
    } catch (error) {
        console.error('Error adding course:', error.message);
        res.status(500).json({ error: 'Failed to add course' });
    }
};

// Controller to handle getting the list of courses
export const getCoursesController = async (req, res) => {
    try {
        const courses = await courseModel.getCourses();
        res.status(200).json({
            courses,
        });
    } catch (error) {
        console.error('Error getting courses:', error.message);
        res.status(500).json({ error: 'Failed to get courses' });
    }
};
