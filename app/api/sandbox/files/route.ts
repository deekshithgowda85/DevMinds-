import { NextRequest, NextResponse } from 'next/server';
import { getOrReconnectSandbox } from '@/lib/sandbox-instances';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
    const sandbox = await getOrReconnectSandbox(sessionId);
    
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

    console.log('[GET /api/sandbox/files] Reading file:', { sessionId, path });

    if (!sessionId || !path) {
      return NextResponse.json(
        { error: 'Missing required parameters: sessionId, path' },
        { status: 400 }
      );
    }

    const sandbox = await getOrReconnectSandbox(sessionId);
    if (!sandbox) {
      console.error('[GET /api/sandbox/files] Sandbox not found for sessionId:', sessionId);
      return NextResponse.json(
        { error: 'Sandbox session not found' },
        { status: 404 }
      );
    }

    console.log('[GET /api/sandbox/files] Reading file from sandbox...');
    const content = await sandbox.readFile(path);
    console.log('[GET /api/sandbox/files] File read successfully, length:', content.length);

    return NextResponse.json({
      success: true,
      path,
      content,
    });
  } catch (error) {
    console.error('[GET /api/sandbox/files] File read error:', error);
    console.error('[GET /api/sandbox/files] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to read file',
        details: 'File may not exist in sandbox. Check if the file was properly created or cloned.'
      },
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

    const sandbox = await getOrReconnectSandbox(sessionId);
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

export async function OPTIONS() {
  return NextResponse.json(
    { message: 'OK' },
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
