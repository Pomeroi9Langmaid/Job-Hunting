(() => {
  const replyUpdates = {
    "70": {
      current_status: "Future Opportunity",
      outcome_date: "29 Jul 2026",
      outcome: "No current matching commercial role. The company asked to retain Andrew's CV for possible future international-growth opportunities.",
      notes: "Reply received 29 July 2026; CV retained for possible future opportunities."
    },
    "86": {
      notes: "Out-of-office reply received 28 July 2026; substantive response still awaited."
    },
    "124": {
      current_status: "Application Closed",
      outcome_date: "27 Jul 2026",
      outcome: "Speculative approach closed because direct sector experience was required. Andrew acknowledged the reply and closed the exchange.",
      notes: "Substantive reply received 27 July 2026; Andrew replied on 28 July."
    },
    "138": {
      current_status: "Application Closed",
      outcome_date: "30 Jul 2026",
      outcome: "No current opening. The company normally requires direct specialist sector experience and had recently completed recruitment for related international roles.",
      notes: "Substantive reply received 30 July 2026."
    },
    "143": { notes: "Automatic reply received 28 July 2026; substantive response still awaited." },
    "145": { notes: "Automatic reply received 28 July 2026; substantive response still awaited." },
    "146": { notes: "Automatic redirect received from the original contact. Replacement outreach sent to the current CEO; substantive response still awaited." },
    "148": { notes: "Automatic reply received 28 July 2026; substantive response still awaited." },
    "151": { notes: "Automatic reply received 28 July 2026; substantive response still awaited." }
  };

  function applyReplyUpdates() {
    if (typeof state === "undefined" || !Array.isArray(state.records) || state.records.length === 0) {
      window.setTimeout(applyReplyUpdates, 100);
      return;
    }

    state.records = state.records.map((record) => ({
      ...record,
      ...(replyUpdates[record.id] || {})
    }));

    renderSummary();
    render();
  }

  applyReplyUpdates();
})();
