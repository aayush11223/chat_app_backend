import User from "../models/user.js";

export const getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ["id", "username", "email"],
        });

        const filtered = users.filter(u => u.id !== req.user.id);

        res.json({ users: filtered });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
};