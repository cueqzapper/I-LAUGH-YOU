import {
  getOrCreateBlogSchedulerLog,
  updateBlogSchedulerLog,
} from "@/lib/sqlite";
import { generateBlogArticle } from "@/lib/blog-generator";

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const MIN_HOUR = 6;
const MAX_HOUR = 22;

let schedulerRunning = false;
let todayScheduledHour: number | null = null;
let todayDateStr: string | null = null;

function getTodayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function pickRandomHour(): number {
  return MIN_HOUR + Math.floor(Math.random() * (MAX_HOUR - MIN_HOUR + 1));
}

function getCurrentHour(): number {
  return new Date().getHours();
}

async function checkAndGenerate(): Promise<void> {
  if (process.env.BLOG_GENERATION_ENABLED !== "true") {
    return;
  }

  const today = getTodayDateStr();

  // New day → pick a new random hour
  if (todayDateStr !== today) {
    todayDateStr = today;
    todayScheduledHour = pickRandomHour();
    console.log(
      `[blog-scheduler] New day: ${today}, scheduled generation at hour ${todayScheduledHour}`
    );
  }

  if (todayScheduledHour === null) return;

  const currentHour = getCurrentHour();

  // Not time yet
  if (currentHour < todayScheduledHour) return;

  // Check if already generated today (via DB log)
  const log = getOrCreateBlogSchedulerLog(today, todayScheduledHour);

  if (log.status === "completed" || log.status === "running") {
    return;
  }

  if (log.status === "failed") {
    // Don't retry failed generations in the same day
    return;
  }

  // Time to generate
  console.log(`[blog-scheduler] Starting daily generation for ${today}`);

  updateBlogSchedulerLog({
    generationDate: today,
    status: "running",
    startedAt: new Date().toISOString(),
  });

  try {
    const result = await generateBlogArticle();

    updateBlogSchedulerLog({
      generationDate: today,
      status: "completed",
      articleId: result.article.id,
      completedAt: new Date().toISOString(),
    });

    console.log(
      `[blog-scheduler] Daily generation complete: "${result.article.title}"`
    );
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[blog-scheduler] Generation failed:", errorMsg);

    updateBlogSchedulerLog({
      generationDate: today,
      status: "failed",
      errorMessage: errorMsg,
      completedAt: new Date().toISOString(),
    });
  }
}

export function startBlogScheduler(): void {
  if (schedulerRunning) {
    console.log("[blog-scheduler] Already running, skipping duplicate start");
    return;
  }

  schedulerRunning = true;
  console.log(
    `[blog-scheduler] Started (check interval: ${CHECK_INTERVAL_MS / 60000}min)`
  );

  // Initial check after short delay
  setTimeout(() => {
    checkAndGenerate().catch((err) =>
      console.error("[blog-scheduler] Check error:", err)
    );
  }, 5000);

  // Regular interval
  setInterval(() => {
    checkAndGenerate().catch((err) =>
      console.error("[blog-scheduler] Check error:", err)
    );
  }, CHECK_INTERVAL_MS);
}
