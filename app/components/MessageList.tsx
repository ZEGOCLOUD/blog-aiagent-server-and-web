'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../types/zego';

interface MessageListProps {
  messages: ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-400">
        <p>Start a conversation with AI</p>
      </div>
    );
  }

  return (
    <div ref={listRef} className="flex-1 overflow-y-auto space-y-4 p-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-2 ${
              msg.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100'
            }`}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            {!msg.isComplete && (
              <span className="inline-block w-1.5 h-4 ml-1 bg-current animate-pulse" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

