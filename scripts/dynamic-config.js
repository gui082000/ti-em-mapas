(function () {
  function applyPixel(id) {
    if (!id || typeof window.fbq !== "function") return;
    window.fbq("init", id);
    window.fbq("track", "PageView");
  }

  function applyLinks(cfg) {
    var map = {
      "checkout-basico": cfg.basico,
      "checkout-basico-downsell": cfg.basico,
      "checkout-premium": cfg.premium,
      "checkout-premium-downsell": cfg.premiumDownsell,
    };
    Object.keys(map).forEach(function (id) {
      var url = map[id];
      if (!url) return;
      var el = document.getElementById(id);
      if (el && el.getAttribute("href") !== url) {
        el.setAttribute("href", url);
      }
    });
  }

  fetch("/api/config")
    .then(function (r) {
      return r.json();
    })
    .then(function (cfg) {
      applyPixel(cfg.pixelId);
      applyLinks(cfg);
      new MutationObserver(function () {
        applyLinks(cfg);
      }).observe(document.body, { childList: true, subtree: true });
    })
    .catch(function (err) {
      console.error("Failed to load runtime config", err);
    });
})();
