// Chat message type
export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
  isComplete: boolean;
}

// RTC room custom message
export interface ZegoRoomMessage {
  Timestamp: number;
  SeqId: number;
  Round: number;
  Cmd: number; // 3: ASR text, 4: LLM text
  Data: {
    Text: string;
    MessageId: string;
    EndFlag: boolean;
  };
}

// API response
export interface ApiResponse<T = unknown> {
  code: number;
  message?: string;
  data?: T;
}

export interface StartCallResponse {
  agentInstanceId: string;
  agentUserId: string;
  agentStreamId: string;
}

export interface TokenResponse {
  token: string;
}

