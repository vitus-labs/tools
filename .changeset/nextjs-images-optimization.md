---
'@vitus-labs/tools-nextjs-images': patch
---

Fix image optimization and loader resolution: imagemin plugins are now actually applied (img-loader received an unawaited Promise), use the `withOptimizedImages` options and defaults, are detected from the user's project / `overwriteImageLoaderPaths`, own loaders resolve to absolute paths for isolated installs, resource queries are anchored to parameter boundaries, loader detection is memoized, a one-time Turbopack warning is emitted, and the published tarball only ships `lib/`. Requires Node >= 22.12.
