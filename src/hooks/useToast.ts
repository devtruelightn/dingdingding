"use client";

import { useCallback, useEffect, useState } from "react";

/** 하단 토스트 메시지 상태. 2.8초 뒤 자동으로 사라진다. */
export const useToast = () => {
  const [message, setMessage] = useState("");
  const toast = useCallback((next: string) => setMessage(next), []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 2800);
    return () => window.clearTimeout(timer);
  }, [message]);

  return { message, toast };
};
