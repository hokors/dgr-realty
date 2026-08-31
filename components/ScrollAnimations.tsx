'use client';

import { useEffect } from 'react';

const selector = '[data-reveal]';

export function ScrollAnimations() {
  useEffect(() => {
    const root = document.documentElement;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.add('reveal-reduced');
      return;
    }

    root.classList.add('reveal-enabled');

    const observer = new IntersectionObserver(
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
          observer.unobserve(element);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );

    const observe = (scope: ParentNode) => {
      if (scope instanceof HTMLElement && scope.matches(selector) && !scope.dataset.revealObserved) {
        scope.dataset.revealObserved = 'true';
        observer.observe(scope);
      }

      scope.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        if (element.dataset.revealObserved) return;
        element.dataset.revealObserved = 'true';
        observer.observe(element);
      });
    };

    observe(document);

    const mutations = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) observe(node);
        });
      });
    });

    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      observer.disconnect();
      root.classList.remove('reveal-enabled');
    };
  }, []);

  return null;
}
