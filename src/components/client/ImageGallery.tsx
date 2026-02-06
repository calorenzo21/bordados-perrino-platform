'use client';

import { useState } from 'react';

import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface ImageGalleryProps {
  photos: string[];
  thumbnailSize?: 'sm' | 'md';
}

export function ImageGallery({ photos, thumbnailSize = 'md' }: ImageGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!photos || photos.length === 0) return null;

  const openGallery = (index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
  };

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const sizeClasses = thumbnailSize === 'sm' ? 'h-12 w-12' : 'h-16 w-16';

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {photos.map((photo, index) => (
          <button
            key={index}
            type="button"
            onClick={() => openGallery(index)}
            className={`group relative ${sizeClasses} overflow-hidden rounded-lg bg-slate-100 shadow-sm transition-transform hover:scale-105`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/40">
              <ZoomIn className="h-5 w-5 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </div>
          </button>
        ))}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="max-w-4xl border-0 bg-black/90 p-0 rounded-2xl mx-auto"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">
            Galería de imágenes - Foto {currentIndex + 1} de {photos.length}
          </DialogTitle>
          <div className="relative flex flex-col p-3 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 sm:pb-4">
              <span className="text-sm font-medium text-white/70">
                {currentIndex + 1} de {photos.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Imagen principal */}
            <div className="relative flex items-center justify-center">
              {photos.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevPhoto}
                  className="absolute left-1 sm:left-2 z-10 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-110"
                >
                  <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              )}

              <div className="relative w-full max-h-[60vh] sm:max-h-[70vh] overflow-hidden rounded-xl">
                {photos[currentIndex] && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={photos[currentIndex]}
                    alt={`Foto ${currentIndex + 1}`}
                    className="h-full w-full object-contain"
                  />
                )}
              </div>

              {photos.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextPhoto}
                  className="absolute right-1 sm:right-2 z-10 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-110"
                >
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              )}
            </div>

            {/* Thumbnails */}
            {photos.length > 1 && (
              <div className="flex justify-center gap-2 pt-3 sm:pt-4">
                {photos.map((photo, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className={`h-10 w-10 sm:h-14 sm:w-14 overflow-hidden rounded-lg transition-all duration-200 ${
                      index === currentIndex
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-black/90 scale-110'
                        : 'opacity-50 hover:opacity-80'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo}
                      alt={`Miniatura ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
