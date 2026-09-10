import { tick } from 'svelte';

interface HorizontalScrollRailOptions {
  getElement: () => HTMLDivElement | null;
  getActiveId: () => string | null;
  getActiveItemSelector: (id: string) => string;
  minScrollDistance: number;
  viewportFraction: number;
}

export function createHorizontalScrollRail(options: HorizontalScrollRailOptions) {
  let canScrollLeft = $state(false);
  let canScrollRight = $state(false);

  function update() {
    const element = options.getElement();
    if (!element) {
      canScrollLeft = false;
      canScrollRight = false;
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = element;
    canScrollLeft = scrollLeft > 8;
    canScrollRight = scrollLeft + clientWidth < scrollWidth - 8;
  }

  function scroll(direction: -1 | 1) {
    const element = options.getElement();
    if (!element) return;

    const amount = Math.max(
      options.minScrollDistance,
      Math.round(element.clientWidth * options.viewportFraction)
    );
    element.scrollBy({ left: direction * amount, behavior: 'smooth' });
  }

  function handleWheel(event: WheelEvent) {
    const element = options.getElement();
    if (!element || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

    event.preventDefault();
    element.scrollBy({ left: event.deltaY, behavior: 'auto' });
    update();
  }

  $effect(() => {
    const element = options.getElement();
    if (!element) {
      update();
      return;
    }

    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();

    return () => observer.disconnect();
  });

  $effect(() => {
    const element = options.getElement();
    const activeId = options.getActiveId();
    if (!element || !activeId) return;

    let active = true;
    void tick().then(() => {
      if (!active || options.getElement() !== element || options.getActiveId() !== activeId) return;

      const activeItem = element.querySelector<HTMLElement>(
        options.getActiveItemSelector(activeId)
      );
      activeItem?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      update();
    });

    return () => {
      active = false;
    };
  });

  return {
    get canScrollLeft() {
      return canScrollLeft;
    },
    get canScrollRight() {
      return canScrollRight;
    },
    update,
    scroll,
    handleWheel
  };
}
