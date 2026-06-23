/**
 * Small logging utility that gates debug output by the application config.
 * Errors and warnings are always emitted; debug/info messages are suppressed
 * unless debug mode is enabled.
 */

import { configService } from "$lib/services/configService";

function isDebugEnabled(): boolean {
  try {
    return configService.isDebugMode();
  } catch {
    // Config not loaded yet; keep debug output off.
    return false;
  }
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDebugEnabled()) {
      console.debug("[Ultimon]", ...args);
    }
  },

  info: (...args: unknown[]) => {
    if (isDebugEnabled()) {
      console.info("[Ultimon]", ...args);
    }
  },

  warn: (...args: unknown[]) => {
    console.warn("[Ultimon]", ...args);
  },

  error: (...args: unknown[]) => {
    console.error("[Ultimon]", ...args);
  },
};
