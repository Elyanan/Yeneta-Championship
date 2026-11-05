import nextEnv from "@next/env";
import { createClient } from "@sanity/client";
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const projectId = process.env.SANITY_PROJECT_ID,
  dataset = process.env.SANITY_DATASET;
const token =
  process.env.SANITY_API_READ_TOKEN || process.env.SANITY_API_WRITE_TOKEN;
const report = {};
try {
  if (!projectId || !dataset || !token)
    throw new Error(
      "Set the Sanity project, dataset and a server-side token in .env.local.",
    );
  if (!/^[a-z0-9-]+$/.test(projectId))
    throw new Error("Use the Sanity project ID, not an organization ID.");
  report.configuration = true;
  report.passwordHash = /^scrypt([:$])[a-f0-9]{32}\1[a-f0-9]{128}$/.test(
    process.env.ADMIN_PASSWORD_HASH || "",
  );
  report.sessionSecret =
    (process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SESSION_SECRET || "")
      .length >= 32;
  const config = {
    projectId,
    dataset,
    apiVersion: process.env.SANITY_API_VERSION || "2026-11-03",
    useCdn: false,
    timeout: 15000,
    maxRetries: 1,
  };
  const client = createClient({ ...config, token });
  const doc = await client.getDocument("championship.current");
  report.championshipInitialized = Boolean(
    doc?.payload?.settings?.activeSeasonId,
  );
  report.teams = doc?.payload?.teams?.length || 0;
  report.athletes = doc?.payload?.athletes?.length || 0;
  report.matches = doc?.payload?.matches?.length || 0;
  const anonymous = createClient(config);
  try {
    report.anonymousChampionshipReadDenied = !(await anonymous.getDocument(
      "championship.current",
    ));
  } catch (error) {
    if ([401, 403].includes(error.statusCode))
      report.anonymousChampionshipReadDenied = true;
    else throw error;
  }
  report.anonymousAdminMetadataReadDenied =
    (await anonymous.fetch(
      'count(*[_type in ["adminSession", "loginThrottle"]])',
    )) === 0;
  report.ready =
    report.passwordHash &&
    report.sessionSecret &&
    report.championshipInitialized &&
    report.anonymousChampionshipReadDenied &&
    report.anonymousAdminMetadataReadDenied;
  console.log(JSON.stringify(report, null, 2));
  if (!report.ready) process.exitCode = 1;
} catch (error) {
  console.error(
    "Backend verification failed: " +
      (error.statusCode
        ? `Sanity returned HTTP ${error.statusCode}. Check token permissions.`
        : error.name === "TimeoutError"
          ? "Sanity did not respond in time. Try again."
          : error.message),
  );
  process.exitCode = 1;
}
