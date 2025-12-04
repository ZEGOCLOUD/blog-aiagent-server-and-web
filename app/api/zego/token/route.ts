import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '../utils';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ code: -1, message: 'userId is required' }, { status: 400 });
    }

    const appId = parseInt(process.env.NEXT_PUBLIC_ZEGO_APP_ID || '0');
    const serverSecret = process.env.ZEGO_SERVER_SECRET || '';

    if (!appId || !serverSecret) {
      return NextResponse.json({ code: -1, message: 'ZEGO config not set' }, { status: 500 });
    }

    const token = generateToken(appId, userId, serverSecret, 3600); // 1小时有效期

    return NextResponse.json({ code: 0, data: { token } });
  } catch (error) {
    console.error('Generate token error:', error);
    return NextResponse.json({ code: -1, message: 'Failed to generate token' }, { status: 500 });
  }
}

