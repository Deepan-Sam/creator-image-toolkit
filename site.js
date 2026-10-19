// Shared navigation and footer behavior.
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  var label = document.querySelector('.nav-toggle-label');

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    label.textContent = open ? 'Close' : 'Menu';
  }

  if (toggle && nav && label) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) { setMenu(false); }
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
      }
    });
    var desktopQuery = window.matchMedia('(min-width: 48em)');
    var closeMenuOnDesktop = function (event) {
      if (event.matches) { setMenu(false); }
    };
    if (typeof desktopQuery.addEventListener === 'function') {
      desktopQuery.addEventListener('change', closeMenuOnDesktop);
    } else if (typeof desktopQuery.addListener === 'function') {
      desktopQuery.addListener(closeMenuOnDesktop);
    }
  }


  // Accessible, crawlable Tools dropdown rendered in the HTML on every page.
  if (nav) {
    var toolsItem = nav.querySelector('.tools-dropdown');
    var trigger = toolsItem && toolsItem.querySelector('.tools-dropdown-trigger');
    var dropdown = toolsItem && toolsItem.querySelector('.tools-dropdown-menu');

    if (toolsItem && trigger && dropdown) {
      function setToolsDropdown(open) {
        toolsItem.classList.toggle('is-dropdown-open', open);
        trigger.setAttribute('aria-expanded', String(open));
      }

      trigger.addEventListener('click', function (event) {
        event.stopPropagation();
        setToolsDropdown(trigger.getAttribute('aria-expanded') !== 'true');
      });

      document.addEventListener('click', function (event) {
        if (!toolsItem.contains(event.target)) { setToolsDropdown(false); }
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && toolsItem.classList.contains('is-dropdown-open')) {
          setToolsDropdown(false);
          trigger.focus();
        }
      });

      toolsItem.addEventListener('focusout', function (event) {
        if (!toolsItem.contains(event.relatedTarget)) { setToolsDropdown(false); }
      });
    }
  }

  var year = document.getElementById('year');
  if (year) { year.textContent = String(new Date().getFullYear()); }
}());
