'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'compressing' | 'done' | 'error';
  originalSize: number;
  estimatedSize?: number;
  original?: {
    name: string;
    size: number;
    width: number;
    height: number;
    format: string;
  };
  compressed?: {
    size: number;
    width: number;
    height: number;
    format: string;
    base64: string;
  };
  compressionRatio?: number;
  error?: string;
}

// 压缩质量预估系数
const QUALITY_FACTORS: Record<string, number> = {
  high: 0.7,    // 90% 质量大约保留 70% 大小
  medium: 0.45, // 70% 质量大约保留 45% 大小
  low: 0.25,    // 50% 质量大约保留 25% 大小
};

export default function ImageCompressor() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [quality, setQuality] = useState(70);
  const [qualityPreset, setQualityPreset] = useState<'high' | 'medium' | 'low' | 'custom'>('medium');
  const [outputFormat, setOutputFormat] = useState('original');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // 计算预估大小
  const estimateSize = useCallback((originalSize: number, preset: string, customQuality?: number) => {
    if (preset === 'custom' && customQuality) {
      // 自定义质量：线性估算
      const factor = 0.1 + (customQuality / 100) * 0.6;
      return Math.round(originalSize * factor);
    }
    return Math.round(originalSize * (QUALITY_FACTORS[preset] || 0.45));
  }, []);

  // 更新所有图片的预估大小
  useEffect(() => {
    if (images.length > 0) {
      setImages(prev => prev.map(img => ({
        ...img,
        estimatedSize: estimateSize(img.originalSize, qualityPreset, quality)
      })));
    }
  }, [qualityPreset, quality]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages: ImageFile[] = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
      originalSize: file.size,
      estimatedSize: estimateSize(file.size, qualityPreset, quality),
    }));
    setImages((prev) => [...prev, ...newImages]);
  }, [qualityPreset, quality, estimateSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
      'image/avif': ['.avif'],
    },
    multiple: true,
  });

  const handleQualityPreset = (preset: 'high' | 'medium' | 'low' | 'custom') => {
    setQualityPreset(preset);
    switch (preset) {
      case 'high': setQuality(90); break;
      case 'medium': setQuality(70); break;
      case 'low': setQuality(50); break;
    }
  };

  const compressImage = async (image: ImageFile): Promise<ImageFile> => {
    try {
      const formData = new FormData();
      formData.append('file', image.file);
      formData.append('quality', quality.toString());
      formData.append('format', outputFormat);

      const response = await fetch('/api/compress', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('压缩失败');

      const result = await response.json();
      return {
        ...image,
        status: 'done',
        original: result.original,
        compressed: result.compressed,
        compressionRatio: result.compressionRatio,
      };
    } catch (error) {
      return {
        ...image,
        status: 'error',
        error: error instanceof Error ? error.message : '压缩失败',
      };
    }
  };

  const handleCompress = async () => {
    if (images.length === 0) return;
    setIsCompressing(true);

    setImages((prev) =>
      prev.map((img) =>
        img.status === 'pending' ? { ...img, status: 'compressing' as const } : img
      )
    );

    const pendingImages = images.filter((img) => img.status === 'pending' || img.status === 'compressing');
    
    for (const image of pendingImages) {
      const compressed = await compressImage(image);
      setImages((prev) =>
        prev.map((img) => (img.id === compressed.id ? compressed : img))
      );
    }

    setIsCompressing(false);
  };

  const handleDownload = (image: ImageFile) => {
    if (!image.compressed?.base64) return;
    const link = document.createElement('a');
    link.href = image.compressed.base64;
    const originalName = image.original?.name || 'image';
    const extension = image.compressed.format || 'jpg';
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    link.download = `${nameWithoutExt}_compressed.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 批量下载为 ZIP
  const handleDownloadZip = async () => {
    const completedImages = images.filter((img) => img.status === 'done' && img.compressed);
    if (completedImages.length === 0) return;

    setIsDownloading(true);
    
    try {
      const zip = new JSZip();
      
      for (const img of completedImages) {
        if (img.compressed?.base64) {
          // 从 base64 中提取数据
          const base64Data = img.compressed.base64.split(',')[1];
          const originalName = img.original?.name || 'image';
          const extension = img.compressed.format || 'jpg';
          const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
          const fileName = `${nameWithoutExt}_compressed.${extension}`;
          
          zip.file(fileName, base64Data, { base64: true });
        }
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `compressed_images_${Date.now()}.zip`);
    } catch (error) {
      console.error('ZIP 创建失败:', error);
    }
    
    setIsDownloading(false);
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const clearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const completedCount = images.filter((img) => img.status === 'done').length;
  const totalOriginalSize = images.reduce((acc, img) => acc + img.originalSize, 0);
  const totalEstimatedSize = images.reduce((acc, img) => acc + (img.estimatedSize || 0), 0);
  const totalCompressedSize = images.filter(img => img.status === 'done' && img.compressed)
    .reduce((acc, img) => acc + (img.compressed?.size || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col">
      {/* 头部 - 紧凑型 */}
      <header className="bg-white shadow-sm border-b border-green-100 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                图片压缩工具
              </h1>
            </div>
            {images.length > 0 && (
              <button onClick={clearAll} className="text-xs sm:text-sm text-red-500 hover:text-red-600 font-medium">
                清空全部
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 主内容区 - 自适应布局 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-4 flex flex-col min-h-0">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 min-h-0">
          
          {/* 左侧：上传和设置 */}
          <div className="lg:col-span-1 flex flex-col gap-3 sm:gap-4">
            {/* 上传区域 */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-4 sm:p-6 text-center cursor-pointer transition-all duration-300 flex-shrink-0 ${
                isDragActive
                  ? 'border-green-500 bg-green-50 scale-[1.02]'
                  : 'border-green-300 bg-white hover:border-green-400 hover:bg-green-50/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mb-2 ${
                  isDragActive ? 'bg-green-200' : 'bg-green-100'
                }`}>
                  <svg className={`w-6 h-6 sm:w-7 sm:h-7 ${isDragActive ? 'text-green-600' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm sm:text-base font-semibold text-gray-700">
                  {isDragActive ? '松开上传' : '拖放或点击上传'}
                </p>
                <p className="text-xs text-gray-500 mt-1">JPG / PNG / WebP / GIF</p>
              </div>
            </div>

            {/* 设置区域 */}
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-green-100 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">压缩质量</h3>
              
              {/* 质量预设按钮 */}
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {[
                  { key: 'high', label: '高', desc: '90%', color: 'green' },
                  { key: 'medium', label: '中', desc: '70%', color: 'yellow' },
                  { key: 'low', label: '低', desc: '50%', color: 'orange' },
                  { key: 'custom', label: '自定义', desc: '', color: 'gray' },
                ].map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => handleQualityPreset(preset.key as 'high' | 'medium' | 'low' | 'custom')}
                    className={`py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                      qualityPreset === preset.key
                        ? 'bg-green-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div>{preset.label}</div>
                    {preset.desc && <div className="text-[10px] opacity-70">{preset.desc}</div>}
                  </button>
                ))}
              </div>

              {/* 自定义滑块 */}
              {qualityPreset === 'custom' && (
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="w-10 text-center text-sm font-semibold text-green-600">{quality}%</span>
                </div>
              )}

              {/* 预估信息 */}
              {images.length > 0 && (
                <div className="bg-green-50 rounded-lg p-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>原始总大小:</span>
                    <span className="font-medium">{formatFileSize(totalOriginalSize)}</span>
                  </div>
                  <div className="flex justify-between text-green-600 mt-1">
                    <span>预估压缩后:</span>
                    <span className="font-medium">≈ {formatFileSize(totalEstimatedSize)}</span>
                  </div>
                  <div className="flex justify-between text-green-700 mt-1 pt-1 border-t border-green-200">
                    <span>预估节省:</span>
                    <span className="font-bold">≈ {formatFileSize(totalOriginalSize - totalEstimatedSize)}</span>
                  </div>
                </div>
              )}

              {/* 输出格式 */}
              <h3 className="text-sm font-semibold text-gray-700 mt-3 mb-2">输出格式</h3>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { value: 'original', label: '原格式' },
                  { value: 'jpeg', label: 'JPEG' },
                  { value: 'png', label: 'PNG' },
                  { value: 'webp', label: 'WebP' },
                ].map((format) => (
                  <button
                    key={format.value}
                    onClick={() => setOutputFormat(format.value)}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                      outputFormat === format.value
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {format.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleCompress}
                disabled={isCompressing || images.filter((img) => img.status === 'pending').length === 0}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  isCompressing || images.filter((img) => img.status === 'pending').length === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/30'
                }`}
              >
                {isCompressing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>压缩中...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>开始压缩</span>
                  </>
                )}
              </button>

              {completedCount > 1 && (
                <button
                  onClick={handleDownloadZip}
                  disabled={isDownloading}
                  className="py-2.5 px-4 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-200 transition-colors flex items-center gap-1.5"
                >
                  {isDownloading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  <span>ZIP</span>
                </button>
              )}
            </div>

            {/* 压缩统计 */}
            {completedCount > 0 && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-3 text-white flex-shrink-0">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg sm:text-xl font-bold">{completedCount}</div>
                    <div className="text-xs opacity-80">已压缩</div>
                  </div>
                  <div>
                    <div className="text-lg sm:text-xl font-bold">{formatFileSize(totalOriginalSize - totalCompressedSize)}</div>
                    <div className="text-xs opacity-80">已节省</div>
                  </div>
                  <div>
                    <div className="text-lg sm:text-xl font-bold">
                      {totalOriginalSize > 0 ? Math.round((1 - totalCompressedSize / totalOriginalSize) * 100) : 0}%
                    </div>
                    <div className="text-xs opacity-80">压缩率</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 右侧：图片列表 */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            {images.length === 0 ? (
              <div className="flex-1 flex items-center justify-center bg-white/50 rounded-xl border-2 border-dashed border-green-200">
                <div className="text-center text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">上传图片开始压缩</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm border border-green-100 p-2 sm:p-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className="relative bg-gray-50 rounded-lg overflow-hidden group"
                    >
                      {/* 图片预览 */}
                      <div className="aspect-square relative">
                        <img
                          src={image.status === 'done' && image.compressed ? image.compressed.base64 : image.preview}
                          alt="预览"
                          className="w-full h-full object-cover"
                        />
                        
                        {/* 状态覆盖层 */}
                        {image.status === 'compressing' && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          </div>
                        )}

                        {image.status === 'error' && (
                          <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                        )}

                        {/* 删除按钮 */}
                        <button
                          onClick={() => removeImage(image.id)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>

                        {/* 完成标记 */}
                        {image.status === 'done' && (
                          <div className="absolute top-1 left-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* 信息栏 */}
                      <div className="p-1.5 text-xs">
                        <div className="truncate text-gray-600 font-medium" title={image.file.name}>
                          {image.file.name}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-gray-400">{formatFileSize(image.originalSize)}</span>
                          {image.status === 'done' && image.compressed ? (
                            <span className="text-green-600 font-medium">
                              → {formatFileSize(image.compressed.size)}
                            </span>
                          ) : image.status === 'pending' && (
                            <span className="text-gray-400">
                              ≈ {formatFileSize(image.estimatedSize || 0)}
                            </span>
                          )}
                        </div>
                        
                        {/* 压缩率显示 */}
                        {image.status === 'done' && image.compressionRatio !== undefined && (
                          <div className="mt-1">
                            <div className="w-full bg-gray-200 rounded-full h-1">
                              <div
                                className="bg-green-500 h-1 rounded-full transition-all"
                                style={{ width: `${100 - image.compressionRatio}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-green-600 mt-0.5 text-right">
                              -{image.compressionRatio.toFixed(0)}%
                            </div>
                          </div>
                        )}

                        {/* 下载按钮 */}
                        {image.status === 'done' && (
                          <button
                            onClick={() => handleDownload(image)}
                            className="w-full mt-1 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-[10px] font-medium transition-colors"
                          >
                            下载
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
