(function () {
  "use strict";

  console.log("[CV] Script loaded and executing");

  // ─── Feature flags ────────────────────────────────────────────────────────
  // Set to true to show the category tabs (CONTENT, CURRENCY, NUMBERING…).
  // Set to false to hide them and show only the flat change list.
  var showCategories = false;
  // ─────────────────────────────────────────────────────────────────────────

  var params        = new URLSearchParams(window.location.search);
  var comparisonUrl = params.get("comparisonUrl");
  var deltaviewRoot = document.getElementById("deltaview-root");

  console.log("[CV] deltaviewRoot:",  deltaviewRoot);
  console.log("[CV] showCategories:", showCategories);
  console.log("[CV] comparisonUrl:",  comparisonUrl);

  function setStatus(message, isError) {
    if (message && isError) {
      window.alert(message);
    }
  }

  // ── Category tabs ─────────────────────────────────────────────────────────
  // Hides/shows the CONTENT / CURRENCY / NUMBERING… tab strip based on the
  // showCategories flag. Uses removeProperty() when showing so deltaview's
  // own active-tab styles are not overridden.

  function applyCategoryVisibility() {
    var selector = [
      "[class*='CategoryHeader_categoriesList']",
      "[class*='CategoryHeader_categoriesToggler']",
      "[class*='CategoryHeader_categoriesWrapper']",
      "[class*='CategoryHeader_category']",
      "[class*='CategoryHeader_activeCategory']"
    ].join(", ");

    var nodes = document.querySelectorAll(selector);
    nodes.forEach(function (el) {
      if (showCategories) {
        el.style.removeProperty("display");
        el.style.removeProperty("visibility");
        el.style.removeProperty("opacity");
      } else {
        el.style.setProperty("display", "none", "important");
      }
    });
  }

  function enhanceViewerDom() {
    applyCategoryVisibility();
  }

  function scheduleEnhancement(attempt) {
    enhanceViewerDom();
    if (attempt >= 50) {
      console.log("[CV] Scheduled enhancement completed after 50 attempts");
      return;
    }
    window.setTimeout(function () {
      scheduleEnhancement(attempt + 1);
    }, 200);
  }

  function installDomObserver() {
    if (!deltaviewRoot) { return; }
    var observer = new MutationObserver(function () {
      enhanceViewerDom();
    });
    observer.observe(deltaviewRoot, {
      childList:       true,
      subtree:         true,
      attributes:      true,
      attributeFilter: ["style", "class", "hidden", "aria-hidden"]
    });
    console.log("[CV] DOM observer installed");
  }

  // Belt-and-suspenders polling in case mutations are missed.
  window.setInterval(function () {
    enhanceViewerDom();
  }, 500);

  // ── Validation ────────────────────────────────────────────────────────────

  function validateInputs() {
    if (!comparisonUrl) {
      console.error("[CV] Missing comparisonUrl parameter");
      setStatus("The viewer link is missing the required comparisonUrl parameter.", true);
      return false;
    }

    if (
      !window.deltaview ||
      typeof window.deltaview.init   !== "function" ||
      typeof window.deltaview.render !== "function"
    ) {
      console.error("[CV] deltaview.js not loaded or missing methods");
      setStatus(
        "deltaview.js did not load correctly. Confirm the Compare Server assets are reachable.",
        true
      );
      return false;
    }

    console.log("[CV] Inputs validated successfully");
    return true;
  }

  // ── Initialisation ────────────────────────────────────────────────────────

  function initializeViewer() {
    console.log("[CV] initializeViewer called");
    try {
      if (!validateInputs()) {
        console.log("[CV] validateInputs failed");
        return;
      }

      window.deltaview.init({
        deltaviewId: "deltaview-root",
        // acceptChanges.enabled is what tells deltaview to render the
        // per-row checkboxes and the "Accept selected changes" button.
        acceptChanges: {
          enabled: true
        },
        display: {
          toolbar:       true,
          changeSummary: true,
          redline:       true,
          statistics:    false,
          about: {
            render: true,
            acknowledgmentsURL: "/WorkshareCompareApi/about/acknowledgments"
          }
        }
      });

      window.deltaview.render(comparisonUrl);
      scheduleEnhancement(0);
      installDomObserver();
      setStatus("");
    } catch (error) {
      console.error("[CV] Exception in initializeViewer:", error);
      setStatus(
        "The comparison could not be rendered. " +
          (error && error.message ? error.message : "Please verify the comparison URL."),
        true
      );
    }
  }

  initializeViewer();
  console.log("[CV] Script initialization complete");

})();