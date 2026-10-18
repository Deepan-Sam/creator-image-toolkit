// Client-side site behavior and image resizing.
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

  var year = document.getElementById('year');
  if (year) { year.textContent = String(new Date().getFullYear()); }

  var fileInput = document.getElementById('image-file');
  var maxFileSizeInput = document.getElementById('max-file-size');
  var widthInput = document.getElementById('output-width');
  var heightInput = document.getElementById('output-height');
  var aspectLock = document.getElementById('aspect-lock');
  var lockLabel = document.getElementById('lock-label');
  var formatInput = document.getElementById('output-format');
  var downloadButton = document.getElementById('download-image');
  var resizeActionButton = document.getElementById('resize-image-action');
  var resizerResetButton = document.getElementById('resizer-reset');
  var status = document.getElementById('resizer-status');
  var sourcePreview = document.getElementById('source-preview');
  var sourcePlaceholder = document.getElementById('source-placeholder');
  var sourceDetails = document.getElementById('source-details');
  var resultPreview = document.getElementById('result-preview');
  var resultPlaceholder = document.getElementById('result-placeholder');
  var resultDetails = document.getElementById('result-details');

  if (!fileInput || !maxFileSizeInput || !widthInput || !heightInput || !aspectLock ||
      !formatInput || !downloadButton || !status) {
    return;
  }

  function bindToolDropzone(input, dropzone, browseButton, updateStatus) {
    if (!input || !dropzone || !browseButton) { return; }
    browseButton.addEventListener('click', function () {
      input.click();
    });
    input.addEventListener('change', function () {
      if (input.files && input.files.length) {
        updateStatus('Checking selected image…', 'info');
      }
    });
    dropzone.addEventListener('dragenter', function (event) {
      event.preventDefault();
      dropzone.classList.add('is-dragging');
    });
    dropzone.addEventListener('dragover', function (event) {
      event.preventDefault();
      if (event.dataTransfer) { event.dataTransfer.dropEffect = 'copy'; }
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
        updateStatus('No file was found. Choose a JPG, PNG, or WebP image.', 'error');
        return;
      }
      if (files.length !== 1) {
        updateStatus('Please drop one image at a time.', 'error');
        return;
      }
      try {
        var transfer = new DataTransfer();
        transfer.items.add(files[0]);
        input.files = transfer.files;
        updateStatus('Checking selected image…', 'info');
        input.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (error) {
        updateStatus('Drag-and-drop is unavailable in this browser. Use “browse files” instead.', 'error');
      }
    });
  }

  bindToolDropzone(
    fileInput,
    document.getElementById('resizer-dropzone'),
    document.getElementById('resizer-browse'),
    function (message, state) { setStatus(message, state); }
  );

  var heroDropzone = document.getElementById('hero-upload-dropzone');
  var heroBrowseButton = document.getElementById('hero-browse-button');
  var heroUploadStatus = document.getElementById('hero-upload-status');

  function setHeroUploadStatus(message, state) {
    if (!heroUploadStatus) { return; }
    heroUploadStatus.textContent = message;
    heroUploadStatus.dataset.state = state || 'info';
  }

  if (heroDropzone && heroBrowseButton && heroUploadStatus) {
    var statusObserver = new MutationObserver(function () {
      setHeroUploadStatus(status.textContent, status.dataset.state);
    });
    statusObserver.observe(status, { childList: true, characterData: true, subtree: true, attributes: true });

    heroBrowseButton.addEventListener('click', function () {
      fileInput.click();
    });

    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files.length) {
        setHeroUploadStatus('Checking selected image…');
      }
    });

    heroDropzone.addEventListener('dragenter', function (event) {
      event.preventDefault();
      heroDropzone.classList.add('is-dragging');
    });

    heroDropzone.addEventListener('dragover', function (event) {
      event.preventDefault();
      if (event.dataTransfer) { event.dataTransfer.dropEffect = 'copy'; }
    });

    heroDropzone.addEventListener('dragleave', function (event) {
      if (!event.relatedTarget || !heroDropzone.contains(event.relatedTarget)) {
        heroDropzone.classList.remove('is-dragging');
      }
    });

    heroDropzone.addEventListener('drop', function (event) {
      event.preventDefault();
      heroDropzone.classList.remove('is-dragging');
      var files = event.dataTransfer && event.dataTransfer.files;
      if (!files || !files.length) {
        setHeroUploadStatus('No file was found. Choose a JPG, PNG, or WebP image.', 'error');
        return;
      }
      if (files.length !== 1) {
        setHeroUploadStatus('Please drop one image at a time.', 'error');
        return;
      }
      try {
        var transfer = new DataTransfer();
        transfer.items.add(files[0]);
        fileInput.files = transfer.files;
        setHeroUploadStatus('Checking selected image…');
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (error) {
        setHeroUploadStatus('Drag-and-drop is not available in this browser. Use “browse files” instead.', 'error');
      }
    });
  }

  var maxDimension = 16384;
  var maxPixels = 40000000;
  var allowedExtensions = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp'
  };
  var sourceUrl = null;
  var outputUrl = null;
  var sourceImage = null;
  var selectedFile = null;
  var outputBlob = null;
  var aspectRatio = 1;
  var ratioLocked = true;
  var loadVersion = 0;
  var renderVersion = 0;
  var mimeExtensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  };

  function setStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state || 'info';
  }

  function formatBytes(bytes) {
    if (bytes < 1024) { return bytes + ' B'; }
    if (bytes < 1024 * 1024) { return (bytes / 1024).toFixed(1) + ' KB'; }
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function loadImage(image, url, errorMessage) {
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
          finish(new Error(errorMessage));
          return;
        }
        finish();
      }
      function onError() {
        finish(new Error(errorMessage));
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

  function clearOutput() {
    renderVersion += 1;
    outputBlob = null;
    downloadButton.disabled = true;
    resultPreview.removeAttribute('src');
    resultPreview.hidden = true;
    resultPlaceholder.hidden = false;
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      outputUrl = null;
    }
    resultDetails.textContent = 'Output dimensions and file size will appear here.';
  }

  function clearSource() {
    clearOutput();
    ratioLocked = true;
    aspectLock.setAttribute('aria-pressed', 'true');
    aspectLock.setAttribute('aria-label', 'Aspect ratio locked');
    lockLabel.textContent = 'Ratio locked';
    sourcePreview.removeAttribute('src');
    sourcePreview.hidden = true;
    sourcePlaceholder.hidden = false;
    sourceDetails.textContent = 'No image selected';
    if (sourceImage) {
      sourceImage.removeAttribute('src');
      sourceImage = null;
    }
    if (sourceUrl) {
      URL.revokeObjectURL(sourceUrl);
      sourceUrl = null;
    }
    widthInput.value = '';
    heightInput.value = '';
    widthInput.disabled = true;
    heightInput.disabled = true;
    widthInput.removeAttribute('aria-invalid');
    heightInput.removeAttribute('aria-invalid');
    aspectLock.disabled = true;
    formatInput.disabled = true;
    if (resizeActionButton) { resizeActionButton.disabled = true; }
    if (resizerResetButton) { resizerResetButton.disabled = true; }
  }

  function getLimitBytes(input) {
    var megabytes = Number(input.value);
    if (!Number.isInteger(megabytes) || megabytes < 1 || megabytes > 100) {
      throw new Error('Choose a maximum file size between 1 and 100 MB.');
    }
    return megabytes * 1024 * 1024;
  }

  function getFileMime(file) {
    var extension = file.name.split('.').pop().toLowerCase();
    var extensionMime = allowedExtensions[extension];
    var declaredMime = file.type.toLowerCase();
    if (declaredMime === 'image/jpg') { declaredMime = 'image/jpeg'; }

    if (!extensionMime || (declaredMime && declaredMime !== 'application/octet-stream' && !mimeExtensions[declaredMime])) {
      throw new Error('Unsupported file. Choose a JPG, PNG, or WebP image.');
    }
    if (mimeExtensions[declaredMime] && declaredMime !== extensionMime) {
      throw new Error('The file extension does not match its image type.');
    }
    return mimeExtensions[declaredMime] ? declaredMime : extensionMime;
  }

  async function validateFileMime(file) {
    var expectedMime = getFileMime(file);
    var signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    var actualMime = null;
    if (signature.length >= 3 && signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff) {
      actualMime = 'image/jpeg';
    } else if (signature.length >= 8 &&
        signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4e && signature[3] === 0x47 &&
        signature[4] === 0x0d && signature[5] === 0x0a && signature[6] === 0x1a && signature[7] === 0x0a) {
      actualMime = 'image/png';
    } else if (signature.length >= 12 &&
        signature[0] === 0x52 && signature[1] === 0x49 && signature[2] === 0x46 && signature[3] === 0x46 &&
        signature[8] === 0x57 && signature[9] === 0x45 && signature[10] === 0x42 && signature[11] === 0x50) {
      actualMime = 'image/webp';
    }

    if (actualMime !== expectedMime) {
      throw new Error('The file contents do not match the selected JPG, PNG, or WebP image type.');
    }
    return actualMime;
  }

  async function createVerifiedImageUrl(blob, width, height) {
    var url = URL.createObjectURL(blob);
    var image = new Image();
    try {
      await loadImage(image, url, 'The encoded image could not be decoded.');
      if (image.naturalWidth !== width || image.naturalHeight !== height) {
        throw new Error('The encoded output dimensions did not match the requested dimensions.');
      }
    } catch (error) {
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
      throw error;
    }
    image.removeAttribute('src');
    return url;
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

  function drawImageToCanvas(context, image, width, height, mime, mode, positionX, positionY) {
    if (mime === 'image/jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
    }

    if (mode === 'fit') {
      var scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
      var fittedWidth = image.naturalWidth * scale;
      var fittedHeight = image.naturalHeight * scale;
      context.drawImage(image, (width - fittedWidth) / 2, (height - fittedHeight) / 2, fittedWidth, fittedHeight);
      return;
    }

    if (mode === 'crop') {
      var sourceRatio = image.naturalWidth / image.naturalHeight;
      var targetRatio = width / height;
      var cropWidth = image.naturalWidth;
      var cropHeight = image.naturalHeight;
      var sourceX = 0;
      var sourceY = 0;
      if (sourceRatio > targetRatio) {
        cropWidth = image.naturalHeight * targetRatio;
        sourceX = (image.naturalWidth - cropWidth) * positionX;
      } else if (sourceRatio < targetRatio) {
        cropHeight = image.naturalWidth / targetRatio;
        sourceY = (image.naturalHeight - cropHeight) * positionY;
      }
      context.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, 0, 0, width, height);
      return;
    }

    context.drawImage(image, 0, 0, width, height);
  }

  function initializeFormats(preferredMime) {
    var options = formatInput.options;
    var firstSupported = null;
    var preferredSupported = null;
    for (var i = 0; i < options.length; i += 1) {
      var option = options[i];
      var supported = supportsOutput(option.value);
      option.disabled = !supported;
      if (!supported && option.text.indexOf('(not supported)') === -1) {
        option.text += ' (not supported)';
      }
      if (supported && firstSupported === null) { firstSupported = option.value; }
      if (supported && option.value === preferredMime) { preferredSupported = option.value; }
    }
    if (preferredSupported || firstSupported) { formatInput.value = preferredSupported || firstSupported; }
    return firstSupported !== null;
  }

  function failLoad(message) {
    clearSource();
    setStatus(message, 'error');
  }

  async function loadFile(file) {
    var version = ++loadVersion;
    selectedFile = file || null;
    clearSource();

    if (!file) {
      setStatus('Choose an image to get started.');
      return;
    }
    sourceDetails.textContent = file.name + ' · ' + formatBytes(file.size) + ' · Checking image…';

    var mime;
    try {
      mime = await validateFileMime(file);
      if (version !== loadVersion) { return; }
      if (file.size > getLimitBytes(maxFileSizeInput)) {
        throw new Error('This file is larger than the selected size limit (' + maxFileSizeInput.value + ' MB).');
      }
    } catch (error) {
      if (version !== loadVersion) { return; }
      failLoad(error.message);
      return;
    }

    setStatus('Loading image…');
    var url;
    try {
      url = URL.createObjectURL(file);
    } catch (error) {
      failLoad('The browser could not allocate memory for this image preview.');
      return;
    }
    var image = new Image();
    try {
      await loadImage(image, url, 'The browser could not decode this image.');
    } catch (error) {
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
      if (version === loadVersion) {
        failLoad('Could not decode this image. The file may be damaged or use an unsupported encoding.');
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
      failLoad('This image is too large to process safely. Maximum dimensions are ' +
        maxDimension.toLocaleString() + ' px per side and ' + (maxPixels / 1000000) + ' megapixels.');
      return;
    }

    sourceUrl = url;
    sourceImage = image;
    sourcePreview.alt = file.name + ' original image preview';
    sourcePreview.src = url;
    sourcePreview.hidden = false;
    sourcePlaceholder.hidden = true;
    sourceDetails.textContent = file.name + ' · ' + imageWidth + ' × ' + imageHeight + ' px · ' + formatBytes(file.size);
    aspectRatio = imageWidth / imageHeight;
    widthInput.value = String(imageWidth);
    heightInput.value = String(imageHeight);
    widthInput.disabled = false;
    heightInput.disabled = false;
    aspectLock.disabled = false;
    formatInput.disabled = false;
    if (resizeActionButton) { resizeActionButton.disabled = false; }
    if (resizerResetButton) { resizerResetButton.disabled = false; }

    if (!initializeFormats(mime)) {
      setStatus('This browser cannot export images from Canvas.', 'error');
      return;
    }
    setStatus('Image ready. Adjust the dimensions or output format.', 'success');
    renderOutput();
  }

  function validDimension(value) {
    return Number.isInteger(value) && value > 0 && value <= maxDimension;
  }

  function renderOutput() {
    clearOutput();
    var version = ++renderVersion;
    if (!sourceImage) {
      widthInput.removeAttribute('aria-invalid');
      heightInput.removeAttribute('aria-invalid');
      if (resizeActionButton) { resizeActionButton.disabled = true; }
      return;
    }

    var width = Number(widthInput.value);
    var height = Number(heightInput.value);
    var widthValid = validDimension(width);
    var heightValid = validDimension(height);
    var withinPixelLimit = widthValid && heightValid && width * height <= maxPixels;
    widthInput.setAttribute('aria-invalid', String(!widthValid || !withinPixelLimit));
    heightInput.setAttribute('aria-invalid', String(!heightValid || !withinPixelLimit));
    var dimensionsValid = widthValid && heightValid && withinPixelLimit;
    if (resizeActionButton) { resizeActionButton.disabled = !dimensionsValid; }
    if (!widthValid || !heightValid) {
      setStatus('Enter whole-number dimensions from 1 to ' + maxDimension.toLocaleString() + ' pixels.', 'error');
      return;
    }
    if (width * height > maxPixels) {
      setStatus('The output exceeds the safe limit of ' + (maxPixels / 1000000) + ' megapixels.', 'error');
      return;
    }

    var mime = formatInput.value;
    if (!mimeExtensions[mime] || !supportsOutput(mime)) {
      setStatus('The selected output format is not supported by this browser.', 'error');
      return;
    }

    setStatus('Creating resized preview…');
    var canvas = document.createElement('canvas');
    var context;
    try {
      canvas.width = width;
      canvas.height = height;
      context = canvas.getContext('2d');
      if (!context) { throw new Error('This browser could not create a Canvas for resizing.'); }
      drawImageToCanvas(context, sourceImage, width, height, mime, 'stretch', 0.5, 0.5);
    } catch (error) {
      canvas.width = 0;
      canvas.height = 0;
      setStatus(error.message || 'Could not draw this image to Canvas. Try a smaller output size.', 'error');
      return;
    }

    new Promise(function (resolve) {
      try {
        canvas.toBlob(resolve, mime, 0.92);
      } catch (error) {
        resolve(null);
      }
    }).then(async function (blob) {
      canvas.width = 0;
      canvas.height = 0;
      if (version !== renderVersion) { return; }
      if (!blob) {
        setStatus('The browser failed to create the resized image. Try a smaller output size.', 'error');
        return;
      }
      if (blob.type.toLowerCase() !== mime) {
        setStatus('This browser cannot export ' + mimeExtensions[mime].toUpperCase() +
          ' from Canvas. Choose another output format.', 'error');
        return;
      }

      var verifiedUrl;
      try {
        verifiedUrl = await createVerifiedImageUrl(blob, width, height);
      } catch (error) {
        if (version === renderVersion) {
          setStatus('The resized output failed verification and cannot be downloaded.', 'error');
        }
        return;
      }
      if (version !== renderVersion) {
        URL.revokeObjectURL(verifiedUrl);
        return;
      }
      outputBlob = blob;
      outputUrl = verifiedUrl;
      resultPreview.alt = selectedFile.name + ' resized image preview';
      resultPreview.src = outputUrl;
      resultPreview.hidden = false;
      resultPlaceholder.hidden = true;
      resultDetails.textContent = width + ' × ' + height + ' px · ' + formatBytes(blob.size);
      downloadButton.disabled = false;
      setStatus('Resized image ready to download.', 'success');
    });
  }

  function updateLockedDimension(changedInput) {
    if (!ratioLocked || !sourceImage) { return; }
    var value = Number(changedInput.value);
    if (!Number.isInteger(value) || value < 1) { return; }
    if (changedInput === widthInput) {
      heightInput.value = String(Math.max(1, Math.round(value / aspectRatio)));
    } else {
      widthInput.value = String(Math.max(1, Math.round(value * aspectRatio)));
    }
  }

  fileInput.addEventListener('change', function () {
    loadFile(fileInput.files && fileInput.files[0]);
  });
  if (resizeActionButton) {
    resizeActionButton.addEventListener('click', function () {
      renderOutput();
    });
  }
  if (resizerResetButton) {
    resizerResetButton.addEventListener('click', function () {
      fileInput.value = '';
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  maxFileSizeInput.addEventListener('change', function () {
    if (selectedFile) { loadFile(selectedFile); }
    else {
      try {
        getLimitBytes(maxFileSizeInput);
        setStatus('Maximum file size set to ' + maxFileSizeInput.value + ' MB.');
      } catch (error) {
        setStatus(error.message, 'error');
      }
    }
  });

  widthInput.addEventListener('input', function () {
    updateLockedDimension(widthInput);
    renderOutput();
  });
  heightInput.addEventListener('input', function () {
    updateLockedDimension(heightInput);
    renderOutput();
  });
  formatInput.addEventListener('change', renderOutput);

  aspectLock.addEventListener('click', function () {
    ratioLocked = !ratioLocked;
    aspectLock.setAttribute('aria-pressed', String(ratioLocked));
    lockLabel.textContent = ratioLocked ? 'Ratio locked' : 'Stretch enabled';
    aspectLock.setAttribute('aria-label', ratioLocked
      ? 'Aspect ratio locked'
      : 'Aspect ratio unlocked; image will stretch to fit both dimensions');
    if (ratioLocked) { updateLockedDimension(widthInput); }
    renderOutput();
  });

  downloadButton.addEventListener('click', function () {
    if (!outputBlob || !sourceImage) { return; }
    var extension = mimeExtensions[outputBlob.type.toLowerCase()];
    if (!extension) {
      setStatus('Cannot download because the browser returned an unsupported image format.', 'error');
      return;
    }
    var baseName = selectedFile.name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
    var link = document.createElement('a');
    link.href = outputUrl;
    link.download = (baseName || 'resized-image') + '-resized.' + extension;
    document.body.appendChild(link);
    link.click();
    link.remove();
  });

  var compressFileInput = document.getElementById('compress-file');
  var compressMaxSizeInput = document.getElementById('compress-max-file-size');
  var compressQualityInput = document.getElementById('compress-quality');
  var compressQualityValue = document.getElementById('compress-quality-value');
  var compressQualityNote = document.getElementById('compress-quality-note');
  var compressStatus = document.getElementById('compress-status');
  var compressSourcePreview = document.getElementById('compress-source-preview');
  var compressSourcePlaceholder = document.getElementById('compress-source-placeholder');
  var compressOriginalDetails = document.getElementById('compress-original-details');
  var compressResultPreview = document.getElementById('compress-result-preview');
  var compressResultPlaceholder = document.getElementById('compress-result-placeholder');
  var compressResultDetails = document.getElementById('compress-result-details');
  var compressDownloadButton = document.getElementById('download-compressed');
  var compressActionButton = document.getElementById('compress-image-action');
  var compressResetButton = document.getElementById('compress-reset');

  if (compressFileInput && compressMaxSizeInput && compressQualityInput && compressQualityValue &&
      compressQualityNote && compressStatus && compressSourcePreview && compressSourcePlaceholder &&
      compressOriginalDetails && compressResultPreview && compressResultPlaceholder &&
      compressResultDetails && compressDownloadButton) {
    bindToolDropzone(
      compressFileInput,
      document.getElementById('compress-dropzone'),
      document.getElementById('compress-browse'),
      function (message, state) { setCompressStatus(message, state); }
    );
    var compressSourceUrl = null;
    var compressOutputUrl = null;
    var compressSourceImage = null;
    var compressSelectedFile = null;
    var compressOutputBlob = null;
    var compressLoadVersion = 0;
    var compressRenderVersion = 0;
    var compressMime = null;

    function setCompressStatus(message, state) {
      compressStatus.textContent = message;
      compressStatus.dataset.state = state || 'info';
    }

    function clearCompressOutput() {
      compressRenderVersion += 1;
      compressOutputBlob = null;
      compressDownloadButton.disabled = true;
      compressResultPreview.removeAttribute('src');
      compressResultPreview.hidden = true;
      compressResultPlaceholder.hidden = false;
      if (compressOutputUrl) {
        URL.revokeObjectURL(compressOutputUrl);
        compressOutputUrl = null;
      }
      compressResultDetails.textContent = 'Output size and reduction will appear here.';
    }

    function clearCompressSource() {
      clearCompressOutput();
      compressSourcePreview.removeAttribute('src');
      compressSourcePreview.hidden = true;
      compressSourcePlaceholder.hidden = false;
      compressOriginalDetails.textContent = 'No image selected';
      if (compressSourceImage) {
        compressSourceImage.removeAttribute('src');
        compressSourceImage = null;
      }
      if (compressSourceUrl) {
        URL.revokeObjectURL(compressSourceUrl);
        compressSourceUrl = null;
      }
      compressQualityInput.disabled = true;
      if (compressActionButton) { compressActionButton.disabled = true; }
      if (compressResetButton) { compressResetButton.disabled = true; }
      compressMime = null;
    }

    async function loadCompressorFile(file) {
      var version = ++compressLoadVersion;
      compressSelectedFile = file || null;
      clearCompressSource();
      if (!file) {
        setCompressStatus('Choose an image to get started.');
        return;
      }
      compressOriginalDetails.textContent = file.name + ' · ' + formatBytes(file.size) + ' · Checking image…';

      try {
        compressMime = await validateFileMime(file);
        if (version !== compressLoadVersion) { return; }
        if (file.size > getLimitBytes(compressMaxSizeInput)) {
          throw new Error('This file is larger than the selected size limit (' + compressMaxSizeInput.value + ' MB).');
        }
      } catch (error) {
        if (version !== compressLoadVersion) { return; }
        compressMime = null;
        setCompressStatus(error.message, 'error');
        return;
      }

      setCompressStatus('Loading image…');
      var url;
      try {
        url = URL.createObjectURL(file);
      } catch (error) {
        compressMime = null;
        setCompressStatus('The browser could not allocate memory for this image preview.', 'error');
        return;
      }
      var image = new Image();
      try {
        await loadImage(image, url, 'The browser could not decode this image.');
      } catch (error) {
        image.removeAttribute('src');
        URL.revokeObjectURL(url);
        if (version === compressLoadVersion) {
          compressMime = null;
          setCompressStatus('Could not decode this image. The file may be damaged or use an unsupported encoding.', 'error');
        }
        return;
      }

      if (version !== compressLoadVersion) {
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
        compressMime = null;
        setCompressStatus('This image is too large to process safely. Maximum dimensions are ' +
          maxDimension.toLocaleString() + ' px per side and ' + (maxPixels / 1000000) + ' megapixels.', 'error');
        return;
      }

      compressSourceUrl = url;
      compressSourceImage = image;
      compressSourcePreview.alt = file.name + ' original image preview';
      compressSourcePreview.src = url;
      compressSourcePreview.hidden = false;
      compressSourcePlaceholder.hidden = true;
      compressOriginalDetails.textContent = file.name + ' · ' + imageWidth + ' × ' + imageHeight +
        ' px · Original: ' + formatBytes(file.size);
      var canEncode = supportsOutput(compressMime);
      compressQualityInput.disabled = compressMime === 'image/png' || !canEncode;
      compressQualityNote.textContent = compressMime === 'image/png'
        ? 'PNG uses lossless Canvas output; the quality slider does not apply.'
        : 'JPEG and WebP use the selected quality. Lower quality can reduce file size but may reduce image quality.';

      if (!canEncode) {
        setCompressStatus('This browser cannot encode ' + mimeExtensions[compressMime].toUpperCase() +
          ' output using Canvas. Try another supported input format or browser.', 'error');
        return;
      }
      if (compressActionButton) { compressActionButton.disabled = false; }
      if (compressResetButton) { compressResetButton.disabled = false; }
      setCompressStatus('Image ready. Adjust the quality and review the output.', 'success');
      createCompressedOutput();
    }

    function createCompressedOutput() {
      clearCompressOutput();
      var version = ++compressRenderVersion;
      if (!compressSourceImage || !compressSelectedFile || !compressMime) { return; }
      if (!supportsOutput(compressMime)) {
        setCompressStatus('This browser cannot encode the selected image format.', 'error');
        return;
      }

      var width = compressSourceImage.naturalWidth;
      var height = compressSourceImage.naturalHeight;
      var canvas = document.createElement('canvas');
      var context;
      try {
        canvas.width = width;
        canvas.height = height;
        context = canvas.getContext('2d');
        if (!context) { throw new Error('This browser could not create a Canvas for compression.'); }
        drawImageToCanvas(context, compressSourceImage, width, height, compressMime, 'stretch', 0.5, 0.5);
      } catch (error) {
        canvas.width = 0;
        canvas.height = 0;
        setCompressStatus(error.message || 'Could not draw this image to Canvas.', 'error');
        return;
      }

      var quality = Number(compressQualityInput.value);
      setCompressStatus('Encoding and verifying output…');
      new Promise(function (resolve) {
        try {
          canvas.toBlob(resolve, compressMime, compressMime === 'image/png' ? undefined : quality);
        } catch (error) {
          resolve(null);
        }
      }).then(async function (blob) {
        canvas.width = 0;
        canvas.height = 0;
        if (version !== compressRenderVersion) { return; }
        if (!blob || !blob.size) {
          setCompressStatus('The browser could not encode this image. Try another supported format or browser.', 'error');
          return;
        }
        if (blob.type.toLowerCase() !== compressMime) {
          setCompressStatus('The browser returned an unsupported output format; no download is available.', 'error');
          return;
        }

        var verificationUrl = URL.createObjectURL(blob);
        var verificationImage = new Image();
        try {
          await loadImage(verificationImage, verificationUrl, 'The encoded image could not be decoded.');
        } catch (error) {
          verificationImage.removeAttribute('src');
          URL.revokeObjectURL(verificationUrl);
          if (version === compressRenderVersion) {
            setCompressStatus('The encoded output failed verification and cannot be downloaded.', 'error');
          }
          return;
        }
        var verified = verificationImage.naturalWidth === width && verificationImage.naturalHeight === height;
        verificationImage.removeAttribute('src');
        if (!verified || version !== compressRenderVersion) {
          URL.revokeObjectURL(verificationUrl);
          if (version === compressRenderVersion) {
            setCompressStatus('The encoded output dimensions did not match the original; no download is available.', 'error');
          }
          return;
        }

        compressOutputBlob = blob;
        compressOutputUrl = verificationUrl;
        compressResultPreview.alt = compressSelectedFile.name + ' compressed image preview';
        compressResultPreview.src = verificationUrl;
        compressResultPreview.hidden = false;
        compressResultPlaceholder.hidden = true;
        var reduction = ((compressSelectedFile.size - blob.size) / compressSelectedFile.size) * 100;
        var roundedChange = Math.abs(reduction).toFixed(1);
        var delta = blob.size === compressSelectedFile.size
          ? '0.0% reduction'
          : (reduction > 0 ? (roundedChange === '0.0' ? '<0.1% smaller' : roundedChange + '% smaller')
            : (roundedChange === '0.0' ? '<0.1% larger' : roundedChange + '% larger'));
        compressResultDetails.textContent = width + ' × ' + height + ' px · Output size: ' +
          formatBytes(blob.size) + ' · ' + delta;
        compressDownloadButton.disabled = false;
        if (blob.size < compressSelectedFile.size) {
          setCompressStatus('Verified output is ' + (roundedChange === '0.0' ? 'less than 0.1%' :
            roundedChange + '%') + ' smaller than the original.', 'success');
        } else if (blob.size === compressSelectedFile.size) {
          setCompressStatus('Output verified, but it is the same size as the original; no size reduction was achieved.', 'info');
        } else {
          setCompressStatus('Output verified, but it is larger than the original. The original remains unchanged.', 'info');
        }
      }).catch(function () {
        canvas.width = 0;
        canvas.height = 0;
        if (version === compressRenderVersion) {
          setCompressStatus('The browser encountered an error while verifying the output; no download is available.', 'error');
        }
      });
    }

    compressFileInput.addEventListener('change', function () {
      loadCompressorFile(compressFileInput.files && compressFileInput.files[0]);
    });
    if (compressActionButton) {
      compressActionButton.addEventListener('click', function () {
        createCompressedOutput();
      });
    }
    if (compressResetButton) {
      compressResetButton.addEventListener('click', function () {
        compressFileInput.value = '';
        compressFileInput.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
    compressMaxSizeInput.addEventListener('change', function () {
      if (compressSelectedFile) {
        loadCompressorFile(compressSelectedFile);
        return;
      }
      try {
        getLimitBytes(compressMaxSizeInput);
        setCompressStatus('Maximum file size set to ' + compressMaxSizeInput.value + ' MB.');
      } catch (error) {
        setCompressStatus(error.message, 'error');
      }
    });
    compressQualityInput.addEventListener('input', function () {
      compressQualityValue.value = Math.round(Number(compressQualityInput.value) * 100) + '%';
      compressQualityValue.textContent = compressQualityValue.value;
      if (compressSourceImage && compressMime !== 'image/png') { createCompressedOutput(); }
    });
    compressDownloadButton.addEventListener('click', function () {
      if (!compressOutputBlob || !compressSelectedFile) { return; }
      var extension = mimeExtensions[compressOutputBlob.type.toLowerCase()];
      if (!extension) {
        setCompressStatus('Cannot download because the browser returned an unsupported image format.', 'error');
        return;
      }
      var baseName = compressSelectedFile.name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
      var suffix = compressOutputBlob.size < compressSelectedFile.size ? '-compressed.' : '-reencoded.';
      var link = document.createElement('a');
      link.href = compressOutputUrl;
      link.download = (baseName || 'image') + suffix + extension;
      document.body.appendChild(link);
      link.click();
      link.remove();
    });

    window.addEventListener('beforeunload', function () {
      if (compressSourceImage) { compressSourceImage.removeAttribute('src'); }
      if (compressSourceUrl) { URL.revokeObjectURL(compressSourceUrl); }
      if (compressOutputUrl) { URL.revokeObjectURL(compressOutputUrl); }
    });
  }

  var thumbnailFileInput = document.getElementById('thumbnail-file');
  var thumbnailMaxSizeInput = document.getElementById('thumbnail-max-file-size');
  var thumbnailModeInput = document.getElementById('thumbnail-mode');
  var thumbnailFormatInput = document.getElementById('thumbnail-format');
  var thumbnailCropControls = document.getElementById('thumbnail-crop-controls');
  var thumbnailPositionX = document.getElementById('thumbnail-position-x');
  var thumbnailPositionXValue = document.getElementById('thumbnail-position-x-value');
  var thumbnailPositionY = document.getElementById('thumbnail-position-y');
  var thumbnailPositionYValue = document.getElementById('thumbnail-position-y-value');
  var thumbnailStatus = document.getElementById('thumbnail-status');
  var thumbnailSourcePreview = document.getElementById('thumbnail-source-preview');
  var thumbnailSourcePlaceholder = document.getElementById('thumbnail-source-placeholder');
  var thumbnailSourceDetails = document.getElementById('thumbnail-source-details');
  var thumbnailResultPreview = document.getElementById('thumbnail-result-preview');
  var thumbnailResultPlaceholder = document.getElementById('thumbnail-result-placeholder');
  var thumbnailResultDetails = document.getElementById('thumbnail-result-details');
  var thumbnailDownloadButton = document.getElementById('download-thumbnail');

  if (thumbnailFileInput && thumbnailMaxSizeInput && thumbnailModeInput && thumbnailFormatInput &&
      thumbnailCropControls && thumbnailPositionX && thumbnailPositionXValue && thumbnailPositionY &&
      thumbnailPositionYValue && thumbnailStatus && thumbnailSourcePreview && thumbnailSourcePlaceholder &&
      thumbnailSourceDetails && thumbnailResultPreview && thumbnailResultPlaceholder &&
      thumbnailResultDetails && thumbnailDownloadButton) {
    var thumbnailWidth = 1280;
    var thumbnailHeight = 720;
    var thumbnailSourceUrl = null;
    var thumbnailOutputUrl = null;
    var thumbnailSourceImage = null;
    var thumbnailSelectedFile = null;
    var thumbnailOutputBlob = null;
    var thumbnailMime = null;
    var thumbnailLoadVersion = 0;
    var thumbnailRenderVersion = 0;

    function setThumbnailStatus(message, state) {
      thumbnailStatus.textContent = message;
      thumbnailStatus.dataset.state = state || 'info';
    }

    function clearThumbnailOutput() {
      thumbnailRenderVersion += 1;
      thumbnailOutputBlob = null;
      thumbnailDownloadButton.disabled = true;
      thumbnailResultPreview.removeAttribute('src');
      thumbnailResultPreview.hidden = true;
      thumbnailResultPlaceholder.hidden = false;
      thumbnailResultDetails.textContent = 'Final output dimensions and file size will appear here.';
      if (thumbnailOutputUrl) {
        URL.revokeObjectURL(thumbnailOutputUrl);
        thumbnailOutputUrl = null;
      }
    }

    function clearThumbnailSource() {
      clearThumbnailOutput();
      thumbnailSourcePreview.removeAttribute('src');
      thumbnailSourcePreview.hidden = true;
      thumbnailSourcePlaceholder.hidden = false;
      thumbnailSourceDetails.textContent = 'Dimensions and file size will appear here.';
      if (thumbnailSourceImage) {
        thumbnailSourceImage.removeAttribute('src');
        thumbnailSourceImage = null;
      }
      if (thumbnailSourceUrl) {
        URL.revokeObjectURL(thumbnailSourceUrl);
        thumbnailSourceUrl = null;
      }
      thumbnailModeInput.disabled = true;
      thumbnailFormatInput.disabled = true;
      thumbnailPositionX.disabled = true;
      thumbnailPositionY.disabled = true;
    }

    function initializeThumbnailFormats(preferredMime) {
      var options = thumbnailFormatInput.options;
      var firstSupported = null;
      var preferredSupported = null;
      for (var i = 0; i < options.length; i += 1) {
        var option = options[i];
        var supported = supportsOutput(option.value);
        option.disabled = !supported;
        if (!supported && option.text.indexOf('(not supported)') === -1) {
          option.text += ' (not supported)';
        }
        if (supported && firstSupported === null) { firstSupported = option.value; }
        if (supported && option.value === preferredMime) { preferredSupported = option.value; }
      }
      if (preferredSupported || firstSupported) {
        thumbnailFormatInput.value = preferredSupported || firstSupported;
      }
      return firstSupported !== null;
    }

    async function loadThumbnailFile(file) {
      var version = ++thumbnailLoadVersion;
      thumbnailSelectedFile = file || null;
      clearThumbnailSource();
      if (!file) {
        thumbnailMime = null;
        setThumbnailStatus('Choose an image to get started.');
        return;
      }

      try {
        thumbnailMime = await validateFileMime(file);
        if (version !== thumbnailLoadVersion) { return; }
        if (file.size > getLimitBytes(thumbnailMaxSizeInput)) {
          throw new Error('This file is larger than the selected size limit (' + thumbnailMaxSizeInput.value + ' MB).');
        }
      } catch (error) {
        if (version !== thumbnailLoadVersion) { return; }
        thumbnailMime = null;
        setThumbnailStatus(error.message, 'error');
        return;
      }

      setThumbnailStatus('Loading image…');
      var url;
      try {
        url = URL.createObjectURL(file);
      } catch (error) {
        thumbnailMime = null;
        setThumbnailStatus('The browser could not allocate memory for this image preview.', 'error');
        return;
      }
      var image = new Image();
      try {
        await loadImage(image, url, 'The browser could not decode this image.');
      } catch (error) {
        image.removeAttribute('src');
        URL.revokeObjectURL(url);
        if (version === thumbnailLoadVersion) {
          thumbnailMime = null;
          setThumbnailStatus('Could not decode this image. The file may be damaged or use an unsupported encoding.', 'error');
        }
        return;
      }

      if (version !== thumbnailLoadVersion) {
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
        thumbnailMime = null;
        setThumbnailStatus('This image is too large to process safely. Maximum dimensions are ' +
          maxDimension.toLocaleString() + ' px per side and ' + (maxPixels / 1000000) + ' megapixels.', 'error');
        return;
      }

      thumbnailSourceUrl = url;
      thumbnailSourceImage = image;
      thumbnailSourcePreview.alt = file.name + ' original image preview';
      thumbnailSourcePreview.src = url;
      thumbnailSourcePreview.hidden = false;
      thumbnailSourcePlaceholder.hidden = true;
      thumbnailSourceDetails.textContent = imageWidth + ' × ' + imageHeight + ' px · ' + formatBytes(file.size);
      thumbnailModeInput.disabled = false;
      thumbnailFormatInput.disabled = false;
      var formatsSupported = initializeThumbnailFormats(thumbnailMime);
      if (!formatsSupported) {
        setThumbnailStatus('This browser cannot export images from Canvas.', 'error');
        return;
      }
      setThumbnailCropControls();
      renderThumbnail();
    }

    function setThumbnailCropControls() {
      var cropEnabled = Boolean(thumbnailSourceImage) && thumbnailModeInput.value === 'crop';
      thumbnailCropControls.hidden = !cropEnabled;
      thumbnailPositionX.disabled = !cropEnabled;
      thumbnailPositionY.disabled = !cropEnabled;
    }

    function renderThumbnail() {
      clearThumbnailOutput();
      var version = ++thumbnailRenderVersion;
      if (!thumbnailSourceImage || !thumbnailSelectedFile || !thumbnailMime) { return; }

      var outputMime = thumbnailFormatInput.value;
      if (!mimeExtensions[outputMime] || !supportsOutput(outputMime)) {
        setThumbnailStatus('The selected output format is not supported by this browser.', 'error');
        return;
      }

      var mode = thumbnailModeInput.value;
      var positionX = Number(thumbnailPositionX.value) / 100;
      var positionY = Number(thumbnailPositionY.value) / 100;
      var canvas = document.createElement('canvas');
      var context;
      try {
        canvas.width = thumbnailWidth;
        canvas.height = thumbnailHeight;
        context = canvas.getContext('2d');
        if (!context) { throw new Error('This browser could not create a Canvas for the thumbnail.'); }
        drawImageToCanvas(context, thumbnailSourceImage, thumbnailWidth, thumbnailHeight, outputMime,
          mode, positionX, positionY);
      } catch (error) {
        canvas.width = 0;
        canvas.height = 0;
        setThumbnailStatus(error.message || 'Could not draw this image to Canvas.', 'error');
        return;
      }

      setThumbnailStatus('Creating thumbnail preview…');
      new Promise(function (resolve) {
        try {
          canvas.toBlob(resolve, outputMime, outputMime === 'image/png' ? undefined : 0.92);
        } catch (error) {
          resolve(null);
        }
      }).then(async function (blob) {
        canvas.width = 0;
        canvas.height = 0;
        if (version !== thumbnailRenderVersion) { return; }
        if (!blob || !blob.size) {
          setThumbnailStatus('The browser could not encode this thumbnail. Try another output format.', 'error');
          return;
        }
        if (blob.type.toLowerCase() !== outputMime) {
          setThumbnailStatus('The browser returned an unsupported output format; no download is available.', 'error');
          return;
        }

        var verificationUrl = URL.createObjectURL(blob);
        var verificationImage = new Image();
        try {
          await loadImage(verificationImage, verificationUrl, 'The encoded thumbnail could not be decoded.');
        } catch (error) {
          verificationImage.removeAttribute('src');
          URL.revokeObjectURL(verificationUrl);
          if (version === thumbnailRenderVersion) {
            setThumbnailStatus('The encoded thumbnail failed verification and cannot be downloaded.', 'error');
          }
          return;
        }

        var verified = verificationImage.naturalWidth === thumbnailWidth &&
          verificationImage.naturalHeight === thumbnailHeight;
        verificationImage.removeAttribute('src');
        if (!verified || version !== thumbnailRenderVersion) {
          URL.revokeObjectURL(verificationUrl);
          if (version === thumbnailRenderVersion) {
            setThumbnailStatus('The encoded output dimensions did not match 1280 × 720; no download is available.', 'error');
          }
          return;
        }

        thumbnailOutputBlob = blob;
        thumbnailOutputUrl = verificationUrl;
        thumbnailResultPreview.alt = thumbnailSelectedFile.name + ' 1280 by 720 thumbnail preview';
        thumbnailResultPreview.src = verificationUrl;
        thumbnailResultPreview.hidden = false;
        thumbnailResultPlaceholder.hidden = true;
        thumbnailResultDetails.textContent = thumbnailWidth + ' × ' + thumbnailHeight + ' px · Final file size: ' + formatBytes(blob.size);
        thumbnailDownloadButton.disabled = false;
        setThumbnailStatus('Verified 1280 × 720 thumbnail ready to download.', 'success');
      }).catch(function () {
        canvas.width = 0;
        canvas.height = 0;
        if (version === thumbnailRenderVersion) {
          setThumbnailStatus('The browser encountered an error while verifying the thumbnail; no download is available.', 'error');
        }
      });
    }

    thumbnailFileInput.addEventListener('change', function () {
      loadThumbnailFile(thumbnailFileInput.files && thumbnailFileInput.files[0]);
    });
    thumbnailMaxSizeInput.addEventListener('change', function () {
      if (thumbnailSelectedFile) {
        loadThumbnailFile(thumbnailSelectedFile);
        return;
      }
      try {
        getLimitBytes(thumbnailMaxSizeInput);
        setThumbnailStatus('Maximum file size set to ' + thumbnailMaxSizeInput.value + ' MB.');
      } catch (error) {
        setThumbnailStatus(error.message, 'error');
      }
    });
    thumbnailModeInput.addEventListener('change', function () {
      setThumbnailCropControls();
      renderThumbnail();
    });
    thumbnailFormatInput.addEventListener('change', renderThumbnail);
    thumbnailPositionX.addEventListener('input', function () {
      thumbnailPositionXValue.value = thumbnailPositionX.value + '%';
      thumbnailPositionXValue.textContent = thumbnailPositionXValue.value;
      renderThumbnail();
    });
    thumbnailPositionY.addEventListener('input', function () {
      thumbnailPositionYValue.value = thumbnailPositionY.value + '%';
      thumbnailPositionYValue.textContent = thumbnailPositionYValue.value;
      renderThumbnail();
    });
    thumbnailDownloadButton.addEventListener('click', function () {
      if (!thumbnailOutputBlob || !thumbnailSelectedFile) { return; }
      var extension = mimeExtensions[thumbnailOutputBlob.type.toLowerCase()];
      if (!extension) {
        setThumbnailStatus('Cannot download because the browser returned an unsupported image format.', 'error');
        return;
      }
      var baseName = thumbnailSelectedFile.name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
      var link = document.createElement('a');
      link.href = thumbnailOutputUrl;
      link.download = (baseName || 'image') + '-youtube-thumbnail.' + extension;
      document.body.appendChild(link);
      link.click();
      link.remove();
    });

    window.addEventListener('beforeunload', function () {
      if (thumbnailSourceImage) { thumbnailSourceImage.removeAttribute('src'); }
      if (thumbnailSourceUrl) { URL.revokeObjectURL(thumbnailSourceUrl); }
      if (thumbnailOutputUrl) { URL.revokeObjectURL(thumbnailOutputUrl); }
    });
  }

  window.addEventListener('beforeunload', function () {
    if (sourceImage) { sourceImage.removeAttribute('src'); }
    if (sourceUrl) { URL.revokeObjectURL(sourceUrl); }
    if (outputUrl) { URL.revokeObjectURL(outputUrl); }
  });
})();
