letsfixthenavbar.md

---

Now the issue is almost certainly **(A) tab bar is rendering but sitting *off-screen/behind something*** and **(B) fonts are failing to load**, which will make icons + typography look broken.

You can literally see both in your console:

* **“Font loading failed, proceeding anyway: NetworkError”**
* **“Failed to decode downloaded font: <URL>”**
* **“OTS parsing error: invalid sfntVersion …”**

That means: **your design + icons are broken because font files are not loading/valid.** Separately, the navbar is likely there but not visible (or is being covered) due to absolute positioning + safe-area/layout.

Below is the precise request to your developer.

---

## Send this exact request to your developer

### 1) Fix the font pipeline (this is the design/icons break)

**Problem:** Console shows font files are failing to download/parse. That breaks typography and icon glyphs (Feather).
**Evidence:** `Font loading failed… NetworkError`, `Failed to decode downloaded font`, `OTS parsing error invalid sfntVersion…`

**Do this:**

1. In the **web build**, open Network tab → filter `font` and confirm which URLs are failing (status code + content-type).
2. Ensure every font file served is:

   * hosted at a valid URL reachable from production
   * served with correct `Content-Type`:

     * `.ttf` → `font/ttf` (or `application/octet-stream`)
     * `.otf` → `font/otf`
     * `.woff` → `font/woff`
     * `.woff2` → `font/woff2`
   * NOT being served as HTML (common when the path 404s and returns an HTML page)
3. Confirm fonts are referenced correctly:

   * If using Expo `useFonts`, the font keys match exactly what `fontFamily` uses.
   * If using `@expo/vector-icons`, ensure the icon font is loaded for web too (Feather).
4. Fix hosting/paths:

   * Fonts should live in `assets/fonts` (and be bundled) OR be served from `/public/fonts` (web) with correct headers.
   * If using Firebase Hosting, add headers for `/fonts/**` in `firebase.json`.

**Deliverable back to me:** a screenshot of Network entries for a failing font showing:

* Request URL
* Status code
* Response headers (especially `content-type`)
* Response preview (should not be HTML)

---

### 2) Make the navbar visible (it’s rendering, but it’s not on-screen)

**Problem:** `CustomTabBar` renders (confirmed) but the bar isn’t visible. That’s almost always one of:

* it’s positioned off-screen
* it’s behind another View
* it’s transparent / height = 0
* safe-area/padding pushes it out

**Do this:**

1. Temporarily force debug styles in `CustomTabBar` container:

   ```ts
   container: {
     position: 'absolute',
     left: 0,
     right: 0,
     bottom: 0,
     width: '100%',
     height: 80,                 // TEMP
     backgroundColor: 'red',      // TEMP
     zIndex: 9999,               // TEMP
     elevation: 9999,            // TEMP (android)
   }
   ```
2. Reload. If you don’t see a red bar at the bottom, it is being clipped by a parent.
3. If clipped: locate the nearest parent wrapper around navigation and remove any of:

   * `overflow: 'hidden'`
   * `position: 'relative'` with constrained height
   * fixed height containers
4. Once visible, remove the red and keep:

   * `zIndex: 9999` (web)
   * `elevation: 9999` (android)
   * and use actual background color.

**Deliverable back to me:** screenshot showing the red bar at bottom + the DOM element selection (web) or a mobile screenshot.

---

### 3) Ensure screens don’t cover the bar (content overlap)

Once bar is absolute, main screens must have bottom padding:

* Add `paddingBottom: TAB_BAR_HEIGHT + safeAreaInsetBottom` to your main screen container(s) or use `useBottomTabBarHeight()`.

**Deliverable back:** confirm which container got bottom padding (file + line).

---

## Why this is the right “next move”

Because your console already tells the story:

* Fonts are **broken at the network/asset level** → design + iconography breaks.
* Tab bar code **runs** → so invisibility is layout stacking/clipping, not logic.

---


