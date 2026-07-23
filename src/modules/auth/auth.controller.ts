import { Request, Response, NextFunction } from "express";
import { registerSchema, loginSchema, refreshTokenSchema } from "./auth.schema";
import * as authService from "./auth.service";

export async function registerHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = registerSchema.parse(req.body);
    const tokens = await authService.register(input);
    res.status(201).json(tokens);
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = loginSchema.parse(req.body);
    const tokens = await authService.login(input);
    res.status(200).json(tokens);
  } catch (err) {
    next(err);
  }
}
export async function refreshHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = refreshTokenSchema.parse(req.body);

    const tokens = await authService.refreshAccessToken(input.refreshToken);

    res.status(200).json(tokens);
  } catch (err) {
    next(err);
  }
}
