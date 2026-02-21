# Particle Shader → OpenSeadragon Transition: Complete Architecture

## Overview

The most complex visual feature of I-LAUGH-YOU is a system where **6,059 particle tiles** (each showing a unique piece of the artist's self-portrait) animate from a scattered random cloud into the complete assembled image as the user scrolls. When fully assembled, the particles seamlessly swap to an OpenSeadragon deep-zoom viewer, allowing the user to zoom into individual tiles and click to buy them.

---

## 1. The Image Grid

The original portrait is **337,920 × 396,288 pixels** (≈134 megapixels).

It's divided into a grid of **83 columns × 73 rows = 6,059 tiles**.

```
Source: helpers.js
```
```js
var completeImageWidth = 337920;
var completeImageHeight = 396288;
var imageRatio = completeImageHeight / completeImageWidth; // ≈ 1.173

var offsetTop = 3873;    // pixels trimmed from top
var offsetRight = 3083;  // pixels trimmed from right
var offsetBottom = 1573; // pixels trimmed from bottom
var offsetLeft = 1509;   // pixels trimmed from left

var rowCount = 73;       // rows (y-axis)
var columnCount = 83;    // columns (x-axis)

var finalImageWidth = (completeImageWidth - offsetRight - offsetLeft) / columnCount;   // ≈ 4016px per tile
var finalImageHeight = (completeImageHeight - offsetTop - offsetBottom) / rowCount;    // ≈ 5354px per tile
```

Each tile is approximately **4016 × 5354 pixels** — aspect ratio ≈ **0.75** (taller than wide).

---

## 2. Particle System Setup

```
Source: particles.js (lines 122-250)
```

### Scene & Camera
```js
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 0, 62);

// Fog fades distant scattered particles
scene.fog = new THREE.Fog(0x000000, 0.0025, 500);

// Transparent background (alpha: true) so gradient shows through
var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
```

### Grid Positions (assembled state)
```js
// NOTE: In particles.js, the naming is SWAPPED from helpers.js:
var rowCount = 83;      // actually columns (AMOUNTX)
var columnCount = 73;   // actually rows (AMOUNTY)
var AMOUNTX = 83, AMOUNTY = 73;

var points = [];
for (var x = 0; x < 83; x++) {
    for (var y = 0; y < 73; y++) {
        points.push(new THREE.Vector3(x * 0.75, y, 1));
        // x * 0.75 compensates for tile aspect ratio (tiles are taller than wide)
        // z = 1 for all (flat plane)
    }
}
```

### Random Positions (scattered state)
```js
var randomVerts = [];
function setRandomPointInSphere(radius) {
    var v = new THREE.Vector3(
        THREE.Math.randFloatSpread(radius * 2),
        THREE.Math.randFloatSpread(radius * 2),
        THREE.Math.randFloatSpread(radius * 2)
    );
    if (v.length() > radius) return setRandomPointInSphere(radius); // rejection sampling
    return v;
}

for (var x = 0; x < 83; x++) {
    for (var y = 0; y < 73; y++) {
        randomVerts.push(setRandomPointInSphere(400)); // radius 400 sphere
    }
}
```

### BufferGeometry & Attributes
```js
var geom = new THREE.BufferGeometry().setFromPoints(points);
geom.addAttribute('whIndex', new THREE.BufferAttribute(new Float32Array(whIndices), 2));
// whIndices = [x0, y0, x1, y1, ...] — grid coordinate per particle
geom.addAttribute('sizes', new THREE.BufferAttribute(new Float32Array(sizesArr), 1));
geom.center();

var mat = new THREE.PointsMaterial({ size: 1 });
var cloud = new THREE.Points(geom, mat);
```

---

## 3. The Custom Shader (Texture Atlas)

The magic: each particle renders a different piece of `full2.jpg` (a downscaled version of the full portrait).

```
Source: particles.js (lines 200-246)
```

### Vertex Shader Injection
```glsl
uniform vec2 division;       // vec2(83, 73) — grid dimensions
attribute vec2 whIndex;      // vec2(x, y) — this particle's grid position
attribute float sizes;
varying vec2 vSize;
varying vec2 vUv;

void main() {
    vSize = vec2(1.0) / division;     // size of one tile in UV space
    vUv = whIndex / division;          // UV origin for this tile
    // ... rest of PointsMaterial vertex shader
}
```

### Fragment Shader Injection
```glsl
uniform sampler2D texture;   // full2.jpg
varying vec2 vSize;
varying vec2 vUv;

// Replaces the default gl_FragColor line:
vec2 pUv = gl_PointCoord;
pUv.y = 1.0 - pUv.y;                          // flip Y
pUv.x = (pUv.x - 0.5) / 0.75 + 0.5;          // compensate for 0.75 x-spacing
if (pUv.x > 1.0 || pUv.x < 0.0) discard;     // clip to tile boundary

vec2 uv = vUv + vSize * pUv;                  // sample correct tile region
vec4 texColor = texture2D(texture, uv);
outgoingLight *= texColor.xyz;
gl_FragColor = vec4(outgoingLight, texColor.a * diffuseColor.a);
```

**How it works:**
- `gl_PointCoord` gives UV within the point sprite (0,0 to 1,1)
- The 0.75 correction adjusts for non-square tile spacing
- `vUv` is the tile's UV origin in the full texture
- `vSize` is how much UV space one tile occupies
- `vUv + vSize * pUv` maps the point sprite to the correct tile region

---

## 4. Scroll Animation

```
Source: particles.js (lines 65-120, 290-388)
```

### Scroll Progress Calculation
```js
// scrollEnd = position where OpenSeadragon canvas is vertically centered
var scrollEnd = $('.openseadragon-canvas').offset().top - offsetTopAnim;

// Non-linear scroll curve (rational function)
// Fast initial convergence, slow fine-tuning at end
newScrollTop = (scrollTop * 6000 + 5000) / (scrollTop + 2000);
```

The scroll curve transforms raw scroll position into animation progress. Plot: starts steep (particles rush together), flattens near scrollEnd (fine positioning).

### Position Interpolation (per frame, per particle)
```js
function getTween(begin, end, scrollPos, scrollEnd) {
    var tween = begin + ((scrollPos / scrollEnd) * (end - begin));
    return tween > end ? end : tween;  // clamp at end
}

// Wobble diminishes as scroll approaches end
var scrollNormalizedReversed = 1 - (scrollTop / scrollEnd);
var clockAnimationCos = (Math.cos(clockNow) * randomArr[i]) * scrollNormalizedReversed;
var clockAnimationSin = ((Math.sin(clockNow) / 5) * (randomArr[i] * 5)) * scrollNormalizedReversed;

// Interpolate: random position → grid position (scaled 1.5x)
positions[i]     = getTween(random.x, grid.x * 1.5, scrollTopMarginOffset, scrollEnd) + clockAnimationCos;
positions[i + 1] = getTween(random.y, grid.y * 1.5, scrollTopMarginOffset, scrollEnd) + clockAnimationCos;
positions[i + 2] = getTween(random.z, grid.z,       scrollTopMarginOffset, scrollEnd) + clockAnimationSin;
```

### Post-Update Normalization
```js
geom.center();                  // re-center geometry at origin
geom.scale(0.5, 0.5, 0.5);     // scale down to fit camera view
cloud.geometry.attributes.position.needsUpdate = true;
renderer.render(scene, camera);
```

**Critical:** `center()` and `scale(0.5)` happen EVERY frame after position updates.

---

## 5. OpenSeadragon Pre-Positioning

```
Source: particles.js (lines 83-104)
```

While particles are visible, OpenSeadragon continuously zoom-matches:

```js
$(window).scroll(function() {
    if (scrollTop > scrollEnd) {
        particlesAreVisible = false;  // particles done, stop rendering
    } else {
        // Calculate Three.js image size
        threeJsHeight = $(window).height() * 0.6;
        threeJsWidth = threeJsHeight / imageRatio;
        
        // Match OpenSeadragon zoom to particle image size
        openSeadragonWidth = viewer.element.clientWidth;
        openSeadragonZoomTo = threeJsWidth / openSeadragonWidth;
        
        viewer.viewport.zoomTo(openSeadragonZoomTo, null, false);  // instant, no animation
        viewer.viewport.panTo(new OpenSeadragon.Point(0.5, 0.6), false);
        
        particlesAreVisible = true;
    }
});
```

**Key insight:** OpenSeadragon is always loaded at `opacity: 0`. Its zoom level continuously matches the particle image size. When particles hide, OpenSeadragon reveals — the images align perfectly.

---

## 6. The Transition (fullpage.js onLeave)

```
Source: footer.php (lines 755-775)
```

```js
onLeave: function(origin, destination, direction) {
    // Leaving section "usp3" (last section before fullImage) going DOWN:
    if ($(origin.item).attr('id') == 'usp3' && direction == 'down') {
        particlesAreVisible = false;
        $('#particleImage').hide();                    // hide Three.js canvas
        $('.openseadragon-canvas').css('opacity', '1'); // reveal OpenSeadragon
    }

    // Leaving "fullImage" section going UP:
    if ($(origin.item).attr('id') == 'fullImage' && direction == 'up') {
        $('#particleImage').show();                    // show Three.js canvas
        $('.openseadragon-canvas').css('opacity', '0'); // hide OpenSeadragon
        particlesAreVisible = true;                    // resume rendering
    }
}
```

### fullpage.js Config
```js
normalScrollElements: '#openseadragonWrapper',  // allows normal scroll inside deep zoom
scrollBar: true,                                 // keeps browser scrollbar
```

---

## 7. OpenSeadragon Viewer Setup

```
Source: helpers.js (lines 717-942)
```

```js
viewer = OpenSeadragon({
    id: "openseadragonWrapper",
    tileSources: {
        height: 396288,
        width: 337920,
        tileSize: 256,
        minLevel: 0,
        maxLevel: 11,
        getTileUrl: function(levelOfDetail, tileX, tileY) {
            // QuadKey-based tile URL generation
            // Tiles hosted at http://ily.seez.ch/
            // Directory structure uses quadkey path segments
        }
    }
});
```

### Canvas Overlay (grid lines + sold markers)
On `viewer.open`, a canvas overlay draws:
- Grid lines for each of the 6059 tiles
- Red overlay on sold tiles
- Thick highlight on hovered tile

### Click Handler
```js
viewer.addHandler('canvas-click', function(event) {
    var imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);
    var xImage = parseInt((imagePoint.x - offsetLeft) / finalImageWidth);
    var yImage = parseInt((imagePoint.y - offsetTop) / finalImageHeight);
    currentHoverImage = ((yImage * columnCount) + xImage) + 1;  // 1-indexed image number
    updateImage(currentHoverImage);  // open preview overlay
});
```

---

## 8. "Go" Button Animation Sequence

```
Source: footer.php (lines 336-406)
```

The "Go" button triggers an automated scroll sequence:
1. Slow scroll to "Pick a piece of me" section (7 seconds)
2. Fade in the pick-a-piece image
3. Continue scroll to particle assembly point (7 seconds)
4. Trigger dramatic OpenSeadragon zoom (zoom to 35x, random position, 14s animation)
5. After 14 seconds, reset animation speed to normal (1.2s)

---

## 9. Summary: Data Flow

```
Page Load:
  full2.jpg → THREE.TextureLoader → shader uniform
  6059 random positions → randomVerts[]
  6059 grid positions → points[] (x*0.75, y, 1)
  OpenSeadragon initialized at opacity:0

Scroll (sections 1-5):
  window.scrollY → non-linear curve → scrollProgress
  for each particle:
    position = lerp(random, grid*1.5, scrollProgress) + wobble
  geom.center() + geom.scale(0.5)
  OpenSeadragon.zoomTo(match particle size)

Transition (entering section 6):
  particlesAreVisible = false
  #particleImage.hide()
  .openseadragon-canvas.opacity = 1
  → User now sees identical image, but zoomable

Reverse (leaving section 6 upward):
  .openseadragon-canvas.opacity = 0
  #particleImage.show()
  particlesAreVisible = true
  → Particles resume from assembled position, scatter as user scrolls up
```

---

Last updated: 2026-02-14
