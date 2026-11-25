const destinations = {
  'snipray.vercel.app': 'https://skipcam.selfgraphic.tech',
  'skipcam.vercel.app': 'https://skipcam.selfgraphic.tech',
  'snipray.selfgraphic.tech': 'https://skipcam.selfgraphic.tech'
};
const destination = destinations[window.location.hostname];
if (destination) {
  window.location.replace(destination + window.location.pathname + window.location.search + window.location.hash);
}
