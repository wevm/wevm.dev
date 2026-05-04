import * as Config from './src/lib/config'

export default Config.define({
  excludedSponsors: ['contextwtf'],
  highlighted: {
    projects: [
      { github: 'wevm/viem' },
      { github: 'wevm/wagmi' },
      { github: 'wevm/vocs' },
      {
        desc: 'URL to markdown for agents',
        github: 'wevm/curl.md',
        href: 'https://curl.md',
        name: 'curl.md',
        new: true,
      },
      { github: 'wevm/incur' },
      { github: 'wevm/mppx', name: 'mppx' },
      { github: 'wevm/abitype', name: 'ABIType' },
    ],
    sponsors: [
      { github: 'paradigmxyz', type: 'collaborator' },
      { github: 'tempoxyz', type: 'collaborator' },
      { github: 'stripe', type: 'large' },
      { alias: 'family', github: 'aave', type: 'large' },
      { alias: 'tbtstl', github: 'ourzora', type: 'small' },
      { alias: 'lamaalrajih', github: 'rainbow-me', type: 'small' },
    ],
  },
  logoOverrides: {
    paradigmxyz: { scale: 1.5 },
    polymarket: { scale: 1.5 },
    'rainbow-me': { scale: 0.9 },
    stripe: { scale: 1.3 },
    tempoxyz: { scale: 0.7 },
  },
  team: [
    { github: 'tmm', handle: 'tmm', twitter: 'awkweb' },
    { github: 'jxom', handle: 'jxom', twitter: '_jxom' },
  ],
  usedBy: [
    { href: 'https://paradigm.xyz', name: 'Paradigm', slug: 'paradigmxyz' },
    { href: 'https://tempo.xyz', name: 'Tempo', slug: 'tempoxyz' },
    { href: 'https://coinbase.com', name: 'Coinbase', slug: 'coinbase' },
    { href: 'https://stripe.com', name: 'Stripe', slug: 'stripe' },
    { href: 'https://brave.com', name: 'Brave', slug: 'brave' },
    { href: 'https://cloudflare.com', name: 'Cloudflare', slug: 'cloudflare' },
    { href: 'https://shopify.com', name: 'Shopify', slug: 'shopify' },
    { href: 'https://vercel.com', name: 'Vercel', slug: 'vercel' },
    { href: 'https://metamask.io', name: 'MetaMask', slug: 'metamask' },
    { href: 'https://polymarket.com', name: 'Polymarket', slug: 'polymarket' },
  ],
})
