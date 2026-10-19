(function () {
  'use strict';
  const input = document.getElementById('tool-search-input');
  const directory = document.getElementById('tool-directory');
  const clear = document.getElementById('tool-search-clear');
  const status = document.getElementById('tool-search-status');
  if (!input || !directory || !clear || !status) return;

  const cards = Array.from(directory.querySelectorAll('.tool-card'));
  const normalize = value => value.toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim();

  function filterTools() {
    const query = normalize(input.value);
    let visible = 0;
    cards.forEach(card => {
      const matches = !query || normalize(card.textContent).includes(query);
      card.hidden = !matches;
      if (matches) visible++;
    });
    clear.hidden = !input.value;
    status.textContent = query
      ? (visible ? visible + ' of ' + cards.length + ' tools shown.' : 'No tools found. Try a different search.')
      : '';
  }

  input.addEventListener('input', filterTools);
  clear.addEventListener('click', () => {
    input.value = '';
    filterTools();
    input.focus();
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape' && input.value) {
      input.value = '';
      filterTools();
    }
  });
  filterTools();
})();