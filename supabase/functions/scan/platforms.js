// Maps a URL's hostname to a marketplace. Order matters: first match wins.
const PLATFORMS = [
  ['Amazon', [/(^|\.)amazon\.[a-z.]+$/, /(^|\.)media-amazon\.com$/, /(^|\.)images-amazon\.com$/, /(^|\.)ssl-images-amazon\.com$/]],
  ['Temu', [/(^|\.)temu\.com$/, /(^|\.)kwcdn\.com$/]],
  ['AliExpress', [/(^|\.)aliexpress\.[a-z.]+$/, /(^|\.)aliexpress-media\.com$/]],
  ['Alibaba', [/(^|\.)alibaba\.com$/, /(^|\.)alicdn\.com$/, /(^|\.)1688\.com$/]],
  ['Shein', [/(^|\.)shein\.[a-z.]+$/, /(^|\.)ltwebstatic\.com$/]],
  ['eBay', [/(^|\.)ebay\.[a-z.]+$/, /(^|\.)ebayimg\.com$/]],
  ['Walmart', [/(^|\.)walmart\.[a-z.]+$/, /(^|\.)walmartimages\.com$/]],
  ['Etsy', [/(^|\.)etsy\.com$/, /(^|\.)etsystatic\.com$/]],
  ['Shopify store', [/(^|\.)myshopify\.com$/, /^cdn\.shopify\.com$/]],
  ['Cdiscount', [/(^|\.)cdiscount\.com$/]],
  ['Wish', [/(^|\.)wish\.com$/]],
  ['DHgate', [/(^|\.)dhgate\.com$/]],
  ['Mercado Libre', [/(^|\.)mercadoli[bv]re\.[a-z.]+$/, /(^|\.)mlstatic\.com$/]],
  ['Rakuten', [/(^|\.)rakuten\.[a-z.]+$/]],
  ['Allegro', [/(^|\.)allegro\.pl$/, /(^|\.)allegroimg\.com$/]],
  ['Otto', [/(^|\.)otto\.de$/]],
  ['Bol.com', [/(^|\.)bol\.com$/]],
  ['Facebook / Instagram', [/(^|\.)facebook\.com$/, /(^|\.)fbcdn\.net$/, /(^|\.)instagram\.com$/, /(^|\.)cdninstagram\.com$/]],
  ['TikTok Shop', [/(^|\.)tiktok\.com$/, /(^|\.)tiktokcdn\.com$/]],
];

export function platformOf(url) {
  let host;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return 'Other';
  }
  for (const [name, patterns] of PLATFORMS) {
    if (patterns.some(re => re.test(host))) return name;
  }
  return 'Other';
}

export const isMarketplace = platform => platform !== 'Other';
