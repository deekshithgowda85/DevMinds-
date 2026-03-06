import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, getUser } from '@/lib/devmind/aws/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('devmind-session')?.value;
    if (!token) {
      return NextResponse.json({ success: false, user: null });
    }

    const username = verifySessionToken(token);
    if (!username) {
      return NextResponse.json({ success: false, user: null });
    }

    const user = await getUser(username);
    if (!user) {
      return NextResponse.json({ success: false, user: null });
    }

    return NextResponse.json({ success: true, user });
  } catch {
    return NextResponse.json({ success: false, user: null });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('devmind-session');
  return response;
}
