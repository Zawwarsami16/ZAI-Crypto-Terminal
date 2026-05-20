(() => {
  if (window.__anteroomMarketRouterReady) return;
  window.__anteroomMarketRouterReady = true;

  const CONTRACT_MAP = {
    SHIB: '1000SHIB',
    PEPE: '1000PEPE',
    BONK: '1000BONK',
    FLOKI: '1000FLOKI',
    LUNC: '1000LUNC',
    XEC: '1000XEC',
    RATS: '1000RATS',
    SATS: '1000SATS',
  };

  const originalFetch = window.fetch.bind(window);
  const OriginalWebSocket = window.WebSocket;

  const routeSymbol = (symbol) => {
    const base = String(symbol || '').replace(/USDT$/i, '').toUpperCase();
    return CONTRACT_MAP[base] ? `${CONTRACT_MAP[base]}USDT` : symbol;
  };

  const rewriteUrl = (input) => {
    const raw = typeof input === 'string' ? input : input?.url;
    if (!raw || !raw.includes('binance.com')) return input;
    try {
      const url = new URL(raw);
      const symbol = url.searchParams.get('symbol');
      if (symbol) url.searchParams.set('symbol', routeSymbol(symbol));
      return typeof input === 'string' ? url.toString() : new Request(url.toString(), input);
    } catch {
      return input;
    }
  };

  window.fetch = (input, init) => originalFetch(rewriteUrl(input), init);

  window.WebSocket = function AnteroomWebSocket(url, protocols) {
    let routedUrl = String(url || '');
    for (const [display, contract] of Object.entries(CONTRACT_MAP)) {
      routedUrl = routedUrl.replace(`${display.toLowerCase()}usdt@`, `${contract.toLowerCase()}usdt@`);
    }
    return protocols ? new OriginalWebSocket(routedUrl, protocols) : new OriginalWebSocket(routedUrl);
  };
  window.WebSocket.prototype = OriginalWebSocket.prototype;
})();
