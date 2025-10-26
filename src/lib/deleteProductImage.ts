import { supabase } from '@/integrations/supabase/client';

/**
 * Deletes a product image from Supabase storage
 * @param imageUrl - The full URL of the image to delete
 * @param bucketName - The storage bucket name (default: 'product-images')
 * @returns Promise that resolves if successful, or undefined if there was an error
 */
export const deleteProductImage = async (
  imageUrl: string | null | undefined,
  bucketName: string = 'product-images'
): Promise<void> => {
  // If no image URL, nothing to delete
  if (!imageUrl) {
    console.log('No image URL provided, skipping deletion');
    return;
  }

  try {
    console.log('Original image URL:', imageUrl);
    
    // Extract file path from the Supabase storage URL
    // Format: https://[project-id].supabase.co/storage/v1/object/public/product-images/vendor-id/timestamp.ext
    const url = new URL(imageUrl);
    
    // The pathname will be: /storage/v1/object/public/product-images/vendor-id/timestamp.ext
    // We need to extract everything after "product-images/"
    let filePath = url.pathname;
    
    // Try to extract the path after the bucket name
    const bucketPattern = new RegExp(`/${bucketName}/(.+)`, 'i');
    const match = filePath.match(bucketPattern);
    
    if (match && match[1]) {
      filePath = match[1];
    } else {
      // Fallback: try to get everything after the last /storage/v1/object/public/ part
      const publicIndex = filePath.indexOf('/public/');
      if (publicIndex !== -1) {
        // Get everything after /public/, then remove bucket name and the slash after it
        const afterPublic = filePath.substring(publicIndex + 8); // 8 is length of "/public/"
        const bucketStart = afterPublic.indexOf(`${bucketName}/`);
        if (bucketStart !== -1) {
          filePath = afterPublic.substring(bucketStart + bucketName.length + 1); // +1 for the slash
        } else {
          filePath = afterPublic;
        }
      }
    }
    
    console.log(`Extracted file path: ${filePath}`);
    console.log(`Deleting from bucket: ${bucketName}`);
    
    // Delete the file from storage
    const { data, error: storageError } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);
    
    if (storageError) {
      console.error('Failed to delete image file from storage:', storageError);
      console.error('Bucket:', bucketName);
      console.error('File path:', filePath);
      console.error('Original URL:', imageUrl);
      // Don't throw - log warning but don't fail the whole operation
      // The database record is more important than the storage file
    } else {
      console.log(`Successfully deleted image file from bucket "${bucketName}":`, filePath);
      console.log('Storage response:', data);
    }
  } catch (err) {
    // Handle URL parsing errors or other issues
    console.error('Error processing image URL for deletion:', err);
    console.error('Image URL:', imageUrl);
    // Don't throw - log warning but don't fail the whole operation
  }
};

