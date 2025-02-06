import pool from '../db.js';
import * as curriculumModel from "./Group.js"; // Assuming db connection is handled here

export const addEvent = async (data) => {
    const { days, scienceGroupIds, courseIds, types, daysOfWeek, classrooms, slotIds } = data;
    const query = `
        INSERT INTO curriculum (
            id, science_group_id, course_id, course_lesson_type, academic_year_id, week_of_day,
            classroom, slot_id, created_at, created_by
        )
        SELECT
            COALESCE(new_id, nextval('curriculum_id_seq')),
            science_group_id, course_id, course_lesson_type, academic_year_id, week_of_day,
            classroom, slot_id, created_at, created_by
        FROM UNNEST(
                     $1::bigint[], 
                     $2::bigint[],
                     $3::bigint[],
                     $4::lesson_type[],
                     ARRAY[3]::int[], -- Academic year (constant for all rows)
                     $5::int[],
                     $6::text[],
                     $7::int[],
                     ARRAY[now()]::timestamp[], -- Created at (constant for all rows)
                     ARRAY[1]::int[]            -- Created by (constant for all rows)
             ) AS t(new_id, science_group_id, course_id, course_lesson_type, academic_year_id, week_of_day, classroom, slot_id, created_at, created_by)
        ON CONFLICT (id)
        DO UPDATE SET
            science_group_id = EXCLUDED.science_group_id,
                           course_id = EXCLUDED.course_id,
                           course_lesson_type = EXCLUDED.course_lesson_type,
                           academic_year_id = EXCLUDED.academic_year_id,
                           week_of_day = EXCLUDED.week_of_day,
                           classroom = EXCLUDED.classroom,
                           slot_id = EXCLUDED.slot_id,
                           created_at = EXCLUDED.created_at,
                           created_by = EXCLUDED.created_by;
    `;
    const values = [
        days.map(day => day.id || null),
        scienceGroupIds,
        courseIds,
        types,
        daysOfWeek,
        classrooms,
        slotIds
    ];
    return await pool.query(query, values);
};

export const getGroup = async (req, res) => {
    const query = `
        select id, name
        from groups where state = 1;`
    try {
        return await pool.query(query);
    }catch (error) {
        console.log(error);
        throw new Error(error);
    }
}

export const deleteCurriculum = async (id) => {
    const query = `UPDATE curriculum SET state = 0 WHERE id = $1;`;
    return await pool.query(query, [id]);
};

export const getAcademicGroupSchedule = async (groupId) => {
    const query = `SELECT id, week_of_day as day, slot_id, classroom, course_lesson_type as type
                   FROM curriculum WHERE science_group_id = $1 AND state = 1`;
    return await pool.query(query, [groupId]);
};



export const getStudentTimetable = async (startDate, groupId, teacherId) => {
    const query = `
        SELECT
            c.id,
            c.week_of_day,
            TO_CHAR(
                    (coalesce(null::date, CURRENT_DATE) - (EXTRACT(DOW FROM coalesce(null::date, CURRENT_DATE))::INTEGER) + INTERVAL '1 day' + (c.week_of_day - 1) * INTERVAL '1 day') + l.key1::interval,
                    'YYYY-MM-DD"T"HH24:MI:SS'
            ) AS start,
            TO_CHAR(
                    (coalesce(null::date, CURRENT_DATE) - (EXTRACT(DOW FROM coalesce(null::date, CURRENT_DATE))::INTEGER) + INTERVAL '1 day' + (c.week_of_day - 1) * INTERVAL '1 day') + l.key2::interval,
                    'YYYY-MM-DD"T"HH24:MI:SS'
            ) AS end,
        dc.name as course_name,
        CONCAT(
            regexp_replace(c.classroom, 'Room', chr(65 + trunc(random() * 4)::integer)),
            ' - ',
            dc.name
        ) AS title,
        regexp_replace(c.classroom, 'Room', chr(65 + trunc(random() * 4)::integer)) as location,
        case when c.course_lesson_type = 'LECTURE' then 'Ma''ruza' else 'Amaliy' end as course_lesson_type,
        case when teacher.teacher_name::varchar is null then 'O''qituvchi briktrilmagan' else teacher.teacher_name end as teacher
    FROM
        curriculum c
    LEFT JOIN
        lists l ON l.id = c.slot_id AND l.type_id = 10
    LEFT JOIN
        department_courses dc ON dc.id = c.course_id AND dc.state = 1
    left join lateral (
                       select  string_agg( regexp_replace(d.name, '(\\w+)\\s+(\\w).*', '\\1 \\2'), ', ') AS teacher_name
                       from science_group_teachers sct
                                left join department_teachers d on sct.teacher_id = d.id and d.state = 1
                       where sct.science_group_id = c.science_group_id and sct.state = 1 and sct.role = c.course_lesson_type
                       group by sct.science_group_id
                           ) teacher on true
   WHERE
        dc.id is not null and
         c.science_group_id IN (
        SELECT science_group_id FROM academic_group_assignments WHERE group_id = coalesce($1, 1) and state = 1)
        AND c.state = 1
        ORDER BY c.week_of_day
    `;
    return await pool.query(query, [groupId]);
};


export const getTeacherTimetable = async (teacherId) => {
    const query = `
        SELECT
            c.id,
            c.week_of_day,
            TO_CHAR(
                    (coalesce(null::date, CURRENT_DATE) - (EXTRACT(DOW FROM coalesce(null::date, CURRENT_DATE))::INTEGER) + INTERVAL '1 day' + (c.week_of_day - 1) * INTERVAL '1 day') + l.key1::interval,
                    'YYYY-MM-DD"T"HH24:MI:SS'
            ) AS start,
            TO_CHAR(
                    (coalesce(null::date, CURRENT_DATE) - (EXTRACT(DOW FROM coalesce(null::date, CURRENT_DATE))::INTEGER) + INTERVAL '1 day' + (c.week_of_day - 1) * INTERVAL '1 day') + l.key2::interval,
                    'YYYY-MM-DD"T"HH24:MI:SS'
            ) AS end,
        dc.name as course_name,
        CONCAT(
            regexp_replace(c.classroom, 'Room', chr(65 + trunc(random() * 4)::integer)),
            ' - ',
            dc.name
        ) AS title,
        regexp_replace(c.classroom, 'Room', chr(65 + trunc(random() * 4)::integer)) as location,
        case when c.course_lesson_type = 'LECTURE' then 'Ma''ruza' else 'Amaliy' end as course_lesson_type,
        case when teacher.teacher_name::varchar is null then 'O''qituvchi briktrilmagan' else teacher.teacher_name end as teacher
    FROM
        curriculum c
    LEFT JOIN
        lists l ON l.id = c.slot_id AND l.type_id = 10
    LEFT JOIN
        department_courses dc ON dc.id = c.course_id AND dc.state = 1
            left join science_groups sc on sc.id = c.science_group_id and sc.state = 1
    left join lateral (
                       select  string_agg(d.name, ', ') AS teacher_name
                       from science_group_teachers sct
                                left join department_teachers d on sct.teacher_id = d.id and d.state = 1
                       where sct.science_group_id = c.science_group_id and sct.state = 1 and sct.role = c.course_lesson_type
                       group by sct.science_group_id
                           ) teacher on true
   WHERE
        dc.id is not null and
        sc.id is not null and 
         c.science_group_id IN (
        SELECT science_group_id FROM science_group_teachers WHERE state = 1 and teacher_id = $1 and  c.course_lesson_type = role)
        AND c.state = 1
        ORDER BY c.week_of_day;
    `;
    return await pool.query(query, [teacherId]);
};
