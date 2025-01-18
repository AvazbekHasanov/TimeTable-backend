// models/teacherModel.js
import pool from "../db.js"; // Assuming pool is already set up in a separate db.js file.

export const addTeacher = async (degree, teacher_name) => {
    const client = await pool.connect();
    const query = `
        INSERT INTO department_teachers (degree, department_id, created_at, created_by, name)
        VALUES ($1, 2, now(), 1, $2)
        RETURNING id, name as teacher_name, to_char(created_at, 'DD.MM.YYYY') as created_at, degree;
    `;
    const values = [degree, teacher_name];
    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    } finally {
        client.release();
    }
};

export const getAllTeachersAdmin = async () => {
    const client = await pool.connect();
    const query = `
        SELECT id, teacher_id, name as teacher_name, to_char(created_at, 'DD.MM.YYYY') as created_at, degree
        FROM department_teachers
        WHERE state = 1;
    `;
    try {
        const result = await client.query(query);
        return result.rows;
    } catch (error) {
        throw error;
    } finally {
        client.release();
    }
};

export const getAllTeachers = async () => {
    const client = await pool.connect();
    const query = `
        SELECT id, teacher_id, name as teacher_name
        FROM department_teachers
        WHERE state = 1;
    `;
    try {
        const result = await client.query(query);
        return result.rows;
    } catch (error) {
        throw error;
    } finally {
        client.release();
    }
};
