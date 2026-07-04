/* ===== Image Storage (IndexedDB Blob with Thumbnails) ===== */
window.GTA = window.GTA || {};

GTA.ImageStore = (function () {
  var MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  var THUMBNAIL_SIZE = 200;

  /**
   * Generate a thumbnail blob from an image file
   */
  function generateThumbnail(file, maxWidth) {
    if (!maxWidth) maxWidth = THUMBNAIL_SIZE;
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = null;

      img.onload = function () {
        try {
          var canvas = document.createElement('canvas');
          var ratio = maxWidth / img.width;
          canvas.width = maxWidth;
          canvas.height = Math.round(img.height * ratio);

          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(function (blob) {
            URL.revokeObjectURL(url);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Thumbnail generation failed'));
            }
          }, 'image/webp', 0.7);
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };

      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      url = URL.createObjectURL(file);
      img.src = url;
    });
  }

  /**
   * Validate file before upload
   */
  function validateFile(file) {
    if (!file) return '没有选择文件';
    if (file.size > MAX_FILE_SIZE) {
      return '图片超过 5MB 限制 (当前: ' + (file.size / 1024 / 1024).toFixed(1) + 'MB)';
    }
    var validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp'];
    if (validTypes.indexOf(file.type) === -1) {
      return '不支持的图片格式 (支持: PNG, JPEG, WebP, BMP)';
    }
    return null;
  }

  /**
   * Save a photo to IndexedDB for a vehicle
   * @param {string} vehicleId
   * @param {File} file
   * @param {boolean} isCover
   */
  async function savePhoto(vehicleId, file, isCover) {
    var error = validateFile(file);
    if (error) throw new Error(error);

    await GTA.db.ready();

    // If this is a cover photo, unset existing cover
    if (isCover) {
      await GTA.db.photos
        .where({ vehicleId: vehicleId, isCover: 1 })
        .modify({ isCover: 0 });
    }

    // Generate thumbnail
    var thumbnail = await generateThumbnail(file);

    // Save full image and thumbnail as Blobs
    var photoId = await GTA.db.photos.add({
      vehicleId: vehicleId,
      data: file,
      thumbnail: thumbnail,
      uploadedAt: Date.now(),
      isCover: isCover ? 1 : 0
    });

    return photoId;
  }

  /**
   * Get all photos for a vehicle
   */
  async function getPhotos(vehicleId) {
    await GTA.db.ready();
    return await GTA.db.photos
      .where('vehicleId')
      .equals(vehicleId)
      .reverse()
      .sortBy('uploadedAt');
  }

  /**
   * Get cover photo for a vehicle (returns thumbnail blob URL)
   */
  async function getCoverPhotoUrl(vehicleId) {
    await GTA.db.ready();
    var cover = await GTA.db.photos
      .where({ vehicleId: vehicleId, isCover: 1 })
      .first();

    if (cover && cover.thumbnail) {
      return URL.createObjectURL(cover.thumbnail);
    }
    if (cover && cover.data) {
      return URL.createObjectURL(cover.data);
    }
    return null;
  }

  /**
   * Get a display URL for a photo (thumbnail or full)
   */
  function getPhotoUrl(photo, useThumbnail) {
    var blob = (useThumbnail && photo.thumbnail) ? photo.thumbnail : photo.data;
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }

  /**
   * Delete a photo by ID
   */
  async function deletePhoto(photoId) {
    await GTA.db.ready();
    await GTA.db.photos.delete(photoId);
  }

  /**
   * Set a photo as cover for its vehicle
   */
  async function setCover(photoId) {
    await GTA.db.ready();
    var photo = await GTA.db.photos.get(photoId);
    if (!photo) return;

    // Unset existing cover
    await GTA.db.photos
      .where({ vehicleId: photo.vehicleId, isCover: 1 })
      .modify({ isCover: 0 });

    // Set new cover
    await GTA.db.photos.update(photoId, { isCover: 1 });
  }

  /**
   * Get photo count for a vehicle
   */
  async function getPhotoCount(vehicleId) {
    await GTA.db.ready();
    return await GTA.db.photos.where('vehicleId').equals(vehicleId).count();
  }

  return {
    savePhoto: savePhoto,
    getPhotos: getPhotos,
    getCoverPhotoUrl: getCoverPhotoUrl,
    getPhotoUrl: getPhotoUrl,
    deletePhoto: deletePhoto,
    setCover: setCover,
    getPhotoCount: getPhotoCount,
    validateFile: validateFile
  };
})();
