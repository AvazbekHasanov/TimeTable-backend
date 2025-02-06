import pool  from '../db.js'; // Assuming you have a DB pool configured

export const addGroup = async (course_id, name) => {
    const client = await pool.connect();
    const query = `
        INSERT INTO science_groups (name, course_id, academic_year_id, student_count, created_at, created_by)
        VALUES ($1, $2, 3, 30, NOW(), 1)
            ON CONFLICT (course_id, academic_year_id, name) where state = 1
DO UPDATE
                   SET name = EXCLUDED.name,
                   course_id = EXCLUDED.course_id,
                   updated_at = NOW()
   WHERE science_groups.state = 1
                   RETURNING name, student_count, TO_CHAR(updated_at, 'DD.MM.YYYY') AS updated_at, id;
    `;
    const values = [name, course_id];
    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } finally {
        client.release();
    }
};

export const addStudentToGroup = async (group_id) => {
    const client = await pool.connect();
    const queryAddStudent = `insert into science_group_students (student_id, science_group_id, created_at, created_by)
                             values (1, $1, now(), 1);`;
    try {
        const result = await client.query(queryAddStudent, [group_id]);
        return result;
    } finally {
        client.release();
    }
};

export  const joinGroupsToAcademicGroup = async (group_id, groups) => {
    const client = await pool.connect();
    try {
        // Start a transaction
        await client.query('BEGIN');

        // Delete previous assignments
        const deleteQuery = `
            UPDATE academic_group_assignments
            SET state = 0
            WHERE science_group_id = $1;
        `;
        await client.query(deleteQuery, [group_id]);

        // Prepare values for bulk insert
        const values = groups.flatMap(g => [g.id, group_id]);
        const valuePlaceholders = groups
            .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2}, NOW(), 1)`)
            .join(", ");

        // Bulk insert query with conflict handling
        const insertQuery = `
            INSERT INTO academic_group_assignments (group_id, science_group_id, created_at, created_by)
            VALUES ${valuePlaceholders}
            ON CONFLICT (science_group_id, group_id)
            DO UPDATE SET state = 1;
        `;

        await client.query(insertQuery, values);

        await client.query('COMMIT');
        console.log("Groups successfully assigned to academic group.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error assigning groups to academic group:", err);
    } finally {
        client.release();
    }
}

export const getAllGroups = async (limit, page, group) => {
    const client = await pool.connect();
    const query = `select sc.course_id, sc.id,
                          sc.name as academic_group_name,
                          dc.name as course_name, g.student_count,
                          g.groups
                   from science_groups sc
                            left join department_courses dc on dc.id= sc.course_id and dc.state = 1
                            left join lateral (select json_agg(group_id) as groups,
                                                      sum(g.student_count) as student_count
                                               from academic_group_assignments ac
                                                        left join groups g on g.id = ac.group_id and g.state = 1
                                               where ac.science_group_id =  sc.id and ac.state = 1) g on true
                   where 
                       case when $3::integer <> 0 then
                                EXISTS (
                                    SELECT 1
                                    FROM jsonb_array_elements_text(g.groups::jsonb) AS group_id  
                                    WHERE group_id = $3::varchar
                                ) else true end and
                       sc.state = 1 and dc.id is not null
                   order by sc.created_at
                       limit case when $1::integer = -1 then null else $1 end
offset case when $1::integer = -1 then 0 else $1*$2 end `;
    const countQuery = `
        select count(*) as total_count
        from science_groups sc
                 left join department_courses dc on dc.id = sc.course_id and dc.state = 1
        where sc.state = 1 and dc.id is not null
          and case when $1::integer <> 0  then sc.id in (select science_group_id
                                                              from academic_group_assignments ess
                                                              where ess.group_id = $1::integer and ess.state = 1)
                   else  true end
    `
    try {
        const [result, countResult] = await Promise.all([
            client.query(query, [limit, page, group]),
            client.query(countQuery, [group])
        ]);

        return {
            total_count: countResult.rows[0].total_count,  // Total count of all records in database
            data: result.rows  // Paginated data
        };
    } finally {
        client.release();
    }
};

export const updateTeacherState = async (science_group_id, course_lesson_type) => {
    const client = await pool.connect();
    const updateQuery = `
        UPDATE science_group_teachers
        SET state = 0
        WHERE science_group_id = $1 and role = $2;
    `;
    try {
        await client.query(updateQuery, [science_group_id, course_lesson_type]);
    } finally {
        client.release();
    }
};

export const insertTeachers = async (science_group_id, teachers, course_lesson_type) => {
    const client = await pool.connect();
    const insertQuery = `
        INSERT INTO science_group_teachers (science_group_id, teacher_id, role, created_at, created_by)
        SELECT
            $1, teacher_id_1, $3, NOW(), 1
        FROM UNNEST($2::INT[]) AS teacher_id_1
            ON CONFLICT (id) 
        DO UPDATE SET
            role = EXCLUDED.role,
                   state = 1;
    `;
    try {
        const result = await client.query(insertQuery, [science_group_id, teachers, course_lesson_type]);
        return result.rowCount;
    } finally {
        client.release();
    }
};

export const addTeacher = async (science_group_id, teacher_id, course_lesson_type) => {
    const client = await pool.connect();
    const query = `insert into science_group_teachers (science_group_id, teacher_id, role, created_at, created_by)
    values ( $1, $2, $3, now(), 1);`;
    try {
        const result = await client.query(query, [science_group_id, teacher_id, course_lesson_type]);
        return result;
    } finally {
        client.release();
    }
};

export const removeTeacher = async (id, course_lesson_type) => {
    const client = await pool.connect();
    const query = `
        UPDATE science_group_teachers
        SET state = 0
        WHERE science_group_id = $1 AND role = $2 AND state = 1;
    `;
    try {
        const result = await client.query(query, [id, course_lesson_type]);
        return result.rowCount;
    } finally {
        client.release();
    }
};

export const getRequiredData = async (id, course_lesson_type) => {
    const client = await pool.connect();
    const courseQuery = `
        SELECT id, name AS course_name, credit
        FROM department_courses
        WHERE state = 1;
    `;
    const groupQuery = `select id, name, student_count
from groups where state = 1;`
    try {
        const courses = await client.query(courseQuery);
        const groups = await client.query(groupQuery);
        return {
            courses: courses.rows,
            groups: groups.rows,
        };
    } finally {
        client.release();
    }
};

export const getTeacherAndGroupData = async () => {
    const client = await pool.connect();
    const query = `select sg.name,
                          c.course_lesson_type,
                          sg.id,
                          concat(dc.name, case
                                              when course_lesson_type = 'LECTURE' THEN ' (Ma''ro''za)'
                                              when course_lesson_type = 'PRACTICAL' then ' (Amaliyot)'
                                              else ' (Dars jadvali qo''yilmagan)' end) as course_name,
                          teacher.teacher_name                                   as teacher_name
                   from science_groups sg
                            left join department_courses dc on dc.id = sg.course_id and dc.state = 1
                            left join lateral (
                       select course_lesson_type, course_id
                       from curriculum c
                       where c.science_group_id = sg.id
                         and c.state = 1
                       group by course_lesson_type, course_id
                           ) c on true
                            left join lateral (
                       select  string_agg(d.name, ', ') AS teacher_name
                       from science_group_teachers sct
                                left join department_teachers d on sct.teacher_id = d.id and d.state = 1
                       where sct.science_group_id = sg.id and sct.state = 1 and sct.role = c.course_lesson_type
                       group by sct.science_group_id
                           ) teacher on true
                   where sg.academic_year_id in (select current_semester_id from groups where state = 1);`
    try {
        const result = await client.query(query);
        return { result: result.rows };
    } finally {
        client.release();
    }
};

export const getAllTeacher = async (lesson_type, academic_id) => {
    const query = `SELECT dt.teacher_id,  dt.name AS teacher_name,
                          COALESCE(schedule.teacher_schedule, '[]'::json) AS teacher_schedule,
                          case when sct.id is not null  then true else  false end as is_teacher
                   FROM department_teachers dt
                            left join science_group_teachers sct on sct.role = $2 and
                                                                    sct.teacher_id = dt.teacher_id
                       and sct.state = 1
                       and sct.science_group_id = $1
                            CROSS JOIN LATERAL (
                       SELECT json_agg(jsonb_build_object('week_of_day', c.week_of_day, 'slot_id', c.slot_id)) AS teacher_schedule
                       FROM curriculum c
                                JOIN science_group_teachers sc
                                     ON sc.science_group_id = c.science_group_id
                                         AND sc.teacher_id = dt.teacher_id
                                         AND c.course_lesson_type = sc.role
                       WHERE c.state = 1
                         AND sc.state = 1
                           ) schedule
                   WHERE dt.state = 1;`

    try {
        const result = await pool.query(query, [ academic_id, lesson_type]);
        return result.rows;
    }catch (e) {
        console.log(e.message)
        throw new Error(e.message)
    }
}

export const scienceSchedule = async (lesson_type, academic_id) => {
    const query = `
    select slot_id, week_of_day
    from curriculum where science_group_id = $1 and course_lesson_type = $2;
    `
    try {
        const result = await pool.query(query, [ academic_id, lesson_type]);
        return result.rows;
    }catch (e) {
        console.log(e.message)
        throw new Error(e.message)
    }
}
