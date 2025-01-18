import { Router } from "express";
import dotenv from "dotenv";


dotenv.config();

const router = Router();


router.post('/schedule/add-event', async (req, res) => {
    const client = await pool.connect();
    try {
        const { days, course_id, id } = req.body;

        // Prepare arrays for each column
        const scienceGroupIds = [];
        const courseIds = [];
        const types = [];
        const daysOfWeek = [];
        const classrooms = [];
        const slotIds = [];

        // Populate arrays from `days`, using `null` for missing IDs
        days.forEach(day => {
            scienceGroupIds.push(id); // Set from the main request
            courseIds.push(course_id); // Set from the main request
            types.push(day.type || 'default_type'); // Default for `type`
            daysOfWeek.push(day.day || 0); // Default for `day`
            classrooms.push(day.classroom || 'default_classroom'); // Default for `classroom`
            slotIds.push(day.slot_id || 0); // Default for `slot_id`
        });

        // SQL query using UNNEST and handling null IDs with a sequence
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

        // Execute query with arrays
        await client.query(query, [
            days.map(day => day.id || null), // Pass `null` if `id` is missing
            scienceGroupIds,
            courseIds,
            types,
            daysOfWeek,
            classrooms,
            slotIds
        ]);

        res.status(200).json({message: 'Successfully added'});
    } catch (error) {
        console.error(error);
        res.status(500).send('Error adding events');
    } finally {
        client.release();
    }
});

router.post('/delete/curriculum', async (req, res) => {
    const { id } = req.body;
    const client = await pool.connect();
    const  query = `update curriculum
set state = 0
where id = $1;`
    try {
        const result = await client.query(query, [id])
        res.status(200).json({message: 'Deleted curriculum'})
    }catch (e) {
        res.status(500).json({massage: e.message})
    }

})

router.get('/academic/group/schedule', async (req, res) => {
    const client = await pool.connect();
    const query = `select id, week_of_day as day, slot_id, classroom, course_lesson_type as  type
                   from curriculum where science_group_id = $1 and state = 1`
    try {
        const result = await client.query(query, [req.query.group_id])
        res.status(200).json({result: result.rows})
    }catch (e) {
        res.status(500).json({massage: e.message})
    }
})


router.get('/student/timetable', async (req, res) => {
    const client = await pool.connect();
    const query = `
        SELECT
            c.id,
            c.week_of_day,
            TO_CHAR(
                    (coalesce($1::date, CURRENT_DATE) - (EXTRACT(DOW FROM coalesce($1::date, CURRENT_DATE))::INTEGER) + INTERVAL '1 day' + (c.week_of_day - 1) * INTERVAL '1 day') + l.key1::interval,
                    'YYYY-MM-DD"T"HH24:MI:SS'
            ) AS start,
            TO_CHAR(
                    (coalesce($1::date, CURRENT_DATE) - (EXTRACT(DOW FROM coalesce($1::date, CURRENT_DATE))::INTEGER) + INTERVAL '1 day' + (c.week_of_day - 1) * INTERVAL '1 day') + l.key2::interval,
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
        case when sct.name is null then 'O''qituvchi briktrilmagan' else sct.name end as teacher
    FROM
        curriculum c
    LEFT JOIN
        lists l ON l.id = c.slot_id AND l.type_id = 10
    LEFT JOIN
        department_courses dc ON dc.id = c.course_id AND dc.state = 1
left join lateral (
                       select STRING_AGG(dt.name, ', ') AS name
                       from science_group_teachers sct
                                left join department_teachers dt on dt.teacher_id = sct.teacher_id and dt.state = 1
                       where sct.science_group_id = c.science_group_id and sct.state = 1
                         and sct.role = c.course_lesson_type)  sct on true
    WHERE
        dc.id is not null 
        AND c.state = 1
        AND c.science_group_id IN (
        SELECT science_group_id FROM science_group_students WHERE student_id = 1
        )
        ORDER BY c.week_of_day;`;

    try {
        const result = await client.query(query, [req.query.start_date]);
        res.status(200).json({ result: result.rows });
    } catch (e) {
        res.status(500).json({ message: e.message });
    } finally {
        client.release();
    }
});


export default router;