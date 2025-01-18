import pkg from 'pg';
const { Pool } = pkg;


// PostgreSQL connection pool setup
// const pool = new Pool({
//     user: 'project',
//     host: 'dev.realsoft.academy',
//     database: 'project',
//     password: 'p9DxPyhAYv82rnc3bdza',
//     port: 7632,
//     // ssl: {
//     //     rejectUnauthorized: false, // Add this to allow self-signed certificates
//     // },
// });

// const pool = new Pool({
//     user: 'postgres',
//     host: 'localhost',
//     database: 'postgres',
//     password: 'avazbek0003',
//     port: 5432,
//     // ssl: {
//     //     rejectUnauthorized: false, // Add this to allow self-signed certificates
//     // },
// });


const pool = new Pool({
    user: 'postgres.bcngbqdjuayrndrejuio',
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    database: 'postgres',
    password: 'avazbek0003',
    port: 5432,
    ssl: {
        rejectUnauthorized: false, // Allow self-signed certificates
    },
});

export default pool;
