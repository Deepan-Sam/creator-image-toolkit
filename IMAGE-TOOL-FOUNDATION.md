# Image tool foundation

## Existing image-processing behavior

The active image resizer, compressor, and YouTube thumbnail resizer are implemented in `app.js` and run only when the corresponding homepage elements exist. The script also previously owned navigation and footer-year behavior; those site-wide concerns now live in `site.js`. The homepage loads both scripts. Other pages load only `site.js` unless they have their own tool script.

The existing private functions in `app.js` that informed the cropper are:

- `getFileMime` and `validateFileMime`: extension, declared MIME type, and JPEG/PNG/WebP signature checks.
- `loadImage`: event-based image decoding with natural-dimension checks.
- `supportsOutput` and `createVerifiedImageUrl`: Canvas output support and decoded-output dimension verification.
- `drawImageToCanvas`: existing fit/crop Canvas drawing, white backing for JPEG, and crop rectangle calculations.
- `formatBytes`: user-facing byte formatting.

The helper functions are scoped inside an IIFE and are not exported. They were therefore left intact instead of extracting a new shared image library. The cropper keeps its own small, purpose-specific validation/rendering code rather than duplicating the three existing tool workflows.

## Cropper behavior and limits

- Inputs: `.jpg`, `.jpeg`, `.png`, and `.webp`; declared MIME is checked when present, and file signatures are checked before decoding.
- Input limit: 20 MB. Image dimensions are capped at 16,384 pixels per side and 40 megapixels, matching the current homepage tools.
- Output formats: JPEG, PNG, and WebP choices are checked with Canvas support detection. The generated Blob MIME must match the selected format.
- Output: Canvas draws only the selected source rectangle. The output is decoded again and its dimensions checked before preview/download is enabled. JPEG uses a white background; PNG retains transparent source pixels.
- Coordinates: crop bounds are held in source-image pixels. Pointer movement is scaled by the source-to-preview dimensions; crop bounds are clamped to the source edges. Fixed ratios are maintained when resizing handles or editing crop dimensions.
- Stale work: each load and render has an incrementing version. Older file loads and renders cannot replace a newer selection. Pending preview generation is debounced and invalidated when crop options change.
- Cleanup: source and output object URLs are revoked on replacement/reset, stale load/render completion, verification failure, and page unload. The source image reference is cleared when it is no longer needed.
- Errors: invalid input, decode failures, missing Canvas support, encoding failures, unexpected MIME, and output verification failures are shown in the live status region; failed outputs are not downloadable.
- Privacy: image bytes are read and processed in the browser; the cropper does not send the selected image to a server. The separate AdSense loader remains a third-party network request as disclosed in the site privacy page.

## Test status

The homepage resizer, compressor, thumbnail workflows, and shared navigation/year behavior were browser-tested again after separating `site.js` from homepage-only `app.js`.

Cropper browser QA:

- Passed: valid PNG input, actual dropped-file input, tiny (3 × 2 px), landscape, and portrait sources; freeform, square, 4:5, 16:9, 3:2, and custom 7:3 crops; source-pixel coordinate clamping; invalid coordinate/custom-ratio recovery; all eight pointer handles with the fixed ratio preserved; and a crop handle keyboard adjustment.
- Passed: PNG transparency retained, JPEG transparency rendered white, and PNG/JPEG/WebP output MIME, dimensions, Blob, and download name verified. Output URL revocation was observed on replacement and reset, and Start over restores the initial ratio, custom values, output format, empty state, and disabled download.
- Passed: unsupported extension, extension/type mismatch, invalid signature, corrupt image, file over 20 MB, and a 16,385 px side were rejected without enabling download. The 40 MP cap is present in code, but an image exceeding only the pixel-count threshold was not decoded in browser QA because such a fixture requires substantial memory.
- Passed: responsive viewport checks at 320, 360, 390, 768, 1,024, and 1,440 px showed no horizontal overflow. Browser verification was performed locally; no production deployment was made.
- Existing-tool regressions passed: resizer exported JPEG/PNG/WebP at 80 × 40 with the expected aspect-locked dimensions, supported unlocking and stretching, and reset disabled download; compressor output decoded at 120 × 60 and the displayed 22.6% reduction matched its measured input/output bytes; thumbnail fit and crop outputs decoded at 1,280 × 720; reset disabled downloads. Shared mobile navigation opened, Escape closed it and restored focus, and the footer year was current.
- Browser requests from the pre-existing AdSense loader failed DNS resolution from the local file origin; this is unrelated to image processing and was not tested as an advertising integration.
