// ==UserScript==
// @name         Block Specific Users' Posts (twitter.now)
// @namespace    dex.userscripts
// @version      2.0
// @description  Hides posts from a list of usernames on twitter.now, with an easy way to add/remove them
// @author       You
// @match        https://app.twitter.now/*
// @match        https://twitter.now/*
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'blocked_users_twitternow';

  // Default usernames blocked out of the box (lowercase, no @)
  const DEFAULT_BLOCKED_USERS = ['kaitlyn', 'not_lake', 'lake', 'karaa', 'elonmask'];

  function normalize(name) {
    return name.trim().toLowerCase().replace(/^@/, '');
  }

  function loadBlockedUsers() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_BLOCKED_USERS.slice();
    } catch (e) {
      return DEFAULT_BLOCKED_USERS.slice();
    }
  }

  function saveBlockedUsers(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  let blockedUsers = loadBlockedUsers();

  function addBlockedUser() {
    const input = prompt('Username to block (with or without @):');
    if (!input) return;
    const username = normalize(input);
    if (!username) return;
    if (!blockedUsers.includes(username)) {
      blockedUsers.push(username);
      saveBlockedUsers(blockedUsers);
      alert(`Blocked @${username}. Refresh the page if posts don't disappear immediately.`);
      resetCheckedFlags();
      hideBlockedPosts();
    } else {
      alert(`@${username} is already blocked.`);
    }
  }

  function removeBlockedUser() {
    if (blockedUsers.length === 0) {
      alert('No users are currently blocked.');
      return;
    }
    const list = blockedUsers.map((u, i) => `${i + 1}. @${u}`).join('\n');
    const input = prompt(
      `Currently blocked:\n${list}\n\nEnter the username (or number) to unblock:`
    );
    if (!input) return;
    const trimmed = input.trim();
    let target = null;

    if (/^\d+$/.test(trimmed)) {
      const idx = parseInt(trimmed, 10) - 1;
      if (idx >= 0 && idx < blockedUsers.length) target = blockedUsers[idx];
    } else {
      target = normalize(trimmed);
    }

    if (target && blockedUsers.includes(target)) {
      blockedUsers = blockedUsers.filter((u) => u !== target);
      saveBlockedUsers(blockedUsers);
      alert(`Unblocked @${target}. Refresh the page to see their posts again.`);
    } else {
      alert('User not found in blocked list.');
    }
  }

  function listBlockedUsers() {
    if (blockedUsers.length === 0) {
      alert('No users are currently blocked.');
    } else {
      alert('Currently blocked:\n' + blockedUsers.map((u) => `@${u}`).join('\n'));
    }
  }

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('➕ Block a user', addBlockedUser);
    GM_registerMenuCommand('➖ Unblock a user', removeBlockedUser);
    GM_registerMenuCommand('📋 List blocked users', listBlockedUsers);
  }

  // Matches aria-label="View @kaitlyn's profile" or "Follow @kaitlyn"
  const ARIA_USERNAME_RE = /@([A-Za-z0-9_]+)/;

  function findPostCard(el) {
    // Each post is wrapped in a clean <article> tag on this site.
    return el.closest('article') || el;
  }

  function resetCheckedFlags() {
    document
      .querySelectorAll('[data-block-checked="1"]')
      .forEach((el) => delete el.dataset.blockChecked);
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
      if (!blockedUsers.includes(username)) return;

      const card = findPostCard(el);
      if (card) {
        card.style.display = 'none';
      }
    });
  }

  function blockUserNow(username) {
    if (!blockedUsers.includes(username)) {
      blockedUsers.push(username);
      saveBlockedUsers(blockedUsers);
    }
    resetCheckedFlags();
    hideBlockedPosts();
  }

  function makeBlockButton(username) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = `Block @${username}`;
    btn.setAttribute('aria-label', `Block @${username}`);
    btn.dataset.blockBtn = '1';
    btn.style.cssText =
      'display:inline-flex;align-items:center;justify-content:center;' +
      'width:32px;height:32px;padding:0;margin-left:2px;border:none;' +
      'border-radius:9999px;background:rgba(127,127,127,0.15);' +
      'cursor:pointer;opacity:1;flex-shrink:0;position:relative;z-index:5;';
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" ' +
      'fill="none" stroke="#71767b" stroke-width="2.25" stroke-linecap="round" ' +
      'stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle>' +
      '<line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>';

    const svg = btn.querySelector('svg');

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(239,68,68,0.18)';
      svg.setAttribute('stroke', '#ef4444');
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(127,127,127,0.15)';
      svg.setAttribute('stroke', '#71767b');
    });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (confirm(`Block @${username}? Their posts will be hidden.`)) {
        blockUserNow(username);
      }
    });

    return btn;
  }

  function addBlockButtons() {
    const optionButtons = document.querySelectorAll(
      'button[aria-label="Post options"]:not([data-block-btn-added])'
    );
    optionButtons.forEach((optionsBtn) => {
      optionsBtn.dataset.blockBtnAdded = '1';

      const article = optionsBtn.closest('article');
      if (!article) return;

      const profileLink = article.querySelector('[aria-label^="View @"]');
      if (!profileLink) return;

      const label = profileLink.getAttribute('aria-label') || '';
      const match = label.match(ARIA_USERNAME_RE);
      if (!match) return;

      const username = normalize(match[1]);
      const blockBtn = makeBlockButton(username);
      optionsBtn.parentElement.insertBefore(blockBtn, optionsBtn);
    });
  }

  const observer = new MutationObserver(() => {
    hideBlockedPosts();
    addBlockButtons();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  hideBlockedPosts();
  addBlockButtons();
})();