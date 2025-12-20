# Authentication System Documentation

## Overview

This project now includes a complete authentication system with:
- **Email/Password Authentication** - Traditional login/signup
- **Google OAuth** - Social login as an alternative option
- **Reusable Components** - Modular design for easy maintenance

## 🎨 Features

### Login Page (`/auth/login`)
- Email and password input fields with icons
- Google OAuth button as an alternative
- Link to signup page
- "Back to Home" button
- Beautiful gradient background
- Loading states

### Signup Page (`/auth/signup`)
- Full name, email, and password fields
- Google OAuth button as an alternative
- Password validation (minimum 6 characters)
- Link to login page
- Automatic redirect to login after successful signup

### Navbar Integration
- "Sign In" button when logged out
- User name display when logged in
- "Sign Out" button for authenticated users
- Responsive design for mobile and desktop

## 🔧 Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory with your credentials:

```env
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
```

**Important:** You need to generate a secure `NEXTAUTH_SECRET`:

```bash
# On Windows PowerShell, use:
openssl rand -base64 32

# Or use Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Replace `your_nextauth_secret_here` with the generated string.

### 2. Google Cloud Console Setup

Make sure your Google Cloud Console is configured:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" → "Credentials"
4. Edit your OAuth 2.0 Client ID
5. Add these to **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`
   - `http://localhost:3001/api/auth/callback/google` (if using different port)
   - Your production URL when deploying

## 📁 Project Structure

```
components/
  auth/
    auth-form.tsx      # Reusable form component with email/password & Google
    auth-card.tsx      # Card wrapper with header, footer, and links
  ui/
    card.tsx           # New card component
    button.tsx         # Existing UI components
    input.tsx
    label.tsx
    ...

app/
  auth/
    login/
      page.tsx         # Login page
    signup/
      page.tsx         # Signup page
  api/
    auth/
      [...nextauth]/
        route.ts       # NextAuth handler
      signup/
        route.ts       # Signup API endpoint
  components/
    Navbar.tsx         # Updated with auth buttons

lib/
  auth.ts              # NextAuth configuration

types/
  next-auth.d.ts       # TypeScript declarations
```

## 🎯 How to Use

### For Users

1. **Sign Up:**
   - Visit `/auth/signup`
   - Enter your full name, email, and password
   - Or click "Google" to sign up with Google
   - After signup, you'll be redirected to login

2. **Log In:**
   - Visit `/auth/login`
   - Enter your email and password
   - Or click "Google" to sign in with Google
   - After login, you'll be redirected to `/editor`

3. **Sign Out:**
   - Click your name in the navbar
   - Click the "Sign Out" icon

### For Developers

#### Using the Auth Components

The authentication system is built with reusable components:

**AuthForm Component** (`components/auth/auth-form.tsx`):
```tsx
import { AuthForm } from "@/components/auth/auth-form";

// For login
<AuthForm mode="login" />

// For signup
<AuthForm mode="signup" />
```

**AuthCard Component** (`components/auth/auth-card.tsx`):
```tsx
import { AuthCard } from "@/components/auth/auth-card";

// Complete login card with styling
<AuthCard mode="login" />

// Complete signup card with styling
<AuthCard mode="signup" />
```

#### Protecting Routes

To protect a page and require authentication:

```tsx
// app/protected-page/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function ProtectedPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/auth/login');
  }
  
  return (
    <div>
      <h1>Welcome {session.user.name}!</h1>
      <p>This page is protected</p>
    </div>
  );
}
```

#### Client-Side Authentication

For client components:

```tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function ClientComponent() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    router.push('/auth/login');
    return null;
  }

  return <div>Hello {session.user.name}!</div>;
}
```

## 🔒 Security Features

- **Password Hashing:** Uses bcryptjs with 12 rounds
- **JWT Sessions:** Secure token-based authentication
- **CSRF Protection:** Built into NextAuth
- **Password Requirements:** Minimum 6 characters (can be adjusted)
- **Email Validation:** Required and validated
- **Duplicate Prevention:** Checks for existing users

## ⚠️ Important Notes

### User Storage

Currently, users are stored **in-memory** using a Map. This means:
- ✅ Great for development and testing
- ❌ Data is lost when server restarts
- ❌ Not suitable for production

**For Production:**
Integrate a database (PostgreSQL, MongoDB, MySQL, etc.):

```typescript
// Example with Prisma/PostgreSQL
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// In signup route
const user = await prisma.user.create({
  data: {
    name,
    email,
    password: hashedPassword,
  },
});

// In auth.ts credentials provider
const user = await prisma.user.findUnique({
  where: { email: credentials.email },
});
```

## 🎨 Customization

### Styling
All components use your existing UI components and Tailwind CSS. You can customize:
- Colors in `tailwind.config.js`
- Component styles in `components/auth/`
- Background gradients in the page files

### Validation
Update password requirements in `components/auth/auth-form.tsx`:
```tsx
<Input
  id="password"
  type="password"
  required
  minLength={8}  // Change minimum length
  // Add pattern for complexity
  pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$"
/>
```

### Additional Providers
Add more OAuth providers in `lib/auth.ts`:
```tsx
import GitHubProvider from "next-auth/providers/github";

providers: [
  GoogleProvider({ ... }),
  GitHubProvider({
    clientId: process.env.GITHUB_ID,
    clientSecret: process.env.GITHUB_SECRET,
  }),
  // ... more providers
],
```

## 🧪 Testing

### Test User Creation
1. Go to `http://localhost:3000/auth/signup`
2. Create an account with:
   - Name: Test User
   - Email: test@example.com
   - Password: test123

### Test Login
1. Go to `http://localhost:3000/auth/login`
2. Login with the credentials above
3. You should be redirected to `/editor`

### Test Google OAuth
1. Click "Google" on login or signup page
2. Select your Google account
3. Grant permissions
4. You should be redirected to `/editor`

## 📱 Responsive Design

The authentication system is fully responsive:
- Mobile: Optimized forms, touch-friendly buttons
- Tablet: Adjusted spacing and layout
- Desktop: Full-width inputs with proper spacing

## 🚀 Next Steps

1. **Generate NEXTAUTH_SECRET** - Update your `.env.local`
2. **Test the System** - Try creating an account and logging in
3. **Add Database** - When ready for production
4. **Add Email Verification** - Optional enhancement
5. **Add Password Reset** - Optional enhancement
6. **Add Remember Me** - Optional enhancement

## 📞 Support

If you need to customize or extend the authentication system, the reusable components make it easy to:
- Change the form layout
- Add more fields
- Modify validation rules
- Change styling
- Add more OAuth providers

All components are in `components/auth/` and can be modified independently.