import { createClient } from '@/lib/supabase/server'

/**
 * Upload file to Supabase Storage
 */
export async function uploadFile(
  bucket: string,
  file: File,
  path: string,
  options?: {
    upsert?: boolean
    contentType?: string
  }
): Promise<{ url: string; path: string; error?: string }> {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { url: '', path: '', error: 'Authentication required' }
    }

    // Convert File to ArrayBuffer
    const fileBuffer = await file.arrayBuffer()

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, fileBuffer, {
        contentType: options?.contentType || file.type,
        upsert: options?.upsert || false
      })

    if (error) {
      console.error('Storage upload error:', error)
      return { url: '', path: '', error: error.message }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return {
      url: urlData.publicUrl,
      path: data.path,
    }
  } catch (error) {
    console.error('Upload file error:', error)
    return {
      url: '',
      path: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      console.error('Storage delete error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Delete file error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Generate unique file path
 */
export function generateFilePath(
  folder: string,
  filename: string,
  userId?: string
): string {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 15)
  const extension = filename.split('.').pop()
  const baseName = filename.split('.').slice(0, -1).join('.')
  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_')

  const userPrefix = userId ? `${userId}/` : ''
  return `${folder}/${userPrefix}${timestamp}_${randomId}_${sanitizedBaseName}.${extension}`
}