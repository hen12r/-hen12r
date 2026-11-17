import type { Lang } from '../i18n';

export interface TakedownInput {
  lang: Lang;
  platform: string;
  /** The copy that was found. */
  finding: { page_url: string | null; image_url: string | null; title: string | null; asin: string | null; match: 'full' | 'partial' };
  /** The seller's own listing. */
  product: { asin: string; marketplace: string; label: string | null; image_url: string | null };
  /** Optional name or brand typed by the seller; never stored. */
  sellerName: string;
  /** When the copy was found (scan completion date). */
  foundAt: Date;
}

export interface Takedown {
  subject: string;
  body: string;
  /** Only set where we know the official form address for sure. */
  formUrl: string | null;
}

/** Amazon's public report-infringement form, per marketplace domain. */
export function amazonFormUrl(marketplace: string): string {
  const domain = /^amazon\.[a-z.]+$/i.test(marketplace) ? marketplace.toLowerCase() : 'amazon.com';
  return `https://www.${domain}/report/infringement`;
}

const fmtDate = (d: Date, lang: Lang) =>
  new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'long' }).format(d);

/** Builds a ready-to-send copyright takedown request for one copied photo. */
export function buildTakedown({ lang, platform, finding, product, sellerName, foundAt }: TakedownInput): Takedown {
  const name = sellerName.trim();
  const listing = `https://www.${product.marketplace}/dp/${product.asin}`;
  const date = fmtDate(foundAt, lang);
  const isAmazon = platform === 'Amazon';
  const where = finding.page_url ?? finding.image_url ?? '';
  const exact = finding.match === 'full';

  if (lang === 'fr') {
    const lines = [
      'Bonjour,',
      '',
      `${name ? `Je suis ${name}, ` : 'Je suis '}titulaire des droits d’auteur sur les photos de mon produit${product.label ? ` « ${product.label} »` : ''}, vendu sur ${product.marketplace} sous l’ASIN ${product.asin} :`,
      listing,
      ...(product.image_url ? ['Photo originale : ' + product.image_url] : []),
      '',
      `Le ${date}, j’ai constaté que ${exact ? 'cette photo est reproduite à l’identique' : 'une version recadrée ou retouchée de cette photo est utilisée'}, sans mon autorisation, sur la page suivante (${platform}) :`,
      where,
      ...(finding.asin ? [`ASIN de l’annonce concernée : ${finding.asin}`] : []),
      ...(finding.image_url && finding.image_url !== where ? [`Image concernée : ${finding.image_url}`] : []),
      '',
      'Je vous demande de retirer cette image (ou l’annonce qui l’utilise) dans les meilleurs délais.',
      '',
      'Je déclare de bonne foi que cette utilisation n’est autorisée ni par moi, ni par mon représentant, ni par la loi, et que les informations ci-dessus sont exactes.',
      '',
      'Cordialement,',
      name || '[Votre nom]',
    ];
    return {
      subject: `Violation de droit d’auteur : photo copiée de l’ASIN ${product.asin}`,
      body: lines.join('\n'),
      formUrl: isAmazon ? amazonFormUrl(product.marketplace) : null,
    };
  }

  const lines = [
    'Hello,',
    '',
    `${name ? `I am ${name}, ` : 'I am '}the copyright owner of the photos of my product${product.label ? ` "${product.label}"` : ''}, sold on ${product.marketplace} under ASIN ${product.asin}:`,
    listing,
    ...(product.image_url ? ['Original photo: ' + product.image_url] : []),
    '',
    `On ${date}, I found that ${exact ? 'this photo is reproduced exactly' : 'a cropped or edited version of this photo is used'}, without my permission, on the following page (${platform}):`,
    where,
    ...(finding.asin ? [`ASIN of the listing involved: ${finding.asin}`] : []),
    ...(finding.image_url && finding.image_url !== where ? [`Image involved: ${finding.image_url}`] : []),
    '',
    'Please remove this image (or the listing using it) as soon as possible.',
    '',
    'I state in good faith that this use is not authorised by me, my agent or the law, and that the information above is accurate.',
    '',
    'Kind regards,',
    name || '[Your name]',
  ];
  return {
    subject: `Copyright infringement: photo copied from ASIN ${product.asin}`,
    body: lines.join('\n'),
    formUrl: isAmazon ? amazonFormUrl(product.marketplace) : null,
  };
}

/** CSV of all findings of a report (RFC 4180 quoting; formula-injection safe). */
export function findingsCsv(rows: { platform: string; match: string; page_url: string | null; image_url: string | null; asin: string | null; title: string | null }[], foundAt: Date): string {
  const cell = (v: string | null | undefined) => {
    let s = v ?? '';
    // A leading =, +, - or @ makes spreadsheets run the cell as a formula.
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['found_at', 'platform', 'match', 'page_url', 'image_url', 'asin', 'title'];
  const date = foundAt.toISOString();
  return [header.join(','), ...rows.map(r => [date, r.platform, r.match, r.page_url, r.image_url, r.asin, r.title].map(cell).join(','))].join('\n') + '\n';
}

/** Saves text as a file in the browser. */
export function downloadText(filename: string, text: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
