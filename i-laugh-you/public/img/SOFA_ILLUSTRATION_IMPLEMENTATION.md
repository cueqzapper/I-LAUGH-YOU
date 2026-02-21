# Sofa Illustration (`/sofa`) – Exact Parity Implementation

## Goal
Reproduce the sofa scene so it looks and behaves exactly like the current implementation, including:
- responsive sofa/floor positioning
- color picker behavior
- wallpaper recommendation strip
- identical asset usage and blend modes

## Source of Truth (current implementation)
- Route wiring: `src/web/App.tsx` (`/sofa` + `/test-landing`)
- Page implementation: `src/web/pages/LandingPage.tsx`
- Backend API: `src/server.ts` (`POST /api/colorpicker`)
- Static assets: `public/img/sofa/*`
- Data dependency: `public/json/wallpapers-list.json`

## Asset Migration
Copy:
- `public/img/sofa/**` → `public/img/sofa/**`
- `public/json/wallpapers-list.json` → `public/json/wallpapers-list.json`

**Important:** Keep `/img/sofa/...` paths unchanged to avoid any visual/behavior drift.

---

## Route (exact)

```tsx
import { LandingPage } from './pages/LandingPage';
// ...
<Route path="/sofa" element={<LandingPage />} />
<Route path="/test-landing" element={<LandingPage />} />
```

---

## Frontend Page (exact)

Copy the full file unchanged: `src/web/pages/LandingPage.tsx`

### Full Source Code

```tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '@/lib/auth';
import axios from 'axios';

// Types for the color picker response
interface Wallpaper {
    path: string;
}

export const LandingPage = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Sofa state
    const [sofaColor, setSofaColor] = useState('#25507C');
    const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
    const [scale, setScale] = useState(0.4);
    const [positions, setPositions] = useState({
        sofa: { left: 0, top: 0 },
        floor: { left: 0 }
    });

    const wrapperRef = useRef<HTMLDivElement>(null);
    const sofaRef = useRef<HTMLDivElement>(null);
    const floorRef = useRef<HTMLDivElement>(null);

    // Debounce utility
    const debounce = (func: Function, wait: number) => {
        let timeout: NodeJS.Timeout;
        return (...args: any[]) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };

    // Fetch wallpapers when color changes
    const fetchWallpapers = async (color: string) => {
        try {
            const response = await axios.post('/api/colorpicker', { color });
            // Shuffle and pick 3
            const shuffled = [...response.data].sort(() => 0.5 - Math.random());
            setWallpapers(shuffled.slice(0, 3));
        } catch (error) {
            console.error('Error fetching wallpapers:', error);
        }
    };

    // Debounced version of fetch
    const debouncedFetch = useRef(debounce(fetchWallpapers, 500)).current;

    const handleColorChange = (color: string) => {
        setSofaColor(color);
        debouncedFetch(color);
    };

    const handleGoogleSignIn = async () => {
        try {
            setLoading(true);
            await signInWithGoogle();
            navigate('/studio');
        } catch (err) {
            console.error('Sign in error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Resize logic
    useEffect(() => {
        const handleResize = () => {
            if (!wrapperRef.current || !sofaRef.current || !floorRef.current) return;

            const wrapperWidth = wrapperRef.current.offsetWidth;
            const floorWidth = floorRef.current.offsetWidth;

            // Center floor
            const floorLeft = (wrapperWidth - floorWidth) / 2;
            const isDesktop = window.innerWidth >= 768;
            const floorTop = isDesktop ? 900 : 500;

            // Scale and center sofa
            const originalSofaWidth = 1800;
            const intendedSofaWidth = wrapperWidth * 1.2;
            let newScale = intendedSofaWidth / originalSofaWidth;
            newScale = Math.min(newScale, 0.75);

            const sofaHeight = 684 * newScale;
            const sofaWidth = originalSofaWidth * newScale;

            const sofaLeft = (wrapperWidth - sofaWidth) / 2;

            // Position sofa on floor
            const sofaTop = floorTop - sofaHeight + (sofaHeight * 0.15);

            setScale(newScale);
            setPositions({
                sofa: { left: sofaLeft, top: sofaTop },
                floor: { left: floorLeft }
            });
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        // Initial wallpaper fetch
        fetchWallpapers(sofaColor);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const colors = [
        '#FF5733', '#FFC300', '#DAF7A6', '#28B463',
        '#3498DB', '#8E44AD', '#FF69B4'
    ];

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden relative">
            {/* Login Button Overlay */}
            <div className="absolute top-4 right-4 z-50">
                <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-6 py-2 rounded-full font-medium transition-all border border-white/20 shadow-lg flex items-center gap-2"
                >
                    {loading ? 'Signing in...' : (
                        <>
                            <span>Sign In</span>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                            </svg>
                        </>
                    )}
                </button>
            </div>

            {/* Sofa Environment */}
            <div
                ref={wrapperRef}
                id="canvasPreviewSofaWrapper"
                className="relative overflow-hidden h-[600px] md:h-[800px] lg:h-[1200px] mt-[52px]"
            >
                {/* Wall */}
                <div id="wall" className="absolute top-0 left-0 w-[3000px] h-[1000px] bg-[url('/img/sofa/white-wall-textures.webp')] bg-[length:11%]">
                    <div className="w-full h-full bg-gradient-to-b from-white via-transparent to-black mix-blend-multiply opacity-30" />
                </div>

                {/* Floor */}
                <div
                    ref={floorRef}
                    id="floor"
                    className="absolute top-[500px] md:top-[900px] h-[100px] w-full"
                    style={{ left: positions.floor.left }}
                >
                    <img
                        src="/img/sofa/floor.webp"
                        alt="Floor texture"
                        className="max-w-fit origin-top-left scale-[0.2] md:scale-[0.8] brightness-150 contrast-125"
                    />
                </div>

                {/* Edge Contour & Fade Out */}
                <div className="absolute top-[880px] left-[-500px] w-[9000px] h-[30px] bg-black/50 blur-[15px]" />
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#2f3847] via-transparent to-[#14171c] via-[2%] to-[99%] opacity-80" />

                {/* Sofa Wrapper */}
                <div
                    ref={sofaRef}
                    id="sofaWrapper"
                    className="absolute w-[1800px] h-[684px] cursor-pointer origin-top-left"
                    style={{
                        transform: `scale(${scale})`,
                        left: positions.sofa.left,
                        top: positions.sofa.top
                    }}
                >
                    {/* Sofa SVG */}
                    <svg
                        className="absolute w-full h-full"
                        version="1.0"
                        viewBox="0 0 2400 912"
                    >
                        <g>
                            <path
                                id="sofaBackground"
                                style={{ fill: sofaColor, transition: 'fill 0.3s ease' }}
                                d="M483.68,262c3.51,0.35,4.02-1.17,4.14-3.81c1.48-34.24,3.8-68.43,6.08-102.62c0.66-9.42,1.98-18.82,3.4-28.16
                                c0.94-6.2,4.91-9.61,11.34-9.89c169.92-6.81,340.2-2,510.26-3.91c50.78,0.21,101.74-0.65,152.41,2.36
                                c15.74,1.16,31.06-1.38,46.6-1.34c32.15-0.33,64.3-1.19,96.46-0.96c178.15,0.24,356.31-0.88,534.45,2.13
                                c10.07,0.15,20.12,2.36,30.14,3.91c5.58,0.86,8.12,5.18,8.91,10.2c6.92,42.56,6.99,85.88,10.3,128.81
                                c0.21,3.43,1.38,4.76,4.99,4.13c47-7.7,94.49,2.75,140.69,10.92c12.91,2.73,25.39,7.84,37.76,12.64
                                c8.76,3.4,11.81,11.19,10.78,20.02c-3.51,28.87-8.14,57.62-12.46,86.38c-7.5,49.61-14.21,99.51-24.95,148.52
                                c-8.3,37.21-36.35,65.84-75.65,67.96c-518.01,3.54-1036.19,0.16-1554.26,1.11c-15.81-0.01-31.81-0.62-46.94-7.21
                                c-22.49-9.78-38.9-25.29-46.01-48.92c-9.73-34.91-13.84-71.23-19.48-106.99c-6.47-45.79-14.08-91.45-19.3-137.4
                                c-1.89-16.06,2.53-23.82,18.34-29.06c42.82-14.15,88.09-20.77,133.15-21C444.84,259.5,470.77,260.71,483.68,262z"
                            />
                        </g>
                    </svg>

                    {/* Overlays */}
                    <img src="/img/sofa/transparencySmall4.webp" className="absolute w-full h-full mix-blend-multiply pointer-events-none" alt="" />
                    <img src="/img/sofa/transparencySmall4.webp" className="absolute w-full h-full mix-blend-hard-light pointer-events-none" alt="" />
                    <img
                        src="/img/sofa/cat.webp"
                        className="absolute w-[405px] h-[237px] left-[376px] top-[139px] pointer-events-none"
                        alt="Cat"
                    />
                </div>

                {/* Posters Strip */}
                <div className="absolute top-[20px] w-full flex justify-center mt-[40px] scale-90 pointer-events-none">
                    {wallpapers.map((wp, i) => {
                        const path = wp.path.replace(/\\/g, '/');
                        const imageUrl = `https://storage.googleapis.com/pi3/${path.replace('.png', '-medium.jpg')}`;
                        const linkUrl = path.replace('wallpapers', 'wallpaper');

                        return (
                            <div key={i} className="mx-[20px] transition-transform duration-500 hover:scale-[1.02] pointer-events-auto">
                                <img src="/img/sofa/wood.webp" className="w-[225px]" alt="Frame top" />
                                <a href={linkUrl} target="_blank" rel="noopener noreferrer">
                                    <img
                                        src={imageUrl}
                                        className="shadow-lg w-[225px] h-[300px] object-cover bg-gray-800"
                                        alt={`Poster ${i + 1}`}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://placehold.co/225x300?text=Error`;
                                        }}
                                    />
                                </a>
                                <img src="/img/sofa/wood.webp" className="w-[225px]" alt="Frame bottom" />
                            </div>
                        );
                    })}
                    {wallpapers.length === 0 && (
                        [1, 2, 3].map(i => (
                            <div key={i} className="mx-[20px]">
                                <img src="/img/sofa/wood.webp" className="w-[225px]" alt="Frame top" />
                                <img src={`https://placehold.co/225x300?text=Loading...`} className="shadow-lg" alt="Poster" />
                                <img src="/img/sofa/wood.webp" className="w-[225px]" alt="Frame bottom" />
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Color Selection UI */}
            <div className="relative z-50 mt-[-215px] sm:mt-[-33px] mb-[50px] text-center">
                <p className="text-lg font-semibold text-white bg-black inline-block px-4 py-1 rounded mb-2">
                    Pick a Sofa Color:
                </p>
                <div className="flex justify-center gap-2 sm:gap-4">
                    {colors.map(color => (
                        <button
                            key={color}
                            className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/40 shadow-[0_0_10px_rgba(0,0,0,0.3)] transition-transform hover:scale-110 hover:shadow-[0_0_10px_rgba(0,0,0,0.3),0_0_30px_rgba(0,0,0,0.4)]"
                            style={{ backgroundColor: color }}
                            onClick={() => handleColorChange(color)}
                            aria-label={`Select color ${color}`}
                        />
                    ))}
                    {/* Rainbow Circle */}
                    <button
                        className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/40 shadow-[0_0_10px_rgba(0,0,0,0.3)] transition-transform hover:scale-110"
                        style={{ background: 'linear-gradient(90deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #4B0082, #8B00FF)' }}
                        onClick={() => {
                            const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
                            handleColorChange(randomColor);
                        }}
                        aria-label="Random Color"
                    />
                </div>
            </div>
        </div>
    );
};
```

### Key Behavior Preserved
- Initial sofa color `#25507C` + 7 fixed color buttons + rainbow random color
- Debounced `/api/colorpicker` call (500ms)
- Random 3 posters from top 10 color matches
- Responsive sofa/floor positioning on resize
- Poster frame assets (`wood.webp`) and sofa overlays (`transparencySmall4.webp`, `cat.webp`)

---

## Backend API (exact)

```ts
// POST /api/colorpicker - Get matching wallpapers for a color
app.post('/api/colorpicker', (req, res) => {
    try {
        const { color } = req.body;

        const wallpapersPath = path.join(process.cwd(), 'public', 'json', 'wallpapers-list.json');

        if (!fs.existsSync(wallpapersPath)) {
            serverLog.error('wallpapers-list.json not found', { path: wallpapersPath });
            return res.status(500).json({ error: 'Wallpapers data not found' });
        }

        let fileContent = fs.readFileSync(wallpapersPath, 'utf-8');
        // Strip BOM if present
        fileContent = fileContent.replace(/^\uFEFF/, '');

        serverLog.info('Reading wallpapers file', { path: wallpapersPath, length: fileContent.length, preview: fileContent.substring(0, 100) });

        const wallpapersData = JSON.parse(fileContent);

        // Helper to parse hex to rgb
        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }

        const targetRgb = hexToRgb(color);
        if (!targetRgb) {
            return res.status(400).json({ error: 'Invalid color format' });
        }

        const filtered = wallpapersData
            .filter((w: any) => w.path && w.path.includes('7-16_'))
            .map((w: any) => {
                let minDistance = Number.MAX_VALUE;
                if (w.colors && Array.isArray(w.colors)) {
                    for (const c of w.colors) {
                        const rgb = hexToRgb(c);
                        if (rgb) {
                            const distance = Math.sqrt(
                                Math.pow(rgb.r - targetRgb.r, 2) +
                                Math.pow(rgb.g - targetRgb.g, 2) +
                                Math.pow(rgb.b - targetRgb.b, 2)
                            );
                            if (distance < minDistance) minDistance = distance;
                        }
                    }
                }
                return { ...w, colorDistance: minDistance };
            })
            .sort((a: any, b: any) => a.colorDistance - b.colorDistance)
            .slice(0, 10);

        res.json(filtered);
    } catch (error: any) {
        serverLog.error('Error in colorpicker API', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch wallpapers' });
    }
});
```

---

## Parity Test Checklist

1. Open `/sofa`: wall/floor/sofa/cat/frame composition matches current look.
2. Click each fixed color button: sofa fill updates and posters refresh.
3. Click rainbow button: random color applied, posters refresh.
4. Poster links open in new tab and images load from `storage.googleapis.com/pi3`.
5. Resize viewport (mobile/desktop): sofa stays aligned to floor.
6. If API fails, placeholder posters appear (no crash).

---

## Files Summary

| File | Purpose |
|------|---------|
| `public/img/sofa/*` | All sofa environment images (wall, floor, cat, overlays, wood frames) |
| `public/json/wallpapers-list.json` | Wallpaper metadata with color arrays for matching |
| `src/web/pages/LandingPage.tsx` | React component for `/sofa` page |
| `src/server.ts` (colorpicker section) | Backend API for color-based wallpaper matching |
| `src/web/App.tsx` | Route definitions (`/sofa`, `/test-landing`) |

---

Last updated: 2026-02-14
