import { NextRequest, NextResponse } from 'next/server';
import { loginUser, generateSessionToken } from '@/lib/devmind/aws/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ success: false, error: 'Username and password required' }, { status: 400 });
    }

    const user = await loginUser(username, password);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
    }

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
    console.error('[Auth/login]', error);
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 });
  }
}
