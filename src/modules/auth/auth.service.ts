import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/config/env";
import { ApiError } from "@/lib/apiError";
import type { RegisterInput, LoginInput } from "./auth.schema";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateAccessToken(
  userId: string,
  organizationId: string,
  role: string,
): string {
  return jwt.sign(
    { sub: userId, organizationId, role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL },
  );
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) throw new ApiError(409, "Email already registered");

  const passwordHash = await bcrypt.hash(input.password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: input.organizationName },
    });
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: "admin",
        organizationId: organization.id,
      },
    });

    return { organization, user };
  });

  return issueTokenPair(
    result.user.id,
    result.organization.id,
    result.user.role,
  );
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw new ApiError(401, "Invalid credentials");

  const validPassword = await bcrypt.compare(input.password , user.passwordHash);
  if (!validPassword) throw new ApiError(401, 'Invalid credentials');

  return issueTokenPair(user.id , user.organizationId  , user.role);
}

async function issueTokenPair(
  userId: string,
  organizationId: string,
  role: string,
) {
  const accessToken = generateAccessToken(userId, organizationId, role);
  const rawRefreshToken = crypto.randomBytes(40).toString("hex");
  const tokenHash = hashToken(rawRefreshToken);

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  return { accessToken, refreshToken: rawRefreshToken };
}

export async function refreshAccessToken(rawRefreshToken: string) {
  const tokenHash = hashToken(rawRefreshToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueTokenPair(stored.user.id, stored.user.organizationId, stored.user.role);
}