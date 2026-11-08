# Proof of concept: find copies of Amazon product photos

One question: **if we run a seller's real product photos through reverse image search, do stolen copies show up, and on which platforms?**

It sends each photo to Google Cloud Vision (`WEB_DETECTION`), drops the seller's own listings, sorts the rest by platform (Amazon, Temu, AliExpress, eBay, Shopify stores, Etsy, Walmart and others), and writes an HTML + JSON report.

## Run it

Node 20+. No dependencies.

```bash
export GOOGLE_VISION_API_KEY=...   # Google Cloud project with the Vision API enabled
node scan.mjs photos/ --own-asin B0XXXXXXXX --own-domain mybrand.com
```

- Inputs: image files, folders of images, or image URLs (e.g. `https://m.media-amazon.com/images/I/....jpg`).
- `--own-asin` / `--own-domain` (repeatable): the seller's own listings, so they aren't reported as copies.
- `--out dir` (default `out/`): where `report.html` and `report.json` go.

```bash
npm test   # offline tests against a recorded-shape Vision response
```

## How to read the results

- **Exact copy**: Vision found the same image, possibly resized. Strong signal.
- **Edited / cropped**: part of the image matches. Needs a human look.
- Visually similar images are counted but not listed: they're usually just similar products.

## Limits (that's what this POC is for)

- It only sees **pages Google has indexed**. Temu, AliExpress and Shein listings are often poorly indexed, so missing results there don't mean there are no copies.
- Scraping those platforms directly is against their terms and is not done here.
- Copies on Amazon are found only if Google indexed the copycat's listing. The reliable route for Amazon is the Selling Partner API, which needs Amazon's approval.
- Cost: Vision bills per image (check current Google Cloud pricing). Each photo is one request.
