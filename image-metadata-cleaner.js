(function () {
  'use strict';
  var MAX_BYTES = 20 * 1024 * 1024;
  var MAX_DIMENSION = 16384;
  var MAX_PIXELS = 40000000;
  var types = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
  var input=document.getElementById('metadata-file');
  var dropzone=document.getElementById('metadata-dropzone');
  var browse=document.getElementById('metadata-browse');
  var selected=document.getElementById('metadata-selected');
  var fileName=document.getElementById('metadata-file-name');
  var sourceDetails=document.getElementById('metadata-source-details');
  var originalInfo=document.getElementById('metadata-original-info');
  var outputInfo=document.getElementById('metadata-output-info');
  var originalPreview=document.getElementById('metadata-original-preview');
  var outputPreview=document.getElementById('metadata-output-preview');
  var originalPlaceholder=document.getElementById('metadata-original-placeholder');
  var outputPlaceholder=document.getElementById('metadata-output-placeholder');
  var format=document.getElementById('metadata-format');
  var jpegBg=document.getElementById('metadata-jpeg-bg');
  var processButton=document.getElementById('metadata-process');
  var downloadButton=document.getElementById('metadata-download');
  var resetButton=document.getElementById('metadata-reset');
  var status=document.getElementById('metadata-status');
  var sourceImage=null, sourceFile=null, sourceUrl=null, outputUrl=null, outputBlob=null, version=0;
  function say(message){status.textContent=message;}
  function bytes(n){if(n<1024)return n+' B';if(n<1024*1024)return (n/1024).toFixed(1)+' KB';return (n/(1024*1024)).toFixed(2)+' MB';}
  function revoke(url){if(url)URL.revokeObjectURL(url);}
  function clearOutput(){revoke(outputUrl);outputUrl=null;outputBlob=null;outputPreview.removeAttribute('src');outputPreview.hidden=true;outputPlaceholder.hidden=false;outputInfo.textContent='The output will appear here after processing.';downloadButton.disabled=true;}
  function reset(){version++;revoke(sourceUrl);sourceUrl=null;sourceImage=null;sourceFile=null;clearOutput();input.value='';selected.hidden=true;originalPreview.removeAttribute('src');originalPreview.hidden=true;originalPlaceholder.hidden=false;originalInfo.textContent='Dimensions and file size will appear here.';sourceDetails.textContent='Original image details';fileName.textContent='Selected image';format.disabled=true;jpegBg.disabled=true;processButton.disabled=true;resetButton.disabled=true;say('Choose an image to get started.');}
  function validSignature(buffer,type){var b=new Uint8Array(buffer);if(type==='image/jpeg')return b.length>2&&b[0]===255&&b[1]===216&&b[2]===255;if(type==='image/png')return b.length>8&&b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10;if(type==='image/webp')return b.length>12&&String.fromCharCode.apply(null,b.slice(0,4))==='RIFF'&&String.fromCharCode.apply(null,b.slice(8,12))==='WEBP';return false;}
  function loadFile(file){
    if(!file){say('Choose an image to get started.');return;}
    var current=++version;
    revoke(sourceUrl);sourceUrl=null;sourceImage=null;sourceFile=null;
    originalPreview.removeAttribute('src');originalPreview.hidden=true;originalPlaceholder.hidden=false;
    originalInfo.textContent='Dimensions and file size will appear here.';
    selected.hidden=true;format.disabled=true;jpegBg.disabled=true;processButton.disabled=true;resetButton.disabled=true;
    clearOutput();
    if(file.size===0){say('This file is empty. Choose another image.');return;}
    if(file.size>MAX_BYTES){say('This image exceeds the 20 MB file limit. Choose a smaller file.');return;}
    if(!types[file.type]){say('Unsupported file type. Choose a JPG, PNG, or WebP image.');return;}
    if(!/\.(jpe?g|png|webp)$/i.test(file.name)){say('The file extension does not match a supported image type.');return;}
    file.slice(0,16).arrayBuffer().then(function(sig){
      if(current!==version)return;
      if(!validSignature(sig,file.type)){say('The file contents do not match the declared image type. Choose a valid JPG, PNG, or WebP.');return;}
      var fileUrl=URL.createObjectURL(file);sourceUrl=fileUrl;
      var img=new Image();
      img.onload=function(){
        if(current!==version){revoke(fileUrl);return;}
        if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth>MAX_DIMENSION||img.naturalHeight>MAX_DIMENSION||img.naturalWidth*img.naturalHeight>MAX_PIXELS){revoke(fileUrl);if(sourceUrl===fileUrl)sourceUrl=null;say('This image exceeds the supported dimensions. Maximum: 16,384 pixels per side and 40 megapixels.');return;}
        sourceImage=img;sourceFile=file;selected.hidden=false;fileName.textContent=file.name;sourceDetails.textContent=img.naturalWidth+' × '+img.naturalHeight+' · '+bytes(file.size);originalInfo.textContent=img.naturalWidth+' × '+img.naturalHeight+' · '+bytes(file.size);originalPreview.src=sourceUrl;originalPreview.hidden=false;originalPlaceholder.hidden=true;format.disabled=false;jpegBg.disabled=false;processButton.disabled=false;resetButton.disabled=false;say('Image ready. Create a re-encoded copy when you are ready.');
      };
      img.onerror=function(){revoke(fileUrl);if(current!==version)return;if(sourceUrl===fileUrl)sourceUrl=null;sourceImage=null;sourceFile=null;say('The image could not be decoded. Choose a valid image file.');};
      img.src=fileUrl;
    }).catch(function(){if(current===version)say('The file could not be read. Try another image.');});
  }
  function makeOutput(){
    if(!sourceImage||!sourceFile){say('Choose an image before creating an output.');return;}
    var current=version;processButton.disabled=true;downloadButton.disabled=true;say('Creating a fresh copy in your browser…');
    try{
      var canvas=document.createElement('canvas');canvas.width=sourceImage.naturalWidth;canvas.height=sourceImage.naturalHeight;
      var ctx=canvas.getContext('2d');
      if(!ctx)throw new Error('Canvas unavailable');
      var mime=format.value;
      if(mime==='image/jpeg'){ctx.fillStyle=jpegBg.value;ctx.fillRect(0,0,canvas.width,canvas.height);}
      ctx.drawImage(sourceImage,0,0);
      canvas.toBlob(function(blob){
        if(current!==version){return;}
        processButton.disabled=false;
        if(!blob){say('The browser could not create the image. Try another output format.');return;}
        if(blob.type!==mime){say('This browser did not support the selected output format. Choose another format.');return;}
        var url=URL.createObjectURL(blob), check=new Image();
        check.onload=function(){
          if(current!==version){revoke(url);return;}
          if(check.naturalWidth!==canvas.width||check.naturalHeight!==canvas.height){revoke(url);say('The generated image dimensions did not match. Please try again.');return;}
          clearOutput();outputUrl=url;outputBlob=blob;outputPreview.src=url;outputPreview.hidden=false;outputPlaceholder.hidden=true;outputInfo.textContent=check.naturalWidth+' × '+check.naturalHeight+' · '+bytes(blob.size)+' · '+mime;
          downloadButton.disabled=false;say('Re-encoded copy ready. This can remove many metadata fields, but complete removal is not guaranteed.');
        };
        check.onerror=function(){revoke(url);if(current===version)say('The browser could not verify the generated image. Please try another format.');};
        check.src=url;
      },mime,mime==='image/jpeg'||mime==='image/webp'?0.92:undefined);
    }catch(e){processButton.disabled=false;say('Image processing failed in this browser. Try another image or output format.');}
  }
  browse.addEventListener('click',function(){input.click();});
  input.addEventListener('change',function(){if(input.files&&input.files[0])loadFile(input.files[0]);});
  ['dragenter','dragover'].forEach(function(name){dropzone.addEventListener(name,function(e){e.preventDefault();dropzone.classList.add('is-dragging');});});
  ['dragleave','drop'].forEach(function(name){dropzone.addEventListener(name,function(e){e.preventDefault();dropzone.classList.remove('is-dragging');});});
  dropzone.addEventListener('drop',function(e){var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f)loadFile(f);});
  format.addEventListener('change',function(){version++;clearOutput();processButton.disabled=!sourceImage;if(sourceImage)say('Output format changed. Create the copy again to apply it.');});
  jpegBg.addEventListener('change',function(){if(format.value==='image/jpeg'){version++;clearOutput();processButton.disabled=!sourceImage;if(sourceImage)say('JPEG background changed. Create the copy again to apply it.');}});
  processButton.addEventListener('click',makeOutput);
  downloadButton.addEventListener('click',function(){if(!outputBlob||!outputUrl){say('Create a verified output before downloading.');return;}var a=document.createElement('a');a.href=outputUrl;var ext=types[outputBlob.type]||'png';var base=(sourceFile.name||'image').replace(/\.[^.]+$/,'').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'')||'image';a.download=base+'-reencoded.'+ext;document.body.appendChild(a);a.click();a.remove();say('Download started. Review the downloaded file before sharing.');});
  resetButton.addEventListener('click',reset);
  window.addEventListener('pagehide',function(){revoke(sourceUrl);revoke(outputUrl);});
}());