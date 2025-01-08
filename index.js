import express from 'express';
import pg from 'pg';

import cors from 'cors';

const { Pool } = pg;

const app = express();
app.use(express.json());

const corsOptions = {
    origin: '*',
    methods: 'GET,POST', // Allow only these methods
    allowedHeaders: ['Content-Type', 'Authorization'] // Allow only these headers
};

app.use(cors(corsOptions));
// PostgreSQL connection pool setup
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'avazbek0003',
    port: 5432,
    // ssl: {
    //     rejectUnauthorized: false, // Add this to allow self-signed certificates
    // },
});
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});

app.use(express.json());

async function generateSchedule() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');  // Start transaction

        // Fetch necessary data
        const slotsQuery = await client.query("SELECT * FROM slots ORDER BY slot_number ASC");
        const groupsPlanQuery = await client.query(
            `SELECT gp.group_id, gp.course_id, dc.credit
        FROM groups_plan gp
        JOIN department_courses dc ON gp.course_id = dc.id
        WHERE gp.state = 1`
    );
        const groupsQuery = await client.query("SELECT * FROM groups WHERE is_schedule_generated = false");
        const classroomsQuery = await client.query("SELECT * FROM classrooms WHERE state = 1");

        const slots = slotsQuery.rows;
        const groupsPlan = groupsPlanQuery.rows;
        const groups = groupsQuery.rows;
        const classrooms = classroomsQuery.rows;

        if (!slots.length || !groupsPlan.length || !groups.length || !classrooms.length) {
            throw new Error("Missing data: Ensure slots, groups, group plans, and classrooms are populated in the database.");
        }

        // Process each group
        for (const group of groups) {
            group.plans = groupsPlan.filter((p) => p.group_id === group.id);
            group.schedule = [];

            for (const p of group.plans) {
                let scheduleItems = [];

                switch (p.credit) {
                    case 2:
                        scheduleItems = [
                            { group_id: group.id, course_id: p.course_id, type: 'LECTURE', weekly_frequency: 1 },
                            { group_id: group.id, course_id: p.course_id, type: 'PRACTICAL', weekly_frequency: 1 }
                        ];
                        break;
                    case 4:
                        scheduleItems = [
                            { group_id: group.id, course_id: p.course_id, type: 'LECTURE', weekly_frequency: 1 },
                            { group_id: group.id, course_id: p.course_id, type: 'PRACTICAL', weekly_frequency: 1 }
                        ];
                        break;
                    case 6:
                        scheduleItems = [
                            { group_id: group.id, course_id: p.course_id, type: 'LECTURE', weekly_frequency: 1 },
                            { group_id: group.id, course_id: p.course_id, type: 'LECTURE', weekly_frequency: 0.5 },
                            { group_id: group.id, course_id: p.course_id, type: 'PRACTICAL', weekly_frequency: 1 }
                        ];
                        break;
                    case 8:
                        scheduleItems = [
                            { group_id: group.id, course_id: p.course_id, type: 'LECTURE', weekly_frequency: 1 },
                            { group_id: group.id, course_id: p.course_id, type: 'LECTURE', weekly_frequency: 1 },
                            { group_id: group.id, course_id: p.course_id, type: 'PRACTICAL', weekly_frequency: 1 },
                            { group_id: group.id, course_id: p.course_id, type: 'PRACTICAL', weekly_frequency: 1 }
                        ];
                        break;
                }

                group.schedule.push(...scheduleItems);
            }

            let day = 1; // Start with the first weekday
            let slotIndex = 0; // Start with the first slot
            const halfFrequencyQueue = []; // To track entries with weekly_frequency 0.5

            for (const item of group.schedule) {
                // Assign classrooms
                const availableClassroom = classrooms.find((classroom) =>
                    classroom.capacity >= group.student_count &&
                    classroom.room_type === (item.type === 'LECTURE' ? 'LECTURE' : 'PRACTICAL') &&
                    !group.schedule.some((s) => s.slot_id === slots[slotIndex].id && s.week_day === day && s.classroom_id === classroom.id)
                );

                if (!availableClassroom) {
                    throw new Error("No suitable classroom available for scheduling.");
                }

                item.classroom_id = availableClassroom.id;
                item.week_day = day;
                item.slot_id = slots[slotIndex].id;

                slotIndex = (slotIndex + 1) % slots.length;
                if (slotIndex === 0) day++;
            }

            // Insert schedule into the database
            const insertQuery = `
                INSERT INTO schedules (group_id, course_id, slot_id, day_of_week, type, weekly_frequency, week_day, classroom_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ;`

            const scheduleItems = group.schedule.map(item => [
                item.group_id, item.course_id, item.slot_id, item.week_day, item.type, item.weekly_frequency, item.week_day, item.classroom_id
            ]);

            const promises = scheduleItems.map(item => client.query(insertQuery, item));
            await Promise.all(promises); // Insert schedules concurrently
        }

        await client.query('COMMIT');  // Commit transaction
        client.release();  // Release the client back to the pool

        console.log('Schedules inserted successfully');
        return { success: true, message: "Schedule generated successfully", data: groups, slots };
    } catch (error) {
        await client.query('ROLLBACK');  // Rollback transaction on error
        client.release();  // Ensure client is always released
        console.error("Error generating schedule:", error);
        return { success: false, message: "An error occurred while generating schedules.", error };
    }
}




app.post("/generate-schedule", async (req, res) => {
    const result = await generateSchedule();
    if (result.success) {
        res.status(200).json(result);
    } else {
        res.status(500).json(result);
    }
});


app.post("/add-teacher", async (req, res) => {
    const client = await pool.connect()
    const query = `insert into science_group_teachers (science_group_id, teacher_id, role, created_at, created_by)
values ( $1, $2, $3, now(), 1);`
    console.log("[req.body.science_group_id, req.body.teacher_id, req.body.course_lesson_type]",req.body, [req.body.science_group_id, req.body.teacher_id, req.body.course_lesson_type])
    try {
        const result = await client.query(query, [req.body.science_group_id, req.body.teacher_id, req.body.course_lesson_type]);
        res.status(200).json(result);
    }catch(err) {
        res.status(500).json(err);
    }
});

app.get('/group/schedule', async (req, res) => {
    const client = await pool.connect();
    const query = `select s.type, dc.name, sl.start_time,get_weekday(s.day_of_week) as day_of_week,
                          s.weekly_frequency,
                          concat(rm.building,' ',rm.number) as room_number,
                          get_teacher_name(case when s.type = 'PRACTICAL' then p.practical_teacher else p.lecture_teacher end) as teacher
                   from schedules s
                            left join slots sl on sl.id = s.slot_id
                            left join groups_plan p on p.course_id = s.course_id and s.group_id = p.group_id
                            left join classrooms rm on rm.id = s.classroom_id
                            left join department_courses dc on dc.id = s.course_id and dc.state = 1
                   where s.group_id = $1;`
    const result = await client.query(query, [req.query.group_id]);
    res.status(200).json(result.rows);

})
app.post('/department/schedule/free/teacher', async (req, res) => {
    const client = await pool.connect();
    const conditions = req.body
        .map(param => `(s2.day_of_week = ${param.day_code} AND s2.slot_id = ${param.slot} AND s2.type = '${param.type}')`)
        .join(' OR ');
    const query = `
        SELECT t.name AS teacher_name, t.id
        FROM teachers t
        WHERE NOT EXISTS (
            SELECT 1
            FROM schedules s2
                     LEFT JOIN groups_plan gp2 ON gp2.course_id = s2.course_id
            WHERE (gp2.lecture_teacher = t.id OR gp2.practical_teacher = t.id)
              AND (${conditions})
        );
    `;

    try {
        const result = await client.query(query);
        res.status(200).json(result.rows);
    }catch (e) {
        res.status(500).json({
            error: e,
            message: e.message
        });
    }

})

app.get('/department/schedule/courses', async (req, res) => {
    const client = await pool.connect();
    const query = `SELECT concat(dc.name, '(group: ' , g.name,' )') as course_name,
       p.id ,
                          dc.id as course_id,
                          sch.days_json as days,
                          p.group_id ,
                          te.name as lecture_teacher,
                          p.lecture_teacher  as lecture_teacher_id,
                          tp.name as practical_teacher,
                          p.practical_teacher as practical_teacher_id
                   FROM groups_plan p
                            left join groups g on g.id = p.group_id
                            left join department_courses dc on dc.id = p.course_id and dc.state = 1
                            LEFT JOIN LATERAL (
                       SELECT json_agg(json_build_object('day',
                                                         concat(get_weekday(s.day_of_week),' (', s.slot_id , '-period)'), 'type', s.type,
                                                         'day_code', s.day_of_week, 'slot', s.slot_id)) AS days_json
                       FROM schedules s
                                LEFT JOIN slots sl ON sl.id = s.slot_id
                       WHERE s.course_id = p.course_id
                         AND s.group_id = p.group_id
                         AND p.semester = s.semester
                           ) sch ON true
                            left join teachers te on te.id = p.lecture_teacher
                            left join teachers tp on tp.id = p.practical_teacher
                   WHERE
                       dc.department_id = $1 and
                       (p.group_id, p.semester)
                           IN (SELECT id, current_semester
                               FROM groups
                               WHERE state = 1 AND is_schedule_generated IS TRUE) order by p.id;`
    const result = await client.query(query, [req.query.department_id]);
    res.status(200).json(result.rows);

})

app.post('/department/schedule/set/teacher', async (req, res) => {
    const client = await pool.connect();
    const query1 = `
        UPDATE groups_plan
        SET lecture_teacher = CASE WHEN $1 = 'LECTURE' THEN $2 ELSE lecture_teacher END,
            practical_teacher = CASE WHEN $1 = 'PRACTICAL' THEN $2 ELSE practical_teacher END
        WHERE id = $3;
    `;
    const query2 = `
        UPDATE schedules
        SET teacher_id = $4
        WHERE group_id = $1 AND course_id = $2 AND type = $3;
    `;

    try {
        await client.query('BEGIN');

        await client.query(query1, [req.body.type, req.body.teacher_id, req.body.group_plan_id]);

        await client.query(query2, [req.body.group_id, req.body.course_id, req.body.type, req.body.teacher_id]);

        await client.query('COMMIT'); // Commit the transaction

        res.status(200).json({
            message: 'Success',
        });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({
            message: e.message,
        });
    } finally {
        client.release();
    }
});


app.get('/student/timetable', async (req, res) => {
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
        case when dt.id is null then 'O''qituvchi briktrilmagan' else dt.name end as teacher
    FROM
        curriculum c
    LEFT JOIN
        lists l ON l.id = c.slot_id AND l.type_id = 10
    LEFT JOIN
        department_courses dc ON dc.id = c.course_id AND dc.state = 1
    LEFT JOIN
        science_group_teachers st ON st.science_group_id = c.science_group_id AND st.role = c.course_lesson_type and st.state = 1
    LEFT JOIN
        department_teachers dt ON dt.teacher_id = st.teacher_id AND dt.state = 1
    WHERE
        (CASE 
        WHEN $2::INTEGER IS NOT NULL THEN dt.teacher_id = $2::INTEGER
        ELSE true
        END)
        AND c.state = 1
        AND c.science_group_id IN (
        SELECT science_group_id FROM science_group_students WHERE student_id = 1
        )
        ORDER BY c.week_of_day;`;

    try {
        const result = await client.query(query, [req.query.start_date, req.query.teacher_id]);
        res.status(200).json({ result: result.rows });
    } catch (e) {
        res.status(500).json({ message: e.message });
    } finally {
        client.release();
    }
});

app.get('/api/add/teacher', async (req, res) => {
    const client = await pool.connect();
    const query = `select sg.name,
       c.course_lesson_type,
       sg.id,
       concat(dc.name, case
                           when course_lesson_type = 'LECTURE' THEN ' (Ma''ro''za)'
                           when course_lesson_type = 'PRACTICAL' then ' (Amaliyot)'
                           else ' (Labratory)' end) as course_name,
       dt.name                                      as teacher_name,
       sct.teacher_id,
       (SELECT json_agg(json_build_object('name', dt.name, 'teacher_id', dt.teacher_id))
                     FROM department_teachers dt
                     WHERE dt.department_id = (SELECT dc.department_id
                                               FROM department_courses dc
                                               WHERE dc.id = sg.course_id
                                                 AND dc.state = 1))                                    AS teachers
from science_groups sg
         left join department_courses dc on dc.id = sg.course_id and dc.state = 1
         left join lateral (
    select course_lesson_type, course_id
    from curriculum c
    where c.science_group_id = sg.id
      and c.state = 1
    group by course_lesson_type, course_id
    ) c on true
         left join science_group_teachers sct
                   on sct.science_group_id = sg.id and sct.state = 1 and sct.role = c.course_lesson_type
         left join department_teachers dt on dt.teacher_id = sct.teacher_id and dt.state = 1
where sg.academic_year_id in (select current_semester_id from groups where state = 1);`
    try {
        const result = await client.query(query)
        res.status(200).json({result: result.rows})
    }catch (e) {
        res.status(500).json({massage: e.message})
    }
})



app.get('/teacher/list', async (req, res) => {
    const client = await pool.connect();
    const query = `select id, teacher_id, name as teacher_name
                   from department_teachers where state = 1;`
    const result = await client.query(query);
    res.status(200).json(result.rows);
})

app.post('/remove-teacher', async (req, res) => {
    const { id, course_lesson_type } = req.body; // Access the body
    console.log('ID:', id, 'Course Lesson Type:', course_lesson_type);
    // Validation
    if (!course_lesson_type || !id) {
        return res.status(400).json({ message: 'science_group_id and role are required.' });
    }

    const query = `
        UPDATE science_group_teachers
        SET state = 0
        WHERE science_group_id = $1 AND role = $2 AND state = 1;
    `;

    let client;

    try {
        client = await pool.connect(); // Get a client from the pool
        const result = await client.query(query, [id, course_lesson_type]);
        res.status(200).json({
            message: 'Update successful',
            rowsUpdated: result.rowCount, // Return the number of rows updated
        });
    } catch (error) {
        console.error('Error updating science_group_teachers:', error.message);
        res.status(500).json({ message: 'An error occurred', error: error.message });
    } finally {
        if (client) {
            client.release(); // Release the client back to the pool
        }
    }
});


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


