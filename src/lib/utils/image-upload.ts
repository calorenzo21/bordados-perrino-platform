import { createClient } from '@/lib/supabase/browser';

// Tipos de bucket disponibles
export type StorageBucket = 'status-photos' | 'payment-receipts' | 'order-images';

// Opciones de compresión
interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  maxSizeKB: 500, // Tamaño máximo deseado en KB
};

/**
 * Comprime una imagen si es necesario
 * - Si la imagen es menor a maxSizeKB, la devuelve sin cambios
 * - Si es mayor, la comprime reduciendo calidad y/o tamaño
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Si el archivo es menor al tamaño máximo y no es muy grande en dimensiones, no comprimir
  if (file.size < (opts.maxSizeKB! * 1024) && file.size < 500 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;

      // Calcular nuevas dimensiones manteniendo proporción
      if (width > opts.maxWidth! || height > opts.maxHeight!) {
        const ratio = Math.min(opts.maxWidth! / width, opts.maxHeight! / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // Dibujar imagen en canvas
      ctx?.drawImage(img, 0, 0, width, height);

      // Función para obtener blob con calidad específica
      const getBlob = (quality: number): Promise<Blob> => {
        return new Promise((res) => {
          canvas.toBlob(
            (blob) => res(blob!),
            'image/jpeg',
            quality
          );
        });
      };

      // Intentar comprimir con calidad decreciente hasta alcanzar el tamaño deseado
      const compress = async () => {
        let quality = opts.quality!;
        let blob = await getBlob(quality);

        // Si aún es muy grande, reducir calidad progresivamente
        while (blob.size > opts.maxSizeKB! * 1024 && quality > 0.3) {
          quality -= 0.1;
          blob = await getBlob(quality);
        }

        // Si aún es muy grande, reducir dimensiones
        if (blob.size > opts.maxSizeKB! * 1024 * 2) {
          const newWidth = Math.round(width * 0.7);
          const newHeight = Math.round(height * 0.7);
          canvas.width = newWidth;
          canvas.height = newHeight;
          ctx?.drawImage(img, 0, 0, newWidth, newHeight);
          blob = await getBlob(0.7);
        }

        resolve(blob);
      };

      compress();
    };

    img.onerror = () => reject(new Error('Error al cargar la imagen'));

    // Cargar imagen desde File
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Genera un nombre único para el archivo
 */
function generateFileName(originalName: string, prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const safeName = originalName
    .replace(/\.[^/.]+$/, '') // Quitar extensión
    .replace(/[^a-zA-Z0-9]/g, '_') // Reemplazar caracteres especiales
    .substring(0, 20); // Limitar longitud
  
  return `${prefix ? prefix + '/' : ''}${timestamp}_${random}_${safeName}.${extension === 'png' || extension === 'gif' ? extension : 'jpg'}`;
}

/**
 * Sube una imagen a Supabase Storage
 * Comprime automáticamente si es necesario
 */
export async function uploadImage(
  file: File,
  bucket: StorageBucket,
  folder?: string,
  compressionOptions?: CompressionOptions
): Promise<{ url: string; path: string } | null> {
  const supabase = createClient();

  try {
    // Verificar que sea una imagen
    if (!file.type.startsWith('image/')) {
      throw new Error('El archivo debe ser una imagen');
    }

    // Comprimir si es necesario
    const compressedBlob = await compressImage(file, compressionOptions);
    
    // Generar nombre único
    const fileName = generateFileName(file.name, folder);

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, compressedBlob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('Error al subir imagen:', error);
      throw error;
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (err) {
    console.error('Error en uploadImage:', err);
    return null;
  }
}

/**
 * Sube múltiples imágenes
 */
export async function uploadMultipleImages(
  files: File[],
  bucket: StorageBucket,
  folder?: string,
  compressionOptions?: CompressionOptions
): Promise<{ url: string; path: string }[]> {
  const results: { url: string; path: string }[] = [];

  for (const file of files) {
    const result = await uploadImage(file, bucket, folder, compressionOptions);
    if (result) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Elimina una imagen de Supabase Storage
 */
export async function deleteImage(
  bucket: StorageBucket,
  path: string
): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Error al eliminar imagen:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error en deleteImage:', err);
    return false;
  }
}

/**
 * Convierte un archivo a base64 para preview
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Formatea el tamaño de archivo para mostrar
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
