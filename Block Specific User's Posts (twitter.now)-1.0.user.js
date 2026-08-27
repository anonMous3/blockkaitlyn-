// ==UserScript==
// @name         Block Specific User's Posts (twitter.now)
// @namespace    dex.userscripts
// @version      1.0
// @description  Hides posts from a specific username on twitter.now
// @author       You
// @match        https://app.twitter.now/*
// @match        https://twitter.now/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Add usernames here (lowercase, no @)
  const BLOCKED_USERS = ['kaitlyn'];

  function normalize(name) {
    return name.trim().toLowerCase();
  }

  // Matches aria-label="View @kaitlyn's profile" or "Follow @kaitlyn"
  const ARIA_USERNAME_RE = /@([A-Za-z0-9_]+)/;

  function findPostCard(el) {
    // Each post is wrapped in a clean <article> tag on this site.
    return el.closest('article') || el;
  }

  function hideBlockedPosts() {
    const candidates = document.querySelectorAll('[aria-label*="@"]');
    candidates.forEach((el) => {
      if (el.dataset.blockChecked === '1') return;
      el.dataset.blockChecked = '1';

      const label = el.getAttribute('aria-label') || '';
      const match = label.match(ARIA_USERNAME_RE);
      if (!match) return;

      const username = normalize(match[1]);
      if (!BLOCKED_USERS.includes(username)) return;

      const card = findPostCard(el);
      if (card) {
        card.style.display = 'none';
      }
    });
  }

  const observer = new MutationObserver(() => {
    hideBlockedPosts();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  hideBlockedPosts();
})();