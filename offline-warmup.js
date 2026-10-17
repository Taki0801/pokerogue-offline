// 首次加载后在后台预热离线缓存（自动生成）
(function () {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  navigator.serviceWorker.ready.then(function (reg) {
    try {
      if (reg.active) {
        reg.active.postMessage("warm");
      }
    } catch (e) {}
  });
})();
