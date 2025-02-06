import ExcelJS from 'exceljs';
import { getSchedule, deleteItemFromDatabase } from '../models/Overall.js';

// Map days of the week to Uzbek
const uzbekDays = {
    1: 'Dushanba',
    2: 'Seshanba',
    3: 'Chorshanba',
    4: 'Payshanba',
    5: 'Juma',
    6: 'Shanba',
    7: 'Yakshanba',
};

export const downloadSchedule = async (req, res) => {
    const { teacher_id, student_id } = req.query;

    try {
        const schedules = await getSchedule(teacher_id, student_id);
        const workbook = await createStyledExcelSheet(schedules);

        // Set response headers
        const fileName = 'styled_schedules.xlsx';
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        // Write workbook to response
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Function to create the Excel sheet
export const createStyledExcelSheet = async (data) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Schedules');

    // Define styles
    const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
        },
    };

    const bodyStyle = {
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
        },
    };

    // Add header row
    worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Kun', key: 'week_of_day', width: 15 },
        { header: 'Boshlanish', key: 'start', width: 25 },
        { header: 'Tugash', key: 'end', width: 25 },
        { header: 'Kurs', key: 'course_name', width: 20 },
        { header: 'Sarlavha', key: 'title', width: 30 },
        { header: 'Joylashuv', key: 'location', width: 15 },
        { header: 'Dars turi', key: 'course_lesson_type', width: 15 },
        { header: 'O‘qituvchi', key: 'teacher', width: 25 },
    ];

    worksheet.getRow(1).eachCell((cell) => {
        cell.style = headerStyle;
    });

    // Add data rows
    data.forEach((item) => {
        const row = worksheet.addRow({
            id: item.id,
            week_of_day: uzbekDays[item.week_of_day] || 'Noma’lum',
            start: item.start,
            end: item.end,
            course_name: item.course_name,
            title: item.title,
            location: item.location,
            course_lesson_type: item.course_lesson_type,
            teacher: item.teacher,
        });

        row.eachCell((cell) => {
            cell.style = bodyStyle;
        });
    });

    worksheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
            const length = cell.value ? cell.value.toString().length : 0;
            if (length > maxLength) {
                maxLength = length;
            }
        });
        column.width = maxLength + 5;
    });

    return workbook;
};
export const deleteItem = async (req, res) => {
    const { id, type } = req.body;
    const tableName = {
        group: 'science_groups',
        course: 'department_courses',
        teacher: 'department_teachers',
        classroom: 'classrooms',
    };

    try {
        const result = await deleteItemFromDatabase(tableName[type], id);
        res.status(201).json({
            message: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`,
            course: result,
        });
    } catch (error) {
        console.error('Error deleting item:', error.message);
        res.status(500).json({ error: 'Failed to delete item' });
    }
};
