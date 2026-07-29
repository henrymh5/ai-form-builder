(function () {
  "use strict";

  var script = document.currentScript;
  var origin = script && script.src ? new URL(script.src).origin : window.location.origin;

  function mountEmbed(container) {
    var slug = container.getAttribute("data-formapp-slug");
    if (!slug || container.querySelector("iframe")) return;

    var transparent = container.getAttribute("data-formapp-transparent") === "true";
    var src =
      origin +
      "/embed/" +
      encodeURIComponent(slug) +
      "?parent=" +
      encodeURIComponent(window.location.origin) +
      (transparent ? "&transparent=1" : "");

    var iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.title = "Formular";
    iframe.loading = "lazy";
    iframe.style.border = "0";
    iframe.style.width = "100%";
    iframe.style.minHeight = "480px";
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups");
    container.appendChild(iframe);

    function dispatch(type, payload) {
      container.dispatchEvent(new CustomEvent("formapp:" + type, { detail: payload }));
    }

    window.addEventListener("message", function (event) {
      if (event.source !== iframe.contentWindow) return;
      if (event.origin !== origin) return;
      var data = event.data;
      if (!data || data.source !== "formapp") return;

      if (data.type === "form.resized" && data.payload && data.payload.height) {
        iframe.style.height = data.payload.height + "px";
      }
      var shortType = String(data.type || "").replace(/^form\./, "");
      dispatch(shortType, data.payload || {});
    });
  }

  function mountAll() {
    var containers = document.querySelectorAll("[data-formapp-slug]");
    for (var i = 0; i < containers.length; i++) mountEmbed(containers[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountAll);
  } else {
    mountAll();
  }
})();
