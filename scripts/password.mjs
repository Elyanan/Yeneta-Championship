import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";
// Password arrives over stdin, never a shell argument or command history.
let password = "";
if (process.stdin.isTTY) {
  console.error(
    "Pipe your password through stdin. See README.md for a PowerShell secure-input example.",
  );
  process.exit(1);
}
for await (const chunk of process.stdin) password += chunk;
password = password.replace(/\r?\n$/, "");
if (password.length < 12 || password.length > 256) {
  console.error("Use a password between 12 and 256 characters.");
  process.exit(1);
}
const salt = randomBytes(16).toString("hex"),
  key = await promisify(scrypt)(password, salt, 64);
console.log(`scrypt:${salt}:${key.toString("hex")}`);
