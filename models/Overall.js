// models/scheduleModel.js
import  pool  from "../db.js"; // Assuming `db` file handles database connection

export const getSchedule = async (teacherId) => {
    const query = `
        SELECT
            c.id,
            c.week_of_day,
            l.key1 AS start,
            l.key2 AS "end",
            dc.name as course_name,
            CONCAT(
                    regexp_replace(c.classroom, 'Room', chr(65 + trunc(random() * 4)::integer)),
                    ' - ',
                    dc.name
            ) AS title,
            c.classroom as location,
            case when c.course_lesson_type = 'LECTURE' then 'Ma''ruza' else 'Amaliy' end as course_lesson_type,
            case when sct.name is null then 'O''qituvchi briktrilmagan' else sct.name end as teacher
        FROM
            curriculum c
                LEFT JOIN
            lists l ON l.id = c.slot_id AND l.type_id = 10
                LEFT JOIN
            department_courses dc ON dc.id = c.course_id AND dc.state = 1
                LEFT JOIN LATERAL (
                SELECT
                    STRING_AGG(dt.name, ', ') AS name
                FROM
                    science_group_teachers sct
                        LEFT JOIN
                    department_teachers dt
                    ON
                        dt.teacher_id = sct.teacher_id AND dt.state = 1
                WHERE
                    sct.science_group_id = c.science_group_id
                  AND sct.state = 1
                  AND sct.role = c.course_lesson_type
                  AND ($1::INTEGER IS NULL OR dt.teacher_id = $1::INTEGER)
                    ) sct ON true
        WHERE
            c.state = 1
          AND c.science_group_id IN (
            SELECT science_group_id FROM science_group_students WHERE student_id = 1
        )
        ORDER BY
            c.week_of_day;
    `;


    try {
        const result = await pool.query(query, [teacherId]);
        return result.rows;
    } catch (error) {
        throw new Error('Error fetching schedule: ' + error.message);
    }
};

export const deleteItemFromDatabase = async (tableName, id) => {
    const client = await pool.connect();

    try {
        const query = `
            UPDATE ${tableName}
            SET state = 0
            WHERE id = $1;
        `;
        const result = await client.query(query, [id]);
        return result.rows[0]; // returns the result, you can adjust this as per your needs
    } catch (error) {
        console.error('Database error:', error.message);
        throw new Error('Failed to delete item');
    } finally {
        client.release();
    }
};
