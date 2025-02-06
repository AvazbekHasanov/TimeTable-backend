// models/scheduleModel.js
import  pool  from "../db.js"; // Assuming `db` file handles database connection

export const getSchedule = async (teacherId, studentId) => {
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
            case when teacher.name is null then 'O''qituvchi briktrilmagan' else teacher.name end as teacher
        FROM
            curriculum c
                LEFT JOIN
            lists l ON l.id = c.slot_id AND l.type_id = 10
                LEFT JOIN
            department_courses dc ON dc.id = c.course_id AND dc.state = 1
                left join lateral (
                select  string_agg(d.name, ', ') AS name
                from science_group_teachers sct
                         left join department_teachers d on sct.teacher_id = d.id and d.state = 1
                where sct.science_group_id = c.science_group_id and sct.state = 1 and sct.role = c.course_lesson_type
                group by sct.science_group_id
                    ) teacher on true
        WHERE
            c.state = 1
          AND
            dc.state = 1 and
            case when $1::integer is not null then c.science_group_id IN (
                SELECT science_group_id FROM science_group_teachers WHERE state = 1 and teacher_id = $1::integer and  c.course_lesson_type = role)
                 when $2::integer is not null  then
                     c.science_group_id IN (
                         SELECT science_group_id FROM academic_group_assignments WHERE group_id = $2::integer)
                 else false end
        ORDER BY
            c.week_of_day;
    `;


    try {
        const result = await pool.query(query, [teacherId, studentId]);
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
