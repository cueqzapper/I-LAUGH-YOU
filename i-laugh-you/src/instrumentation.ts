export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startBlogScheduler } = await import("@/lib/blog-scheduler");
    startBlogScheduler();
  }
}
