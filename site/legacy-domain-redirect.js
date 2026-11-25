const destinations = {
  'snipray.vercel.app': 'https://skipcam.vercel.app',
  'snipray.selfgraphic.tech': 'https://skipcam.selfgraphic.tech'
};
const destination = destinations[window.location.hostname];
if (destination) {
  window.location.replace(destination + window.location.pathname + window.location.search + window.location.hash);
}
