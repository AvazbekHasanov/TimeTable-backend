import pool  from '../db.js'; // Assuming you have a DB pool configured

export const addGroup = async (course_id, name) => {
    const client = await pool.connect();
    const query = `
        insert into science_groups (name, course_id, academic_year_id, student_count, created_at, created_by)
        values ($1, $2, 3, 30, now(), 1)
            returning name, student_count , to_char(created_at, 'DD.MM.YYYY') as created_at, id;
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

export const getAllGroups = async () => {
    const client = await pool.connect();
    const query = `select sc.course_id, sc.id, sc.name as academic_group_name, dc.name as course_name, sc.student_count
                   from science_groups sc
                            left join department_courses dc on dc.id= sc.course_id and dc.state = 1
                   where sc.state = 1`;
    try {
        const result = await client.query(query);
        return result.rows;
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
        SELECT $1, teacher_id_1, $3, NOW(), 1
        FROM UNNEST($2::INT[]) AS teacher_id_1
        WHERE NOT EXISTS (
            SELECT 1 FROM science_group_teachers 
            WHERE science_group_id = $1 AND teacher_id = teacher_id_1 and state = 1 and role = $3
        );
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

export const getTeacherAndGroupData = async () => {
    const client = await pool.connect();
    const query = `select sg.name,
                          c.course_lesson_type,
                          sg.id,
                          concat(dc.name, case
                                              when course_lesson_type = 'LECTURE' THEN ' (Ma''ro''za)'
                                              when course_lesson_type = 'PRACTICAL' then ' (Amaliyot)'
                                              else ' (Labratory)' end) as course_name,
                          teacher.teacher_name                                   as teacher_name,
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
                            left join lateral (
                       select  string_agg(d.name, ', ') AS teacher_name
                       from science_group_teachers sct
                                left join department_teachers d on sct.teacher_id = d.id and d.state = 1
                       where sct.science_group_id = sg.id and sct.state = 1 and sct.role = c.course_lesson_type
                       group by sct.science_group_id
                           ) teacher on true
                   where sg.academic_year_id in (select current_semester_id from groups where state = 1);`
    const teacherQuery = `select dt.name as name, dt.teacher_id as teacher_id
                          from department_teachers dt
                          where dt.state = 1;`;
    try {
        const result = await client.query(query);
        const resultTeachers = await client.query(teacherQuery);
        return { result: result.rows, teachers: resultTeachers.rows };
    } finally {
        client.release();
    }
};
