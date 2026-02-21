import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { listAllBlogImages } from "@/lib/sqlite";
import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionToken,
} from "@/lib/admin-auth";
import type { Metadata } from "next";
import "../blog.css";
import "./gallery.css";

export const metadata: Metadata = {
  title: "Galerie (Admin) — I LAUGH YOU Blog",
  description: "Admin-Ansicht aller generierten Blog-Illustrationen.",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function BlogGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!verifyAdminSessionToken(adminToken)) {
    redirect("/admin");
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const { images, total, pages } = listAllBlogImages(page, 36);

  return (
    <div id="blog-page">
      <header className="blog-header">
        <Link href="/admin" className="blog-home-link">
          &larr; Admin
        </Link>
        <h1>Blog Galerie</h1>
        <p className="blog-header-sub">
          Alle generierten Illustrationen &mdash; {total} Bilder
        </p>
      </header>

      <main className="gallery-container">
        {images.length === 0 ? (
          <div className="blog-empty">
            <h2>Noch keine Bilder</h2>
            <p>
              Sobald Blog-Artikel generiert werden, erscheinen hier die
              Illustrationen.
            </p>
          </div>
        ) : (
          <>
            <div className="gallery-masonry">
              {images.map((image) => (
                <Link
                  key={image.id}
                  href={`/blog/${image.article_slug}`}
                  className="gallery-item"
                >
                  <img
                    src={image.file_path}
                    alt={image.alt_text}
                    loading="lazy"
                  />
                  <div className="gallery-item-overlay">
                    <p className="gallery-item-title">
                      {image.article_title}
                    </p>
                    <p className="gallery-item-date">
                      {formatDate(image.created_at)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {pages > 1 && (
              <nav className="blog-pagination">
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) =>
                  p === page ? (
                    <span key={p} className="active">
                      {p}
                    </span>
                  ) : (
                    <Link key={p} href={`/blog/gallery?page=${p}`}>
                      {p}
                    </Link>
                  )
                )}
              </nav>
            )}
          </>
        )}
      </main>
    </div>
  );
}
