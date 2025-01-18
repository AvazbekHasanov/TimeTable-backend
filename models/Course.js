import pool from "../db.js"; // Import the DB connection pool

// Model to add a course
export const addCourse = async (course_name, credit) => {
    const query = `
        INSERT INTO department_courses (name, department_id, credit, created_at, created_by)
        VALUES ($1, 2, $2, now(), 1)
        RETURNING id, name AS course_name, credit, TO_CHAR(created_at, 'DD.MM.YYYY') AS created_at;
    `;
    const values = [course_name, credit];
    try {
        const result = await pool.query(query, values);
        return result.rows[0]; // Return the course data
    } catch (error) {
        throw new Error("Failed to add course: " + error.message);
    }
};

// Model to get list of courses
export const getCourses = async () => {
    const query = `
        SELECT id, name AS course_name, credit, TO_CHAR(created_at, 'DD.MM.YYYY') AS created_at
        FROM department_courses 
        WHERE state = 1;
    `;
    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        throw new Error("Failed to get courses: " + error.message);
    }
};
