import pool from "../db.js"; // Import your DB connection pool

export const addClassroom = async (number, building, capacity) => {
    const query = `
        INSERT INTO classrooms (number, building, capacity, room_type)
        VALUES ($1, $2, $3, 'LECTURE') 
        RETURNING id, number, building, capacity;
    `;
    const values = [number, building, capacity];
    try {
        const result = await pool.query(query, values);
        return result.rows[0]; // Return the classroom data
    } catch (error) {
        throw new Error("Failed to add classroom: " + error.message);
    }
};

// Model to get list of classrooms
export const getClassrooms = async () => {
    const query = `
        SELECT id, number, building, capacity, CONCAT(building, ' ', number) AS name
        FROM classrooms 
        WHERE state = 1;
    `;
    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        throw new Error("Failed to get classrooms: " + error.message);
    }
};
