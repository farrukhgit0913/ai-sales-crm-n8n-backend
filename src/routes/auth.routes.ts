
import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is Missing.");
}

const TOKEN_EXPIRY = "1h";

// --------------------------------------------------
// Register
// POST /api/auth/register
// --------------------------------------------------

router.post("/register", async (req: Request, res: Response) => {
  try {
    const name =
      typeof req.body?.name === "string" ? req.body.name.trim() : "";

    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Name, email, and password are required.",
      });
    }

    if (name.length > 100 || email.length > 254) {
      return res.status(400).json({
        success: false,
        error: "Name or email is too long.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid email address.",
      });
    }

    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters and at most 72 UTF-8 bytes.",
      });
    }

    const existingUser = await User.findOne({ email }).lean();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    // Handles simultaneous registrations for the same unique email.
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "An account with this email already exists.",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Registration failed. Please try again.",
    });
  }
});

// --------------------------------------------------
// Login
// POST /api/auth/login
// --------------------------------------------------

router.post("/login", async (req: Request, res: Response) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required.",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password,
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      {
        sub: user._id.toString(),
      },
      JWT_SECRET!,
      {
        expiresIn: TOKEN_EXPIRY,
        algorithm: "HS256",
      },
    );

    return res.json({
      success: true,
      message: "Login successful.",
      token,
      expiresIn: 3600,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Login failed. Please try again.",
    });
  }
});

// --------------------------------------------------
// Logout
// POST /api/auth/logout
// --------------------------------------------------

router.post("/logout", (_req: Request, res: Response) => {
  // JWTs are stateless. The client must discard its token.
  // This endpoint does not revoke a copied token.
  return res.json({
    success: true,
    message: "Logout successful. Remove the stored token on the client.",
  });
});

export default router;