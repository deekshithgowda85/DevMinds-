import { NextRequest, NextResponse } from 'next/server';
import { registerUser, generateSessionToken } from '@/lib/devmind/aws/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, displayName } = body;

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ success: false, error: 'Username and password required' }, { status: 400 });
    }

    if (username.length < 3 || username.length > 30) {
      return NextResponse.json({ success: false, error: 'Username must be 3-30 characters' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return NextResponse.json({ success: false, error: 'Username can only contain letters, numbers, underscores, hyphens' }, { status: 400 });
    }

    const user = await registerUser(username, password, displayName || username);
    const token = generateSessionToken(user.username);

    const response = NextResponse.json({ success: true, user });
    response.cookies.set('devmind-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
