/*
  Store Bot maintenance settings

  How to use:
  1. Edit this file.
  2. Commit and push to GitHub Pages.
  3. Set enabled back to false when the work is done.

  Path examples:
    /index.html
    /pricing.html
    /autopay.html
    /dashboard.html

  Owner preview bypass:
    Add ?maintenance_bypass=change-this-token to the page URL.
    Change the token below before using this publicly.
*/

window.STOREBOT_MAINTENANCE = {
  // Turns the entire website into a maintenance page.
  site: {
    enabled: false,
    title: 'Store Bot is under maintenance',
    reason: 'We are updating the site right now. Please check back soon.',
    expectedBack: '',
    contactUrl: 'https://discord.gg/zB7NgPBzBA',
    contactLabel: 'Join the support server'
  },

  // Turns specific pages into maintenance pages.
  pages: {
    // '/pricing.html': {
    //   enabled: true,
    //   title: 'Pricing is being updated',
    //   reason: 'We are updating Premium checkout and billing information.',
    //   expectedBack: 'Later today'
    // },

    // '/dashboard.html': {
    //   enabled: true,
    //   title: 'Dashboard maintenance',
    //   reason: 'We are updating the Premium management dashboard.',
    //   expectedBack: 'A few minutes'
    // }
  },

  // Replaces only specific sections on a page with a maintenance card.
  sections: {
    // '/index.html': [
    //   {
    //     enabled: true,
    //     selector: '#pricing',
    //     title: 'Pricing section under maintenance',
    //     reason: 'We are updating the Premium offer details.'
    //   }
    // ]
  },

  // Optional owner-only preview bypass for checking the real page during maintenance.
  bypass: {
    enabled: true,
    queryParam: 'maintenance_bypass',
    token: 'change-this-token'
  }
};
