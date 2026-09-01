(function () {
  window.addEventListener("DOMContentLoaded", function () {
    const toggle = document.getElementById("nav-toggle");
    const drawer = document.getElementById("nav-drawer");
    if (!toggle || !drawer) return;

    function openDrawer() {
      drawer.hidden = false;
      void drawer.offsetWidth;
      drawer.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
    }

    function closeDrawer() {
      drawer.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      window.setTimeout(function () {
        if (!drawer.classList.contains("is-open")) drawer.hidden = true;
      }, 360);
    }

    toggle.addEventListener("click", function () {
      if (drawer.classList.contains("is-open")) closeDrawer();
      else openDrawer();
    });

    drawer.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        closeDrawer();
      });
    });

    window.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeDrawer();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 820) closeDrawer();
    });
  });
})();
