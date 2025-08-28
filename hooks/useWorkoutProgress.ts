import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getCurrentUser } from '@/lib/auth';

interface ProgressEvent {
  progress: number; // 0-100
  complete?: boolean;
  error?: string;
}

interface UseWorkoutProgressReturn {
  progress: number;
  isComplete: boolean;
  error: string | null;
  isConnected: boolean;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export function useWorkoutProgress(): UseWorkoutProgressReturn {
  const [progress, setProgress] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  const socketRef = useRef<Socket | null>(null);
  const userIdRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeSocket = async () => {
      try {
        // Get current user
        const user = await getCurrentUser();
        if (!user || !mounted) return;

        userIdRef.current = user.id;

        // Create socket connection
        const socket = io(API_BASE_URL, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
        });

        socketRef.current = socket;

        // Connection handlers
        socket.on('connect', () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          
          // Join user-specific room
          if (userIdRef.current) {
            socket.emit('join-user-room', userIdRef.current);
          }
        });

        socket.on('disconnect', () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
        });

        socket.on('connect_error', (err) => {
          console.error('WebSocket connection error:', err);
          setIsConnected(false);
        });

        // Listen for workout progress updates
        socket.on('workout-progress', (data: ProgressEvent) => {
          console.log('Workout progress update:', data);
          
          if (mounted) {
            setProgress(data.progress);
            setIsComplete(data.complete || false);
            setError(data.error || null);
          }
        });

      } catch (err) {
        console.error('Error initializing WebSocket:', err);
      }
    };

    initializeSocket();

    // Cleanup
    return () => {
      mounted = false;
      
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      setIsConnected(false);
    };
  }, []);

  return {
    progress,
    isComplete,
    error,
    isConnected,
  };
}

/**
 * Hook for listening to progress updates for a specific job
 */
export function useJobProgress(jobId: number | null): UseWorkoutProgressReturn {
  const [progress, setProgress] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  const socketRef = useRef<Socket | null>(null);
  const userIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!jobId) {
      // Reset state when no job ID
      setProgress(0);
      setIsComplete(false);
      setError(null);
      return;
    }

    let mounted = true;

    const initializeSocket = async () => {
      try {
        // Get current user
        const user = await getCurrentUser();
        if (!user || !mounted) return;

        userIdRef.current = user.id;

        // Create socket connection
        const socket = io(API_BASE_URL, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
        });

        socketRef.current = socket;

        // Connection handlers
        socket.on('connect', () => {
          console.log('WebSocket connected for job:', jobId);
          setIsConnected(true);
          
          // Join user-specific room
          if (userIdRef.current) {
            socket.emit('join-user-room', userIdRef.current);
          }
        });

        socket.on('disconnect', () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
        });

        socket.on('connect_error', (err) => {
          console.error('WebSocket connection error:', err);
          setIsConnected(false);
        });

        // Listen for workout progress updates
        socket.on('workout-progress', (data: ProgressEvent) => {
          console.log('Job progress update:', data);
          
          if (mounted) {
            setProgress(data.progress);
            setIsComplete(data.complete || false);
            setError(data.error || null);
          }
        });

      } catch (err) {
        console.error('Error initializing WebSocket for job:', err);
      }
    };

    initializeSocket();

    // Cleanup
    return () => {
      mounted = false;
      
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      setIsConnected(false);
    };
  }, [jobId]);

  return {
    progress,
    isComplete,
    error,
    isConnected,
  };
}