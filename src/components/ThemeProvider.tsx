import { generateThemeCSS } from "@/lib/theme";
import type { WorkspaceTheme } from "@/lib/types";

interface ThemeProviderProps {
  theme: WorkspaceTheme | null;
  children: React.ReactNode;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  const css = generateThemeCSS(theme);

  if (!css) return <>{children}</>;

  return (
    <>
      <style>{css}</style>
      {children}
    </>
  );
}
