import { AsyncLocalStorage } from "async_hooks";

/**
 * Các route polling gọi liên tục từ frontend -> tắt toàn bộ log (morgan, API REQ/RES, DB SQL)
 * để tránh làm nhiễu console. Thêm path vào đây nếu cần ẩn thêm route khác.
 */
export const SILENT_LOG_PATHS = ["/chats/unread-count"];

const logContext = new AsyncLocalStorage();

export function isSilentLogPath(url = "") {
  const path = url.split("?")[0].replace(/\/+$/, "");
  return SILENT_LOG_PATHS.includes(path);
}

/** Middleware: đánh dấu request hiện tại (và mọi query SQL bên trong nó) là "silent" */
export function logContextMiddleware(req, res, next) {
  logContext.run({ silent: isSilentLogPath(req.originalUrl) }, next);
}

/** true nếu đang ở trong một request thuộc SILENT_LOG_PATHS */
export function isLogSilenced() {
  return logContext.getStore()?.silent === true;
}

