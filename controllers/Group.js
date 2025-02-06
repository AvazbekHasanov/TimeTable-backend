import * as groupModel from "../models/Group.js";

export const addGroupController = async (req, res) => {
    const { id, student_count, name } = req.body;
    try {
        const group = await groupModel.addGroup(id, student_count, name);
        res.status(200).json({
            message: 'Group added successfully',
            group,
        });
    } catch (error) {
        console.error('Error adding group:', error.message);
        res.status(500).json({ error: 'Failed to add classroom' });
    }
};

export const getGroupsController = async (req, res) => {
    try {
        const groups = await groupModel.getGroups(req.query.limit, req.query.page);
        res.status(200).json({
            data:groups
        });
    } catch (error) {
        console.error('Error getting groups:', error.message);
        res.status(500).json({ error: 'Failed to get groups' });
    }
};

export const deleteGroup = async (req, res) => {
    try {
        const response = await groupModel.deleteGroup(req.params.id);
        res.status(200).json({status: 'success', message: 'Group deleted successfully' });
    } catch (error) {
        console.error('Error getting groups:', error.message);
        res.status(500).json({ error: 'Failed to get groups' });
    }
}
