/** External legal documents (Tartabini Enterprises). */
export const legal = {
  companyName: 'Tartabini Enterprises LLC',
  eulaUrl: 'https://enterprises.jacobtartabini.com/eula',
  privacyUrl: 'https://enterprises.jacobtartabini.com/privacy',
  termsUrl: 'https://enterprises.jacobtartabini.com/terms',
} as const;

export function copyrightLine(year: number = new Date().getFullYear()) {
  return `© ${year} ${legal.companyName}`;
}
