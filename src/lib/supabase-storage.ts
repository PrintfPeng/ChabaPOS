import { supabase } from './supabase';

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 * @param file The file to upload.
 * @param folderName The folder within the 'pos' bucket.
 * @returns The public URL of the uploaded image.
 */
export async function uploadImageToSupabase(file: File, folderName: string = 'items'): Promise<string> {
  try {
    // 1. Validate file size (2MB limit)
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('ขนาดไฟล์ใหญ่เกิน 2MB');
    }

    // 2. Generate unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${folderName}/${fileName}`;

    if (!supabase) {
      throw new Error('กรุณาตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ในส่วนการตั้งค่าก่อนใช้งานการอัปโหลด');
    }

    // 3. Upload to 'pos' bucket
    const { error: uploadError } = await supabase.storage
      .from('pos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase Storage Error Details:', uploadError);
      if (uploadError.message === 'new row violates row-level security policy') {
        throw new Error('ติดปัญหา RLS: กรุณาไปที่ Supabase Dashboard -> Storage -> Bucket "pos" -> Policies และเพิ่ม Policy ให้ "anon" สามารถ "INSERT" (อัปโหลด) ได้');
      }
      if (uploadError.message === 'Failed to fetch') {
        throw new Error('ไม่สามารถเชื่อมต่อกับ Supabase ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต หรือเช็คว่า VITE_SUPABASE_URL ใน Settings ถูกต้องแล้ว');
      }
      throw uploadError;
    }

    // 4. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('pos')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error: any) {
    console.error('Error uploading image to Supabase:', error);
    throw new Error(error.message || 'Error uploading image');
  }
}
