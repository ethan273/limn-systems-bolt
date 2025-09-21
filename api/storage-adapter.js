// Storage Adapter Pattern for Document Management
// This abstraction allows easy switching between storage providers

/**
 * Base storage adapter interface
 */
class StorageAdapter {
  constructor(config) {
    this.config = config;
    this.name = 'base';
  }

  async upload() {
    throw new Error('upload method must be implemented');
  }

  async download() {
    throw new Error('download method must be implemented');
  }

  async delete() {
    throw new Error('delete method must be implemented');
  }

  async getUrl() {
    throw new Error('getUrl method must be implemented');
  }

  async list() {
    throw new Error('list method must be implemented');
  }

  async move() {
    throw new Error('move method must be implemented');
  }

  async copy() {
    throw new Error('copy method must be implemented');
  }

  async exists() {
    throw new Error('exists method must be implemented');
  }

  async getMetadata() {
    throw new Error('getMetadata method must be implemented');
  }
}

/**
 * Supabase Storage Adapter
 */
class SupabaseStorageAdapter extends StorageAdapter {
  constructor(supabaseClient, bucketName = 'documents') {
    super();
    this.name = 'supabase';
    this.storage = supabaseClient.storage;
    this.bucket = bucketName;
  }

  async upload(file, path, metadata = {}) {
    try {
      const { data, error } = await this.storage
        .from(this.bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: metadata.mimeType || file.type,
        });

      if (error) throw error;

      return {
        success: true,
        path: data.path,
        id: data.id,
        fullPath: `${this.bucket}/${data.path}`,
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  async download(path) {
    try {
      const { data, error } = await this.storage
        .from(this.bucket)
        .download(path);

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }

  async delete(path) {
    try {
      const { error } = await this.storage
        .from(this.bucket)
        .remove([path]);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  }

  async getUrl(path, options = {}) {
    try {
      if (options.signed && options.expiresIn) {
        // Get signed URL for private files
        const { data, error } = await this.storage
          .from(this.bucket)
          .createSignedUrl(path, options.expiresIn);

        if (error) throw error;

        return data.signedUrl;
      } else {
        // Get public URL
        const { data } = this.storage
          .from(this.bucket)
          .getPublicUrl(path);

        return data.publicUrl;
      }
    } catch (error) {
      console.error('Get URL error:', error);
      throw error;
    }
  }

  async list(prefix = '', options = {}) {
    try {
      const { data, error } = await this.storage
        .from(this.bucket)
        .list(prefix, {
          limit: options.limit || 100,
          offset: options.offset || 0,
          sortBy: options.sortBy || { column: 'name', order: 'asc' },
        });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('List error:', error);
      throw error;
    }
  }

  async move(fromPath, toPath) {
    try {
      const { error } = await this.storage
        .from(this.bucket)
        .move(fromPath, toPath);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Move error:', error);
      throw error;
    }
  }

  async copy(fromPath, toPath) {
    try {
      const { error } = await this.storage
        .from(this.bucket)
        .copy(fromPath, toPath);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Copy error:', error);
      throw error;
    }
  }

  async exists(path) {
    try {
      const { data, error } = await this.storage
        .from(this.bucket)
        .list(path.substring(0, path.lastIndexOf('/')), {
          limit: 1,
          search: path.substring(path.lastIndexOf('/') + 1),
        });

      if (error) throw error;

      return data && data.length > 0;
    } catch (error) {
      console.error('Exists check error:', error);
      return false;
    }
  }

  async getMetadata(path) {
    try {
      // Supabase doesn't have direct metadata API, so we use list
      const dir = path.substring(0, path.lastIndexOf('/'));
      const filename = path.substring(path.lastIndexOf('/') + 1);
      
      const { data, error } = await this.storage
        .from(this.bucket)
        .list(dir, {
          limit: 1,
          search: filename,
        });

      if (error) throw error;

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Get metadata error:', error);
      throw error;
    }
  }
}

/**
 * Google Drive Storage Adapter (Future Implementation)
 * This is a template for when/if you want to add Google Drive support
 */
class GoogleDriveStorageAdapter extends StorageAdapter {
  constructor(auth) {
    super();
    this.name = 'google_drive';
    this.auth = auth;
    // Initialize Google Drive API client here
  }

  async upload() {
    // Implementation for Google Drive upload
    // Will use Google Drive API
    throw new Error('Google Drive adapter not yet implemented');
  }

  async download() {
    // Implementation for Google Drive download
    throw new Error('Google Drive adapter not yet implemented');
  }

  // ... other methods
}

/**
 * Storage adapter factory
 */
class StorageFactory {
  static create(type, config) {
    switch (type) {
      case 'supabase':
        return new SupabaseStorageAdapter(config.client, config.bucket);
      case 'google_drive':
        return new GoogleDriveStorageAdapter(config.auth);
      default:
        throw new Error(`Unknown storage adapter type: ${type}`);
    }
  }
}

// Export for use in Next.js (CommonJS compatibility)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    StorageAdapter,
    SupabaseStorageAdapter,
    GoogleDriveStorageAdapter,
    StorageFactory,
  };
}

export {
  StorageAdapter,
  SupabaseStorageAdapter,
  GoogleDriveStorageAdapter,
  StorageFactory,
};