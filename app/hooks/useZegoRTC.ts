'use client';

import { useState, useRef, useCallback } from 'react';
import type { ApiResponse, StartCallResponse, TokenResponse } from '../types/zego';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZegoEngine = any;

export function useZegoRTC() {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zgRef = useRef<ZegoEngine | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const agentInstanceIdRef = useRef<string | null>(null);
  const roomIdRef = useRef<string>('');
  const userIdRef = useRef<string>('');
  const userStreamIdRef = useRef<string>('');

  const initEngine = useCallback(async () => {
    if (zgRef.current) return zgRef.current;

    const appId = parseInt(process.env.NEXT_PUBLIC_ZEGO_APP_ID || '0');
    const server = process.env.NEXT_PUBLIC_ZEGO_SERVER || '';

    if (!appId || !server) {
      throw new Error('ZEGO config not set');
    }

    // Dynamic import to avoid SSR issues
    const { ZegoExpressEngine } = await import('zego-express-engine-webrtc');
    zgRef.current = new ZegoExpressEngine(appId, server);
    return zgRef.current;
  }, []);

  const startCall = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const zg = await initEngine();

      // Generate unique IDs
      const timestamp = Date.now();
      roomIdRef.current = `room${timestamp}`;
      userIdRef.current = `user${timestamp}`;
      userStreamIdRef.current = `stream${timestamp}`;

      // Get token
      const tokenRes = await fetch('/api/zego/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userIdRef.current })
      });
      const tokenData: ApiResponse<TokenResponse> = await tokenRes.json();
      if (tokenData.code !== 0 || !tokenData.data) throw new Error(tokenData.message || 'Failed to get token');

      // Login room
      await zg.loginRoom(roomIdRef.current, tokenData.data.token, {
        userID: userIdRef.current,
        userName: userIdRef.current
      });

      // Create local audio stream
      localStreamRef.current = await zg.createZegoStream({ camera: { video: false, audio: true } });
      if (localStreamRef.current) {
        await zg.startPublishingStream(userStreamIdRef.current, localStreamRef.current);
      }

      // Notify backend to start call
      const startRes = await fetch('/api/zego/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: roomIdRef.current,
          userId: userIdRef.current,
          userStreamId: userStreamIdRef.current
        })
      });
      const startData: ApiResponse<StartCallResponse> = await startRes.json();
      if (startData.code !== 0 || !startData.data) throw new Error(startData.message || 'Failed to start call');

      agentInstanceIdRef.current = startData.data.agentInstanceId;

      // Listen for remote streams
      zg.on('roomStreamUpdate', async (roomID: string, updateType: string, streamList: Array<{ streamID: string }>) => {
        if (updateType === 'ADD') {
          for (const stream of streamList) {
            // Pull remote audio stream
            const remoteStream = await zg.startPlayingStream(stream.streamID);
            if (remoteStream) {
              remoteStreamRef.current = remoteStream;
              // Create audio element to play remote audio
              if (!audioElementRef.current) {
                audioElementRef.current = document.createElement('audio');
                audioElementRef.current.autoplay = true;
                document.body.appendChild(audioElementRef.current);
              }
              audioElementRef.current.srcObject = remoteStream;
              audioElementRef.current.play().catch(e => console.error('Audio play error:', e));
              console.log('Started playing remote stream:', stream.streamID);
            }
          }
        } else if (updateType === 'DELETE') {
          // Stop playback
          if (audioElementRef.current) {
            audioElementRef.current.srcObject = null;
          }
          remoteStreamRef.current = null;
        }
      });

      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      console.error('Start call error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [initEngine]);

  const stopCall = useCallback(async () => {
    setIsLoading(true);
    try {
      if (agentInstanceIdRef.current) {
        await fetch('/api/zego/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentInstanceId: agentInstanceIdRef.current })
        });
      }

      if (zgRef.current) {
        if (localStreamRef.current) {
          zgRef.current.destroyStream(localStreamRef.current);
          localStreamRef.current = null;
        }
        await zgRef.current.logoutRoom();
      }

      // Clean up audio playback
      if (audioElementRef.current) {
        audioElementRef.current.srcObject = null;
        audioElementRef.current.remove();
        audioElementRef.current = null;
      }
      remoteStreamRef.current = null;

      agentInstanceIdRef.current = null;
      setIsConnected(false);
      setIsMuted(false);
    } catch (err) {
      console.error('Stop call error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (zgRef.current) {
      zgRef.current.muteMicrophone(!isMuted);
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  return {
    zg: zgRef.current,
    isConnected,
    isMuted,
    isLoading,
    error,
    startCall,
    stopCall,
    toggleMute
  };
}

