"use client";

import { useCallback, useEffect, useState } from "react";
import { loadTheme, saveTheme } from "@/lib/storage";
import type { Theme } from "@/types";

/** 배경 테마 + 접근성(모션/투명도) 상태를 관리하고 <html> data-* 속성에 반영한다. */
export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>("lavender");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [reduceTransparency, setReduceTransparency] = useState(false);

  // localStorage는 클라이언트에서만 읽어 하이드레이션 불일치를 피한다.
  useEffect(() => {
    setThemeState(loadTheme());
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
    document.documentElement.dataset.reduceTransparency = String(reduceTransparency);
  }, [reduceMotion, reduceTransparency]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);

  return {
    theme,
    setTheme,
    reduceMotion,
    setReduceMotion,
    reduceTransparency,
    setReduceTransparency,
  };
};
