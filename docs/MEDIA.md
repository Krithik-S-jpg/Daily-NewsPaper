# Illustrated edition media

The browser reader and front-page preview support muted video previews. Hover with a mouse to start; tap or use the image button with Enter/Space to toggle. Previews stop after 12 seconds, on pointer exit, on page turn, or when the tab is hidden. Reduced-motion users must explicitly start video. Video is loaded only on interaction; unavailable video leaves the still image visible. Images without video use a labeled pan-and-zoom effect, not simulated footage.

## Assets and attribution

- `webb.jpg`: existing Cosmic Cliffs image, NASA, ESA, CSA, STScI.
- `cosmic-preview.webm`: Hubble/Webb comparison from [NASA SVS 31285](https://svs.gsfc.nasa.gov/31285/), credit NASA, ESA, CSA, STScI. The 2024 bonus visualization is explicitly dated separately from the historical 2022 sample.
- `infrared.jpg`: NIRCam/MIRI comparison, same NASA SVS page and credits.
- `earth.jpg`: [Blue Marble 2002](https://science.nasa.gov/resource/blue-marble-2002/), NASA Earth Observatory. This is a satellite composite, labeled as such.
- AI-generated bookshop artwork has been removed from the application. Fiction and creative prompts are text-only; interface icons are decorative controls, not news photographs.

These assets enrich the demonstration edition. Live sources do not automatically acquire video; their media must be supplied with appropriate rights and attribution. The browser's supplement pages remain separate from backend PDF and offline article exports.

RSS/Atom ingestion now preserves each article's image from Media RSS image content, thumbnails, image enclosures, or embedded article images, together with supplied credits or a publisher attribution. These fields survive composition and JSON persistence without a schema migration. Feed logos and unrelated stock or generated pictures are not used as fallbacks. Missing images remain absent; unavailable images are hidden by the reader. Publisher images are loaded directly over HTTPS without a referrer. Backend PDF rendering remains text-only. Source attachment establishes article association, not independent verification of a photograph's authenticity or reuse rights.
