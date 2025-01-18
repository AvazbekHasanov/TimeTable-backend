// routes/scheduleRoutes.js
import { Router } from "express";
import { downloadSchedule, deleteItem } from "../controllers/Overall.js";

const router = Router();

// Define route for downloading the schedule
router.get('/download-schedule', downloadSchedule);
router.post('/delete/item', deleteItem);

export default router;
