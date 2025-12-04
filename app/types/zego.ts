// 对话消息类型
export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
  isComplete: boolean;
}

// RTC 房间自定义消息
export interface ZegoRoomMessage {
  Timestamp: number;
  SeqId: number;
  Round: number;
  Cmd: number; // 3: ASR文本, 4: LLM文本
  Data: {
    Text: string;
    MessageId: string;
    EndFlag: boolean;
  };
}

// API 响应
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

