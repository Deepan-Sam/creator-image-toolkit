// Browser-local image color sampling.
(function () {
  'use strict';

  var maxDimension = 16384;
  var maxPixels = 40000000;
  var maxFileBytes = 20 * 1024 * 1024;
  var maxPreviewDimension = 1800;
  var allowedTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif'
  };

  var fileInput = document.getElementById('picker-file');
  var dropzone = document.getElementById('picker-dropzone');
  var browseButton = document.getElementById('picker-browse');
  var replaceButton = document.getElementById('picker-replace');
  var resetButton = document.getElementById('picker-reset');
  var filePanel = document.getElementById('picker-file-panel');
  var fileDetails = document.getElementById('picker-file-details');
  var status = document.getElementById('picker-status');
  var workspace = document.getElementById('picker-workspace');
  var preview = document.getElementById('picker-preview');
  var marker = document.getElementById('picker-marker');
  var coordinates = document.getElementById('picker-coordinates');
  var emptyResult = document.getElementById('picker-color-empty');
  var colorResult = document.getElementById('picker-color-result');
  var swatchColor = document.getElementById('picker-swatch-color');
  var hexLarge = document.getElementById('picker-hex-large');
  var alphaNote = document.getElementById('picker-alpha-note');
  var valueElements = {
    hex: document.getElementById('picker-hex-value'),
    rgb: document.getElementById('picker-rgb-value'),
    hsl: document.getElementById('picker-hsl-value'),
    rgba: document.getElementById('picker-rgba-value')
  };
  var historyList = document.getElementById('picker-history-list');
  var historyEmpty = document.getElementById('picker-history-empty');
  var clearHistoryButton = document.getElementById('picker-clear-history');

  var imageBitmap = null;
  var previewContext = null;
  var sampleCanvas = document.createElement('canvas');
  var sampleContext = null;
  var loadVersion = 0;
  var fileDimensions = null;
  var pointerPosition = { x: 0, y: 0 };
  var selectedColor = null;
  var colorHistory = [];
  var historyLimit = 8;

  function userError(message) {
    var error = new Error(message);
    error.userFacing = true;
    return error;
  }

  function setStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state || 'info';
  }

  function closeBitmap() {
    if (imageBitmap) {
      imageBitmap.close();
      imageBitmap = null;
    }
  }

  function clearSelectedColor() {
    selectedColor = null;
    if (sampleContext) { sampleContext.clearRect(0, 0, sampleCanvas.width, sampleCanvas.height); }
    emptyResult.hidden = false;
    colorResult.hidden = true;
    swatchColor.style.backgroundColor = 'transparent';
    hexLarge.textContent = '';
    alphaNote.textContent = 'No color selected';
    Object.keys(valueElements).forEach(function (format) {
      valueElements[format].textContent = '';
    });
    coordinates.textContent = 'No pixel selected.';
    marker.hidden = true;
  }

  function clearImageState(clearFileInput) {
    loadVersion += 1;
    closeBitmap();
    fileDimensions = null;
    clearSelectedColor();
    pointerPosition = { x: 0, y: 0 };
    colorHistory = [];
    preview.removeAttribute('aria-label');
    preview.width = 0;
    preview.height = 0;
    preview.style.width = '';
    preview.classList.remove('picker-preview-upscaled');
    preview.hidden = true;
    previewContext = null;
    marker.hidden = true;
    workspace.hidden = true;
    filePanel.hidden = true;
    fileDetails.textContent = 'No image selected';
    coordinates.textContent = 'No pixel selected.';
    emptyResult.hidden = false;
    colorResult.hidden = true;
    historyList.replaceChildren();
    historyEmpty.hidden = false;
    clearHistoryButton.disabled = true;
    if (clearFileInput) { fileInput.value = ''; }
  }

  function signatureMime(bytes) {
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'image/jpeg';
    }
    if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e &&
        bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a &&
        bytes[6] === 0x1a && bytes[7] === 0x0a) {
      return 'image/png';
    }
    if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 &&
        bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 &&
        bytes[10] === 0x42 && bytes[11] === 0x50) {
      return 'image/webp';
    }
    if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 &&
        bytes[3] === 0x38 && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61) {
      return 'image/gif';
    }
    return null;
  }

  async function validateFile(file) {
    if (!file || !file.size) { throw userError('The selected file is empty. Choose a non-empty image.'); }
    if (file.size > maxFileBytes) { throw userError('This file is larger than the 20 MB limit.'); }

    var extension = file.name.split('.').pop().toLowerCase();
    var expectedMime = allowedTypes[extension];
    var declaredMime = file.type.toLowerCase();
    if (declaredMime === 'image/jpg') { declaredMime = 'image/jpeg'; }
    if (!expectedMime) {
      throw userError('Unsupported file. Choose a JPG, PNG, WebP, or GIF image.');
    }
    if (declaredMime && declaredMime !== 'application/octet-stream' &&
        (!allowedTypes[declaredMime.split('/').pop()] || allowedTypes[declaredMime.split('/').pop()] !== expectedMime)) {
      throw userError('The file extension does not match its image type.');
    }

    var bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    var actualMime = signatureMime(bytes);
    if (actualMime !== expectedMime) {
      throw userError('The file contents do not match the selected JPG, PNG, WebP, or GIF type.');
    }
    return actualMime;
  }

  function drawPreview() {
    var scale = Math.min(1, maxPreviewDimension / imageBitmap.width, maxPreviewDimension / imageBitmap.height);
    var width = Math.max(1, Math.round(imageBitmap.width * scale));
    var height = Math.max(1, Math.round(imageBitmap.height * scale));
    preview.width = width;
    preview.height = height;
    preview.style.width = Math.max(320, width) + 'px';
    preview.classList.toggle('picker-preview-upscaled', width < 320);
    previewContext = preview.getContext('2d');
    if (!previewContext) { throw userError('Canvas preview is unavailable in this browser.'); }
    previewContext.clearRect(0, 0, width, height);
    previewContext.drawImage(imageBitmap, 0, 0, width, height);
    preview.setAttribute('aria-label', 'Image preview, ' + imageBitmap.width + ' by ' +
      imageBitmap.height + ' pixels. Use arrow keys to move the sampling point, then Enter or Space to select.');
  }

  async function loadFile(file) {
    var version = ++loadVersion;
    closeBitmap();
    fileDimensions = null;
    clearSelectedColor();
    pointerPosition = { x: 0, y: 0 };
    colorHistory = [];
    historyList.replaceChildren();
    historyEmpty.hidden = false;
    clearHistoryButton.disabled = true;
    if (sampleContext) { sampleContext.clearRect(0, 0, sampleCanvas.width, sampleCanvas.height); }
    preview.width = 0;
    preview.height = 0;
    preview.style.width = '';
    preview.classList.remove('picker-preview-upscaled');
    preview.removeAttribute('aria-label');
    previewContext = null;
    preview.hidden = true;
    marker.hidden = true;
    workspace.hidden = true;

    if (!file) {
      filePanel.hidden = true;
      setStatus('Choose or drop one image to begin.');
      return;
    }
    filePanel.hidden = false;
    fileDetails.textContent = file.name + ' · ' + (file.size / 1024).toFixed(1) + ' KB · Checking image…';
    setStatus('Checking selected image…');

    var bitmap;
    try {
      await validateFile(file);
      if (version !== loadVersion) { return; }
      if (typeof createImageBitmap !== 'function') {
        throw userError('This browser does not support local image decoding for the color picker.');
      }
      bitmap = await createImageBitmap(file);
    } catch (error) {
      if (version !== loadVersion) { return; }
      fileDetails.textContent = file.name + ' · Could not load image';
      setStatus(error.userFacing
        ? error.message
        : 'Could not decode this image. It may be damaged or use an unsupported format.', 'error');
      return;
    }
    if (version !== loadVersion) {
      bitmap.close();
      return;
    }

    if (!bitmap.width || !bitmap.height) {
      bitmap.close();
      fileDetails.textContent = file.name + ' · Could not load image';
      setStatus('Could not decode this image. Choose another file.', 'error');
      return;
    }
    if (bitmap.width > maxDimension || bitmap.height > maxDimension || bitmap.width * bitmap.height > maxPixels) {
      bitmap.close();
      fileDetails.textContent = file.name + ' · Image exceeds size limits';
      setStatus('This image exceeds the safe limit of 16,384 px per side or 40 megapixels.', 'error');
      return;
    }

    imageBitmap = bitmap;
    fileDimensions = { width: bitmap.width, height: bitmap.height };
    pointerPosition = { x: Math.floor(bitmap.width / 2), y: Math.floor(bitmap.height / 2) };
    try {
      drawPreview();
      var contextOptions = { willReadFrequently: true };
      sampleCanvas.width = 1;
      sampleCanvas.height = 1;
      sampleContext = sampleCanvas.getContext('2d', contextOptions);
      if (!sampleContext) { throw userError('Canvas pixel sampling is unavailable in this browser.'); }
    } catch (error) {
      closeBitmap();
      fileDimensions = null;
      preview.width = 0;
      preview.height = 0;
      preview.style.width = '';
      preview.classList.remove('picker-preview-upscaled');
      fileDetails.textContent = file.name + ' · Could not prepare preview';
      setStatus(error.userFacing
        ? error.message
        : 'Could not prepare this image for color sampling in this browser.', 'error');
      return;
    }

    var size = file.size < 1024 * 1024
      ? (file.size / 1024).toFixed(1) + ' KB'
      : (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    fileDetails.textContent = file.name + ' · ' + bitmap.width + ' × ' + bitmap.height + ' px · ' + size;
    workspace.hidden = false;
    preview.hidden = false;
    emptyResult.hidden = false;
    colorResult.hidden = true;
    coordinates.textContent = 'No pixel selected. Use arrow keys to position the sample, then Enter or Space.';
    positionMarker(pointerPosition.x, pointerPosition.y);
    setStatus('Image ready. Click or tap a pixel, or use the keyboard controls to select a color.', 'success');
  }

  function positionMarker(x, y) {
    if (!imageBitmap) { return; }
    marker.style.left = ((x + 0.5) / imageBitmap.width * 100) + '%';
    marker.style.top = ((y + 0.5) / imageBitmap.height * 100) + '%';
    marker.hidden = false;
  }

  function getHsl(red, green, blue) {
    var r = red / 255;
    var g = green / 255;
    var b = blue / 255;
    var maximum = Math.max(r, g, b);
    var minimum = Math.min(r, g, b);
    var difference = maximum - minimum;
    var hue = 0;
    var saturation = 0;
    var lightness = (maximum + minimum) / 2;

    if (difference) {
      saturation = difference / (1 - Math.abs(2 * lightness - 1));
      switch (maximum) {
        case r: hue = ((g - b) / difference) % 6; break;
        case g: hue = (b - r) / difference + 2; break;
        default: hue = (r - g) / difference + 4; break;
      }
      hue *= 60;
      if (hue < 0) { hue += 360; }
    }
    return 'hsl(' + Math.round(hue) + ', ' + Math.round(saturation * 100) +
      '%, ' + Math.round(lightness * 100) + '%)';
  }

  function colorFromPixel(x, y) {
    if (!imageBitmap || !sampleContext) { throw new Error('Choose an image before sampling a pixel.'); }
    sampleContext.clearRect(0, 0, 1, 1);
    sampleContext.drawImage(imageBitmap, x, y, 1, 1, 0, 0, 1, 1);
    var pixel = sampleContext.getImageData(0, 0, 1, 1).data;
    var red = pixel[0];
    var green = pixel[1];
    var blue = pixel[2];
    var alpha = pixel[3] / 255;
    var hex = '#' + [red, green, blue].map(function (channel) {
      return channel.toString(16).padStart(2, '0');
    }).join('').toUpperCase();
    var alphaText = String(Number(alpha.toFixed(3)));
    return {
      x: x,
      y: y,
      red: red,
      green: green,
      blue: blue,
      alpha: alpha,
      hex: hex,
      rgb: 'rgb(' + red + ', ' + green + ', ' + blue + ')',
      hsl: getHsl(red, green, blue),
      rgba: 'rgba(' + red + ', ' + green + ', ' + blue + ', ' + alphaText + ')',
      key: red + ',' + green + ',' + blue + ',' + pixel[3]
    };
  }

  function renderColor(color, announce) {
    selectedColor = color;
    emptyResult.hidden = true;
    colorResult.hidden = false;
    swatchColor.style.backgroundColor = color.rgba;
    hexLarge.textContent = color.hex;
    valueElements.hex.textContent = color.hex;
    valueElements.rgb.textContent = color.rgb;
    valueElements.hsl.textContent = color.hsl;
    valueElements.rgba.textContent = color.rgba;
    alphaNote.textContent = color.alpha === 1
      ? 'Opaque color · alpha 100%'
      : 'Transparency · alpha ' + Math.round(color.alpha * 100) + '%';
    coordinates.textContent = 'Pixel ' + (color.x + 1) + ', ' + (color.y + 1) +
      ' of ' + fileDimensions.width + ' × ' + fileDimensions.height + ' px · ' +
      color.hex + ' · alpha ' + Math.round(color.alpha * 100) + '%';
    pointerPosition = { x: color.x, y: color.y };
    positionMarker(color.x, color.y);
    addHistory(color);
    if (announce) {
      setStatus('Selected ' + color.hex + ' at pixel ' + (color.x + 1) + ', ' + (color.y + 1) + '.', 'success');
    }
  }

  function samplePixel(x, y) {
    if (!imageBitmap || !fileDimensions) {
      setStatus('Choose an image before selecting a color.', 'error');
      return;
    }
    x = Math.max(0, Math.min(fileDimensions.width - 1, Math.floor(x)));
    y = Math.max(0, Math.min(fileDimensions.height - 1, Math.floor(y)));
    try {
      renderColor(colorFromPixel(x, y), true);
    } catch (error) {
      setStatus('Could not read the selected pixel. Try another pixel or choose another image.', 'error');
    }
  }

  function pointFromEvent(event) {
    if (!imageBitmap) { return null; }
    var rect = preview.getBoundingClientRect();
    if (!rect.width || !rect.height || event.clientX < rect.left || event.clientX >= rect.right ||
        event.clientY < rect.top || event.clientY >= rect.bottom) {
      return null;
    }
    return {
      x: Math.floor((event.clientX - rect.left) / rect.width * imageBitmap.width),
      y: Math.floor((event.clientY - rect.top) / rect.height * imageBitmap.height)
    };
  }

  function addHistory(color) {
    if (colorHistory.length && colorHistory[0].key === color.key) { return; }
    colorHistory = colorHistory.filter(function (entry) { return entry.key !== color.key; });
    colorHistory.unshift(color);
    if (colorHistory.length > historyLimit) { colorHistory.length = historyLimit; }
    renderHistory();
  }

  function renderHistory() {
    historyList.replaceChildren();
    colorHistory.forEach(function (color, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'picker-history-swatch';
      button.setAttribute('aria-label', 'Select recent color ' + color.hex + ', alpha ' +
        Math.round(color.alpha * 100) + ' percent, from pixel ' + (color.x + 1) + ', ' + (color.y + 1));
      button.title = color.hex + ' · ' + color.rgba;
      button.dataset.historyIndex = String(index);
      var fill = document.createElement('span');
      fill.style.backgroundColor = color.rgba;
      button.appendChild(fill);
      button.addEventListener('click', function () {
        if (!imageBitmap || !colorHistory[index]) { return; }
        renderColor(colorHistory[index], false);
        setStatus('Selected recent color ' + color.hex + '.', 'success');
      });
      historyList.appendChild(button);
    });
    historyEmpty.hidden = colorHistory.length > 0;
    clearHistoryButton.disabled = colorHistory.length === 0;
  }

  async function fallbackCopy(text) {
    var textarea = document.createElement('textarea');
    var previousFocus = document.activeElement;
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.setAttribute('aria-hidden', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();
    var copied = false;
    try {
      copied = document.execCommand('copy');
    } finally {
      textarea.remove();
      if (previousFocus && typeof previousFocus.focus === 'function') { previousFocus.focus(); }
    }
    return copied;
  }

  async function copyValue(format) {
    if (!selectedColor || !valueElements[format]) {
      setStatus('Select a pixel before copying a color value.', 'error');
      return;
    }
    var text = valueElements[format].textContent;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function' && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else if (!await fallbackCopy(text)) {
        throw userError('Clipboard copying is not available here. Select the displayed value and copy it manually.');
      }
      setStatus(format.toUpperCase() + ' value copied: ' + text, 'success');
    } catch (error) {
      setStatus(error.userFacing
        ? error.message
        : 'Could not copy the value. Select it and copy it manually.', 'error');
    }
  }

  browseButton.addEventListener('click', function () {
    fileInput.value = '';
    fileInput.click();
  });
  replaceButton.addEventListener('click', function () {
    fileInput.value = '';
    fileInput.click();
  });
  resetButton.addEventListener('click', function () {
    clearImageState(true);
    setStatus('Choose or drop one image to begin.');
  });
  fileInput.addEventListener('change', function () {
    loadFile(fileInput.files && fileInput.files[0]);
  });
  ['dragenter', 'dragover'].forEach(function (name) {
    dropzone.addEventListener(name, function (event) {
      event.preventDefault();
      dropzone.classList.add('is-dragging');
    });
  });
  dropzone.addEventListener('dragleave', function (event) {
    if (!event.relatedTarget || !dropzone.contains(event.relatedTarget)) {
      dropzone.classList.remove('is-dragging');
    }
  });
  dropzone.addEventListener('drop', function (event) {
    event.preventDefault();
    dropzone.classList.remove('is-dragging');
    var files = event.dataTransfer && event.dataTransfer.files;
    if (!files || !files.length) {
      setStatus('No file was found. Choose a JPG, PNG, WebP, or GIF image.', 'error');
      return;
    }
    if (files.length !== 1) {
      setStatus('Please drop one image at a time.', 'error');
      return;
    }
    fileInput.value = '';
    loadFile(files[0]);
  });
  preview.addEventListener('click', function (event) {
    var point = pointFromEvent(event);
    if (!point) { return; }
    pointerPosition = point;
    samplePixel(point.x, point.y);
  });
  preview.addEventListener('keydown', function (event) {
    if (!imageBitmap) { return; }
    var dx = 0;
    var dy = 0;
    var step = event.shiftKey ? 10 : 1;
    if (event.key === 'ArrowLeft') { dx = -step; }
    else if (event.key === 'ArrowRight') { dx = step; }
    else if (event.key === 'ArrowUp') { dy = -step; }
    else if (event.key === 'ArrowDown') { dy = step; }
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      samplePixel(pointerPosition.x, pointerPosition.y);
      return;
    } else { return; }

    event.preventDefault();
    pointerPosition.x = Math.max(0, Math.min(imageBitmap.width - 1, pointerPosition.x + dx));
    pointerPosition.y = Math.max(0, Math.min(imageBitmap.height - 1, pointerPosition.y + dy));
    positionMarker(pointerPosition.x, pointerPosition.y);
    coordinates.textContent = 'Sampling point ' + (pointerPosition.x + 1) + ', ' +
      (pointerPosition.y + 1) + ' of ' + imageBitmap.width + ' × ' + imageBitmap.height +
      ' px. Press Enter or Space to select this pixel.';
  });
  document.querySelectorAll('[data-copy]').forEach(function (button) {
    button.addEventListener('click', function () { copyValue(button.dataset.copy); });
  });
  clearHistoryButton.addEventListener('click', function () {
    colorHistory = [];
    renderHistory();
    setStatus('Recent color history cleared.', 'success');
  });

  window.addEventListener('beforeunload', function () {
    closeBitmap();
    preview.width = 0;
    preview.height = 0;
    sampleCanvas.width = 0;
    sampleCanvas.height = 0;
  });
}());
