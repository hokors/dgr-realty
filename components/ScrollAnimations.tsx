'use client';

import { useEffect } from 'react';

const selector = '[data-reveal]';

export function ScrollAnimations() {
  useEffect(() => {
    const root = document.documentElement;
    const observedElements = new WeakSet<HTMLElement>();
    let observer: IntersectionObserver | undefined;
    let mutations: MutationObserver | undefined;
    let animationFrame: number | undefined;
    let cancelled = false;

    const start = () => {
      if (cancelled) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        root.classList.add('reveal-reduced');
        return;
      }

      root.classList.add('reveal-enabled');

      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => {
              const vertical = a.boundingClientRect.top - b.boundingClientRect.top;
              return Math.abs(vertical) > 24
                ? vertical
                : a.boundingClientRect.left - b.boundingClientRect.left;
            });

          visible.forEach((entry, index) => {
            const element = entry.target as HTMLElement;
            element.style.setProperty('--reveal-delay', `${Math.min(index * 70, 280)}ms`);
            element.classList.add('is-revealed');
            observer?.unobserve(element);
          });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
      );

      const observe = (scope: ParentNode) => {
        const candidates = scope instanceof HTMLElement && scope.matches(selector)
          ? [scope, ...scope.querySelectorAll<HTMLElement>(selector)]
          : [...scope.querySelectorAll<HTMLElement>(selector)];

        candidates.forEach((element) => {
          if (observedElements.has(element)) return;
          observedElements.add(element);
          observer?.observe(element);
        });
      };

      observe(document);
      mutations = new MutationObserver((records) => {
        records.forEach((record) => {
          record.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) observe(node);
          });
        });
      });
      mutations.observe(document.body, { childList: true, subtree: true });
    };

    const startAfterLoad = () => {
      animationFrame = window.requestAnimationFrame(start);
    };

    if (document.readyState === 'complete') startAfterLoad();
    else window.addEventListener('load', startAfterLoad, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('load', startAfterLoad);
      if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
      mutations?.disconnect();
      observer?.disconnect();
      root.classList.remove('reveal-enabled');
      root.classList.remove('reveal-reduced');
    };
  }, []);

  return null;
}
