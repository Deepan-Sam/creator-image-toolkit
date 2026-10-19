// Social media output sizes are editable practical starting points, not guarantees.
// Last checked: 2026-10-18. Official references are linked in the page source note.
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

  // The sizes below are editable output starting points. YouTube thumbnail size is
  // documented by YouTube Help; other placements use common canvas ratios and
  // remain explicitly subject to each platform's current placement requirements.
  var presets = {
    instagram: [
      { id: 'square-post', label: 'Square feed post · 1:1', width: 1080, height: 1080 },
      { id: 'portrait-post', label: 'Portrait feed post · 4:5', width: 1080, height: 1350 },
      { id: 'landscape-post', label: 'Landscape feed post · 1.91:1', width: 1080, height: 566 },
      { id: 'story-reel', label: 'Story or Reel · 9:16', width: 1080, height: 1920 },
      { id: 'profile', label: 'Profile image · square', width: 800, height: 800 }
    ],
    facebook: [
      { id: 'square-post', label: 'Square post · 1:1', width: 1200, height: 1200 },
      { id: 'landscape-post', label: 'Landscape post · 1.91:1', width: 1200, height: 630 },
      { id: 'story', label: 'Story · 9:16', width: 1080, height: 1920 },
      { id: 'cover', label: 'Page cover · wide', width: 1640, height: 624 },
      { id: 'profile', label: 'Profile image · square', width: 800, height: 800 }
    ],
    youtube: [
      { id: 'thumbnail', label: 'Video thumbnail · 16:9 (YouTube recommendation)', width: 3840, height: 2160 },
      { id: 'channel-banner', label: 'Channel banner · wide', width: 2560, height: 1440 },
      { id: 'community-square', label: 'Square community image · 1:1', width: 1080, height: 1080 },
      { id: 'community-portrait', label: 'Portrait community image · 4:5', width: 1080, height: 1350 }
    ],
    tiktok: [
      { id: 'vertical-post', label: 'Vertical post · 9:16', width: 1080, height: 1920 },
      { id: 'square-photo', label: 'Square photo · 1:1', width: 1080, height: 1080 },
      { id: 'portrait-photo', label: 'Portrait photo · 3:4', width: 1080, height: 1440 },
      { id: 'profile', label: 'Profile image · square', width: 200, height: 200 }
    ],
    linkedin: [
      { id: 'landscape-post', label: 'Landscape feed image · 1.91:1', width: 1200, height: 627 },
      { id: 'square-post', label: 'Square feed image · 1:1', width: 1200, height: 1200 },
      { id: 'portrait-post', label: 'Portrait feed image · 4:5', width: 1200, height: 1500 },
      { id: 'company-cover', label: 'LinkedIn Page cover · wide', width: 1512, height: 256 },
      { id: 'profile-cover', label: 'Personal profile cover · wide', width: 1584, height: 396 },
      { id: 'profile', label: 'Profile image · square', width: 800, height: 800 }
    ],
    x: [
      { id: 'landscape-post', label: 'Landscape post · 16:9', width: 1200, height: 675 },
      { id: 'square-post', label: 'Square post · 1:1', width: 1200, height: 1200 },
      { id: 'portrait-post', label: 'Portrait post · 4:5', width: 1200, height: 1500 },
      { id: 'header', label: 'Profile header · wide', width: 1500, height: 500 },
      { id: 'profile', label: 'Profile image · square', width: 400, height: 400 }
    ]
  };

  var fileInput = document.getElementById('social-file');
  var dropzone = document.getElementById('social-dropzone');
  var browseButton = document.getElementById('social-browse');
  var replaceButton = document.getElementById('social-replace');
  var resetButton = document.getElementById('social-reset');
  var filePanel = document.getElementById('social-file-panel');
  var fileDetails = document.getElementById('social-file-details');
  var status = document.getElementById('social-status');
  var presetStatus = document.getElementById('social-preset-status');
  var platformInput = document.getElementById('social-platform');
  var presetInput = document.getElementById('social-preset');
  var widthInput = document.getElementById('social-width');
  var heightInput = document.getElementById('social-height');
  var ratioLock = document.getElementById('social-ratio-lock');
  var fitModeInput = document.getElementById('social-fit-mode');
  var fitHelp = document.getElementById('social-fit-help');
  var positionControls = document.getElementById('social-position-controls');
  var positionXInput = document.getElementById('social-position-x');
  var positionYInput = document.getElementById('social-position-y');
  var positionXValue = document.getElementById('social-position-x-value');
  var positionYValue = document.getElementById('social-position-y-value');
  var backgroundField = document.querySelector('.social-background-field');
  var backgroundInput = document.getElementById('social-background');
  var formatInput = document.getElementById('social-format');
  var preview = document.getElementById('social-preview');
  var previewContext = preview.getContext('2d');
  var previewPlaceholder = document.getElementById('social-preview-placeholder');
  var previewDetails = document.getElementById('social-preview-details');
  var presetMatch = document.getElementById('social-preset-match');
  var validationBadge = document.getElementById('social-validation-badge');
  var createButton = document.getElementById('social-create');
  var downloadButton = document.getElementById('social-download');
  var outputDetails = document.getElementById('social-output-details');

  var sourceImage = null;
  var sourceUrl = null;
  var selectedFile = null;
  var outputUrl = null;
  var outputBlob = null;
  var renderVersion = 0;
  var loadVersion = 0;
  var previewTimer = null;
  var locked = true;
  var ratio = 1;
  var currentPreset = presets[platformInput.value][0];

  function setStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state || 'info';
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

  function clearSource() {
    if (sourceImage) {
      sourceImage.removeAttribute('src');
      sourceImage = null;
    }
    if (sourceUrl) {
      URL.revokeObjectURL(sourceUrl);
      sourceUrl = null;
    }
  }

  function clearImage() {
    loadVersion += 1;
    if (previewTimer !== null) {
      window.clearTimeout(previewTimer);
      previewTimer = null;
    }
    clearOutput();
    clearSource();
    selectedFile = null;
    fileInput.value = '';
    filePanel.hidden = true;
    fileDetails.textContent = 'No image selected';
    platformInput.value = 'instagram';
    fitModeInput.value = 'fit';
    backgroundInput.value = 'white';
    formatInput.value = 'image/jpeg';
    locked = true;
    ratioLock.setAttribute('aria-pressed', 'true');
    ratioLock.setAttribute('aria-label', 'Unlock aspect ratio');
    ratioLock.textContent = 'Ratio locked';
    setPresetOptions('instagram', presets.instagram[0].id);
    positionControls.hidden = true;
    positionXInput.value = '50';
    positionYInput.value = '50';
    positionXValue.value = '50%';
    positionYValue.value = '50%';
    try {
      initializeFormats('image/jpeg');
    } catch (error) {
      setStatus(error.message || 'This browser cannot export images from Canvas.', 'error');
    }
    preview.width = 320;
    preview.height = 180;
    preview.hidden = true;
    previewPlaceholder.hidden = false;
    previewDetails.textContent = 'Choose an image to preview the selected size.';
    createButton.disabled = true;
    widthInput.value = String(currentPreset.width);
    heightInput.value = String(currentPreset.height);
    widthInput.removeAttribute('aria-invalid');
    heightInput.removeAttribute('aria-invalid');
    ratio = currentPreset.width / currentPreset.height;
    positionXInput.value = '50';
    positionYInput.value = '50';
    positionXValue.value = '50%';
    positionYValue.value = '50%';
    syncControls();
    updatePresetMatch();
    setStatus('Choose or drop one image to begin.');
  }

  function mimeFromSignature(bytes) {
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
    if (!file || !file.size) { throw new Error('The selected file is empty. Choose a non-empty image.'); }
    if (file.size > maxFileBytes) { throw new Error('This file is larger than the 20 MB limit.'); }
    var extension = file.name.split('.').pop().toLowerCase();
    var expectedMime = allowedTypes[extension];
    var declaredMime = file.type.toLowerCase();
    if (declaredMime === 'image/jpg') { declaredMime = 'image/jpeg'; }
    if (!expectedMime) { throw new Error('Unsupported file. Choose a JPG, PNG, or WebP image.'); }
    if (declaredMime && declaredMime !== 'application/octet-stream' && declaredMime !== expectedMime) {
      throw new Error('The file extension does not match its image type.');
    }
    var signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (mimeFromSignature(signature) !== expectedMime) {
      throw new Error('The file contents do not match the selected JPG, PNG, or WebP type.');
    }
  }

  function formatBytes(bytes) {
    if (bytes < 1024) { return bytes + ' B'; }
    if (bytes < 1024 * 1024) { return (bytes / 1024).toFixed(1) + ' KB'; }
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
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

  function validDimensions() {
    var width = Number(widthInput.value);
    var height = Number(heightInput.value);
    return Number.isInteger(width) && Number.isInteger(height) && width >= 1 && height >= 1 &&
      width <= maxDimension && height <= maxDimension && width * height <= maxPixels;
  }

  function updatePresetMatch() {
    var width = Number(widthInput.value);
    var height = Number(heightInput.value);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
      presetMatch.dataset.state = 'invalid';
      presetMatch.textContent = 'Enter positive whole-number dimensions within the output limits.';
      validationBadge.hidden = true;
      return;
    }
    if (width * height > maxPixels || width > maxDimension || height > maxDimension) {
      presetMatch.dataset.state = 'invalid';
      presetMatch.textContent = 'Dimensions exceed the 16,384 px per-side or 40-megapixel limit.';
      validationBadge.hidden = true;
      return;
    }
    var matches = width === currentPreset.width && height === currentPreset.height;
    presetMatch.dataset.state = matches ? 'match' : 'custom';
    presetMatch.textContent = matches
      ? 'Dimensions match the selected preset.'
      : 'Custom dimensions — these no longer match the selected preset.';
    validationBadge.hidden = false;
    validationBadge.textContent = matches ? 'Preset size' : 'Custom dimensions';
  }

  function updateDimensions(changedInput) {
    if (locked) {
      var value = Number(changedInput.value);
      if (Number.isInteger(value) && value > 0) {
        if (changedInput === widthInput) {
          heightInput.value = String(Math.max(1, Math.round(value / ratio)));
        } else {
          widthInput.value = String(Math.max(1, Math.round(value * ratio)));
        }
      }
    }
    var widthValid = Number.isInteger(Number(widthInput.value)) &&
      Number(widthInput.value) > 0 && Number(widthInput.value) <= maxDimension;
    var heightValid = Number.isInteger(Number(heightInput.value)) &&
      Number(heightInput.value) > 0 && Number(heightInput.value) <= maxDimension;
    var pixelsValid = widthValid && heightValid && Number(widthInput.value) * Number(heightInput.value) <= maxPixels;
    widthInput.setAttribute('aria-invalid', String(!widthValid || !pixelsValid));
    heightInput.setAttribute('aria-invalid', String(!heightValid || !pixelsValid));
    createButton.disabled = !sourceImage || !validDimensions();
    updatePresetMatch();
    clearOutput();
    if (!widthValid || !heightValid) {
      clearPreview('Enter valid dimensions to preview the resized image.');
      setStatus('Enter whole-number dimensions from 1 to 16,384 pixels.', 'error');
    } else if (!pixelsValid) {
      clearPreview('Choose dimensions within the 40-megapixel output limit.');
      setStatus('The output exceeds the safe limit of 40 megapixels.', 'error');
    } else {
      setStatus('Dimensions updated. Review the preview and create a new output.', 'info');
      schedulePreview();
    }
  }

  function drawImageToTarget(context, width, height, previewScale) {
    var targetWidth = width * previewScale;
    var targetHeight = height * previewScale;
    context.clearRect(0, 0, targetWidth, targetHeight);
    if (formatInput.value === 'image/jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, targetWidth, targetHeight);
    }
    if (fitModeInput.value === 'fit') {
      var background = backgroundInput.value;
      if (background === 'transparent' && formatInput.value === 'image/jpeg') { background = 'white'; }
      if (background !== 'transparent') {
        context.fillStyle = background === 'black' ? '#000000' : '#ffffff';
        context.fillRect(0, 0, targetWidth, targetHeight);
      }
      var fitScale = Math.min(targetWidth / sourceImage.naturalWidth, targetHeight / sourceImage.naturalHeight);
      var fitWidth = sourceImage.naturalWidth * fitScale;
      var fitHeight = sourceImage.naturalHeight * fitScale;
      context.drawImage(sourceImage, (targetWidth - fitWidth) / 2, (targetHeight - fitHeight) / 2, fitWidth, fitHeight);
      return;
    }
    if (fitModeInput.value === 'stretch') {
      context.drawImage(sourceImage, 0, 0, targetWidth, targetHeight);
      return;
    }
    var fillScale = Math.max(targetWidth / sourceImage.naturalWidth, targetHeight / sourceImage.naturalHeight);
    var drawnWidth = sourceImage.naturalWidth * fillScale;
    var drawnHeight = sourceImage.naturalHeight * fillScale;
    var overflowX = drawnWidth - targetWidth;
    var overflowY = drawnHeight - targetHeight;
    var left = overflowX * Number(positionXInput.value) / 100;
    var top = overflowY * Number(positionYInput.value) / 100;
    context.drawImage(sourceImage, -left, -top, drawnWidth, drawnHeight);
  }

  function schedulePreview() {
    if (previewTimer !== null) { window.clearTimeout(previewTimer); }
    if (!sourceImage || !validDimensions()) { return; }
    previewTimer = window.setTimeout(function () {
      previewTimer = null;
      drawPreview();
    }, 80);
  }

  function clearPreview(message) {
    preview.width = 1;
    preview.height = 1;
    preview.hidden = true;
    previewPlaceholder.hidden = false;
    previewDetails.textContent = message;
  }

  function drawPreview() {
    if (!sourceImage || !validDimensions()) { return; }
    var width = Number(widthInput.value);
    var height = Number(heightInput.value);
    var scale = Math.min(1, previewMaxDimension / width, previewMaxDimension / height);
    var renderWidth = Math.max(1, Math.round(width * scale));
    var renderHeight = Math.max(1, Math.round(height * scale));
    try {
      preview.width = renderWidth;
      preview.height = renderHeight;
      previewContext = preview.getContext('2d');
      if (!previewContext) { throw new Error('Preview is unavailable in this browser.'); }
      drawImageToTarget(previewContext, width, height, scale);
      preview.hidden = false;
      previewPlaceholder.hidden = true;
      previewDetails.textContent = renderWidth + ' × ' + renderHeight + ' px preview for ' +
        width + ' × ' + height + ' px output · ' + fitModeInput.options[fitModeInput.selectedIndex].text;
    } catch (error) {
      preview.width = 1;
      preview.height = 1;
      preview.hidden = true;
      previewPlaceholder.hidden = false;
      setStatus(error.message || 'Could not render the preview in this browser.', 'error');
    }
  }

  function syncControls() {
    var fillMode = fitModeInput.value === 'fill';
    positionControls.hidden = !fillMode;
    backgroundField.hidden = fitModeInput.value !== 'fit';
    positionXInput.disabled = !fillMode || !sourceImage;
    positionYInput.disabled = !fillMode || !sourceImage;
    backgroundInput.disabled = fitModeInput.value !== 'fit' || !sourceImage;
    fitHelp.textContent = fitModeInput.value === 'fit'
      ? 'Fit centers the full image and adds background padding.'
      : fitModeInput.value === 'fill'
        ? 'Fill and crop scales to cover the frame; use the sliders to adjust the crop position.'
        : 'Stretch fills the target exactly and can distort the source image.';
    document.getElementById('social-background-help').textContent = formatInput.value === 'image/jpeg'
      ? 'JPEG does not preserve transparency; transparent padding becomes white.'
      : 'Transparent padding is supported for PNG and WebP output.';
    positionXValue.value = positionXInput.value + '%';
    positionYValue.value = positionYInput.value + '%';
    positionXValue.textContent = positionXInput.value + '%';
    positionYValue.textContent = positionYInput.value + '%';
  }

  function initializeFormats(preferredMime) {
    var firstSupported = null;
    var preferredSupported = null;
    Array.from(formatInput.options).forEach(function (option) {
      var canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      var supported = false;
      try {
        supported = canvas.toDataURL(option.value).indexOf('data:' + option.value) === 0;
      } catch (error) {
        supported = false;
      }
      option.disabled = !supported;
      if (!supported && !option.text.includes('(not supported)')) { option.text += ' (not supported)'; }
      if (supported && firstSupported === null) { firstSupported = option.value; }
      if (supported && option.value === preferredMime) { preferredSupported = option.value; }
    });
    if (!firstSupported) { throw new Error('This browser cannot export images from Canvas.'); }
    formatInput.value = preferredSupported || firstSupported;
  }

  function setPresetOptions(platform, selectedId) {
    var options = presets[platform];
    presetInput.replaceChildren();
    options.forEach(function (preset) {
      var option = document.createElement('option');
      option.value = preset.id;
      option.textContent = preset.label + ' · ' + preset.width + ' × ' + preset.height;
      presetInput.appendChild(option);
    });
    currentPreset = options.find(function (preset) { return preset.id === selectedId; }) || options[0];
    presetInput.value = currentPreset.id;
    widthInput.value = String(currentPreset.width);
    heightInput.value = String(currentPreset.height);
    ratio = currentPreset.width / currentPreset.height;
    widthInput.removeAttribute('aria-invalid');
    heightInput.removeAttribute('aria-invalid');
    createButton.disabled = !sourceImage;
    updatePresetMatch();
    clearOutput();
    schedulePreview();
    presetStatus.textContent = 'Selected ' + platformInput.options[platformInput.selectedIndex].text +
      ' · ' + currentPreset.label + ' · ' + currentPreset.width + ' × ' + currentPreset.height +
      ' px. Editable starting point; verify current placement rules before publishing.';
    setStatus(sourceImage ? 'Preset selected. Review the preview and create a new output.' :
      'Choose or drop one image to begin.', sourceImage ? 'info' : 'info');
  }

  async function loadFile(file) {
    var version = ++loadVersion;
    clearOutput();
    clearSource();
    sourceImage = null;
    selectedFile = file || null;
    createButton.disabled = true;
    preview.width = 320;
    preview.height = 180;
    preview.hidden = true;
    previewPlaceholder.hidden = false;
    if (!file) {
      filePanel.hidden = true;
      setStatus('Choose or drop one image to begin.');
      return;
    }
    filePanel.hidden = false;
    fileDetails.textContent = file.name + ' · ' + formatBytes(file.size) + ' · Checking image…';
    setStatus('Checking selected image…');
    try {
      await validateFile(file);
      if (version !== loadVersion) { return; }
    } catch (error) {
      if (version !== loadVersion) { return; }
      selectedFile = null;
      fileDetails.textContent = file.name + ' · Could not load image';
      setStatus(error.message, 'error');
      return;
    }
    var url;
    try {
      url = URL.createObjectURL(file);
    } catch (error) {
      selectedFile = null;
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
        selectedFile = null;
        fileDetails.textContent = file.name + ' · Could not decode image';
        setStatus('Could not decode this image. It may be damaged or use an unsupported encoding.', 'error');
      }
      return;
    }
    if (version !== loadVersion) {
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
      return;
    }
    if (image.naturalWidth > maxDimension || image.naturalHeight > maxDimension ||
        image.naturalWidth * image.naturalHeight > maxPixels) {
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
      selectedFile = null;
      fileDetails.textContent = file.name + ' · Image exceeds size limits';
      setStatus('This image exceeds the safe limit of 16,384 px per side or 40 megapixels.', 'error');
      return;
    }
    sourceImage = image;
    sourceUrl = url;
    fileDetails.textContent = file.name + ' · ' + image.naturalWidth + ' × ' + image.naturalHeight +
      ' px · ' + formatBytes(file.size);
    createButton.disabled = !validDimensions();
    try {
      initializeFormats('image/jpeg');
    } catch (error) {
      clearSource();
      selectedFile = null;
      fileDetails.textContent = file.name + ' · Image export is unavailable';
      createButton.disabled = true;
      setStatus(error.message || 'This browser cannot export images from Canvas.', 'error');
      return;
    }
    syncControls();
    drawPreview();
    setStatus('Image ready. Adjust the preset or settings and create a verified output.', 'success');
  }

  function renderOutput() {
    if (!sourceImage || !validDimensions()) {
      setStatus('Choose an image and enter valid dimensions before creating an output.', 'error');
      return;
    }
    clearOutput();
    var version = ++renderVersion;
    var width = Number(widthInput.value);
    var height = Number(heightInput.value);
    var mime = formatInput.value;
    if (!mimeExtensions[mime] || formatInput.options[formatInput.selectedIndex].disabled) {
      setStatus('The selected output format is not supported by this browser.', 'error');
      return;
    }
    createButton.disabled = true;
    setStatus('Creating and verifying resized image…');
    var canvas = document.createElement('canvas');
    try {
      canvas.width = width;
      canvas.height = height;
      var context = canvas.getContext('2d');
      if (!context) { throw new Error('Canvas output is unavailable in this browser.'); }
      drawImageToTarget(context, width, height, 1);
    } catch (error) {
      canvas.width = 0;
      canvas.height = 0;
      createButton.disabled = false;
      setStatus(error.message || 'Could not draw this image to Canvas.', 'error');
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
        createButton.disabled = false;
        setStatus('The browser could not encode the resized image. Try another output format.', 'error');
        return;
      }
      if (blob.type.toLowerCase() !== mime) {
        createButton.disabled = false;
        setStatus('The browser returned an unexpected image format; download is unavailable.', 'error');
        return;
      }
      var verifiedUrl;
      try {
        verifiedUrl = URL.createObjectURL(blob);
      } catch (error) {
        createButton.disabled = false;
        setStatus('The browser could not allocate memory for the resized image.', 'error');
        return;
      }
      var verificationImage = new Image();
      try {
        await loadImage(verificationImage, verifiedUrl);
      } catch (error) {
        verificationImage.removeAttribute('src');
        URL.revokeObjectURL(verifiedUrl);
        if (version === renderVersion) {
          createButton.disabled = false;
          setStatus('The resized image could not be decoded and cannot be downloaded.', 'error');
        }
        return;
      }
      var validOutput = verificationImage.naturalWidth === width && verificationImage.naturalHeight === height;
      verificationImage.removeAttribute('src');
      if (version !== renderVersion || !validOutput) {
        URL.revokeObjectURL(verifiedUrl);
        if (version === renderVersion) {
          createButton.disabled = false;
          setStatus('The resized image dimensions did not match the selected output.', 'error');
        }
        return;
      }
      outputBlob = blob;
      outputUrl = verifiedUrl;
      outputDetails.textContent = width + ' × ' + height + ' px · ' + formatBytes(blob.size) +
        ' · ' + mimeExtensions[mime].toUpperCase() + ' · Verified';
      downloadButton.disabled = false;
      createButton.disabled = false;
      setStatus('Resized image verified and ready to download.', 'success');
    }).catch(function () {
      canvas.width = 0;
      canvas.height = 0;
      if (version === renderVersion) {
        createButton.disabled = false;
        setStatus('The browser could not finish creating this image. Try again with a smaller output.', 'error');
      }
    });
  }

  function downloadOutput() {
    if (!outputBlob || !outputUrl || !selectedFile) {
      setStatus('Create a verified resized image before downloading.', 'error');
      return;
    }
    var extension = mimeExtensions[outputBlob.type.toLowerCase()];
    if (!extension) {
      setStatus('Cannot download because the browser returned an unsupported image format.', 'error');
      return;
    }
    var baseName = selectedFile.name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
    var anchor = document.createElement('a');
    anchor.href = outputUrl;
    anchor.download = (baseName || 'image') + '-' + widthInput.value + 'x' + heightInput.value + '.' + extension;
    try {
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setStatus('Download started for the verified resized image.', 'success');
    } catch (error) {
      anchor.remove();
      setStatus('The browser could not start the download. Try again or create the image again.', 'error');
    }
  }

  function changePlatform() {
    setPresetOptions(platformInput.value);
    syncControls();
  }

  function changePreset() {
    var chosen = presets[platformInput.value].find(function (preset) { return preset.id === presetInput.value; });
    if (!chosen) { return; }
    currentPreset = chosen;
    widthInput.value = String(chosen.width);
    heightInput.value = String(chosen.height);
    ratio = chosen.width / chosen.height;
    widthInput.removeAttribute('aria-invalid');
    heightInput.removeAttribute('aria-invalid');
    createButton.disabled = !sourceImage;
    updatePresetMatch();
    clearOutput();
    syncControls();
    schedulePreview();
    presetStatus.textContent = 'Selected ' + platformInput.options[platformInput.selectedIndex].text +
      ' · ' + chosen.label + ' · ' + chosen.width + ' × ' + chosen.height +
      ' px. Editable starting point; verify current placement rules before publishing.';
    setStatus(sourceImage ? 'Preset selected. Review the preview and create a new output.' :
      'Choose or drop one image to begin.');
  }

  browseButton.addEventListener('click', function () {
    fileInput.value = '';
    fileInput.click();
  });
  replaceButton.addEventListener('click', function () {
    fileInput.value = '';
    fileInput.click();
  });
  resetButton.addEventListener('click', clearImage);
  fileInput.addEventListener('change', function () { loadFile(fileInput.files && fileInput.files[0]); });
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
      setStatus('No file was found. Choose a JPG, PNG, or WebP image.', 'error');
      return;
    }
    if (files.length !== 1) {
      setStatus('Please drop one image at a time.', 'error');
      return;
    }
    fileInput.value = '';
    loadFile(files[0]);
  });
  platformInput.addEventListener('change', changePlatform);
  presetInput.addEventListener('change', changePreset);
  widthInput.addEventListener('input', function () { updateDimensions(widthInput); });
  heightInput.addEventListener('input', function () { updateDimensions(heightInput); });
  ratioLock.addEventListener('click', function () {
    locked = !locked;
    ratioLock.setAttribute('aria-pressed', String(locked));
    ratioLock.textContent = locked ? 'Ratio locked' : 'Ratio unlocked';
    ratioLock.setAttribute('aria-label', locked ? 'Unlock aspect ratio' : 'Lock aspect ratio');
    if (locked) {
      var width = Number(widthInput.value);
      var height = Number(heightInput.value);
      if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
        ratio = width / height;
      }
    }
  });
  fitModeInput.addEventListener('change', function () {
    syncControls();
    clearOutput();
    schedulePreview();
    if (sourceImage) { setStatus('Image fit updated. Create a new output to download it.', 'info'); }
  });
  [positionXInput, positionYInput].forEach(function (input) {
    input.addEventListener('input', function () {
      syncControls();
      clearOutput();
      schedulePreview();
      if (sourceImage) { setStatus('Crop position updated. Create a new output to download it.', 'info'); }
    });
  });
  backgroundInput.addEventListener('change', function () {
    syncControls();
    clearOutput();
    schedulePreview();
  });
  formatInput.addEventListener('change', function () {
    syncControls();
    clearOutput();
    schedulePreview();
    if (sourceImage) { setStatus('Output format updated. Create a new output to download it.', 'info'); }
  });
  createButton.addEventListener('click', renderOutput);
  downloadButton.addEventListener('click', downloadOutput);
  window.addEventListener('beforeunload', function () {
    if (previewTimer !== null) { window.clearTimeout(previewTimer); }
    clearSource();
    if (outputUrl) { URL.revokeObjectURL(outputUrl); }
  });

  setPresetOptions(platformInput.value, currentPreset.id);
  syncControls();
}());
