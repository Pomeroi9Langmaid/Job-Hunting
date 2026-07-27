(() => {
  const labels = {
    "pill-role": "APPLIED TO ADVERTISED ROLE",
    "pill-direct": "CONTACTED ABOUT ADVERTISED ROLE",
    "pill-speculative": "SPECULATIVE COMPANY APPROACH",
    "pill-target": "PROSPECTIVE TARGET — NOT CONTACTED",
  };

  function clarifyRouteLabels() {
    document.querySelectorAll("#applications-body .pill").forEach((pill) => {
      const className = Object.keys(labels).find((name) => pill.classList.contains(name));
      if (className) pill.textContent = labels[className];
    });

    document.querySelectorAll("#applications-body .progress-step.step-start").forEach((step) => {
      const text = step.childNodes[0]?.textContent?.trim();
      if (text === "DIRECT ROLE OUTREACH") {
        step.childNodes[0].textContent = "CONTACTED ABOUT ADVERTISED ROLE";
      } else if (text === "REACHED OUT") {
        step.childNodes[0].textContent = "SPECULATIVE APPROACH SENT";
      }
    });
  }

  function initialise() {
    clarifyRouteLabels();
    const body = document.querySelector("#applications-body");
    if (!body) return;

    new MutationObserver(clarifyRouteLabels).observe(body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
})();
