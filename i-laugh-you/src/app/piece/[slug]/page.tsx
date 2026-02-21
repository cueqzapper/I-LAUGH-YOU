import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  getPieceSessionCookieName,
  verifyPieceSessionToken,
} from "@/lib/piece-auth";
import { getPieceSiteBySlug, listSoldImageIds } from "@/lib/sqlite";
import { PIECE_COLUMNS } from "@/lib/piece-config";

const TILE_SERVER_BASE_URL = "https://ily.seez.ch/";
const TILE_DIMENSION = 256;
const MAX_ZOOM_LEVEL = 11;
const PREVIEW_ZOOM = 10;

const SOURCE_IMAGE_WIDTH = 337920;
const SOURCE_IMAGE_HEIGHT = 396288;
const SOURCE_OFFSETS = {
  top: 3873,
  right: 3083,
  bottom: 1573,
  left: 1509,
};
const PIECE_ROWS = 146;
const FINAL_IMAGE_WIDTH =
  (SOURCE_IMAGE_WIDTH - SOURCE_OFFSETS.right - SOURCE_OFFSETS.left) / PIECE_COLUMNS;
const FINAL_IMAGE_HEIGHT =
  (SOURCE_IMAGE_HEIGHT - SOURCE_OFFSETS.top - SOURCE_OFFSETS.bottom) / PIECE_ROWS;
const PREVIEW_OFFSET_SHADOW = 4;

interface PreviewRow {
  images: string[];
  width: number;
}

interface PreviewLayer {
  left: number;
  top: number;
  rows: PreviewRow[];
}

interface PreviewLayout {
  width: number;
  height: number;
  layers: PreviewLayer[];
}

function tileXYToQuadKey(
  tileX: number,
  tileY: number,
  levelOfDetail: number
): string {
  let quadKey = "q";
  for (let i = levelOfDetail; i > 0; i -= 1) {
    let digit = 0;
    const mask = 1 << (i - 1);
    if ((tileX & mask) !== 0) {
      digit += 1;
    }
    if ((tileY & mask) !== 0) {
      digit += 2;
    }
    quadKey += `t${digit}`;
  }

  let dirname = TILE_SERVER_BASE_URL;

  if (levelOfDetail % 2 === 0) {
    for (let i = 1; i < levelOfDetail + 1; i += 1) {
      if (i % 2 === 0) {
        dirname += `${quadKey.substring(
          0,
          quadKey.length - (levelOfDetail - i) * 2 - 1
        )}/`;
      }
    }
  } else {
    for (let i = 1; i < levelOfDetail; i += 1) {
      if (i % 2 !== 0) {
        dirname += `${quadKey.substring(
          0,
          quadKey.length - (levelOfDetail - i) * 2 + 1
        )}/`;
      }
    }
  }

  return `${dirname}${quadKey}.jpg`;
}

function getPiecePreviewLayout(imageId: number): PreviewLayout {
  const normalizedId = Math.max(1, imageId) - 1;
  const zoom = PREVIEW_ZOOM;

  let yCoord =
    Math.floor(normalizedId / PIECE_COLUMNS) * FINAL_IMAGE_HEIGHT +
    SOURCE_OFFSETS.top;
  let xCoord =
    (normalizedId % PIECE_COLUMNS) * FINAL_IMAGE_WIDTH + SOURCE_OFFSETS.left;
  let singleImageWidth = FINAL_IMAGE_WIDTH;
  let singleImageHeight = FINAL_IMAGE_HEIGHT;

  for (let t = 0; t < MAX_ZOOM_LEVEL - zoom; t += 1) {
    xCoord /= 2;
    yCoord /= 2;
    singleImageWidth /= 2;
    singleImageHeight /= 2;
  }

  const tileXFirst = Math.floor(xCoord / TILE_DIMENSION);
  const tileYFirst = Math.floor(yCoord / TILE_DIMENSION);
  const xOffset = xCoord % TILE_DIMENSION;
  const yOffset = yCoord % TILE_DIMENSION;

  let tileXLast = Math.trunc((xCoord + singleImageWidth) / TILE_DIMENSION);
  let tileYLast = Math.trunc((yCoord + singleImageHeight) / TILE_DIMENSION);

  if ((xCoord + singleImageWidth) % TILE_DIMENSION !== 0) {
    tileXLast += 1;
  }

  if ((yCoord + singleImageHeight) % TILE_DIMENSION !== 0) {
    tileYLast += 1;
  }

  const xRange = tileXLast - tileXFirst;
  const yRange = tileYLast - tileYFirst;

  const rows: PreviewRow[] = [];
  for (let row = 0; row < yRange; row += 1) {
    const images: string[] = [];
    for (let column = 0; column < xRange; column += 1) {
      images.push(
        tileXYToQuadKey(tileXFirst + column, tileYFirst + row, zoom)
      );
    }
    rows.push({
      images,
      width: xRange * TILE_DIMENSION,
    });
  }

  const baseOffsetLeft = Math.trunc(xOffset);
  const baseOffsetTop = Math.trunc(yOffset);

  return {
    width: Math.max(1, Math.trunc(singleImageWidth)),
    height: Math.max(1, Math.trunc(singleImageHeight)),
    layers: [
      {
        left: baseOffsetLeft,
        top: baseOffsetTop,
        rows,
      },
      {
        left: baseOffsetLeft + PREVIEW_OFFSET_SHADOW,
        top: baseOffsetTop + PREVIEW_OFFSET_SHADOW,
        rows,
      },
    ],
  };
}

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleValue(value: string | string[] | undefined) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }

  return undefined;
}

function getMessage(searchParams: SearchParams) {
  const errorCode = getSingleValue(searchParams.error);
  const statusCode = getSingleValue(searchParams.status);

  if (errorCode === "invalid_credentials") {
    return {
      tone: "error" as const,
      text: "Wrong password. Please try again.",
    };
  }

  if (errorCode === "unauthorized") {
    return {
      tone: "error" as const,
      text: "Owner login is required to edit this piece page.",
    };
  }

  if (errorCode === "invalid_input") {
    return {
      tone: "error" as const,
      text: "Please complete all required fields and use a valid URL.",
    };
  }

  if (statusCode === "updated") {
    return {
      tone: "success" as const,
      text: "Piece page updated successfully.",
    };
  }

  if (statusCode === "logged_out") {
    return {
      tone: "success" as const,
      text: "You have been logged out from owner editing.",
    };
  }

  return null;
}

export default async function PiecePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  const site = getPieceSiteBySlug(resolvedParams.slug);

  if (!site) {
    notFound();
  }

  const soldImageIds = listSoldImageIds();
  const isSold = soldImageIds.includes(site.image_id);
  const pieceLayout = getPiecePreviewLayout(site.image_id);

  const cookieStore = await cookies();
  const ownerCookieName = getPieceSessionCookieName(site.image_id);
  const ownerToken = cookieStore.get(ownerCookieName)?.value;
  const isOwner = verifyPieceSessionToken(ownerToken, site.image_id);
  const notice = getMessage(resolvedSearchParams);
  const actionPrefix = `/api/pieces/${encodeURIComponent(site.slug)}`;

  const pieceRow = Math.floor((site.image_id - 1) / PIECE_COLUMNS) + 1;
  const pieceCol = ((site.image_id - 1) % PIECE_COLUMNS) + 1;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
        
        .piece-page {
          min-height: 100vh;
          background: #ffffff;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        .piece-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          padding: 20px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #ffffff;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .piece-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: #1a1a1a;
        }
        
        .piece-logo img {
          height: 40px;
          width: auto;
        }
        
        .piece-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 1.4rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: #1a1a1a;
        }
        
        .piece-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #f5f5f5;
          border: 1px solid #e0e0e0;
          border-radius: 50px;
          color: #333;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        
        .piece-back-btn:hover {
          background: #eaeaea;
          border-color: #ccc;
          transform: translateX(-4px);
        }
        
        .piece-content {
          padding: 120px 24px 80px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .piece-gallery {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: start;
        }
        
        @media (max-width: 900px) {
          .piece-gallery {
            grid-template-columns: 1fr;
            gap: 40px;
          }
        }
        
        .piece-artwork-container {
          position: relative;
          max-width: 480px;
        }
        
        .piece-frame {
          position: relative;
          background: #1a1a1a;
          padding: 14px;
          border-radius: 2px;
          box-shadow: 
            0 20px 50px rgba(0,0,0,0.15),
            0 8px 20px rgba(0,0,0,0.1);
          display: inline-block;
        }
        
        .piece-frame::before {
          display: none;
        }
        
        .piece-mat {
          background: transparent;
          padding: 0;
          box-shadow: none;
          display: flex;
        }
        
        .piece-image-scaler {
          position: relative;
          transform-origin: top left;
        }
        
        .piece-image-wrapper {
          position: relative;
          overflow: hidden;
          box-shadow: none;
          background: #333;
        }
        
        .piece-image-inner {
          position: relative;
          overflow: visible;
        }
        
        .piece-image-tiles {
          position: absolute;
        }
        
        .piece-image-row {
          line-height: 0;
          white-space: nowrap;
        }
        
        .piece-image-tile {
          display: inline-block;
          vertical-align: top;
        }
        
        .piece-status-badge {
          position: absolute;
          top: 16px;
          right: 16px;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          backdrop-filter: blur(10px);
          z-index: 10;
        }
        
        .piece-status-sold {
          background: rgba(220, 38, 38, 0.9);
          color: #fff;
          box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4);
        }
        
        .piece-status-available {
          background: rgba(22, 163, 74, 0.9);
          color: #fff;
          box-shadow: 0 4px 15px rgba(22, 163, 74, 0.4);
        }
        
        .piece-details {
          color: #1a1a1a;
        }
        
        .piece-edition {
          display: block;
          margin-bottom: 20px;
        }
        
        .piece-edition-number {
          font-family: 'Playfair Display', serif;
          font-size: 4rem;
          font-weight: 700;
          color: #1a1a1a;
          line-height: 1;
          display: block;
        }
        
        .piece-edition-total {
          font-size: 1rem;
          color: #888;
          font-weight: 400;
          margin-top: 4px;
          display: block;
        }
        
        .piece-title {
          font-family: 'Playfair Display', serif;
          font-size: 2.8rem;
          font-weight: 600;
          line-height: 1.2;
          margin: 0 0 16px;
          color: #1a1a1a;
        }
        
        .piece-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          margin-bottom: 28px;
          padding-bottom: 28px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .piece-meta-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .piece-meta-label {
          font-size: 0.75rem;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        
        .piece-meta-value {
          font-size: 1rem;
          color: #1a1a1a;
          font-weight: 500;
        }
        
        .piece-description {
          font-size: 1.1rem;
          line-height: 1.8;
          color: #444;
          margin-bottom: 32px;
        }
        
        .piece-cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 16px 32px;
          background: #1a1a1a;
          color: #fff;
          text-decoration: none;
          font-size: 1rem;
          font-weight: 600;
          border-radius: 4px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        }
        
        .piece-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.2);
          background: #333;
        }
        
        .piece-owner-section {
          margin-top: 48px;
          padding-top: 32px;
          border-top: 1px solid #e0e0e0;
        }
        
        .piece-owner-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem;
          color: #1a1a1a;
          margin: 0 0 8px;
        }
        
        .piece-owner-subtitle {
          color: #666;
          font-size: 0.95rem;
          margin: 0 0 24px;
        }
        
        .piece-form-group {
          margin-bottom: 20px;
        }
        
        .piece-form-label {
          display: block;
          font-size: 0.85rem;
          color: #555;
          margin-bottom: 8px;
          font-weight: 500;
        }
        
        .piece-form-input {
          width: 100%;
          padding: 14px 16px;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 6px;
          color: #1a1a1a;
          font-size: 1rem;
          transition: all 0.3s ease;
        }
        
        .piece-form-input:focus {
          outline: none;
          border-color: #1a1a1a;
          background: #fff;
        }
        
        .piece-form-input::placeholder {
          color: #aaa;
        }
        
        .piece-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          background: #1a1a1a;
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .piece-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
          background: #333;
        }
        
        .piece-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: transparent;
          color: #555;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .piece-btn-secondary:hover {
          background: #f5f5f5;
          border-color: #ccc;
        }
        
        .piece-notice {
          padding: 16px 20px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 0.95rem;
        }
        
        .piece-notice-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }
        
        .piece-notice-success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }
        
        .piece-dimensions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          padding: 12px 16px;
          background: #f9f9f9;
          border-radius: 6px;
          border: 1px solid #eee;
        }
        
        .piece-dimensions-icon {
          width: 20px;
          height: 20px;
          opacity: 0.5;
          color: #666;
        }
        
        .piece-dimensions-text {
          font-size: 0.9rem;
          color: #666;
        }
      `}</style>

      <div className="piece-page">
        {/* Header with Logo and Back Button */}
        <header className="piece-header">
          <a href="/" className="piece-logo">
            <img src="/img/logo.png" alt="I Laugh You" />
          </a>
          <a href="/" className="piece-back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Gallery
          </a>
        </header>

        {/* Main Content */}
        <main className="piece-content">
          <div className="piece-gallery">
            {/* Artwork Display */}
            <div className="piece-artwork-container">
              <div className="piece-frame">
                <div className="piece-mat">
                  <div 
                    style={{ 
                      width: 420, 
                      height: Math.round(420 * pieceLayout.height / pieceLayout.width),
                      overflow: 'hidden',
                    }}
                  >
                    <div 
                      className="tile"
                      style={{ 
                        transform: `scale(${420 / pieceLayout.width})`,
                        transformOrigin: 'top left',
                        margin: 0,
                      }}
                    >
                    <div 
                      className="imgWrapper"
                      style={{ 
                        position: 'relative',
                        overflow: 'hidden',
                        width: pieceLayout.width, 
                        height: pieceLayout.height,
                      }}
                    >
                      {pieceLayout.layers.map((layer, layerIndex) => (
                        <div
                          className="imgWrapperOffset"
                          key={layerIndex}
                          style={{
                            position: 'absolute',
                            left: `-${layer.left}px`,
                            top: `-${layer.top}px`,
                          }}
                        >
                          {layer.rows.map((row, rowIndex) => (
                            <div
                              className="imgRow"
                              key={rowIndex}
                              style={{
                                height: TILE_DIMENSION,
                                width: row.width,
                              }}
                            >
                              {row.images.map((src, imageIndex) => (
                                <img
                                  key={imageIndex}
                                  src={src}
                                  height={TILE_DIMENSION}
                                  width={TILE_DIMENSION}
                                  alt=""
                                  loading="lazy"
                                  decoding="async"
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  </div>
                </div>
              </div>
              
              {/* Status Badge */}
              <div className={`piece-status-badge ${isSold ? 'piece-status-sold' : 'piece-status-available'}`}>
                {isSold ? '✓ Sold' : 'Available'}
              </div>
              
              {/* Dimensions */}
              <div className="piece-dimensions">
                <svg className="piece-dimensions-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18M9 3v18"/>
                </svg>
                <span className="piece-dimensions-text">30 × 40 cm · Canvas Print · Edition 1 of 1</span>
              </div>
            </div>

            {/* Details Panel */}
            <div className="piece-details">
              <div className="piece-edition">
                <span className="piece-edition-number">#{site.image_id}</span>
                <span className="piece-edition-total">of 24,236 pieces</span>
              </div>
              
              <h1 className="piece-title">{site.title}</h1>
              
              <div className="piece-meta">
                <div className="piece-meta-item">
                  <span className="piece-meta-label">Position</span>
                  <span className="piece-meta-value">Row {pieceRow}, Column {pieceCol}</span>
                </div>
                <div className="piece-meta-item">
                  <span className="piece-meta-label">Slug</span>
                  <span className="piece-meta-value">{site.slug}</span>
                </div>
                <div className="piece-meta-item">
                  <span className="piece-meta-label">Status</span>
                  <span className="piece-meta-value">{isSold ? 'Sold' : 'Available'}</span>
                </div>
              </div>

              {notice && (
                <div className={`piece-notice ${notice.tone === 'error' ? 'piece-notice-error' : 'piece-notice-success'}`}>
                  {notice.text}
                </div>
              )}

              <p className="piece-description">{site.description}</p>

              <a href={site.link_url} target="_blank" rel="noreferrer" className="piece-cta">
                {site.link_label || 'View More'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M17 7H7M17 7v10"/>
                </svg>
              </a>

              {/* Owner Section */}
              <div className="piece-owner-section">
                {isOwner ? (
                  <>
                    <h2 className="piece-owner-title">Edit Your Piece</h2>
                    <p className="piece-owner-subtitle">
                      Customize your piece&apos;s title, description, and link. The URL slug updates automatically.
                    </p>

                    <form method="POST" action={`${actionPrefix}/site`}>
                      <div className="piece-form-group">
                        <label className="piece-form-label">Title</label>
                        <input
                          type="text"
                          name="title"
                          defaultValue={site.title}
                          required
                          maxLength={120}
                          className="piece-form-input"
                        />
                      </div>

                      <div className="piece-form-group">
                        <label className="piece-form-label">Description</label>
                        <textarea
                          name="description"
                          defaultValue={site.description}
                          required
                          maxLength={2000}
                          rows={5}
                          className="piece-form-input"
                        />
                      </div>

                      <div className="piece-form-group">
                        <label className="piece-form-label">Link URL</label>
                        <input
                          type="url"
                          name="linkUrl"
                          defaultValue={site.link_url}
                          required
                          placeholder="https://..."
                          className="piece-form-input"
                        />
                      </div>

                      <div className="piece-form-group">
                        <label className="piece-form-label">Link Label (optional)</label>
                        <input
                          type="text"
                          name="linkLabel"
                          defaultValue={site.link_label ?? ""}
                          maxLength={120}
                          className="piece-form-input"
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button type="submit" className="piece-btn-primary">
                          Save Changes
                        </button>
                      </div>
                    </form>

                    <form method="POST" action={`${actionPrefix}/auth/logout`} style={{ marginTop: '16px' }}>
                      <button type="submit" className="piece-btn-secondary">
                        Logout
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <h2 className="piece-owner-title">Owner Access</h2>
                    <p className="piece-owner-subtitle">
                      Enter your password to edit this piece&apos;s details.
                    </p>

                    <form method="POST" action={`${actionPrefix}/auth/login`}>
                      <div className="piece-form-group" style={{ maxWidth: '320px' }}>
                        <label className="piece-form-label">Password</label>
                        <input
                          type="password"
                          name="password"
                          required
                          autoComplete="current-password"
                          className="piece-form-input"
                        />
                      </div>

                      <button type="submit" className="piece-btn-primary">
                        Login to Edit
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>

      </div>
    </>
  );
}
