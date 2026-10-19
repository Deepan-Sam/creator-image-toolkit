// Shared navigation and footer behavior.
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  var label = document.querySelector('.nav-toggle-label');

  // Keep Home and Guides discoverable in the shared navigation on every route.
  if (nav) {
    var navList = nav.querySelector('ul');
    if (navList) {
      var directLinks = Array.prototype.slice.call(navList.querySelectorAll(':scope > li > a'));
      var hasHome = directLinks.some(function (link) {
        return link.textContent.trim().toLowerCase() === 'home';
      });
      if (!hasHome) {
        var homeItem = document.createElement('li');
        var homeLink = document.createElement('a');
        homeLink.href = '/';
        homeLink.textContent = 'Home';
        homeItem.appendChild(homeLink);
        navList.insertBefore(homeItem, navList.firstElementChild);
      }

      var guideLink = directLinks.find(function (link) {
        return link.textContent.trim().toLowerCase() === 'guides';
      });
      if (guideLink) {
        if (window.location.pathname !== '/' && !/\/index\.html$/.test(window.location.pathname)) {
          guideLink.href = '/index.html#guides';
        } else {
          guideLink.href = '#guides';
        }
      } else {
        var guideItem = document.createElement('li');
        var guideAnchor = document.createElement('a');
        guideAnchor.href = window.location.pathname === '/' || /\/index\.html$/.test(window.location.pathname) ? '#guides' : '/index.html#guides';
        guideAnchor.textContent = 'Guides';
        guideItem.appendChild(guideAnchor);
        var aboutItem = Array.prototype.find.call(navList.querySelectorAll(':scope > li'), function (item) {
          var link = item.querySelector(':scope > a');
          return link && link.textContent.trim().toLowerCase() === 'about';
        });
        navList.insertBefore(guideItem, aboutItem || null);
      }
    }
  }


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
