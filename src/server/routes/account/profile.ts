import { Router } from "express";
import { db } from "src/server/lib/db";
import { user } from "src/server/lib/db/schema/system";
import { authenticated } from "src/server/middleware/authMiddleware";
import { validateData } from "src/server/middleware/validationMiddleware";
import { eq } from "drizzle-orm";
import { z } from "zod";

const profileUpdateSchema = z.object({
  fullname: z.string().min(1, "Full name is required").max(100, "Full name must be less than 100 characters"),
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  avatar: z.string().optional()
});

const profileRoutes = Router();
profileRoutes.use(authenticated());

/**
 * @swagger
 * /api/account/profile:
 *   put:
 *     tags:
 *       - Account - Profile
 *     summary: Update user profile
 *     description: Update the current authenticated user's profile information
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullname:
 *                 type: string
 *                 description: The user's full name
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The user's email address
 *                 example: "john.doe@example.com"
 *               avatar:
 *                 type: string
 *                 description: The user's avatar URL (optional)
 *                 example: "https://example.com/avatar.jpg"
 *             required:
 *               - fullname
 *               - email
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The user ID
 *                 username:
 *                   type: string
 *                   description: The username
 *                 fullname:
 *                   type: string
 *                   description: The full name
 *                 email:
 *                   type: string
 *                   description: The email address
 *                 avatar:
 *                   type: string
 *                   description: The avatar URL
 *                 status:
 *                   type: string
 *                   description: The user status
 *                 activeTenantId:
 *                   type: string
 *                   description: The active tenant ID
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: The creation timestamp
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   description: The last update timestamp
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
profileRoutes.put("/", validateData(profileUpdateSchema), async (req, res) => {
  const { fullname, email, avatar } = req.body;
  const userId = req.user!.id;

  try {
    // Update user profile
    const updatedUser = await db
      .update(user)
      .set({
        fullname,
        email,
        avatar: avatar || null, // Set to null if empty string
        updatedAt: new Date()
      })
      .where(eq(user.id, userId))
      .returning()
      .then((rows) => rows[0]);

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      id: updatedUser.id,
      username: updatedUser.username,
      fullname: updatedUser.fullname,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      status: updatedUser.status,
      activeTenantId: updatedUser.activeTenantId,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default profileRoutes;