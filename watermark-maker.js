(function () {
  'use strict';

  var maxDimension = 16384;
  var maxPixels = 40000000;
  var maxFileBytes = 20 * 1024 * 1024;
  var previewMaxDimension = 1200;
  var allowedTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp'
  };
  var mimeExtensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  };
  var placementPoints = {
    'top-left': [0, 0],
    'top-center': [50, 0],
    'top-right': [100, 0],
    center: [50, 50],
    'bottom-left': [0, 100],
    'bottom-center': [50, 100],
    'bottom-right': [100, 100]
  };
  var sourceInput = document.getElementById('wm-source-file');
  var sourceDropzone = document.getElementById('wm-source-dropzone');
  var sourceBrowse = document.getElementById('wm-source-browse');
  var sourceReplace = document.getElementById('wm-source-replace');
  var sourcePanel = document.getElementById('wm-source-panel');
  var sourceDetails = document.getElementById('wm-source-details');
  var resetButton = document.getElementById('wm-reset');
  var status = document.getElementById('wm-status');
  var typeInput = document.getElementById('wm-type');
  var textControls = document.getElementById('wm-text-controls');
  var logoControls = document.getElementById('wm-logo-controls');
  var textInput = document.getElementById('wm-text');
  var fontInput = document.getElementById('wm-font');
  var fontSizeInput = document.getElementById('wm-font-size');
  var colorInput = document.getElementById('wm-color');
  var opacityInput = document.getElementById('wm-opacity');
  var opacityValue = document.getElementById('wm-opacity-value');
  var logoSizeInput = document.getElementById('wm-logo-size');
  var logoSizeValue = document.getElementById('wm-logo-size-value');
  var logoPaddingInput = document.getElementById('wm-logo-padding');
  var logoPaddingValue = document.getElementById('wm-logo-padding-value');
  var rotationInput = document.getElementById('wm-rotation');
  var rotationValue = document.getElementById('wm-rotation-value');
  var positionPresetInput = document.getElementById('wm-position-preset');
  var positionXInput = document.getElementById('wm-position-x');
  var positionYInput = document.getElementById('wm-position-y');
  var positionXValue = document.getElementById('wm-position-x-value');
  var positionYValue = document.getElementById('wm-position-y-value');
  var logoInput = document.getElementById('wm-logo-file');
  var logoDropzone = document.getElementById('wm-logo-dropzone');
  var logoBrowse = document.getElementById('wm-logo-browse');
  var logoReplace = document.getElementById('wm-logo-replace');
  var logoRemove = document.getElementById('wm-logo-remove');
  var logoPanel = document.getElementById('wm-logo-panel');
  var logoDetails = document.getElementById('wm-logo-details');
  var logoEmpty = document.getElementById('wm-logo-empty');
  var formatInput = document.getElementById('wm-format');
  var formatHelp = document.getElementById('wm-format-help');
  var preview = document.getElementById('wm-preview');
  var previewPlaceholder = document.getElementById('wm-preview-placeholder');
  var previewDetails = document.getElementById('wm-preview-details');
  var createButton = document.getElementById('wm-create');
  var downloadButton = document.getElementById('wm-download');
  var outputDetails = document.getElementById('wm-output-details');

  var sourceImage = null;
  var sourceUrl = null;
  var sourceFile = null;
  var logoImage = null;
  var logoUrl = null;
  var logoFile = null;
  var outputUrl = null;
  var outputBlob = null;
  var loadVersion = 0;
  var logoLoadVersion = 0;
  var renderVersion = 0;
  var previewTimer = null;
  var currentSourceMime = null;

  function setStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state || 'info';
  }

  function formatBytes(bytes) {
    if (bytes < 1024) { return bytes + ' B'; }
    if (bytes < 1024 * 1024) { return (bytes / 1024).toFixed(1) + ' KB'; }
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function clearOutput() {
    renderVersion += 1;
    outputBlob = null;
    downloadButton.disabled = true;
    outputDetails.textContent = 'Verified output dimensions and file size will appear here.';
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      outputUrl = null;
    }
  }

  function releaseSource() {
    if (sourceImage) {
      sourceImage.removeAttribute('src');
      sourceImage = null;
    }
    if (sourceUrl) {
      URL.revokeObjectURL(sourceUrl);
      sourceUrl = null;
    }
    sourceFile = null;
    currentSourceMime = null;
  }

  function releaseLogo() {
    if (logoImage) {
      logoImage.removeAttribute('src');
      logoImage = null;
    }
    if (logoUrl) {
      URL.revokeObjectURL(logoUrl);
      logoUrl = null;
    }
    logoFile = null;
    logoInput.value = '';
    logoPanel.hidden = true;
    logoDetails.textContent = 'No logo selected';
    logoEmpty.hidden = typeInput.value !== 'logo';
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
    return null;
  }

  async function validateFile(file) {
    if (!file || !file.size) {
      throw new Error('The selected file is empty. Choose a non-empty image.');
    }
    if (file.size > maxFileBytes) {
      throw new Error('This file is larger than the 20 MB limit.');
    }
    var extension = file.name.split('.').pop().toLowerCase();
    var expectedMime = allowedTypes[extension];
    var declaredMime = file.type.toLowerCase();
    if (declaredMime === 'image/jpg') { declaredMime = 'image/jpeg'; }
    if (!expectedMime) { throw new Error('Unsupported file. Choose a JPG, PNG, or WebP image.'); }
    if (declaredMime && declaredMime !== 'application/octet-stream' && declaredMime !== expectedMime) {
      throw new Error('The file extension does not match its image type.');
    }
    var signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (signatureMime(signature) !== expectedMime) {
      throw new Error('The file contents do not match the selected JPG, PNG, or WebP type.');
    }
    return expectedMime;
  }

  function loadImage(image, url) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      function finish(error) {
        if (settled) { return; }
        settled = true;
        image.removeEventListener('load', onLoad);
        image.removeEventListener('error', onError);
        if (error) { reject(error); }
        else { resolve(); }
      }
      function onLoad() {
        if (!image.naturalWidth || !image.naturalHeight) {
          finish(new Error('The browser could not decode this image.'));
          return;
        }
        finish();
      }
      function onError() { finish(new Error('The browser could not decode this image.')); }
      image.addEventListener('load', onLoad);
      image.addEventListener('error', onError);
      image.src = url;
      if (image.complete) {
        if (image.naturalWidth && image.naturalHeight) { onLoad(); }
        else { onError(); }
      }
    });
  }

  function validImageDimensions(image) {
    return image.naturalWidth <= maxDimension && image.naturalHeight <= maxDimension &&
      image.naturalWidth * image.naturalHeight <= maxPixels;
  }

  function clearPreview(message) {
    preview.width = 1;
    preview.height = 1;
    preview.hidden = true;
    previewPlaceholder.hidden = false;
    previewDetails.textContent = message;
  }

  function activeWatermarkAvailable() {
    if (typeInput.value === 'logo') { return Boolean(logoImage); }
    var fontSize = Number(fontSizeInput.value);
    return Boolean(textInput.value.trim()) && Number.isInteger(fontSize) &&
      fontSize >= Number(fontSizeInput.min) && fontSize <= Number(fontSizeInput.max);
  }

  function syncControls() {
    var isText = typeInput.value === 'text';
    textControls.hidden = !isText;
    logoControls.hidden = isText;
    document.getElementById('wm-text-size-field').hidden = !isText;
    document.getElementById('wm-logo-size-field').hidden = isText;
    document.getElementById('wm-logo-padding-field').hidden = isText;
    logoEmpty.hidden = isText || Boolean(logoImage);
    opacityValue.value = opacityInput.value + '%';
    opacityValue.textContent = opacityInput.value + '%';
    logoSizeValue.value = logoSizeInput.value + '%';
    logoSizeValue.textContent = logoSizeInput.value + '%';
    logoPaddingValue.value = logoPaddingInput.value + '%';
    logoPaddingValue.textContent = logoPaddingInput.value + '%';
    rotationValue.value = rotationInput.value + '°';
    rotationValue.textContent = rotationInput.value + '°';
    positionXValue.value = positionXInput.value + '%';
    positionXValue.textContent = positionXInput.value + '%';
    positionYValue.value = positionYInput.value + '%';
    positionYValue.textContent = positionYInput.value + '%';
    formatHelp.textContent = formatInput.value === 'image/jpeg'
      ? 'JPEG does not preserve transparency; transparent areas become white.'
      : 'PNG and WebP can preserve transparent areas in the source image.';
    var selectedFormat = formatInput.options[formatInput.selectedIndex];
    createButton.disabled = !sourceImage || !activeWatermarkAvailable() ||
      !selectedFormat || selectedFormat.disabled;
  }

  function wrapText(context, text, maxWidth) {
    var words = text.replace(/\r/g, '').split(/\s+/);
    var lines = [];
    var line = '';
    words.forEach(function (word) {
      if (!word) { return; }
      var candidate = line ? line + ' ' + word : word;
      if (context.measureText(candidate).width <= maxWidth) {
        line = candidate;
      } else if (!line) {
        var fragment = '';
        Array.from(word).forEach(function (character) {
          var next = fragment + character;
          if (fragment && context.measureText(next).width > maxWidth) {
            lines.push(fragment);
            fragment = character;
          } else {
            fragment = next;
          }
        });
        line = fragment;
      } else {
        lines.push(line);
        line = word;
      }
    });
    if (line) { lines.push(line); }
    return lines.length ? lines : [''];
  }

  function getRotatedExtents(width, height, angle) {
    var radians = angle * Math.PI / 180;
    var cosine = Math.abs(Math.cos(radians));
    var sine = Math.abs(Math.sin(radians));
    return {
      width: width * cosine + height * sine,
      height: height * cosine + width * sine
    };
  }

  function getPlacementCenter(width, height, extents, padding) {
    var margin = padding === undefined ? Math.min(width, height) * 0.025 : padding;
    var left = Math.min(width / 2, extents.width / 2 + margin);
    var top = Math.min(height / 2, extents.height / 2 + margin);
    var xRange = Math.max(0, width - (left * 2));
    var yRange = Math.max(0, height - (top * 2));
    return {
      x: left + xRange * Number(positionXInput.value) / 100,
      y: top + yRange * Number(positionYInput.value) / 100
    };
  }

  function drawTextWatermark(context, width, height) {
    var fontSize = Number(fontSizeInput.value);
    context.font = fontSize + 'px ' + fontInput.value;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    var lines = wrapText(context, textInput.value.trim(), Math.max(1, width * 0.84));
    var lineHeight = fontSize * 1.2;
    var measuredWidth = lines.reduce(function (largest, line) {
      return Math.max(largest, context.measureText(line).width);
    }, 0);
    var textHeight = lines.length * lineHeight;
    var angle = Number(rotationInput.value);
    var extents = getRotatedExtents(measuredWidth, textHeight, angle);
    var textScale = Math.min(1, width * 0.9 / Math.max(1, extents.width),
      height * 0.9 / Math.max(1, extents.height));
    var center = getPlacementCenter(width, height, {
      width: extents.width * textScale,
      height: extents.height * textScale
    });
    context.save();
    context.globalAlpha = Number(opacityInput.value) / 100;
    context.fillStyle = colorInput.value;
    context.translate(center.x, center.y);
    context.rotate(angle * Math.PI / 180);
    context.scale(textScale, textScale);
    lines.forEach(function (line, index) {
      context.fillText(line, 0, (index - (lines.length - 1) / 2) * lineHeight);
    });
    context.restore();
  }

  function drawLogoWatermark(context, width, height) {
    var maxSide = Math.min(width, height) * Number(logoSizeInput.value) / 100;
    var scale = Math.min(maxSide / logoImage.naturalWidth, maxSide / logoImage.naturalHeight);
    var logoWidth = logoImage.naturalWidth * scale;
    var logoHeight = logoImage.naturalHeight * scale;
    var angle = Number(rotationInput.value);
    var extents = getRotatedExtents(logoWidth, logoHeight, angle);
    var center = getPlacementCenter(width, height, extents,
      Math.min(width, height) * Number(logoPaddingInput.value) / 100);
    context.save();
    context.globalAlpha = Number(opacityInput.value) / 100;
    context.translate(center.x, center.y);
    context.rotate(angle * Math.PI / 180);
    context.drawImage(logoImage, -logoWidth / 2, -logoHeight / 2, logoWidth, logoHeight);
    context.restore();
  }

  function drawComposite(context, width, height, outputMime) {
    context.clearRect(0, 0, width, height);
    if (outputMime === 'image/jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(sourceImage, 0, 0, width, height);
    if (typeInput.value === 'text') {
      drawTextWatermark(context, width, height);
    } else {
      drawLogoWatermark(context, width, height);
    }
  }

  function schedulePreview() {
    if (previewTimer !== null) { window.clearTimeout(previewTimer); }
    if (!sourceImage || !activeWatermarkAvailable()) {
      if (sourceImage) { clearPreview(typeInput.value === 'text'
        ? 'Enter watermark text to see the preview.'
        : 'Choose a logo image to see the preview.'); }
      return;
    }
    previewTimer = window.setTimeout(function () {
      previewTimer = null;
      drawPreview();
    }, 70);
  }

  function drawPreview() {
    if (!sourceImage || !activeWatermarkAvailable()) { return; }
    var sourceWidth = sourceImage.naturalWidth;
    var sourceHeight = sourceImage.naturalHeight;
    var scale = Math.min(1, previewMaxDimension / sourceWidth, previewMaxDimension / sourceHeight);
    var width = Math.max(1, Math.round(sourceWidth * scale));
    var height = Math.max(1, Math.round(sourceHeight * scale));
    try {
      preview.width = width;
      preview.height = height;
      var context = preview.getContext('2d');
      if (!context) { throw new Error('Preview is unavailable in this browser.'); }
      context.save();
      context.scale(width / sourceWidth, height / sourceHeight);
      drawComposite(context, sourceWidth, sourceHeight, formatInput.value);
      context.restore();
      preview.hidden = false;
      previewPlaceholder.hidden = true;
      previewDetails.textContent = width + ' × ' + height + ' px preview · Source: ' +
        sourceWidth + ' × ' + sourceHeight + ' px';
    } catch (error) {
      clearPreview('The preview could not be rendered. Try another image or setting.');
      setStatus(error.message || 'Could not render the preview in this browser.', 'error');
    }
  }

  function supportsOutput(mime) {
    var canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    try {
      return canvas.toDataURL(mime).indexOf('data:' + mime) === 0;
    } catch (error) {
      return false;
    }
  }

  function initializeFormats(preferredMime) {
    var firstSupported = null;
    var preferredSupported = null;
    Array.from(formatInput.options).forEach(function (option) {
      var supported = supportsOutput(option.value);
      option.disabled = !supported;
      if (!supported && !option.text.includes('(not supported)')) {
        option.text += ' (not supported)';
      }
      if (supported && firstSupported === null) { firstSupported = option.value; }
      if (supported && option.value === preferredMime) { preferredSupported = option.value; }
    });
    if (!firstSupported) { throw new Error('This browser cannot export images from Canvas.'); }
    formatInput.value = preferredSupported || firstSupported;
  }

  async function loadSource(file) {
    var version = ++loadVersion;
    clearOutput();
    releaseSource();
    clearPreview(file ? 'Loading and checking the selected image…' : 'Your watermarked preview will appear here.');
    sourcePanel.hidden = Boolean(!file);
    syncControls();
    if (!file) {
      sourceInput.value = '';
      sourceDetails.textContent = 'No image selected';
      clearPreview('Your watermarked preview will appear here.');
      syncControls();
      setStatus('Choose an image to begin.');
      return;
    }
    sourceFile = file;
    sourcePanel.hidden = false;
    sourceDetails.textContent = file.name + ' · ' + formatBytes(file.size) + ' · Checking image…';
    setStatus('Checking selected image…');
    var mime;
    try {
      mime = await validateFile(file);
    } catch (error) {
      if (version !== loadVersion) { return; }
      sourceFile = null;
      sourceDetails.textContent = file.name + ' · Could not load image';
      clearPreview('Choose a valid image to preview a watermark.');
      syncControls();
      setStatus(error.message, 'error');
      return;
    }
    if (version !== loadVersion) { return; }
    var url;
    try {
      url = URL.createObjectURL(file);
    } catch (error) {
      sourceFile = null;
      sourceDetails.textContent = file.name + ' · Could not open image';
      syncControls();
      setStatus('The browser could not allocate memory for this image.', 'error');
      return;
    }
    var image = new Image();
    try {
      await loadImage(image, url);
    } catch (error) {
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
      if (version === loadVersion) {
        sourceFile = null;
        sourceDetails.textContent = file.name + ' · Could not decode image';
        setStatus('Could not decode this image. It may be damaged or use an unsupported encoding.', 'error');
      }
      return;
    }
    if (version !== loadVersion) {
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
      return;
    }
    if (!validImageDimensions(image)) {
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
      sourceFile = null;
      sourceDetails.textContent = file.name + ' · Image exceeds size limits';
      clearPreview('Choose an image within the processing limits.');
      syncControls();
      setStatus('This image exceeds the safe limit of 16,384 px per side or 40 megapixels.', 'error');
      return;
    }
    sourceImage = image;
    sourceUrl = url;
    sourceFile = file;
    currentSourceMime = mime;
    sourceDetails.textContent = file.name + ' · ' + image.naturalWidth + ' × ' +
      image.naturalHeight + ' px · ' + formatBytes(file.size);
    fontSizeInput.max = String(Math.max(8, Math.min(512, Math.floor(Math.min(image.naturalWidth, image.naturalHeight) / 2))));
    if (Number(fontSizeInput.value) > Number(fontSizeInput.max)) {
      fontSizeInput.value = fontSizeInput.max;
    }
    try {
      initializeFormats(mime);
    } catch (error) {
      releaseSource();
      sourceDetails.textContent = file.name + ' · Image export is unavailable';
      syncControls();
      setStatus(error.message || 'This browser cannot export images from Canvas.', 'error');
      return;
    }
    syncControls();
    drawPreview();
    setStatus('Image ready. Choose text or a logo watermark and adjust its appearance.', 'success');
  }

  async function loadLogo(file) {
    var version = ++logoLoadVersion;
    clearOutput();
    if (logoImage) { logoImage.removeAttribute('src'); }
    if (logoUrl) {
      URL.revokeObjectURL(logoUrl);
      logoUrl = null;
    }
    logoImage = null;
    logoFile = null;
    logoPanel.hidden = false;
    logoEmpty.hidden = true;
    syncControls();
    if (typeInput.value === 'logo') {
      clearPreview(file ? 'Loading and checking the selected logo…' : 'Choose a logo image to see the preview.');
    }
    if (!file) {
      logoInput.value = '';
      logoPanel.hidden = true;
      logoEmpty.hidden = typeInput.value !== 'logo';
      syncControls();
      schedulePreview();
      return;
    }
    logoFile = file;
    logoDetails.textContent = file.name + ' · ' + formatBytes(file.size) + ' · Checking logo…';
    setStatus('Checking logo image…');
    try {
      await validateFile(file);
    } catch (error) {
      if (version !== logoLoadVersion) { return; }
      logoFile = null;
      logoDetails.textContent = file.name + ' · Could not load logo';
      syncControls();
      if (typeInput.value === 'logo') { clearPreview('Choose a valid logo image to see the preview.'); }
      schedulePreview();
      setStatus(error.message, 'error');
      return;
    }
    if (version !== logoLoadVersion) { return; }
    var url;
    try {
      url = URL.createObjectURL(file);
    } catch (error) {
      logoFile = null;
      logoDetails.textContent = file.name + ' · Could not open logo';
      syncControls();
      if (typeInput.value === 'logo') { clearPreview('The logo could not be opened. Choose another logo.'); }
      setStatus('The browser could not allocate memory for this logo.', 'error');
      return;
    }
    var image = new Image();
    try {
      await loadImage(image, url);
    } catch (error) {
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
      if (version === logoLoadVersion) {
        logoFile = null;
        logoDetails.textContent = file.name + ' · Could not decode logo';
        syncControls();
        if (typeInput.value === 'logo') { clearPreview('The logo could not be decoded. Choose another logo.'); }
        setStatus('Could not decode this logo. It may be damaged or use an unsupported encoding.', 'error');
      }
      return;
    }
    if (version !== logoLoadVersion) {
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
      return;
    }
    if (!validImageDimensions(image)) {
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
      logoFile = null;
      logoDetails.textContent = file.name + ' · Logo exceeds size limits';
      syncControls();
      if (typeInput.value === 'logo') { clearPreview('Choose a logo image within the processing limits.'); }
      setStatus('This logo exceeds the safe limit of 16,384 px per side or 40 megapixels.', 'error');
      return;
    }
    logoImage = image;
    logoUrl = url;
    logoFile = file;
    logoDetails.textContent = file.name + ' · ' + image.naturalWidth + ' × ' +
      image.naturalHeight + ' px · ' + formatBytes(file.size);
    syncControls();
    schedulePreview();
    setStatus('Logo ready. Adjust its size, opacity, rotation, and position.', 'success');
  }

  function clearLogo() {
    logoLoadVersion += 1;
    if (logoImage) {
      logoImage.removeAttribute('src');
      logoImage = null;
    }
    if (logoUrl) {
      URL.revokeObjectURL(logoUrl);
      logoUrl = null;
    }
    logoFile = null;
    logoInput.value = '';
    logoPanel.hidden = true;
    logoDetails.textContent = 'No logo selected';
    logoEmpty.hidden = typeInput.value !== 'logo';
    clearOutput();
    syncControls();
    schedulePreview();
    if (typeInput.value === 'logo') { setStatus('Choose a logo image before creating an output.', 'info'); }
  }

  function resetTool() {
    if (previewTimer !== null) {
      window.clearTimeout(previewTimer);
      previewTimer = null;
    }
    loadVersion += 1;
    logoLoadVersion += 1;
    clearOutput();
    releaseSource();
    if (logoImage) {
      logoImage.removeAttribute('src');
      logoImage = null;
    }
    if (logoUrl) {
      URL.revokeObjectURL(logoUrl);
      logoUrl = null;
    }
    logoFile = null;
    sourceInput.value = '';
    logoInput.value = '';
    sourcePanel.hidden = true;
    sourceDetails.textContent = 'No image selected';
    logoPanel.hidden = true;
    logoDetails.textContent = 'No logo selected';
    typeInput.value = 'text';
    textInput.value = 'Your text';
    fontInput.value = 'Arial, sans-serif';
    fontSizeInput.value = '48';
    fontSizeInput.max = '512';
    colorInput.value = '#ffffff';
    opacityInput.value = '65';
    logoSizeInput.value = '16';
    logoPaddingInput.value = '4';
    rotationInput.value = '0';
    positionPresetInput.value = 'bottom-right';
    positionXInput.value = '100';
    positionYInput.value = '100';
    formatInput.value = 'image/png';
    try {
      initializeFormats('image/png');
    } catch (error) {
      setStatus(error.message || 'This browser cannot export images from Canvas.', 'error');
    }
    clearPreview('Your watermarked preview will appear here.');
    syncControls();
    setStatus('Choose an image to begin.');
  }

  function renderOutput() {
    if (!sourceImage || !sourceFile) {
      setStatus('Choose a source image before creating or downloading a watermark.', 'error');
      return;
    }
    if (!activeWatermarkAvailable()) {
      setStatus(typeInput.value === 'text'
        ? 'Enter watermark text before creating an output.'
        : 'Choose a logo image before creating an output.', 'error');
      return;
    }
    var mime = formatInput.value;
    if (!mimeExtensions[mime] || formatInput.options[formatInput.selectedIndex].disabled) {
      setStatus('The selected output format is not supported by this browser.', 'error');
      return;
    }
    clearOutput();
    var version = ++renderVersion;
    var width = sourceImage.naturalWidth;
    var height = sourceImage.naturalHeight;
    createButton.disabled = true;
    setStatus('Creating and verifying the watermarked image…');
    var canvas = document.createElement('canvas');
    try {
      canvas.width = width;
      canvas.height = height;
      var context = canvas.getContext('2d');
      if (!context) { throw new Error('Canvas output is unavailable in this browser.'); }
      drawComposite(context, width, height, mime);
    } catch (error) {
      canvas.width = 0;
      canvas.height = 0;
      syncControls();
      setStatus(error.message || 'Could not render the watermarked image.', 'error');
      return;
    }
    new Promise(function (resolve) {
      try {
        canvas.toBlob(resolve, mime, mime === 'image/png' ? undefined : 0.92);
      } catch (error) {
        resolve(null);
      }
    }).then(async function (blob) {
      canvas.width = 0;
      canvas.height = 0;
      if (version !== renderVersion) { return; }
      if (!blob || !blob.size) {
        syncControls();
        setStatus('The browser could not encode the watermarked image. Try another output format.', 'error');
        return;
      }
      if (blob.type.toLowerCase() !== mime) {
        syncControls();
        setStatus('The browser returned an unexpected image format; download is unavailable.', 'error');
        return;
      }
      var verifiedUrl;
      try {
        verifiedUrl = URL.createObjectURL(blob);
      } catch (error) {
        syncControls();
        setStatus('The browser could not allocate memory for the watermarked image.', 'error');
        return;
      }
      var image = new Image();
      try {
        await loadImage(image, verifiedUrl);
      } catch (error) {
        image.removeAttribute('src');
        URL.revokeObjectURL(verifiedUrl);
        if (version === renderVersion) {
          syncControls();
          setStatus('The watermarked image could not be decoded and cannot be downloaded.', 'error');
        }
        return;
      }
      var validOutput = image.naturalWidth === width && image.naturalHeight === height;
      image.removeAttribute('src');
      if (version !== renderVersion || !validOutput) {
        URL.revokeObjectURL(verifiedUrl);
        if (version === renderVersion) {
          syncControls();
          setStatus('The output dimensions did not match the source image; download is unavailable.', 'error');
        }
        return;
      }
      outputBlob = blob;
      outputUrl = verifiedUrl;
      outputDetails.textContent = width + ' × ' + height + ' px · ' + formatBytes(blob.size) +
        ' · ' + mimeExtensions[mime].toUpperCase() + ' · Verified';
      downloadButton.disabled = false;
      syncControls();
      setStatus('Watermarked image verified and ready to download.', 'success');
    }).catch(function () {
      canvas.width = 0;
      canvas.height = 0;
      if (version === renderVersion) {
        syncControls();
        setStatus('The browser could not finish creating this image. Try again with a smaller source image.', 'error');
      }
    });
  }

  function downloadOutput() {
    if (!outputBlob || !outputUrl || !sourceFile) {
      setStatus('Create a verified watermarked image before downloading.', 'error');
      return;
    }
    var extension = mimeExtensions[outputBlob.type.toLowerCase()];
    if (!extension) {
      setStatus('Cannot download because the browser returned an unsupported image format.', 'error');
      return;
    }
    var baseName = sourceFile.name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
    var anchor = document.createElement('a');
    anchor.href = outputUrl;
    anchor.download = (baseName || 'image') + '-watermarked.' + extension;
    try {
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setStatus('Download started for the verified watermarked image.', 'success');
    } catch (error) {
      anchor.remove();
      setStatus('The browser could not start the download. Try again or create the image again.', 'error');
    }
  }

  function setPositionPreset() {
    var point = placementPoints[positionPresetInput.value];
    if (!point) { return; }
    positionXInput.value = String(point[0]);
    positionYInput.value = String(point[1]);
    syncControls();
    clearOutput();
    schedulePreview();
    if (sourceImage && activeWatermarkAvailable()) {
      setStatus('Watermark position updated. Review the preview and create a new output.', 'info');
    }
  }

  function markCustomPosition() {
    positionPresetInput.value = 'custom';
    syncControls();
    clearOutput();
    schedulePreview();
    if (sourceImage && activeWatermarkAvailable()) {
      setStatus('Watermark position updated. Review the preview and create a new output.', 'info');
    }
  }

  sourceBrowse.addEventListener('click', function () {
    sourceInput.value = '';
    sourceInput.click();
  });
  sourceReplace.addEventListener('click', function () {
    sourceInput.value = '';
    sourceInput.click();
  });
  sourceInput.addEventListener('change', function () {
    loadSource(sourceInput.files && sourceInput.files[0]);
  });
  resetButton.addEventListener('click', resetTool);
  ['dragenter', 'dragover'].forEach(function (name) {
    sourceDropzone.addEventListener(name, function (event) {
      event.preventDefault();
      sourceDropzone.classList.add('is-dragging');
    });
  });
  sourceDropzone.addEventListener('dragleave', function (event) {
    if (!event.relatedTarget || !sourceDropzone.contains(event.relatedTarget)) {
      sourceDropzone.classList.remove('is-dragging');
    }
  });
  sourceDropzone.addEventListener('drop', function (event) {
    event.preventDefault();
    sourceDropzone.classList.remove('is-dragging');
    var files = event.dataTransfer && event.dataTransfer.files;
    if (!files || !files.length) {
      setStatus('No file was found. Choose a JPG, PNG, or WebP image.', 'error');
      return;
    }
    if (files.length !== 1) {
      setStatus('Please drop one source image at a time.', 'error');
      return;
    }
    sourceInput.value = '';
    loadSource(files[0]);
  });

  logoBrowse.addEventListener('click', function () {
    logoInput.value = '';
    logoInput.click();
  });
  logoReplace.addEventListener('click', function () {
    logoInput.value = '';
    logoInput.click();
  });
  logoRemove.addEventListener('click', clearLogo);
  logoInput.addEventListener('change', function () {
    loadLogo(logoInput.files && logoInput.files[0]);
  });
  ['dragenter', 'dragover'].forEach(function (name) {
    logoDropzone.addEventListener(name, function (event) {
      event.preventDefault();
      logoDropzone.classList.add('is-dragging');
    });
  });
  logoDropzone.addEventListener('dragleave', function (event) {
    if (!event.relatedTarget || !logoDropzone.contains(event.relatedTarget)) {
      logoDropzone.classList.remove('is-dragging');
    }
  });
  logoDropzone.addEventListener('drop', function (event) {
    event.preventDefault();
    logoDropzone.classList.remove('is-dragging');
    var files = event.dataTransfer && event.dataTransfer.files;
    if (!files || !files.length) {
      setStatus('No file was found. Choose a JPG, PNG, or WebP logo image.', 'error');
      return;
    }
    if (files.length !== 1) {
      setStatus('Please drop one logo image at a time.', 'error');
      return;
    }
    logoInput.value = '';
    loadLogo(files[0]);
  });

  typeInput.addEventListener('change', function () {
    clearOutput();
    syncControls();
    schedulePreview();
    if (!activeWatermarkAvailable()) {
      setStatus(typeInput.value === 'text'
        ? 'Enter watermark text to continue.'
        : 'Choose a logo image to continue.');
    } else if (sourceImage) {
      setStatus('Watermark type changed. Review the preview and create a new output.', 'info');
    }
  });
  [textInput, fontInput, fontSizeInput, colorInput, opacityInput, logoSizeInput,
    logoPaddingInput, rotationInput, formatInput]
    .forEach(function (input) {
      input.addEventListener('input', function () {
        clearOutput();
        syncControls();
        schedulePreview();
        if (input === fontSizeInput && !activeWatermarkAvailable()) {
          fontSizeInput.setAttribute('aria-invalid', 'true');
          setStatus('Font size must be a whole number from 8 to ' + fontSizeInput.max + ' px.', 'error');
        } else {
          fontSizeInput.removeAttribute('aria-invalid');
          if (input === textInput && !activeWatermarkAvailable()) {
            setStatus('Enter watermark text before creating an output.', 'error');
          }
        }
        if (sourceImage && activeWatermarkAvailable()) {
          setStatus('Watermark settings updated. Create a new output to download it.', 'info');
        }
      });
      input.addEventListener('change', function () {
        clearOutput();
        syncControls();
        schedulePreview();
      });
    });
  positionPresetInput.addEventListener('change', setPositionPreset);
  positionXInput.addEventListener('input', markCustomPosition);
  positionYInput.addEventListener('input', markCustomPosition);
  createButton.addEventListener('click', renderOutput);
  downloadButton.addEventListener('click', downloadOutput);
  window.addEventListener('beforeunload', function () {
    if (previewTimer !== null) { window.clearTimeout(previewTimer); }
    releaseSource();
    if (logoImage) { logoImage.removeAttribute('src'); }
    if (logoUrl) { URL.revokeObjectURL(logoUrl); }
    if (outputUrl) { URL.revokeObjectURL(outputUrl); }
  });

  try {
    initializeFormats('image/png');
  } catch (error) {
    setStatus(error.message || 'This browser cannot export images from Canvas.', 'error');
  }
  syncControls();
}());
