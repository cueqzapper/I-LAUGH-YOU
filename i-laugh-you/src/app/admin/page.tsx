import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE_NAME,
  getAdminCredentialHint,
  verifyAdminSessionToken,
} from "@/lib/admin-auth";
import {
  getSoldPieceCount,
  getSqliteFilePath,
  listPieceSales,
  listBids,
  getBidCount,
  getHighestBid,
  listBlogArticles,
  listBlogArticleTranslations,
  listPieceCredentials,
  getPieceCredentialCount,
} from "@/lib/sqlite";
import { TOTAL_PIECES } from "@/lib/piece-config";
import { loginAdminAction, logoutAdminAction } from "./actions";
import AdminBlogSection from "./AdminBlogSection";
import AdminPasswordsSection from "./AdminPasswordsSection";
type SearchParams = Record<string, string | string[] | undefined>;
type AdminTab = "sales" | "bids" | "blog" | "passwords";

function getErrorMessage(errorCode: string | undefined) {
  switch (errorCode) {
    case "invalid_credentials":
      return "Invalid credentials. Please try again.";
    case "missing_fields":
      return "Please enter username and password.";
    default:
      return "";
  }
}

function getSingleValue(value: string | string[] | undefined) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }

  return undefined;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const errorMessage = getErrorMessage(
    getSingleValue(resolvedSearchParams.error)
  );
  const tabParam = getSingleValue(resolvedSearchParams.tab);
  const activeTab: AdminTab =
    tabParam === "bids" ? "bids" : tabParam === "blog" ? "blog" : tabParam === "passwords" ? "passwords" : "sales";

  const cookieStore = await cookies();
  const adminToken = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = verifyAdminSessionToken(adminToken);
  const credentialsHint = getAdminCredentialHint();

  if (!isAuthenticated) {
    return (
      <div className="admin-login-wrapper">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <div className="admin-login-logo">🎨</div>
            <h1 className="admin-login-title">Admin Login</h1>
            <p className="admin-login-subtitle">
              Single-admin access to sold pieces overview
            </p>
          </div>

          {credentialsHint.show && (
            <div className="admin-alert admin-alert-warning">
              <span>⚠️</span>
              <span>
                <strong>Dev credentials:</strong> {credentialsHint.username} /{" "}
                {credentialsHint.password}
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="admin-alert admin-alert-error">
              <span>❌</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form action={loginAdminAction}>
            <div className="admin-form-group">
              <label className="admin-form-label">Username</label>
              <input
                name="username"
                type="text"
                autoComplete="username"
                required
                className="admin-form-input"
                placeholder="Enter username"
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Password</label>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="admin-form-input"
                placeholder="Enter password"
              />
            </div>

            <button type="submit" className="admin-btn admin-btn-primary" style={{ width: "100%" }}>
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  const sales = listPieceSales();
  const soldCount = getSoldPieceCount();
  const remainingPieces = Math.max(0, TOTAL_PIECES - soldCount);
  const bids = listBids();
  const bidCount = getBidCount();
  const highestBid = getHighestBid();
  const blogData = listBlogArticles(1, 50);
  const credentials = listPieceCredentials();
  const credentialCount = credentials.length;

  // Build a map of article ID -> existing translation languages
  const translationsMap: Record<number, string[]> = {};
  for (const article of blogData.articles) {
    const translations = listBlogArticleTranslations(article.id);
    if (translations.length > 0) {
      translationsMap[article.id] = translations.map((t) => t.language);
    }
  }

  return (
    <>
      {/* Top Navigation */}
      <header className="admin-topnav">
        <div className="admin-topnav-inner">
          <a href="/admin" className="admin-logo">
            <div className="admin-logo-icon">🎨</div>
            <span>ILY Admin</span>
          </a>

          <nav className="admin-nav-links">
            <a
              href="/admin?tab=sales"
              className={`admin-nav-link ${activeTab === "sales" ? "active" : ""}`}
            >
              <span>📦</span>
              <span>Sales</span>
              <span className="badge">{soldCount}</span>
            </a>
            <a
              href="/admin?tab=bids"
              className={`admin-nav-link ${activeTab === "bids" ? "active" : ""}`}
            >
              <span>💰</span>
              <span>Bids</span>
              <span className="badge">{bidCount}</span>
            </a>
            <a
              href="/admin?tab=blog"
              className={`admin-nav-link ${activeTab === "blog" ? "active" : ""}`}
            >
              <span>📝</span>
              <span>Blog</span>
              <span className="badge">{blogData.total}</span>
            </a>
            <a
              href="/admin?tab=passwords"
              className={`admin-nav-link ${activeTab === "passwords" ? "active" : ""}`}
            >
              <span>🔐</span>
              <span>Passwords</span>
              <span className="badge">{credentialCount}</span>
            </a>
          </nav>

          <div className="admin-nav-actions">
            <div className="admin-user-badge">
              <div className="admin-user-avatar">A</div>
              <span>Admin</span>
            </div>
            <form action={logoutAdminAction}>
              <button type="submit" className="admin-btn admin-btn-ghost">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="admin-main">
        <div className="admin-page-header">
          <h1 className="admin-page-title">
            {activeTab === "sales"
              ? "Sales Overview"
              : activeTab === "bids"
                ? "Bids Overview"
                : activeTab === "passwords"
                  ? "Piece Passwords"
                  : "Blog Management"}
          </h1>
          <p className="admin-page-subtitle">
            {activeTab === "sales"
              ? "Track all sold pieces and order details"
              : activeTab === "bids"
                ? "Monitor incoming bids and highest offers"
                : activeTab === "passwords"
                  ? "View and regenerate piece site credentials"
                  : "Generate and manage blog articles"}
          </p>
        </div>

        {activeTab === "passwords" ? (
          <AdminPasswordsSection credentials={credentials} />
        ) : activeTab === "blog" ? (
          <AdminBlogSection
            articles={blogData.articles}
            totalArticles={blogData.total}
            translationsMap={translationsMap}
          />
        ) : activeTab === "sales" ? (
          <>
            {/* Stats Grid */}
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <div className="admin-stat-label">Total Sold</div>
                <div className="admin-stat-value highlight">{soldCount}</div>
                <div className="admin-stat-meta">pieces sold</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Total Inventory</div>
                <div className="admin-stat-value">{TOTAL_PIECES}</div>
                <div className="admin-stat-meta">30x40cm pieces</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Available</div>
                <div className="admin-stat-value">{remainingPieces}</div>
                <div className="admin-stat-meta">unsold pieces</div>
              </div>
            </div>

            {/* Info Box */}
            <div className="admin-info-box">
              <div className="admin-info-row">
                <span className="admin-info-label">SQLite Database:</span>
                <span className="admin-info-value">{getSqliteFilePath()}</span>
              </div>
            </div>

            {/* Sales Table */}
            <div className="admin-table-wrapper">
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Image ID</th>
                      <th>Sold At</th>
                      <th>Buyer</th>
                      <th>Piece Page</th>
                      <th>Password</th>
                      <th>Address</th>
                      <th>Printify</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          <div className="admin-empty-state">
                            <div className="admin-empty-state-icon">📦</div>
                            <div className="admin-empty-state-text">No sales recorded yet</div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sales.map((sale) => {
                        const buyerLabel = sale.buyer_name
                          ? `${sale.buyer_name} (${sale.buyer_email ?? "no email"})`
                          : "Unknown";

                        const piecePath = sale.piece_slug ? `/piece/${sale.piece_slug}` : null;

                        const addressLabel = sale.buyer_address
                          ? [
                              sale.buyer_address,
                              sale.buyer_postal_code,
                              sale.buyer_city,
                              sale.buyer_country,
                            ]
                              .filter(Boolean)
                              .join(", ")
                          : "-";

                        const printifyLabel = sale.printify_status
                          ? `${sale.printify_status}${
                              sale.printify_job_id ? ` (${sale.printify_job_id})` : ""
                            }`
                          : "-";

                        return (
                          <tr key={sale.image_id}>
                            <td>
                              <span className="admin-badge admin-badge-info">#{sale.image_id}</span>
                            </td>
                            <td>{new Date(sale.sold_at).toLocaleString()}</td>
                            <td>{buyerLabel}</td>
                            <td>
                              {piecePath ? (
                                <a href={piecePath} target="_blank" rel="noreferrer" className="admin-link-inline">
                                  {piecePath}
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td>
                              {sale.piece_password ? (
                                <code className="admin-code-inline">{sale.piece_password}</code>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td>{addressLabel}</td>
                            <td>{printifyLabel}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Bids Stats */}
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <div className="admin-stat-label">Total Bids</div>
                <div className="admin-stat-value highlight">{bidCount}</div>
                <div className="admin-stat-meta">received</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Highest Bid</div>
                <div className="admin-stat-value">
                  {highestBid ? `$${highestBid.bid_amount.toLocaleString()}` : "-"}
                </div>
                <div className="admin-stat-meta">
                  {highestBid ? `by ${highestBid.bidder_name}` : "no bids yet"}
                </div>
              </div>
            </div>

            {/* Bids Table */}
            <div className="admin-table-wrapper">
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Amount</th>
                      <th>Bidder</th>
                      <th>Email</th>
                      <th>Message</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bids.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <div className="admin-empty-state">
                            <div className="admin-empty-state-icon">💰</div>
                            <div className="admin-empty-state-text">No bids received yet</div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      bids.map((bid, index) => (
                        <tr key={bid.id} className={index === 0 ? "highlight-row" : ""}>
                          <td>
                            #{bid.id}
                            {index === 0 && (
                              <span className="admin-badge admin-badge-warning" style={{ marginLeft: "8px" }}>
                                HIGHEST
                              </span>
                            )}
                          </td>
                          <td style={{ fontWeight: 600 }}>${bid.bid_amount.toLocaleString()}</td>
                          <td>{bid.bidder_name}</td>
                          <td>{bid.bidder_email}</td>
                          <td>{bid.message || "-"}</td>
                          <td>{new Date(bid.created_at).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
