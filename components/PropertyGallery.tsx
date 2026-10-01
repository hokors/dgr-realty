'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ImageIcon, Maximize, X } from 'lucide-react';
import type { PropertyImage } from '@/lib/types';

export function PropertyGallery({ images, title }: { images: PropertyImage[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const galleryDialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const activeImage = images[activeIndex];

  function openGallery(event: React.MouseEvent<HTMLButtonElement>) {
    openerRef.current = event.currentTarget;
    setLightboxOpen(true);
  }

  const showPrevious = useCallback(() => {
    setActiveIndex((index) => (index - 1 + images.length) % images.length);
  }, [images.length]);

  const showNext = useCallback(() => {
    setActiveIndex((index) => (index + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setLightboxOpen(false);
      if (event.key === 'ArrowLeft' && images.length > 1) showPrevious();
      if (event.key === 'ArrowRight' && images.length > 1) showNext();
      if (event.key === 'Tab') {
        const focusable = galleryDialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      openerRef.current?.focus();
    };
  }, [images.length, lightboxOpen, showNext, showPrevious]);

  if (!activeImage) {
    return (
      <section data-reveal className="grid min-h-[360px] place-items-center overflow-hidden rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface-muted)] px-6 text-center lg:min-h-[560px]">
        <div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-[var(--brand-muted)] shadow-sm"><ImageIcon className="h-6 w-6" /></div><p className="mt-5 font-semibold">Property photos coming soon</p><p className="mt-2 text-sm text-[var(--brand-muted)]">Contact DGR Realty to request photos of this listing.</p></div>
      </section>
    );
  }

  return (
    <>
      <section data-reveal aria-label={`${title} photo gallery`} className="overflow-hidden rounded-2xl border border-[var(--brand-border)] bg-white shadow-[0_10px_34px_rgba(3,27,43,0.07)]">
        <div className="grid gap-2 bg-[var(--brand-surface-muted)] p-2 lg:h-[610px] lg:grid-cols-[minmax(0,1fr)_270px]">
          <button type="button" onClick={openGallery} className="group relative min-h-[330px] overflow-hidden rounded-xl bg-[var(--brand-border)] text-left sm:min-h-[360px] lg:min-h-0" aria-label="Open full-screen photo gallery">
            <Image src={activeImage.imageUrl} alt={activeImage.altText ?? `${title} photo ${activeIndex + 1}`} fill priority unoptimized sizes="(max-width: 1024px) 100vw, 75vw" className="object-cover transition duration-500 group-hover:scale-[1.015]" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/55 via-black/10 to-transparent p-4 pt-20 text-white sm:p-5">
              <span className="rounded-full bg-black/35 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">{activeIndex + 1} / {images.length}</span>
              <span className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-[var(--brand-text)] shadow-sm"><Maximize className="h-3.5 w-3.5" /> View full screen</span>
            </div>
          </button>

          <div className="hidden content-start grid-cols-2 gap-2 overflow-y-auto lg:grid" aria-label="Choose a property photo">
            {images.map((image, index) => (
              <button key={image.id} type="button" onClick={() => setActiveIndex(index)} aria-label={`Show photo ${index + 1}`} aria-current={index === activeIndex} className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--brand-border)] ring-inset transition ${index === activeIndex ? 'ring-3 ring-[var(--brand-secondary-strong)]' : 'opacity-75 hover:opacity-100'}`}>
                <Image src={image.imageUrl} alt={image.altText ?? `${title} thumbnail ${index + 1}`} fill unoptimized sizes="135px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto p-2 lg:hidden" aria-label="Choose a property photo">
            {images.map((image, index) => (
              <button key={image.id} type="button" onClick={() => setActiveIndex(index)} aria-label={`Show photo ${index + 1}`} aria-current={index === activeIndex} className={`relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-[var(--brand-border)] ring-inset ${index === activeIndex ? 'ring-3 ring-[var(--brand-secondary-strong)]' : 'opacity-75'}`}>
                <Image src={image.imageUrl} alt={image.altText ?? `${title} thumbnail ${index + 1}`} fill unoptimized sizes="112px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </section>

      {lightboxOpen && (
        <div ref={galleryDialogRef} role="dialog" aria-modal="true" aria-label={`${title} full-screen gallery`} tabIndex={-1} className="fixed inset-0 z-[100] grid place-items-center bg-[var(--brand-primary-strong)]/96 p-4 sm:p-8">
          <button ref={closeButtonRef} type="button" onClick={() => setLightboxOpen(false)} className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/12 text-white backdrop-blur hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" aria-label="Close gallery"><X className="h-5 w-5" /></button>
          <div className="relative h-full w-full max-w-[1500px]">
            <Image src={activeImage.imageUrl} alt={activeImage.altText ?? `${title} photo ${activeIndex + 1}`} fill unoptimized sizes="100vw" className="object-contain" />
          </div>
          {images.length > 1 && <><button type="button" onClick={showPrevious} className="absolute left-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/12 text-white backdrop-blur hover:bg-white/20 sm:left-6" aria-label="Previous photo"><ChevronLeft className="h-6 w-6" /></button><button type="button" onClick={showNext} className="absolute right-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/12 text-white backdrop-blur hover:bg-white/20 sm:right-6" aria-label="Next photo"><ChevronRight className="h-6 w-6" /></button></>}
          <p aria-live="polite" className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/35 px-4 py-2 text-xs font-semibold text-white backdrop-blur">Photo {activeIndex + 1} of {images.length}</p>
        </div>
      )}
    </>
  );
}
