---
name: stock-media
description: "Where to get stock photos and video that are genuinely free to use, split by what is safe to redistribute and what is use-only."
version: 1.22.0
---

# Stock media sources

Free to use is not the same as free to redistribute. The popular free-stock sites (Unsplash, Pexels, Pixabay, Coverr, Mixkit) let you use their media in a project, but their licenses forbid redistributing the files as a standalone pack, which committing them to a public repository does. Only CC0 and public-domain sources are safe to bundle. Photos are a few hundred KB each, video files run to tens of MB, so keep committed media small and keep video as links, not files.

## Safe to redistribute (CC0 and public domain)

Copy, modify and ship these, including committing them to a repository. No attribution is required unless a row says otherwise.

| Source | Media | License | Link | Notes |
|--------|-------|---------|------|-------|
| StockSnap | photos | CC0 1.0 | <https://stocksnap.io/> | Every image dedicated to the public domain, free even commercially. |
| The Met Open Access | photos, art | CC0 1.0 | <https://www.metmuseum.org/about-the-met/policies-and-documents/open-access> | Around 490000 images of public-domain works, API available. |
| Smithsonian Open Access | photos, art | CC0 1.0 | <https://www.si.edu/openaccess> | Millions of CC0 images and 2D/3D assets. |
| Art Institute of Chicago | photos, art | CC0 1.0 | <https://www.artic.edu/open-access> | Public-domain artworks via a documented API. |
| Cleveland Museum of Art | photos, art | CC0 1.0 | <https://www.clevelandart.org/open-access> | Open Access API for public-domain works. |
| Rijksmuseum | photos, art | Public domain | <https://www.rijksmuseum.nl/en/rijksstudio> | High-resolution public-domain masters, Rijksstudio API. |
| NASA Images | photos, video | Public domain | <https://images.nasa.gov/> | US government work, mostly public domain. Do not imply NASA endorsement, some partner media may be restricted. |
| Library of Congress | photos | Public domain | <https://www.loc.gov/free-to-use/> | Curated free-to-use sets, confirm the item is public domain. |
| Wikimedia Commons | photos, video | Public domain, CC0 | <https://commons.wikimedia.org/> | Filter to the public-domain or CC0 subset, each file states its own license. |
| Internet Archive | video | Public domain | <https://archive.org/details/prelinger> | Prelinger and other public-domain film collections, confirm per item. |
| Pond5 Public Domain Project | video | Public domain | <https://www.pond5.com/free> | Historical public-domain footage and stills. |
| Openverse | photos | CC0 and others | <https://openverse.org/> | Aggregator, filter results to CC0 or public domain before reuse. |
| Picryl | photos | Public domain | <https://picryl.com/> | Public-domain aggregator across archives, confirm per item. |
| Flickr Commons | photos | No known copyright | <https://www.flickr.com/commons> | Institutional sets with no known copyright restrictions, verify per image. |

## Use in a project only (do not bundle or redistribute)

Great for a client site or a demo, downloaded or hotlinked. Do not commit the files to a public repository or a shared pack.

| Source | Media | License | Link | Notes |
|--------|-------|---------|------|-------|
| Unsplash | photos | Unsplash License | <https://unsplash.com/> | Free to use, but compiling or redistributing the files is prohibited. Link or download for a project, never commit to a pack. |
| Pexels | photos, video | Pexels License | <https://www.pexels.com/> | Free to use, standalone redistribution of the files is prohibited. |
| Pixabay | photos, video | Pixabay License | <https://pixabay.com/> | Free to use, redistributing content on a standalone basis is prohibited. |
| Coverr | video | Coverr License | <https://coverr.co/> | Free commercial use, the raw footage may not be redistributed as stock. |
| Mixkit | video | Mixkit License | <https://mixkit.co/> | Free use, redistributing the raw files or building a competing library is prohibited. |

## Caveats

CC0 waives copyright, not other rights. A photo of a recognizable person may still need a model release, private property may need a property release, and brand logos in an image remain trademarks. NASA material is public domain but must not imply NASA endorsement. Wikimedia Commons, Openverse and Flickr Commons mix licenses, so confirm each file is CC0 or public domain before reuse.

## During a build

For any image that will live in the repository, take it from the redistribute list, prefer StockSnap or a museum open-access API, and keep it optimized (WebP or AVIF). For hero and marketing imagery in the user's own project, the use-only sites are fine, add attribution where the license asks for it. Never commit a file sourced from a use-only site. For video, link to the source or embed it, do not commit the file.
