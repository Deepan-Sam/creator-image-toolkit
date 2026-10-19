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


  // Turn the Tools navigation item into a consistent dropdown on every page.
  if (nav) {
    var toolsItem = Array.prototype.find.call(nav.querySelectorAll('li'), function (item) {
      var link = item.querySelector(':scope > a');
      return link && link.textContent.trim().toLowerCase() === 'tools';
    });

    if (toolsItem && !toolsItem.classList.contains('tools-dropdown')) {
      var oldToolsLink = toolsItem.querySelector(':scope > a');
      var trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'tools-dropdown-trigger';
      trigger.setAttribute('aria-expanded', 'false');
      trigger.innerHTML = 'Tools <span class="tools-dropdown-chevron" aria-hidden="true">⌄</span>';
      oldToolsLink.replaceWith(trigger);
      toolsItem.classList.add('tools-dropdown');

      var dropdown = document.createElement('div');
      dropdown.className = 'tools-dropdown-menu';
      dropdown.setAttribute('aria-label', 'Image tools');
      dropdown.innerHTML =
        '<a href="image-resizer.html">Image Resizer</a>' +
        '<a href="image-compressor.html">Image Compressor</a>' +
        '<a href="youtube-thumbnail-resizer.html">YouTube Thumbnail Resizer</a>' +
        '<a href="image-cropper.html">Image Cropper</a>' +
        '<a href="image-color-picker.html">Image Color Picker</a>' +
        '<a href="social-media-image-resizer.html">Social Media Image Resizer</a>' +
        '<a href="watermark-maker.html">Image Watermark Maker</a>' +
        '<a href="image-metadata-cleaner.html">Image Metadata Cleaner</a>' +
        '<a href="image-to-pdf.html">Image to PDF</a>' +
        '<a href="batch-image-resizer.html">Batch Image Resizer</a>' +
        '<a href="image-format-converter.html">Image Format Guide</a>';
      toolsItem.appendChild(dropdown);

      function setToolsDropdown(open) {
        toolsItem.classList.toggle('is-dropdown-open', open);
        trigger.setAttribute('aria-expanded', String(open));
      }
      trigger.addEventListener('click', function (event) {
        event.stopPropagation();
        setToolsDropdown(trigger.getAttribute('aria-expanded') !== 'true');
      });
      dropdown.addEventListener('click', function (event) {
        if (event.target.closest('a')) {
          setToolsDropdown(false);
          if (toggle && nav.classList.contains('is-open')) { setMenu(false); }
        }
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
