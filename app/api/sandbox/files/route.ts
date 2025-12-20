import { NextRequest, NextResponse } from 'next/server';
import { getSandboxInstance } from '@/lib/sandbox-instances';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, path, content } = body;

    console.log('POST /api/sandbox/files - Request:', { sessionId, path, contentLength: content?.length });

    if (!sessionId || !path || content === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, path, content' },
        { status: 400 }
      );
    }

    console.log('Getting sandbox instance for sessionId:', sessionId);
    const sandbox = getSandboxInstance(sessionId);
    
    if (!sandbox) {
      console.error('Sandbox not found for sessionId:', sessionId);
      return NextResponse.json(
        { error: 'Sandbox session not found' },
        { status: 404 }
      );
    }

    console.log('Writing file to sandbox...');
    await sandbox.writeFile(path, content);

    console.log('File written successfully');
    return NextResponse.json({
      success: true,
      message: 'File written successfully',
      path,
    });
  } catch (error) {
    console.error('File write error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to write file' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const path = searchParams.get('path');

    if (!sessionId || !path) {
      return NextResponse.json(
        { error: 'Missing required parameters: sessionId, path' },
        { status: 400 }
      );
    }

    const sandbox = getSandboxInstance(sessionId);
    if (!sandbox) {
      return NextResponse.json(
        { error: 'Sandbox session not found' },
        { status: 404 }
      );
    }

    const content = await sandbox.readFile(path);

    return NextResponse.json({
      success: true,
      path,
      content,
    });
  } catch (error) {
    console.error('File read error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read file' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const path = searchParams.get('path');

    if (!sessionId || !path) {
      return NextResponse.json(
        { error: 'Missing required parameters: sessionId, path' },
        { status: 400 }
      );
    }

    const sandbox = getSandboxInstance(sessionId);
    if (!sandbox) {
      return NextResponse.json(
        { error: 'Sandbox session not found' },
        { status: 404 }
      );
    }

    await sandbox.deleteFile(path);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
      path,
    });
  } catch (error) {
    console.error('File delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete file' },
      { status: 500 }
    );
  }
}
