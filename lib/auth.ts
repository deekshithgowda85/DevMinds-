import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import fs from "fs";
import path from "path";

// Path to users data file
const USERS_FILE = path.join(process.cwd(), "data", "users.json");

// User type
type User = { id: string; name: string; email: string; password: string };

// Initialize users from file
function loadUsers(): Map<string, User> {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      const usersArray: User[] = JSON.parse(data);
      return new Map(usersArray.map(user => [user.id, user]));
    }
  } catch (error) {
    console.error("Error loading users:", error);
  }
  return new Map();
}

// Save users to file
function saveUsers(users: Map<string, User>) {
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const usersArray = Array.from(users.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersArray, null, 2));
  } catch (error) {
    console.error("Error saving users:", error);
  }
}

// Load users on startup
let users = loadUsers();

// Function to get users (allows signup route to share the same Map)
export function getUsersStore() {
  return users;
}

// Function to save a user
export function saveUser(user: User) {
  users.set(user.id, user);
  saveUsers(users);
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        // Find user
        const user = Array.from(users.values()).find(
          (u) => u.email === credentials.email
        );

        if (!user) {
          throw new Error("User not found");
        }

        // Verify password
        const isValid = await compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);