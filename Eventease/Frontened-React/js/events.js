(() => {
  const fallbackEvents = [
    {
      id: 1,
      name: 'DevFest 2026',
      category: 'Technology',
      date: '2026-11-14',
      location: 'Hyderabad Tech Park',
      price: 499,
      seats: 120,
      description: 'A developer festival with talks on AI, web and cloud.',
    },
    {
      id: 2,
      name: 'Sunset Music Fest',
      category: 'Music',
      date: '2026-10-25',
      location: 'Bengaluru Palace Grounds',
      price: 999,
      seats: 340,
      description: 'Live bands, DJs and food stalls under the open sky.',
    },
    {
      id: 3,
      name: 'Inter-College Football Cup',
      category: 'Sports',
      date: '2026-12-05',
      location: 'City Sports Stadium',
      price: 0,
      seats: 210,
      description: 'Sixteen colleges compete for the championship trophy.',
    },
  ];

  const escapeHtml = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[character]));

  const readEvents = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('events') || 'null');
      return Array.isArray(stored) ? stored : fallbackEvents;
    } catch {
      return fallbackEvents;
    }
  };

  const formatDate = (value) => {
    if (!value) return 'Date to be announced';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? 'Date to be announced'
      : date.toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
  };

  const formatPrice = (value) => Number(value) > 0 ? `₹${value}` : 'Free';

  const render = () => {
    const grid = document.querySelector('[data-events], #eventGrid');
    if (!grid) return;

    const search = document.querySelector('#search, [name="search"]')?.value
      ?.trim()
      .toLowerCase() || '';
    const category = document.querySelector('#category, [name="category"]')?.value || '';
    const date = document.querySelector('#dateFilter, [name="date"]')?.value || '';
    const sort = document.querySelector('#sort, [name="sort"]')?.value || 'date';

    const events = readEvents()
      .filter((event) => {
        const text = [
          event.name,
          event.category,
          event.location,
          event.description || event.desc,
        ].join(' ').toLowerCase();
        return (!search || text.includes(search))
          && (!category || event.category === category)
          && (!date || event.date === date);
      })
      .sort((first, second) => {
        if (sort === 'priceLow') return Number(first.price) - Number(second.price);
        if (sort === 'priceHigh') return Number(second.price) - Number(first.price);
        if (sort === 'seats') return Number(second.seats) - Number(first.seats);
        return String(first.date || '').localeCompare(String(second.date || ''));
      });

    grid.innerHTML = events.map((event) => `
      <article class="event-card">
        <span class="event-card__category">${escapeHtml(event.category)}</span>
        <h3>${escapeHtml(event.name)}</h3>
        <p>${escapeHtml(event.description || event.desc || '')}</p>
        <p>📅 ${escapeHtml(formatDate(event.date))}</p>
        <p>📍 ${escapeHtml(event.location)}</p>
        <div class="event-card__footer">
          <strong>${escapeHtml(formatPrice(event.price))}</strong>
          <span>${Number(event.seats) || 0} seats left</span>
        </div>
      </article>
    `).join('');

    const empty = document.querySelector('#noResults, [data-events-empty]');
    if (empty) empty.hidden = events.length > 0;
  };

  const initEvents = () => {
    const controls = document.querySelectorAll(
      '#search, #category, #dateFilter, #sort, [name="search"], [name="category"], [name="date"], [name="sort"]',
    );
    if (!document.querySelector('[data-events], #eventGrid')) return;

    const category = document.querySelector('#category, [name="category"]');
    if (category && category.options.length <= 1) {
      [...new Set(readEvents().map((event) => event.category).filter(Boolean))]
        .sort()
        .forEach((value) => category.add(new Option(value, value)));
    }

    controls.forEach((control) => {
      control.addEventListener('input', render);
      control.addEventListener('change', render);
    });
    render();
  };

  window.initEvents = initEvents;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEvents, { once: true });
  } else {
    initEvents();
  }
})();