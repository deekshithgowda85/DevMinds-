import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { getUsersStore, saveUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Get shared users store
    const users = getUsersStore();

    // Check if user already exists
    const existingUser = Array.from(users.values()).find(
      (user) => user.email === email
    );

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user
    const userId = Date.now().toString();
    const newUser = {
      id: userId,
      name,
      email,
      password: hashedPassword,
    };
    
    // Save user to file
    saveUser(newUser);

    return NextResponse.json(
      { message: "User created successfully", userId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}