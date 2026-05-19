import express from "express";
import checkSession from "../middlewares/session.middleware.js";
import { sequelize } from "../models/index.js";

const router = express.Router();

// GET /api/conversation/chat/:conversationId
router.get("/:conversationId", checkSession, async (req, res) => {
    try {
        const messages = await sequelize.models.Message.findAll({
            where: { conversationId: req.params.conversationId },
            include: [{ model: sequelize.models.User, as: "sender", attributes: ["id", "username"] }],
            order: [["createdAt", "ASC"]],
        });
        res.json({ messages });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

export default router;