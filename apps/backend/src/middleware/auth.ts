import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError, ErrorCodes } from "./error-handler.js";
import { User } from "../db/models.js";

export interface AuthenticatedRequest extends FastifyRequest {
  userId: string;
  userEmail: string;
}

/**
 * Authentication middleware — validates the JWT from the Authorization header
 * and attaches userId + userEmail to the request object.
 *
 * Used with Fastify's preHandler hook on protected routes.
 */
export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    // @fastify/jwt adds verifyJWT — this throws if token is missing/invalid
    await request.jwtVerify();

    const payload = request.user as { sub: string; email: string };

    // Ensure the user still exists in the database
    const user = await User.findById(payload["sub"]);
    if (!user) {
      throw new AppError("User not found", ErrorCodes.UNAUTHORIZED, 401);
    }

    // Attach to request for downstream handlers
    (request as AuthenticatedRequest).userId = user.id;
    (request as AuthenticatedRequest).userEmail = user.email;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Invalid or expired token", ErrorCodes.UNAUTHORIZED, 401);
  }
}
