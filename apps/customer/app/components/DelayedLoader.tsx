"use client";
import { useState, useEffect } from "react";

export default function DelayedLoader({ 
  children, 
  delay = 400 
}: { 
  children: React.ReactNode;
  delay?: number;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!show) return null;

  return <>{children}</>;
}
