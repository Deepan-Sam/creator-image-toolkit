// Isolated browser-local image cropper.
(function () {
  'use strict';

  var maxDimension = 16384;
  var maxPixels = 40000000;
  var maxFileBytes = 20 * 1024 * 1024;
  var allowedTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp'
  };
  var extensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  };

  var fileInput = document.getElementById('cropper-file');
  var dropzone = document.getElementById('cropper-dropzone');
  var browseButton = document.getElementById('cropper-browse');
  var replaceButton = document.getElementById('cropper-replace');
  var resetButton = document.getElementById('cropper-reset');
  var filePanel = document.getElementById('cropper-file-panel');
  var fileDetails = document.getElementById('cropper-file-details');
  var status = document.getElementById('cropper-status');
  var workspace = document.getElementById('cropper-workspace');
  var stage = document.getElementById('cropper-stage');
  var frame = document.getElementById('cropper-frame');
  var sourcePreview = document.getElementById('cropper-source-preview');
  var selection = document.getElementById('cropper-selection');
  var cropDetails = document.getElementById('cropper-crop-details');
  var ratioInput = document.getElementById('cropper-ratio');
  var customRatioPanel = document.getElementById('cropper-custom-ratio');
  var ratioWidthInput = document.getElementById('cropper-ratio-width');
  var ratioHeightInput = document.getElementById('cropper-ratio-height');
  var xInput = document.getElementById('cropper-x');
  var yInput = document.getElementById('cropper-y');
  var widthInput = document.getElementById('cropper-width');
  var heightInput = document.getElementById('cropper-height');
  var formatInput = document.getElementById('cropper-format');
  var outputDetails = document.getElementById('cropper-output-details');
  var resultPreview = document.getElementById('cropper-result-preview');
  var resultPlaceholder = document.getElementById('cropper-result-placeholder');
  var downloadButton = document.getElementById('cropper-download');

  var sourceImage = null;
  var sourceUrl = null;
  var outputUrl = null;
  var outputBlob = null;
  var selectedFile = null;
  var imageMime = null;
  var crop = null;
  var aspectRatio = null;
  var loadVersion = 0;
  var renderVersion = 0;
  var renderTimer = null;
  var dragState = null;
  var resizeObserver = null;

  function setStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state || 'info';
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
      function onError() {
        finish(new Error('The browser could not decode this image.'));
      }
      image.addEventListener('load', onLoad);
      image.addEventListener('error', onError);
      image.src = url;
      if (image.complete) {
        if (image.naturalWidth && image.naturalHeight) { onLoad(); }
        else { onError(); }
      }
    });
  }

  async function validateFile(file) {
    var extension = file.name.split('.').pop().toLowerCase();
    var expectedMime = allowedTypes[extension];
    var declaredMime = file.type.toLowerCase();
    if (declaredMime === 'image/jpg') { declaredMime = 'image/jpeg'; }
    if (!expectedMime || (declaredMime && declaredMime !== 'application/octet-stream' &&
        !extensions[declaredMime])) {
      throw new Error('Unsupported file. Choose a JPG, PNG, or WebP image.');
    }
    if (extensions[declaredMime] && declaredMime !== expectedMime) {
      throw new Error('The file extension does not match its image type.');
    }
    if (file.size > maxFileBytes) {
      throw new Error('This file is larger than the 20 MB limit.');
    }

    var signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    var actualMime = null;
    if (signature.length >= 3 && signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff) {
      actualMime = 'image/jpeg';
    } else if (signature.length >= 8 && signature[0] === 0x89 && signature[1] === 0x50 &&
        signature[2] === 0x4e && signature[3] === 0x47 && signature[4] === 0x0d &&
        signature[5] === 0x0a && signature[6] === 0x1a && signature[7] === 0x0a) {
      actualMime = 'image/png';
    } else if (signature.length >= 12 && signature[0] === 0x52 && signature[1] === 0x49 &&
        signature[2] === 0x46 && signature[3] === 0x46 && signature[8] === 0x57 &&
        signature[9] === 0x45 && signature[10] === 0x42 && signature[11] === 0x50) {
      actualMime = 'image/webp';
    }
    if (actualMime !== expectedMime) {
      throw new Error('The file contents do not match the selected JPG, PNG, or WebP type.');
    }
    return actualMime;
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

  function clearOutput() {
    renderVersion += 1;
    if (renderTimer !== null) {
      window.clearTimeout(renderTimer);
      renderTimer = null;
    }
    outputBlob = null;
    downloadButton.disabled = true;
    resultPreview.removeAttribute('src');
    resultPreview.hidden = true;
    resultPlaceholder.hidden = false;
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      outputUrl = null;
    }
    outputDetails.textContent = 'Output dimensions and size will appear after processing.';
  }

  function revokeSource() {
    if (sourceImage) {
      sourceImage.removeAttribute('src');
      sourceImage = null;
    }
    sourcePreview.removeAttribute('src');
    if (sourceUrl) {
      URL.revokeObjectURL(sourceUrl);
      sourceUrl = null;
    }
  }

  function clearImage() {
    loadVersion += 1;
    clearOutput();
    revokeSource();
    selectedFile = null;
    imageMime = null;
    crop = null;
    aspectRatio = null;
    dragState = null;
    fileInput.value = '';
    filePanel.hidden = true;
    workspace.hidden = true;
    fileDetails.textContent = 'No image selected';
    cropDetails.textContent = 'Crop dimensions will appear here.';
    xInput.value = '0';
    yInput.value = '0';
    widthInput.value = '1';
    heightInput.value = '1';
    ratioInput.value = 'free';
    ratioWidthInput.value = '1';
    ratioHeightInput.value = '1';
    customRatioPanel.hidden = true;
    formatInput.value = 'image/jpeg';
    [ratioWidthInput, ratioHeightInput, xInput, yInput, widthInput, heightInput].forEach(function (input) {
      input.removeAttribute('aria-invalid');
    });
    setStatus('Choose or drop one image to begin.');
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function getAspectRatio() {
    if (ratioInput.value === 'free') { return null; }
    if (ratioInput.value !== 'custom') { return Number(ratioInput.value); }
    var numerator = Number(ratioWidthInput.value);
    var denominator = Number(ratioHeightInput.value);
    if (!Number.isInteger(numerator) || !Number.isInteger(denominator) ||
        numerator < 1 || denominator < 1 || numerator > 10000 || denominator > 10000) {
      throw new Error('Enter whole-number custom ratio values from 1 to 10,000.');
    }
    return numerator / denominator;
  }

  function largestCrop(ratio) {
    var sourceWidth = sourceImage.naturalWidth;
    var sourceHeight = sourceImage.naturalHeight;
    if (ratio === null) {
      return { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
    }
    var width = Math.min(sourceWidth, sourceHeight * ratio);
    var height = width / ratio;
    if (height > sourceHeight) {
      height = sourceHeight;
      width = height * ratio;
    }
    return {
      x: (sourceWidth - width) / 2,
      y: (sourceHeight - height) / 2,
      width: width,
      height: height
    };
  }

  function syncCropUI() {
    if (!crop || !sourceImage) { return; }
    var renderedWidth = sourcePreview.clientWidth;
    var renderedHeight = sourcePreview.clientHeight;
    if (!renderedWidth || !renderedHeight) { return; }
    selection.style.left = (crop.x / sourceImage.naturalWidth * 100) + '%';
    selection.style.top = (crop.y / sourceImage.naturalHeight * 100) + '%';
    selection.style.width = (crop.width / sourceImage.naturalWidth * 100) + '%';
    selection.style.height = (crop.height / sourceImage.naturalHeight * 100) + '%';
    xInput.value = String(Math.round(crop.x));
    yInput.value = String(Math.round(crop.y));
    widthInput.value = String(Math.max(1, Math.round(crop.width)));
    heightInput.value = String(Math.max(1, Math.round(crop.height)));
    cropDetails.textContent = 'Crop: ' + Math.round(crop.width) + ' × ' + Math.round(crop.height) +
      ' px · Left ' + Math.round(crop.x) + ', top ' + Math.round(crop.y) + ' px';
  }

  function scheduleRender(delay) {
    clearOutput();
    if (!sourceImage || !crop) { return; }
    syncCropUI();
    renderTimer = window.setTimeout(renderOutput, delay === undefined ? 140 : delay);
  }

  async function renderOutput() {
    renderTimer = null;
    if (!sourceImage || !crop || !selectedFile || !imageMime) { return; }
    var version = ++renderVersion;
    var width = Math.max(1, Math.round(crop.width));
    var height = Math.max(1, Math.round(crop.height));
    if (width > maxDimension || height > maxDimension || width * height > maxPixels) {
      setStatus('The output exceeds the safe limit of 40 megapixels.', 'error');
      return;
    }
    var mime = formatInput.value;
    if (!extensions[mime] || !supportsOutput(mime)) {
      setStatus('The selected output format is not supported by this browser.', 'error');
      return;
    }

    setStatus('Creating and verifying cropped preview…');
    var canvas = document.createElement('canvas');
    var context;
    try {
      canvas.width = width;
      canvas.height = height;
      context = canvas.getContext('2d');
      if (!context) { throw new Error('This browser could not create a Canvas for cropping.'); }
      if (mime === 'image/jpeg') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(sourceImage, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
    } catch (error) {
      canvas.width = 0;
      canvas.height = 0;
      setStatus(error.message || 'The browser could not crop this image.', 'error');
      return;
    }

    var blob = await new Promise(function (resolve) {
      try {
        canvas.toBlob(resolve, mime, mime === 'image/png' ? undefined : 0.92);
      } catch (error) {
        resolve(null);
      }
    });
    canvas.width = 0;
    canvas.height = 0;
    if (version !== renderVersion) { return; }
    if (!blob || !blob.size) {
      setStatus('The browser could not encode the cropped image. Try another format.', 'error');
      return;
    }
    if (blob.type.toLowerCase() !== mime) {
      setStatus('The browser returned an unexpected image format; download is unavailable.', 'error');
      return;
    }

    var verifiedUrl;
    try {
      verifiedUrl = URL.createObjectURL(blob);
    } catch (error) {
      setStatus('The browser could not allocate memory for the cropped preview.', 'error');
      return;
    }
    var verificationImage = new Image();
    try {
      await loadImage(verificationImage, verifiedUrl);
    } catch (error) {
      verificationImage.removeAttribute('src');
      URL.revokeObjectURL(verifiedUrl);
      if (version === renderVersion) {
        setStatus('The cropped output could not be decoded and cannot be downloaded.', 'error');
      }
      return;
    }
    var dimensionsMatch = verificationImage.naturalWidth === width && verificationImage.naturalHeight === height;
    verificationImage.removeAttribute('src');
    if (!dimensionsMatch || version !== renderVersion) {
      URL.revokeObjectURL(verifiedUrl);
      if (version === renderVersion) {
        setStatus('The cropped output dimensions did not match the selection.', 'error');
      }
      return;
    }

    outputBlob = blob;
    outputUrl = verifiedUrl;
    resultPreview.alt = selectedFile.name + ' cropped image preview';
    resultPreview.src = outputUrl;
    resultPreview.hidden = false;
    resultPlaceholder.hidden = true;
    outputDetails.textContent = width + ' × ' + height + ' px · ' + formatBytes(blob.size) +
      ' · ' + mime.toUpperCase().replace('IMAGE/', '');
    downloadButton.disabled = false;
    setStatus('Cropped image verified and ready to download.', 'success');
  }

  async function loadFile(file) {
    var version = ++loadVersion;
    clearOutput();
    revokeSource();
    selectedFile = file || null;
    imageMime = null;
    crop = null;
    if (!file) {
      filePanel.hidden = true;
      workspace.hidden = true;
      setStatus('Choose or drop one image to begin.');
      return;
    }
    filePanel.hidden = false;
    fileDetails.textContent = file.name + ' · ' + formatBytes(file.size) + ' · Checking image…';
    setStatus('Checking selected image…');

    try {
      imageMime = await validateFile(file);
      if (version !== loadVersion) { return; }
    } catch (error) {
      if (version !== loadVersion) { return; }
      imageMime = null;
      workspace.hidden = true;
      setStatus(error.message, 'error');
      return;
    }

    setStatus('Loading image…');
    var url;
    try {
      url = URL.createObjectURL(file);
    } catch (error) {
      imageMime = null;
      setStatus('The browser could not allocate memory for this image preview.', 'error');
      return;
    }
    var image = new Image();
    try {
      await loadImage(image, url);
    } catch (error) {
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
      if (version === loadVersion) {
        imageMime = null;
        workspace.hidden = true;
        setStatus('Could not decode this image. It may be damaged or use an unsupported encoding.', 'error');
      }
      return;
    }
    if (version !== loadVersion) {
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
      return;
    }
    var imageWidth = image.naturalWidth;
    var imageHeight = image.naturalHeight;
    if (!imageWidth || !imageHeight || imageWidth > maxDimension || imageHeight > maxDimension ||
        imageWidth * imageHeight > maxPixels) {
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
      imageMime = null;
      workspace.hidden = true;
      setStatus('This image exceeds the safe limit of 16,384 px per side or 40 megapixels.', 'error');
      return;
    }

    sourceImage = image;
    sourceUrl = url;
    sourcePreview.src = sourceUrl;
    fileDetails.textContent = file.name + ' · ' + imageWidth + ' × ' + imageHeight +
      ' px · ' + formatBytes(file.size);
    workspace.hidden = false;
    try {
      initializeFormatOptions(imageMime);
      aspectRatio = getAspectRatio();
      crop = largestCrop(aspectRatio);
      syncCropUI();
    } catch (error) {
      setStatus(error.message, 'error');
      return;
    }
    window.requestAnimationFrame(function () {
      syncCropUI();
      scheduleRender(0);
    });
  }

  function initializeFormatOptions(preferredMime) {
    var firstSupported = null;
    var preferredSupported = null;
    for (var i = 0; i < formatInput.options.length; i += 1) {
      var option = formatInput.options[i];
      var supported = supportsOutput(option.value);
      option.disabled = !supported;
      if (!supported && option.text.indexOf('(not supported)') === -1) {
        option.text += ' (not supported)';
      }
      if (supported && firstSupported === null) { firstSupported = option.value; }
      if (supported && option.value === preferredMime) { preferredSupported = option.value; }
    }
    if (!firstSupported) { throw new Error('This browser cannot export images from Canvas.'); }
    formatInput.value = preferredSupported || firstSupported;
  }

  function changeRatio() {
    customRatioPanel.hidden = ratioInput.value !== 'custom';
    if (!sourceImage) { return; }
    clearOutput();
    try {
      aspectRatio = getAspectRatio();
      ratioWidthInput.removeAttribute('aria-invalid');
      ratioHeightInput.removeAttribute('aria-invalid');
      crop = largestCrop(aspectRatio);
      syncCropUI();
      scheduleRender();
      setStatus('Crop selection updated. Creating a verified preview…');
    } catch (error) {
      ratioWidthInput.setAttribute('aria-invalid', 'true');
      ratioHeightInput.setAttribute('aria-invalid', 'true');
      setStatus(error.message, 'error');
    }
  }

  function updateFromFields(changedInput) {
    if (!sourceImage || !crop) { return; }
    var sourceWidth = sourceImage.naturalWidth;
    var sourceHeight = sourceImage.naturalHeight;
    var x = Number(xInput.value);
    var y = Number(yInput.value);
    var width = Number(widthInput.value);
    var height = Number(heightInput.value);
    if (![x, y, width, height].every(Number.isFinite) || width < 1 || height < 1) {
      clearOutput();
      changedInput.setAttribute('aria-invalid', 'true');
      setStatus('Crop coordinates must be valid numbers; crop width and height must be at least 1 px.', 'error');
      return;
    }
    changedInput.removeAttribute('aria-invalid');
    if (aspectRatio !== null) {
      if (changedInput === heightInput) { width = height * aspectRatio; }
      else { height = width / aspectRatio; }
    }
    width = Math.min(sourceWidth, width);
    height = Math.min(sourceHeight, height);
    if (aspectRatio !== null) {
      if (width / height > aspectRatio) { width = height * aspectRatio; }
      else { height = width / aspectRatio; }
    }
    x = clamp(x, 0, sourceWidth - width);
    y = clamp(y, 0, sourceHeight - height);
    crop = { x: x, y: y, width: width, height: height };
    syncCropUI();
    scheduleRender();
    setStatus('Crop selection updated. Creating a verified preview…');
  }

  function beginPointerDrag(event) {
    if (!crop || !sourceImage || event.button !== 0) { return; }
    var imageRect = sourcePreview.getBoundingClientRect();
    var handle = event.target.closest('[data-handle]');
    dragState = {
      pointerId: event.pointerId,
      mode: handle ? 'resize' : 'move',
      handle: handle ? handle.dataset.handle : '',
      startX: event.clientX,
      startY: event.clientY,
      startCrop: { x: crop.x, y: crop.y, width: crop.width, height: crop.height },
      renderWidth: imageRect.width,
      renderHeight: imageRect.height
    };
    selection.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function resizeFreeform(start, handle, dx, dy) {
    var left = start.x;
    var top = start.y;
    var right = start.x + start.width;
    var bottom = start.y + start.height;
    if (handle.indexOf('w') !== -1) { left = clamp(start.x + dx, 0, right - 1); }
    if (handle.indexOf('e') !== -1) { right = clamp(start.x + start.width + dx, left + 1, sourceImage.naturalWidth); }
    if (handle.indexOf('n') !== -1) { top = clamp(start.y + dy, 0, bottom - 1); }
    if (handle.indexOf('s') !== -1) { bottom = clamp(start.y + start.height + dy, top + 1, sourceImage.naturalHeight); }
    return { x: left, y: top, width: right - left, height: bottom - top };
  }

  function resizeWithRatio(start, handle, dx, dy) {
    var sourceWidth = sourceImage.naturalWidth;
    var sourceHeight = sourceImage.naturalHeight;
    var hasWest = handle.indexOf('w') !== -1;
    var hasEast = handle.indexOf('e') !== -1;
    var hasNorth = handle.indexOf('n') !== -1;
    var hasSouth = handle.indexOf('s') !== -1;

    if (!hasWest && !hasEast) {
      var newHeight = clamp(start.height + (hasSouth ? dy : -dy), 1,
        hasSouth ? sourceHeight - start.y : start.y + start.height);
      var newWidth = newHeight * aspectRatio;
      if (newWidth > sourceWidth) {
        newWidth = sourceWidth;
        newHeight = newWidth / aspectRatio;
      }
      return {
        x: clamp(start.x + start.width / 2 - newWidth / 2, 0, sourceWidth - newWidth),
        y: hasSouth ? start.y : start.y + start.height - newHeight,
        width: newWidth,
        height: newHeight
      };
    }
    if (!hasNorth && !hasSouth) {
      var horizontalWidth = clamp(start.width + (hasEast ? dx : -dx), 1,
        hasEast ? sourceWidth - start.x : start.x + start.width);
      var horizontalHeight = horizontalWidth / aspectRatio;
      if (horizontalHeight > sourceHeight) {
        horizontalHeight = sourceHeight;
        horizontalWidth = horizontalHeight * aspectRatio;
      }
      return {
        x: hasEast ? start.x : start.x + start.width - horizontalWidth,
        y: clamp(start.y + start.height / 2 - horizontalHeight / 2, 0, sourceHeight - horizontalHeight),
        width: horizontalWidth,
        height: horizontalHeight
      };
    }

    var anchorX = hasEast ? start.x : start.x + start.width;
    var anchorY = hasSouth ? start.y : start.y + start.height;
    var directionX = hasEast ? 1 : -1;
    var directionY = hasSouth ? 1 : -1;
    var widthFromX = Math.max(1, start.width + directionX * dx);
    var heightFromY = Math.max(1, start.height + directionY * dy);
    var width = Math.abs(widthFromX - start.width) >= Math.abs(heightFromY * aspectRatio - start.width)
      ? widthFromX
      : heightFromY * aspectRatio;
    var maxWidth = Math.min(
      hasEast ? sourceWidth - anchorX : anchorX,
      (hasSouth ? sourceHeight - anchorY : anchorY) * aspectRatio
    );
    width = clamp(width, 1, Math.max(1, maxWidth));
    var height = width / aspectRatio;
    return {
      x: hasEast ? anchorX : anchorX - width,
      y: hasSouth ? anchorY : anchorY - height,
      width: width,
      height: height
    };
  }

  function movePointerDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) { return; }
    var dx = (event.clientX - dragState.startX) * sourceImage.naturalWidth / dragState.renderWidth;
    var dy = (event.clientY - dragState.startY) * sourceImage.naturalHeight / dragState.renderHeight;
    var start = dragState.startCrop;
    if (dragState.mode === 'move') {
      crop = {
        x: clamp(start.x + dx, 0, sourceImage.naturalWidth - start.width),
        y: clamp(start.y + dy, 0, sourceImage.naturalHeight - start.height),
        width: start.width,
        height: start.height
      };
    } else if (aspectRatio === null) {
      crop = resizeFreeform(start, dragState.handle, dx, dy);
    } else {
      crop = resizeWithRatio(start, dragState.handle, dx, dy);
    }
    syncCropUI();
    scheduleRender();
  }

  function finishPointerDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) { return; }
    dragState = null;
    scheduleRender(0);
    setStatus('Crop selection updated. Creating a verified preview…');
  }

  selection.addEventListener('pointerdown', beginPointerDrag);
  selection.addEventListener('pointermove', movePointerDrag);
  selection.addEventListener('pointerup', finishPointerDrag);
  selection.addEventListener('pointercancel', finishPointerDrag);
  selection.addEventListener('lostpointercapture', function () {
    if (dragState) { dragState = null; scheduleRender(0); }
  });
  selection.addEventListener('keydown', function (event) {
    if (!crop || !sourceImage || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) { return; }
    event.preventDefault();
    var scale = sourceImage.naturalWidth / Math.max(1, sourcePreview.clientWidth);
    var step = (event.shiftKey ? 1 : 5) * scale;
    if (event.target === selection) {
      crop.x = clamp(crop.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0), 0, sourceImage.naturalWidth - crop.width);
      crop.y = clamp(crop.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0), 0, sourceImage.naturalHeight - crop.height);
    } else {
      var handle = event.target.dataset.handle;
      var dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
      var dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
      crop = aspectRatio === null
        ? resizeFreeform(crop, handle, dx, dy)
        : resizeWithRatio(crop, handle, dx, dy);
    }
    syncCropUI();
    scheduleRender();
    setStatus('Crop selection updated. Creating a verified preview…');
  });

  function handleDrop(event) {
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
    loadFile(files[0]);
  }

  browseButton.addEventListener('click', function () { fileInput.click(); });
  replaceButton.addEventListener('click', function () { fileInput.click(); });
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
  dropzone.addEventListener('drop', handleDrop);
  ratioInput.addEventListener('change', changeRatio);
  [ratioWidthInput, ratioHeightInput].forEach(function (input) {
    input.addEventListener('change', function () {
      if (ratioInput.value === 'custom') { changeRatio(); }
    });
  });
  [[xInput, 'x'], [yInput, 'y'], [widthInput, 'width'], [heightInput, 'height']].forEach(function (entry) {
    entry[0].addEventListener('change', function () { updateFromFields(entry[0]); });
  });
  formatInput.addEventListener('change', function () {
    scheduleRender(0);
    setStatus('Output format changed. Creating a verified preview…');
  });
  downloadButton.addEventListener('click', function () {
    if (!outputBlob || !outputUrl || !selectedFile) { return; }
    var extension = extensions[outputBlob.type.toLowerCase()];
    if (!extension) {
      setStatus('Cannot download because the browser returned an unsupported image format.', 'error');
      return;
    }
    var baseName = selectedFile.name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
    var link = document.createElement('a');
    link.href = outputUrl;
    link.download = (baseName || 'image') + '-cropped.' + extension;
    document.body.appendChild(link);
    link.click();
    link.remove();
  });

  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(function () {
      syncCropUI();
    });
    resizeObserver.observe(frame);
  } else {
    window.addEventListener('resize', syncCropUI);
  }
  window.addEventListener('beforeunload', function () {
    if (resizeObserver) { resizeObserver.disconnect(); }
    if (sourceImage) { sourceImage.removeAttribute('src'); }
    if (sourceUrl) { URL.revokeObjectURL(sourceUrl); }
    if (outputUrl) { URL.revokeObjectURL(outputUrl); }
  });
}());
