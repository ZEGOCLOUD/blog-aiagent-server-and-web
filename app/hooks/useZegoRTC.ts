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
      throw new Error('ZEGO 配置未设置');
    }

    // 动态导入以避免 SSR 问题
    const { ZegoExpressEngine } = await import('zego-express-engine-webrtc');
    zgRef.current = new ZegoExpressEngine(appId, server);
    return zgRef.current;
  }, []);

  const startCall = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const zg = await initEngine();

      // 生成唯一 ID
      const timestamp = Date.now();
      roomIdRef.current = `room${timestamp}`;
      userIdRef.current = `user${timestamp}`;
      userStreamIdRef.current = `stream${timestamp}`;

      // 获取 Token
      const tokenRes = await fetch('/api/zego/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userIdRef.current })
      });
      const tokenData: ApiResponse<TokenResponse> = await tokenRes.json();
      if (tokenData.code !== 0 || !tokenData.data) throw new Error(tokenData.message || '获取 Token 失败');

      // 登录房间
      await zg.loginRoom(roomIdRef.current, tokenData.data.token, {
        userID: userIdRef.current,
        userName: userIdRef.current
      });

      // 创建本地音频流
      localStreamRef.current = await zg.createZegoStream({ camera: { video: false, audio: true } });
      if (localStreamRef.current) {
        await zg.startPublishingStream(userStreamIdRef.current, localStreamRef.current);
      }

      // 通知后台开始通话
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
      if (startData.code !== 0 || !startData.data) throw new Error(startData.message || '开始通话失败');

      agentInstanceIdRef.current = startData.data.agentInstanceId;

      // 监听远端流
      zg.on('roomStreamUpdate', async (roomID: string, updateType: string, streamList: Array<{ streamID: string }>) => {
        if (updateType === 'ADD') {
          for (const stream of streamList) {
            // 拉取远端音频流
            const remoteStream = await zg.startPlayingStream(stream.streamID);
            if (remoteStream) {
              remoteStreamRef.current = remoteStream;
              // 创建 audio 元素播放远端音频
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
          // 停止播放
          if (audioElementRef.current) {
            audioElementRef.current.srcObject = null;
          }
          remoteStreamRef.current = null;
        }
      });

      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '连接失败');
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

      // 清理音频播放
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

