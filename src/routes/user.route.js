import express from "express";
import checkSession from "../middlewares/session.middleware.js";
import User from "../models/user.js";

const router = express.Router();

// GET all users except current user
router.get("/", checkSession, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ["id", "username", "email"],
        });

        const filteredUsers = users.filter(
            (u) => u.id !== req.user.id
        );

        res.json({ users: filteredUsers });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

export default router;