'use client';

import { useEffect } from 'react';
import { useZegoRTC } from '../hooks/useZegoRTC';
import { useChat } from '../hooks/useChat';
import { MessageList } from './MessageList';

export function AIAgentChat() {
  const { zg, isConnected, isMuted, isLoading, error, startCall, stopCall, toggleMute } = useZegoRTC();
  const { messages, setupEventListeners, clearMessages } = useChat(zg);

  useEffect(() => {
    if (isConnected && zg) {
      setupEventListeners();
    }
  }, [isConnected, zg, setupEventListeners]);

  useEffect(() => {
    if (!isConnected) {
      clearMessages();
    }
  }, [isConnected, clearMessages]);

  const handleToggleCall = () => {
    if (isConnected) {
      stopCall();
    } else {
      startCall();
    }
  };

  return (
    <div className="flex h-screen w-full">
      {/* Left control area */}
      <div className="flex flex-col items-center justify-center w-1/2 bg-zinc-50 dark:bg-zinc-900 p-8">
        <div className="flex flex-col items-center gap-8">
          <h1 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-100">
            ZEGO AI Agent
          </h1>

          {/* Call status indicator */}
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-zinc-300'}`} />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {isConnected ? 'In Call' : 'Disconnected'}
            </span>
          </div>

          {/* Error message */}
          {error && (
            <div className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Control buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleToggleCall}
              disabled={isLoading}
              className={`px-8 py-3 rounded-full font-medium transition-all ${
                isConnected
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? 'Processing...' : isConnected ? 'End Call' : 'Start AI Call'}
            </button>

            {isConnected && (
              <button
                onClick={toggleMute}
                className={`px-6 py-3 rounded-full font-medium transition-all ${
                  isMuted
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
                }`}
              >
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
            )}
          </div>

          <p className="text-sm text-zinc-500 max-w-xs text-center">
            Click to start a voice conversation with AI
          </p>
        </div>
      </div>

      {/* Right message list */}
      <div className="flex flex-col w-1/2 border-l border-zinc-200 dark:border-zinc-700">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="font-medium text-zinc-800 dark:text-zinc-100">Conversation</h2>
        </div>
        <MessageList messages={messages} />
      </div>
    </div>
  );
}

