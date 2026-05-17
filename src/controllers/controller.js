import User from "../models/user.js";

export const getUsers = async (req, res) => {
    try {
        const currentUserId = req.user.id;

        const users = await User.findAll({
            where: {},
            attributes: ["id", "username", "email"],
        });

        const filteredUsers = users.filter(
            (user) => user.id !== currentUserId
        );

        res.status(200).json({
            users: filteredUsers,
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({
            error: "Internal server error",
        });
    }
};