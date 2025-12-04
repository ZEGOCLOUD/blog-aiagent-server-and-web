import { NextRequest, NextResponse } from 'next/server';
import { sendZegoRequest } from '../utils';

// Register agent (if not already registered)
async function ensureAgentRegistered(agentId: string, forceUpdate = false) {
  const agentConfig = {
    AgentId: agentId,
    Name: process.env.ZEGO_AGENT_NAME || 'AI Assistant',
    LLM: {
      Url: process.env.LLM_URL,
      ApiKey: process.env.LLM_API_KEY,
      Model: process.env.LLM_MODEL,
      SystemPrompt: process.env.SYSTEM_PROMPT || 'You are a friendly AI assistant. Please respond concisely.'
    },
    ASR: {
      Vendor: "Tencent",
      Params: {
          engine_model_type: "16k_en"
      }
    },
    TTS: {
      Vendor: process.env.TTS_VENDOR,
      Params: {
        app: {
          appid: process.env.TTS_APP_ID,
          token: process.env.TTS_TOKEN,
          cluster: process.env.TTS_CLUSTER
        },
        audio: {
          voice_type: process.env.TTS_VOICE_TYPE
        }
      }
    }
  };

  try {
    if (forceUpdate) {
      // Try to unregister old agent first
      try {
        await sendZegoRequest('UnregisterAgent', { AgentId: agentId });
        console.log('Agent unregistered for update');
      } catch {
        // Ignore unregister errors
      }
    }

    await sendZegoRequest('RegisterAgent', agentConfig);
    console.log('Agent registered successfully');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // 410001008 means agent already registered
    if (errorMessage.includes('410001008')) {
      console.log('Agent already registered, updating...');
      // Use UpdateAgent to update config
      try {
        await sendZegoRequest('UpdateAgent', agentConfig);
        console.log('Agent updated successfully');
      } catch (updateError) {
        console.error('Update agent error:', updateError);
      }
    } else {
      throw error;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { roomId, userId, userStreamId } = await request.json();

    if (!roomId || !userId || !userStreamId) {
      return NextResponse.json(
        { code: -1, message: 'roomId, userId, userStreamId are required' },
        { status: 400 }
      );
    }

    const agentId = process.env.ZEGO_AGENT_ID || 'aiAgent1';
    const agentUserId = `agent_${roomId}`;
    const agentStreamId = `agent_stream_${roomId}`;

    // Ensure agent is registered
    await ensureAgentRegistered(agentId);

    // Create agent instance
    const result = await sendZegoRequest<{ AgentInstanceId: string }>('CreateAgentInstance', {
      AgentId: agentId,
      UserId: userId,
      RTC: {
        RoomId: roomId,
        AgentUserId: agentUserId,
        AgentStreamId: agentStreamId,
        UserStreamId: userStreamId
      },
      MessageHistory: {
        SyncMode: 1,
        Messages: [],
        WindowSize: 10
      }
    });

    return NextResponse.json({
      code: 0,
      data: {
        agentInstanceId: result.AgentInstanceId,
        agentUserId,
        agentStreamId
      }
    });
  } catch (error) {
    console.error('Start call error:', error);
    const message = error instanceof Error ? error.message : 'Failed to start call';
    return NextResponse.json({ code: -1, message }, { status: 500 });
  }
}

