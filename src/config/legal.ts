/** External legal documents (Tartabini Enterprises). */
export const legal = {
  companyName: 'Tartabini Enterprises LLC',
  eulaUrl: 'https://enterprises.jacobtartabini.com/legal/dsp-app-eula',
  privacyUrl: 'https://enterprises.jacobtartabini.com/privacy',
  termsUrl: 'https://enterprises.jacobtartabini.com/terms',
  cookiesUrl: 'https://enterprises.jacobtartabini.com/cookies',
} as const;

export function copyrightLine(year: number = new Date().getFullYear()) {
  return `© ${year} ${legal.companyName}`;
}
