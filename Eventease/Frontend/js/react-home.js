(function () {
  const rootElement = document.getElementById('react-app');
  if (!rootElement) return;

  const { createElement, useMemo, useState } = React;
  const reactData = window.EventEaseReactData || { categories: [], events: [] };

  function EventCard({ event }) {
    return createElement(
      'article',
      { className: 'feature-card', key: event.id },
      createElement('div', { className: 'icon' }, event.category[0]),
      createElement('h3', null, event.name),
      createElement('p', null, event.description),
      createElement('div', { className: 'mini-meta' },
        createElement('span', null, '📅 ' + event.date),
        createElement('span', null, '📍 ' + event.location)
      ),
      createElement('div', { className: 'mini-row' },
        createElement('strong', null, event.price),
        createElement('a', { className: 'text-link', href: 'events.html' }, 'Explore')
      )
    );
  }

  function HomeApp() {
    const [selectedCategory, setSelectedCategory] = useState('All');

    const filteredEvents = useMemo(() => {
      if (selectedCategory === 'All') return reactData.events;
      return reactData.events.filter((event) => event.category === selectedCategory);
    }, [selectedCategory]);

    return createElement(
      'section',
      { className: 'container', style: { marginTop: '36px', marginBottom: '36px' } },
      createElement('div', { className: 'section-head' },
        createElement('p', { className: 'eyebrow small' }, 'React powered discovery'),
        createElement('h2', null, 'Browse events your way')
      ),
      createElement('div', { className: 'cats', style: { marginBottom: '24px' } },
        createElement('button', {
          className: 'btn btn-light',
          style: { marginRight: '12px', marginBottom: '12px', background: selectedCategory === 'All' ? '#0f766e' : '#ecfdf5', color: selectedCategory === 'All' ? '#fff' : '#12313a', border: '1px solid #cfece7', cursor: 'pointer' },
          onClick: () => setSelectedCategory('All')
        }, 'All'),
        ...reactData.categories.map((category) => createElement('button', {
          key: category.name,
          className: 'btn btn-light',
          style: { marginRight: '12px', marginBottom: '12px', background: selectedCategory === category.name ? '#f97316' : '#fff7ed', color: selectedCategory === category.name ? '#fff' : '#12313a', border: '1px solid #fed7aa', cursor: 'pointer' },
          onClick: () => setSelectedCategory(category.name)
        }, category.emoji + ' ' + category.name))
      ),
      createElement('div', { className: 'feature-grid' },
        ...filteredEvents.map((event) => createElement(EventCard, { event, key: event.id }))
      )
    );
  }

  ReactDOM.createRoot(rootElement).render(createElement(HomeApp));
})();
