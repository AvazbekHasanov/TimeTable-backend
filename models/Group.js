import pool from "../db.js"; // Import your DB connection pool

export const addGroup = async (id, student_count, name) => {
    const query = `
        insert into groups ( id, name, entered_year, current_semester_id, department_id, created_at, created_by,
                             direction_id, student_count)
        values (coalesce($3, nextval('groups_id_seq')) , $1, extract(year from now()), 1, 2, now(), 1,
                1, $2)
            ON CONFLICT(id) 
            DO UPDATE
                               SET name = excluded.name,
                               student_count = excluded.student_count
    `;
    const values = [name, student_count, id];
    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw new Error("Failed to add group: " + error.message);
    }
};

// Model to get list of classrooms
export const getGroups = async (limit, page) => {
    const query = `
        select
            ROW_NUMBER() OVER (ORDER BY created_at) AS index,
            id,
            name,
            student_count,
            to_char(created_at, 'DD-MM-YYYY') AS created_at,
            ll.courses
        FROM groups g
                 left join lateral (select string_agg(dc.name, '<span style="color: red"> ||| </span> ') as courses from science_groups sg
                                                                                         left join department_courses dc on dc.id = sg.course_id and dc.state = 1
                                    where sg.id in (select
                                                        science_group_id
                                                    from academic_group_assignments
                                                    where group_id = g.id and state = 1 ) ) ll on true
        WHERE state = 1
        order by created_at
        LIMIT CASE WHEN $1 <> -1 THEN $1 ELSE NULL END
            OFFSET CASE WHEN $1 <> -1 THEN $2*$1 ELSE 0 END;
    `;
    const allCount = `
        SELECT count(id) as all_count
        FROM groups
        WHERE state = 1;
    `;
    const values = [limit, page];  // Correcting the page calculation
    try {
        const result = await pool.query(query, values);
        const countResult = await pool.query(allCount);
        const totalCount = countResult.rows[0].all_count;
        return { groups: result.rows, totalCount };
    } catch (error) {
        throw new Error("Failed to get classrooms: " + error.message);
    }
};

export const deleteGroup = async (id) => {
    const query = `
        update groups
        set state = 0,
            updated_at = now()
        where id = $1;
    `;
    const values = [id];
    try {
        return await pool.query(query, values);
    } catch (error) {
        throw new Error("Failed to delete group: " + error.message);
    }
}

