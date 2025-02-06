import { Router } from "express";
import * as groupController from "../controllers/Group.js";

const router = Router();

router.post('/add/group', groupController.addGroupController);

router.get('/groups', groupController.getGroupsController);
router.post('/delete/group/:id', groupController.deleteGroup);

export default router;
