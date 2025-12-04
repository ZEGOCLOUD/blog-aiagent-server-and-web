'use client';

import { useState, useCallback, useRef } from 'react';
import type { ChatMessage, ZegoRoomMessage } from '../types/zego';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZegoEngine = any;

export function useChat(zg: ZegoEngine | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const asrCacheRef = useRef<Map<string, { seqId: number; text: string }>>(new Map());
  const llmCacheRef = useRef<Map<string, { seqId: number; text: string; isComplete: boolean }>>(new Map());

  const handleMessage = useCallback((msgContent: string) => {
    try {
      const msg: ZegoRoomMessage = JSON.parse(msgContent);
      const { Cmd, SeqId, Data } = msg;

      if (Cmd === 3) {
        // ASR 文本 (用户说话)
        const cache = asrCacheRef.current.get(Data.MessageId);
        if (!cache || SeqId > cache.seqId) {
          asrCacheRef.current.set(Data.MessageId, { seqId: SeqId, text: Data.Text });

          setMessages(prev => {
            const existing = prev.find(m => m.id === Data.MessageId);
            if (existing) {
              return prev.map(m => m.id === Data.MessageId
                ? { ...m, content: Data.Text, isComplete: Data.EndFlag }
                : m
              );
            }
            return [...prev, {
              id: Data.MessageId,
              role: 'user',
              content: Data.Text,
              timestamp: Date.now(),
              isComplete: Data.EndFlag
            }];
          });
        }

        if (Data.EndFlag) {
          asrCacheRef.current.delete(Data.MessageId);
        }
      } else if (Cmd === 4) {
        // LLM 文本 (智能体回复)
        const cache = llmCacheRef.current.get(Data.MessageId);
        const newText = cache ? cache.text + Data.Text : Data.Text;
        llmCacheRef.current.set(Data.MessageId, { seqId: SeqId, text: newText, isComplete: Data.EndFlag });

        setMessages(prev => {
          const existing = prev.find(m => m.id === Data.MessageId);
          if (existing) {
            return prev.map(m => m.id === Data.MessageId
              ? { ...m, content: newText, isComplete: Data.EndFlag }
              : m
            );
          }
          return [...prev, {
            id: Data.MessageId,
            role: 'agent',
            content: newText,
            timestamp: Date.now(),
            isComplete: Data.EndFlag
          }];
        });

        if (Data.EndFlag) {
          llmCacheRef.current.delete(Data.MessageId);
        }
      }
    } catch (e) {
      console.error('Parse message error:', e);
    }
  }, []);

  const setupEventListeners = useCallback(() => {
    if (!zg) return;

    zg.on('recvExperimentalAPI', (result: Record<string, unknown>) => {
      const method = result.method as string;
      const content = result.content as { msgContent: string } | undefined;
      if (method === 'onRecvRoomChannelMessage' && content?.msgContent) {
        handleMessage(content.msgContent);
      }
    });

    zg.callExperimentalAPI({ method: 'onRecvRoomChannelMessage', params: {} });
  }, [zg, handleMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    asrCacheRef.current.clear();
    llmCacheRef.current.clear();
  }, []);

  return { messages, setupEventListeners, clearMessages };
}

