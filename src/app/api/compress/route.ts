import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const quality = parseInt(formData.get('quality') as string) || 80;
    const format = formData.get('format') as string || 'original';

    if (!file) {
      return NextResponse.json({ error: '没有上传文件' }, { status: 400 });
    }

    // 获取原始文件信息
    const buffer = Buffer.from(await file.arrayBuffer());
    const originalSize = buffer.length;

    // 获取图片元数据
    const metadata = await sharp(buffer).metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;
    const originalFormat = metadata.format || 'unknown';

    // 创建 sharp 实例
    let sharpInstance = sharp(buffer);

    // 根据格式进行压缩
    let outputFormat = format === 'original' ? originalFormat : format;
    let compressedBuffer: Buffer;

    switch (outputFormat) {
      case 'jpeg':
      case 'jpg':
        compressedBuffer = await sharpInstance
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();
        outputFormat = 'jpeg';
        break;
      case 'png':
        compressedBuffer = await sharpInstance
          .png({ quality, compressionLevel: 9 })
          .toBuffer();
        break;
      case 'webp':
        compressedBuffer = await sharpInstance
          .webp({ quality })
          .toBuffer();
        break;
      case 'avif':
        compressedBuffer = await sharpInstance
          .avif({ quality })
          .toBuffer();
        break;
      default:
        // 默认转换为 JPEG
        compressedBuffer = await sharpInstance
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();
        outputFormat = 'jpeg';
    }

    // 获取压缩后的元数据
    const compressedMetadata = await sharp(compressedBuffer).metadata();
    const compressedSize = compressedBuffer.length;
    const compressedWidth = compressedMetadata.width || 0;
    const compressedHeight = compressedMetadata.height || 0;

    // 计算压缩比例
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(2);

    // 将压缩后的图片转换为 base64
    const base64 = compressedBuffer.toString('base64');
    const mimeType = `image/${outputFormat}`;

    return NextResponse.json({
      success: true,
      original: {
        name: file.name,
        size: originalSize,
        width: originalWidth,
        height: originalHeight,
        format: originalFormat,
      },
      compressed: {
        size: compressedSize,
        width: compressedWidth,
        height: compressedHeight,
        format: outputFormat,
        base64: `data:${mimeType};base64,${base64}`,
      },
      compressionRatio: parseFloat(compressionRatio),
    });
  } catch (error) {
    console.error('压缩错误:', error);
    return NextResponse.json(
      { error: '图片压缩失败，请检查文件格式是否正确' },
      { status: 500 }
    );
  }
}
