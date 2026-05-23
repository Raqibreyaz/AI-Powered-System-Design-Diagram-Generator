/**
 * Auth routes — demo authentication (no email infra needed for MVP).
 * POST /api/auth/demo-login  — any email returns a JWT
 * GET  /api/auth/me          — returns the current user
 */

import type { FastifyInstance } from "fastify";
import { User } from "../db/models.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";
import { DemoLoginRequestSchema } from "@diagram-forge/shared";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/demo-login", async (request, reply) => {
    const body = DemoLoginRequestSchema.parse(request.body);

    // Find or create user — any email is accepted for the demo
    let user = await User.findOne({ email: body.email });
    if (!user) {
      user = await User.create({ email: body.email });
    }

    // Sign a JWT with the user's ID as sub
    const token = app.jwt.sign(
      { sub: user.id, email: user.email },
      { expiresIn: "7d" }
    );

    return reply.send({ token, user: { id: user.id, email: user.email } });
  });

  app.get(
    "/me",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const req = request as AuthenticatedRequest;
      return reply.send({ user: { id: req.userId, email: req.userEmail } });
    }
  );
}
