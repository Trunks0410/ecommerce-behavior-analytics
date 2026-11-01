import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendDir = path.join(__dirname, "backend");
const frontendDir = path.join(__dirname, "frontend");

console.log("=====================================================");
console.log("🚚 KHỞI CHẠY HỆ THỐNG VẬN CHUYỂN UTE EXPRESS (SHIPMENT)");
console.log("=====================================================");

// 1. Start Backend (Port 8090)
console.log("[UTE Express] Đang khởi động Backend Microservice...");
const backendProcess = spawn(process.execPath, ["server.js"], {
  cwd: backendDir,
  env: { ...process.env },
  stdio: ["inherit", "pipe", "pipe"],
});

backendProcess.stdout.on("data", (data) => {
  process.stdout.write(`[BACKEND:8090] ${data}`);
});

backendProcess.stderr.on("data", (data) => {
  process.stderr.write(`[BACKEND ERR] ${data}`);
});

backendProcess.on("close", (code) => {
  console.log(`[BACKEND] Đã dừng với mã: ${code}`);
});

// 2. Start Frontend (Port 5174)
console.log("[UTE Express] Đang khởi động Frontend Dashboard...");
const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

const frontendProcess = spawn(npmCmd, ["run", "dev"], {
  cwd: frontendDir,
  env: { ...process.env },
  stdio: ["inherit", "pipe", "pipe"],
});

frontendProcess.stdout.on("data", (data) => {
  process.stdout.write(`[FRONTEND:5174] ${data}`);
});

frontendProcess.stderr.on("data", (data) => {
  process.stderr.write(`[FRONTEND ERR] ${data}`);
});

frontendProcess.on("close", (code) => {
  console.log(`[FRONTEND] Đã dừng với mã: ${code}`);
});

const cleanup = () => {
  console.log("\n[UTE Express] Đang dừng tất cả dịch vụ...");
  try { backendProcess.kill(); } catch {}
  try { frontendProcess.kill(); } catch {}
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

