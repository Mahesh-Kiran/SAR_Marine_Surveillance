import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/**
 * useCollaboration — shared hook for real-time multi-user annotation rooms.
 *
 * @param {string|null} roomId   — room to join (null = solo mode)
 * @param {string|null} imageId  — image being annotated
 * @param {string}      userName — display name of the current user
 * @returns collaboration state & methods
 */
export default function useCollaboration(roomId, imageId, userName) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomUsers, setRoomUsers] = useState([]);
  const [remoteAnnotations, setRemoteAnnotations] = useState([]);
  const [myColor, setMyColor] = useState('#3b82f6');

  // Connect to the /collab namespace when a roomId is provided
  useEffect(() => {
    if (!roomId || !userName) return;

    const socketUrl = API_BASE || window.location.origin;
    const socket = io(`${socketUrl}/collab`, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-room', { roomId, imageId, userName });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Receive the current user list whenever someone joins/leaves
    socket.on('room-users', (users) => {
      setRoomUsers(users);
      // Find our own color from the user list
      const me = users.find(u => u.userName === userName);
      if (me) setMyColor(me.color);
    });

    // Sync existing annotations when we first join
    socket.on('sync-annotations', (annotations) => {
      setRemoteAnnotations(annotations);
    });

    // A remote user created an annotation
    socket.on('remote-annotation-created', (annotation) => {
      setRemoteAnnotations(prev => [...prev, annotation]);
    });

    // A remote user deleted an annotation
    socket.on('remote-annotation-deleted', ({ annotationId }) => {
      setRemoteAnnotations(prev => prev.filter(a => a.id !== annotationId));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setRoomUsers([]);
      setRemoteAnnotations([]);
    };
  }, [roomId, imageId, userName]);

  /** Broadcast a newly created annotation to the room */
  const broadcastAnnotation = useCallback((annotation) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('annotation-created', annotation);
    }
  }, []);

  /** Broadcast a deletion to the room */
  const broadcastDelete = useCallback((annotationId) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('annotation-deleted', { annotationId });
    }
  }, []);

  return {
    isConnected,
    roomUsers,
    remoteAnnotations,
    myColor,
    broadcastAnnotation,
    broadcastDelete
  };
}
