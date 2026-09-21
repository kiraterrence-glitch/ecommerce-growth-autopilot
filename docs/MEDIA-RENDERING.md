# Local media rendering

The project can render the verified campaign draft into real PNG files and a 20-second MP4 without a paid creative API.

## Requirements

- a Chromium-family browser (Edge, Chrome, or Chromium)
- FFmpeg
- ffprobe

Check them with:

```bash
npm run media:doctor
```

On Windows, Edge is usually detected automatically. FFmpeg is intentionally treated as an optional local tool rather than a runtime dependency.

## Deterministic demo

```bash
npm run demo:full
```

This writes three real PNG creative sizes, six rendered video-scene PNGs, one 1080x1920 H.264 MP4, and `media-verification.json` under `.runtime/demo/media`.

On Windows you can double-click `render-media-windows.cmd`.

## Live Ollama demo

```bash
npm run demo:full:ollama
```

This first generates a Product Brain with the configured local Ollama model, runs the marketing-quality gate, and only then renders media from the live campaign kit.

## Safety

The current visual is explicitly labeled as a portfolio/demo product visual. It must not be presented as a real merchant product photograph. Real product imagery can replace the demo visual once the merchant provides licensed assets.
