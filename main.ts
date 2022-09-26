import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config({ path: ".env.local", override: true });

import { spawnSync } from "child_process";
const args = ["pages", "dev", "."];
for (const variable of [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "CF_ACCOUNT_ID",
]) {
  const value = process.env[variable];
  if (typeof value !== "string") throw new Error(`${variable} not defined`);
  args.splice(args.length, 0, "--r2", "127", "-b", `${variable}=${value}`);
}
spawnSync("wrangler", args, { stdio: "inherit" });
