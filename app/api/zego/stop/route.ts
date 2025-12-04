import { NextRequest, NextResponse } from 'next/server';
import { sendZegoRequest } from '../utils';

export async function POST(request: NextRequest) {
  try {
    const { agentInstanceId } = await request.json();

    if (!agentInstanceId) {
      return NextResponse.json(
        { code: -1, message: 'agentInstanceId is required' },
        { status: 400 }
      );
    }

    await sendZegoRequest('DeleteAgentInstance', {
      AgentInstanceId: agentInstanceId
    });

    return NextResponse.json({ code: 0, message: 'Call stopped successfully' });
  } catch (error) {
    console.error('Stop call error:', error);
    const message = error instanceof Error ? error.message : 'Failed to stop call';
    return NextResponse.json({ code: -1, message }, { status: 500 });
  }
}

