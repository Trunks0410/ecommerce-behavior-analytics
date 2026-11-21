import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendDir = path.join(__dirname, "backend");
const frontendDir = path.join(__dirname, "frontend");

console.log("=====================================================");
console.log("📊 KHỞI CHẠY HỆ THỐNG PHÂN TÍCH & TÌM KIẾM (ANALYTICS & SEARCH)");
console.log("=====================================================");

// 1. Start Backend (Port 8088)
console.log("[Analytics] Đang khởi động Search & Analytics Backend Microservice (:8088)...");
const backendProcess = spawn(process.execPath, ["server.js"], {
  cwd: backendDir,
  env: { ...process.env },
  stdio: ["ignore", "pipe", "pipe"],
});

backendProcess.stdout.on("data", (data) => {
  process.stdout.write(`[SEARCH-BACKEND:8088] ${data}`);
});

backendProcess.stderr.on("data", (data) => {
  process.stderr.write(`[SEARCH-BACKEND ERR] ${data}`);
});

backendProcess.on("close", (code) => {
  console.log(`[SEARCH-BACKEND] Đã dừng với mã: ${code}`);
});

// 2. Start Frontend Dashboard (Port 5175)
console.log("[Analytics] Đang khởi động Analytics Frontend Dashboard (:5175)...");
const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

const frontendProcess = spawn(npmCmd, ["run", "dev"], {
  cwd: frontendDir,
  env: { ...process.env },
  stdio: ["ignore", "pipe", "pipe"],
  shell: isWin,
});

frontendProcess.stdout.on("data", (data) => {
  process.stdout.write(`[ANALYTICS-UI:5175] ${data}`);
});

frontendProcess.stderr.on("data", (data) => {
  process.stderr.write(`[ANALYTICS-UI ERR] ${data}`);
});

frontendProcess.on("close", (code) => {
  console.log(`[ANALYTICS-UI] Đã dừng với mã: ${code}`);
});

const cleanup = () => {
  console.log("\n[Analytics] Đang dừng tất cả dịch vụ...");
  try { backendProcess.kill(); } catch {}
  try { frontendProcess.kill(); } catch {}
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
