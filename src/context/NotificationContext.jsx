// src/context/NotificationContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import {
  FaCheckCircle,
  FaInfoCircle,
  FaExclamationTriangle,
  FaTimesCircle,
} from "react-icons/fa";
import "./Notification.css";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const queueRef = useRef([]); // queued notifications
  const processingRef = useRef(false); // lock to avoid overlap

  // 🧠 Queue processor with fade + delay between notifications
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    while (queueRef.current.length > 0) {
      const next = queueRef.current.shift();
      const id = next.id;

      // Add notification to screen
      setNotifications((prev) => [...prev, next]);

      // Wait until near end, then trigger fade-out
      await new Promise((resolve) =>
        setTimeout(() => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, fading: true } : n))
          );
          resolve();
        }, (next.duration || 3000) - 500)
      );

      // Wait another 500ms, then remove
      await new Promise((resolve) =>
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
          resolve();
        }, 500)
      );

      // Add 500ms delay between consecutive notifications
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    processingRef.current = false;
  }, []);

  // 🟢 Public function: Add to queue
  const addNotification = useCallback(
    (message, type = "info", duration = 3000) => {
      const id = Date.now() + Math.random();
      queueRef.current.push({ id, message, type, duration });
      processQueue();
    },
    [processQueue]
  );

  // 🧰 Remove manually (on click)
  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // 🎨 Icon mapping by type
  const icons = {
    success: <FaCheckCircle />,
    info: <FaInfoCircle />,
    warning: <FaExclamationTriangle />,
    error: <FaTimesCircle />,
  };

  const notificationRoot = document.getElementById("notification-root");

  const portalContent = (
    <div className="notification-container">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`notification ${n.type} ${n.fading ? "fade-out" : ""}`}
          onClick={() => removeNotification(n.id)}
        >
          <span className="notification-icon">{icons[n.type] || icons.info}</span>
          <span className="notification-message">{n.message}</span>
        </div>
      ))}
    </div>
  );

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      {notificationRoot
        ? createPortal(portalContent, notificationRoot)
        : portalContent}
    </NotificationContext.Provider>
  );
}

export const useNotification = () => useContext(NotificationContext);
