import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const STORAGE_KEY = 'youth-tier-list-debate-v1';

const TIERS = [
  { id: 'S', label: 'Legendary', color: '#ff4d6d' },
  { id: 'A', label: 'Great', color: '#ffb703' },
  { id: 'B', label: 'Solid', color: '#43aa8b' },
  { id: 'C', label: 'Mid', color: '#4cc9f0' },
  { id: 'D', label: 'Rough', color: '#9381ff' },
  { id: 'F', label: 'Never Again', color: '#6c757d' }
];

const DEFAULT_CATEGORIES = [
  {
    id: 'fast-food',
    name: 'Fast Food',
    items: [
      'Chick-fil-A',
      'Taco Bell',
      'McDonald’s',
      'Wendy’s',
      'In-N-Out',
      'Chipotle',
      'Panda Express',
      'Subway',
      'Five Guys',
      'Dairy Queen'
    ]
  },
  {
    id: 'cereal-brands',
    name: 'Cereal Brands',
    items: [
      'Cinnamon Toast Crunch',
      'Frosted Flakes',
      'Lucky Charms',
      'Reese’s Puffs',
      'Honey Nut Cheerios',
      'Froot Loops',
      'Cap’n Crunch',
      'Cocoa Puffs',
      'Fruity Pebbles',
      'Raisin Bran'
    ]
  },
  {
    id: 'common-movies',
    name: 'Common Well-Known Movies',
    items: [
      'Toy Story',
      'Shrek',
      'The Lion King',
      'Finding Nemo',
      'The Incredibles',
      'Star Wars: A New Hope',
      'Jurassic Park',
      'The Avengers',
      'Spider-Man: Into the Spider-Verse',
      'The Lord of the Rings: The Fellowship of the Ring'
    ]
  }
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `category-${Date.now()}`;
}

function makeCard(name) {
  return {
    id: crypto.randomUUID(),
    name,
    tier: null
  };
}

function createDefaultState() {
  return {
    activeCategoryId: DEFAULT_CATEGORIES[0].id,
    screen: 'select',
    presentationMode: false,
    selectedCardId: null,
    categories: DEFAULT_CATEGORIES.map((category) => ({
      id: category.id,
      name: category.name,
      cards: category.items.map(makeCard)
    }))
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createDefaultState();
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed.categories)) return createDefaultState();
    return {
      ...createDefaultState(),
      ...parsed,
      screen: parsed.screen === 'results' ? 'select' : parsed.screen || 'select'
    };
  } catch {
    return createDefaultState();
  }
}

function usePersistentState() {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return [state, setState];
}

function getNextUnplaced(cards, currentId) {
  const unplaced = cards.filter((card) => !card.tier);
  if (!unplaced.length) return null;
  if (!currentId) return unplaced[0].id;
  const currentIndex = unplaced.findIndex((card) => card.id === currentId);
  return unplaced[(currentIndex + 1 + unplaced.length) % unplaced.length].id;
}

function App() {
  const [state, setState] = usePersistentState();
  const [timer, setTimer] = useState({ duration: 30, remaining: 30, running: false });
  const [draftCategory, setDraftCategory] = useState('');
  const [newCardName, setNewCardName] = useState('');
  const activeCategory = state.categories.find((category) => category.id === state.activeCategoryId) || state.categories[0];
  const selectedCard = activeCategory?.cards.find((card) => card.id === state.selectedCardId) || null;

  useEffect(() => {
    if (!timer.running) return;
    if (timer.remaining <= 0) {
      setTimer((current) => ({ ...current, running: false }));
      return;
    }
    const tick = setTimeout(() => {
      setTimer((current) => ({ ...current, remaining: Math.max(0, current.remaining - 1) }));
    }, 1000);
    return () => clearTimeout(tick);
  }, [timer.running, timer.remaining]);

  useEffect(() => {
    function onKeyDown(event) {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (event.key.toLowerCase() === 'p') {
        setState((current) => ({ ...current, presentationMode: !current.presentationMode }));
      }
      if (event.key.toLowerCase() === 'r' && state.screen === 'board' && activeCategory) {
        event.preventDefault();
        resetCurrentCategory();
      }
      if (event.code === 'Space' && state.screen === 'board' && activeCategory) {
        event.preventDefault();
        selectNextCard();
      }
      const tierIndex = Number(event.key) - 1;
      if (tierIndex >= 0 && tierIndex < TIERS.length && state.screen === 'board' && selectedCard) {
        event.preventDefault();
        placeCard(selectedCard.id, TIERS[tierIndex].id);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeCategory, selectedCard, state.screen, state.presentationMode]);

  function updateCategory(categoryId, updater) {
    setState((current) => ({
      ...current,
      categories: current.categories.map((category) => (category.id === categoryId ? updater(category) : category))
    }));
  }

  function openBoard(categoryId) {
    const category = state.categories.find((entry) => entry.id === categoryId);
    setState((current) => ({
      ...current,
      activeCategoryId: categoryId,
      selectedCardId: getNextUnplaced(category?.cards || [], null),
      screen: 'board'
    }));
  }

  function placeCard(cardId, tierId) {
    setState((current) => {
      const category = current.categories.find((entry) => entry.id === current.activeCategoryId);
      let nextSelected = current.selectedCardId;
      const categories = current.categories.map((entry) => {
        if (entry.id !== current.activeCategoryId) return entry;
        const cards = entry.cards.map((card) => (card.id === cardId ? { ...card, tier: tierId } : card));
        nextSelected = getNextUnplaced(cards, cardId);
        return { ...entry, cards };
      });
      return {
        ...current,
        categories,
        selectedCardId: category ? nextSelected : current.selectedCardId
      };
    });
  }

  function removeFromTier(cardId) {
    setState((current) => ({
      ...current,
      selectedCardId: cardId,
      categories: current.categories.map((category) => (
        category.id === current.activeCategoryId
          ? { ...category, cards: category.cards.map((card) => (card.id === cardId ? { ...card, tier: null } : card)) }
          : category
      ))
    }));
  }

  function selectNextCard() {
    setState((current) => {
      const category = current.categories.find((entry) => entry.id === current.activeCategoryId);
      return { ...current, selectedCardId: getNextUnplaced(category?.cards || [], current.selectedCardId) };
    });
  }

  function resetCurrentCategory() {
    if (!activeCategory || !confirm(`Reset ${activeCategory.name}?`)) return;
    setState((current) => ({
      ...current,
      screen: 'board',
      selectedCardId: activeCategory.cards[0]?.id || null,
      categories: current.categories.map((category) => (
        category.id === current.activeCategoryId
          ? { ...category, cards: category.cards.map((card) => ({ ...card, tier: null })) }
          : category
      ))
    }));
  }

  function resetAll() {
    if (!confirm('Reset all categories and restore the default game data?')) return;
    setState(createDefaultState());
    setTimer({ duration: 30, remaining: 30, running: false });
  }

  function addCategory(event) {
    event.preventDefault();
    const name = draftCategory.trim();
    if (!name) return;
    const id = `${slugify(name)}-${Date.now()}`;
    setState((current) => ({
      ...current,
      activeCategoryId: id,
      categories: [
        ...current.categories,
        {
          id,
          name,
          cards: []
        }
      ]
    }));
    setDraftCategory('');
  }

  function renameCategory(categoryId, name) {
    updateCategory(categoryId, (category) => ({ ...category, name }));
  }

  function deleteCategory(categoryId) {
    if (state.categories.length === 1 || !confirm('Delete this category?')) return;
    setState((current) => {
      const categories = current.categories.filter((category) => category.id !== categoryId);
      return {
        ...current,
        categories,
        activeCategoryId: categories[0].id,
        screen: 'select',
        selectedCardId: null
      };
    });
  }

  function addCard(event) {
    event.preventDefault();
    const name = newCardName.trim();
    if (!name || !activeCategory) return;
    const card = makeCard(name);
    setState((current) => ({
      ...current,
      selectedCardId: current.selectedCardId || card.id,
      categories: current.categories.map((category) => (
        category.id === current.activeCategoryId
          ? { ...category, cards: [...category.cards, card] }
          : category
      ))
    }));
    setNewCardName('');
  }

  function renameCard(cardId, name) {
    updateCategory(activeCategory.id, (category) => ({
      ...category,
      cards: category.cards.map((card) => (card.id === cardId ? { ...card, name } : card))
    }));
  }

  function deleteCard(cardId) {
    updateCategory(activeCategory.id, (category) => ({
      ...category,
      cards: category.cards.filter((card) => card.id !== cardId)
    }));
    setState((current) => ({ ...current, selectedCardId: current.selectedCardId === cardId ? null : current.selectedCardId }));
  }

  function setTimerDuration(duration) {
    setTimer({ duration, remaining: duration, running: false });
  }

  if (!activeCategory) {
    return <EmptyState resetAll={resetAll} />;
  }

  return (
    <main className={`app screen-${state.screen}${state.presentationMode ? ' presentation' : ''}`}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Header
        screen={state.screen}
        activeCategory={activeCategory}
        presentationMode={state.presentationMode}
        onSelectScreen={(screen) => setState((current) => ({ ...current, screen }))}
        onTogglePresentation={() => setState((current) => ({ ...current, presentationMode: !current.presentationMode }))}
        onResetAll={resetAll}
      />
      {state.screen === 'select' && (
        <CategorySelect
          categories={state.categories}
          onOpenBoard={openBoard}
          onRenameCategory={renameCategory}
          onDeleteCategory={deleteCategory}
          draftCategory={draftCategory}
          setDraftCategory={setDraftCategory}
          onAddCategory={addCategory}
          onResetAll={resetAll}
        />
      )}
      {state.screen === 'board' && (
        <TierBoard
          category={activeCategory}
          selectedCardId={state.selectedCardId}
          presentationMode={state.presentationMode}
          timer={timer}
          onSelectCard={(cardId) => setState((current) => ({ ...current, selectedCardId: cardId }))}
          onPlaceCard={placeCard}
          onRemoveFromTier={removeFromTier}
          onSelectNextCard={selectNextCard}
          onSetTimerDuration={setTimerDuration}
          onToggleTimer={() => setTimer((current) => ({ ...current, running: !current.running }))}
          onResetTimer={() => setTimer((current) => ({ ...current, remaining: current.duration, running: false }))}
          onResetCurrentCategory={resetCurrentCategory}
          onShowResults={() => setState((current) => ({ ...current, screen: 'results' }))}
          newCardName={newCardName}
          setNewCardName={setNewCardName}
          onAddCard={addCard}
          onRenameCard={renameCard}
          onDeleteCard={deleteCard}
        />
      )}
      {state.screen === 'results' && (
        <FinalResults
          category={activeCategory}
          onBack={() => setState((current) => ({ ...current, screen: 'board' }))}
          onChooseCategory={() => setState((current) => ({ ...current, screen: 'select' }))}
        />
      )}
    </main>
  );
}

function Header({ screen, activeCategory, presentationMode, onSelectScreen, onTogglePresentation, onResetAll }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => onSelectScreen('select')} aria-label="Category select">
        <span className="brand-mark">TL</span>
        <span>
          <strong>Tier List Debate</strong>
          <small>{activeCategory.name}</small>
        </span>
      </button>
      <nav className="nav-actions" aria-label="Main navigation">
        <button className={screen === 'select' ? 'active' : ''} onClick={() => onSelectScreen('select')}>Categories</button>
        <button className={screen === 'board' ? 'active' : ''} onClick={() => onSelectScreen('board')}>Board</button>
        <button className={screen === 'results' ? 'active' : ''} onClick={() => onSelectScreen('results')}>Results</button>
        <button className={presentationMode ? 'primary active' : 'primary'} onClick={onTogglePresentation}>
          {presentationMode ? 'Exit Presentation' : 'Presentation'}
        </button>
        <button className="danger subtle" onClick={onResetAll}>Reset All</button>
      </nav>
    </header>
  );
}

function CategorySelect({ categories, onOpenBoard, onRenameCategory, onDeleteCategory, draftCategory, setDraftCategory, onAddCategory }) {
  return (
    <section className="screen category-screen">
      <div className="hero-copy">
        <p className="eyebrow">Youth group debate night</p>
        <h1>Pick a category, start the arguments, lock the list.</h1>
      </div>
      <div className="category-grid">
        {categories.map((category) => {
          const placed = category.cards.filter((card) => card.tier).length;
          return (
            <article className="category-card" key={category.id}>
              <input
                className="title-input"
                value={category.name}
                onChange={(event) => onRenameCategory(category.id, event.target.value)}
                aria-label="Category name"
              />
              <div className="category-stats">
                <span>{category.cards.length} cards</span>
                <span>{placed} placed</span>
              </div>
              <div className="mini-stack">
                {category.cards.slice(0, 5).map((card) => (
                  <span key={card.id}>{card.name}</span>
                ))}
              </div>
              <div className="card-actions">
                <button className="primary" onClick={() => onOpenBoard(category.id)}>Open Board</button>
                <button className="subtle danger" onClick={() => onDeleteCategory(category.id)}>Delete</button>
              </div>
            </article>
          );
        })}
        <form className="category-card add-card-form" onSubmit={onAddCategory}>
          <label htmlFor="new-category">New Category</label>
          <input
            id="new-category"
            value={draftCategory}
            onChange={(event) => setDraftCategory(event.target.value)}
            placeholder="Sunday snacks, worship songs..."
          />
          <button className="primary" type="submit">Add Category</button>
        </form>
      </div>
    </section>
  );
}

function TierBoard({
  category,
  selectedCardId,
  presentationMode,
  timer,
  onSelectCard,
  onPlaceCard,
  onRemoveFromTier,
  onSelectNextCard,
  onSetTimerDuration,
  onToggleTimer,
  onResetTimer,
  onResetCurrentCategory,
  onShowResults,
  newCardName,
  setNewCardName,
  onAddCard,
  onRenameCard,
  onDeleteCard
}) {
  const selectedCard = category.cards.find((card) => card.id === selectedCardId) || category.cards.find((card) => !card.tier) || null;
  const unplaced = category.cards.filter((card) => !card.tier);
  const completed = category.cards.length - unplaced.length;
  const progress = category.cards.length ? Math.round((completed / category.cards.length) * 100) : 0;

  function onDragStart(event, cardId) {
    event.dataTransfer.setData('text/plain', cardId);
    event.dataTransfer.effectAllowed = 'move';
  }

  function onDrop(event, tierId) {
    event.preventDefault();
    const cardId = event.dataTransfer.getData('text/plain');
    if (cardId) onPlaceCard(cardId, tierId);
  }

  return (
    <section className="screen board-screen">
      <div className="board-title-row">
        <div>
          <p className="eyebrow">Now debating</p>
          <h1>{category.name}</h1>
        </div>
        <div className="board-actions">
          <TimerPanel
            timer={timer}
            onSetTimerDuration={onSetTimerDuration}
            onToggleTimer={onToggleTimer}
            onResetTimer={onResetTimer}
          />
          <div className="board-buttons">
            <button className="primary" onClick={onShowResults}>Final Results</button>
            <button className="subtle" onClick={onSelectNextCard}>Next</button>
            <button className="danger" onClick={onResetCurrentCategory}>Reset</button>
          </div>
        </div>
      </div>
      <div className="board-status">
        <div className="progress-track" aria-label={`${progress}% complete`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <strong>{completed}/{category.cards.length}</strong>
        <span>{selectedCard ? `${selectedCard.name} selected` : 'All options placed'}</span>
      </div>
      <OptionsBank
        selectedCard={selectedCard}
        unplaced={unplaced}
        presentationMode={presentationMode}
        onSelectCard={onSelectCard}
        onPlaceCard={onPlaceCard}
        onRemoveFromTier={onRemoveFromTier}
        onDragStart={onDragStart}
        onRenameCard={onRenameCard}
        onDeleteCard={onDeleteCard}
      />
      <div className="tiers" aria-label="Tier board">
        {TIERS.map((tier) => {
          const cards = category.cards.filter((card) => card.tier === tier.id);
          return (
            <div
              className="tier-row"
              key={tier.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onDrop(event, tier.id)}
            >
              <div className="tier-label" style={{ '--tier-color': tier.color }}>
                <strong>{tier.id}</strong>
                <span>{tier.label}</span>
              </div>
              <div className="tier-dropzone">
                {cards.length === 0 && <span className="drop-hint">Drop here</span>}
                {cards.map((card) => (
                  <GameCard
                    key={card.id}
                    card={card}
                    selected={card.id === selectedCardId}
                    onSelect={onSelectCard}
                    onDragStart={onDragStart}
                    onRemoveFromTier={onRemoveFromTier}
                    canEdit={false}
                    onRenameCard={onRenameCard}
                    onDeleteCard={onDeleteCard}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {!presentationMode && (
        <div className="edit-drawer">
          <EditPanel
            category={category}
            newCardName={newCardName}
            setNewCardName={setNewCardName}
            onAddCard={onAddCard}
            onRenameCard={onRenameCard}
            onDeleteCard={onDeleteCard}
          />
        </div>
      )}
    </section>
  );
}

function OptionsBank({
  selectedCard,
  unplaced,
  presentationMode,
  onSelectCard,
  onPlaceCard,
  onRemoveFromTier,
  onDragStart,
  onRenameCard,
  onDeleteCard
}) {
  function onDrop(event) {
    event.preventDefault();
    const cardId = event.dataTransfer.getData('text/plain');
    if (cardId) onRemoveFromTier(cardId);
  }

  return (
    <section className="options-bank" aria-label="Unplaced options" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
      <div className="options-heading">
        <span>Options</span>
        <strong>{unplaced.length} left</strong>
      </div>
      <div className="options-grid">
        {unplaced.length ? (
          unplaced.map((card) => (
            <GameCard
              key={card.id}
              card={card}
              selected={card.id === selectedCard?.id}
              onSelect={onSelectCard}
              onDragStart={onDragStart}
              onRemoveFromTier={() => {}}
              canEdit={false}
              onRenameCard={onRenameCard}
              onDeleteCard={onDeleteCard}
            />
          ))
        ) : (
          <div className="empty-bank">All options have made the board.</div>
        )}
      </div>
      {selectedCard && (
        <div className="quick-place">
          <span>Click to place selected:</span>
          {TIERS.map((tier) => (
            <button key={tier.id} style={{ '--tier-color': tier.color }} onClick={() => onPlaceCard(selectedCard.id, tier.id)}>
              {tier.id}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function TimerPanel({ timer, onSetTimerDuration, onToggleTimer, onResetTimer }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (timer.remaining / timer.duration) * circumference;

  return (
    <div className="panel-section timer-panel">
      <div className="timer-display">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r={radius} />
          <circle cx="50" cy="50" r={radius} style={{ strokeDasharray: circumference, strokeDashoffset: offset }} />
        </svg>
        <strong>{timer.remaining}</strong>
      </div>
      <div className="timer-presets">
        {[15, 30, 60].map((duration) => (
          <button key={duration} className={timer.duration === duration ? 'active' : ''} onClick={() => onSetTimerDuration(duration)}>
            {duration}s
          </button>
        ))}
      </div>
      <div className="card-actions">
        <button className="primary" onClick={onToggleTimer}>{timer.running ? 'Pause' : 'Start'}</button>
        <button className="subtle" onClick={onResetTimer}>Reset</button>
      </div>
    </div>
  );
}

function EditPanel({ category, newCardName, setNewCardName, onAddCard, onRenameCard, onDeleteCard }) {
  return (
    <div className="panel-section edit-panel">
      <p className="eyebrow">Edit cards</p>
      <form onSubmit={onAddCard} className="add-row">
        <input
          value={newCardName}
          onChange={(event) => setNewCardName(event.target.value)}
          placeholder="Add a debate item"
        />
        <button className="primary" type="submit">Add</button>
      </form>
      <div className="edit-list">
        {category.cards.map((card) => (
          <div key={card.id} className="edit-item">
            <input value={card.name} onChange={(event) => onRenameCard(card.id, event.target.value)} />
            <button className="icon-button danger" onClick={() => onDeleteCard(card.id)} aria-label={`Delete ${card.name}`}>x</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function GameCard({ card, selected, onSelect, onDragStart, onRemoveFromTier, canEdit, onRenameCard, onDeleteCard }) {
  return (
    <button
      className={selected ? 'game-card selected' : 'game-card'}
      draggable
      onDragStart={(event) => onDragStart(event, card.id)}
      onClick={() => onSelect(card.id)}
    >
      {canEdit ? (
        <input
          value={card.name}
          onChange={(event) => onRenameCard(card.id, event.target.value)}
          onClick={(event) => event.stopPropagation()}
          aria-label="Card name"
        />
      ) : (
        <span>{card.name}</span>
      )}
      {canEdit && (
        <span className="card-mini-actions">
          <span onClick={(event) => { event.stopPropagation(); onRemoveFromTier(card.id); }}>undo</span>
          <span onClick={(event) => { event.stopPropagation(); onDeleteCard(card.id); }}>x</span>
        </span>
      )}
    </button>
  );
}

function FinalResults({ category, onBack, onChooseCategory }) {
  const totalPlaced = category.cards.filter((card) => card.tier).length;

  return (
    <section className="screen results-screen">
      <div className="results-header">
        <div>
          <p className="eyebrow">Final board</p>
          <h1>{category.name}</h1>
        </div>
        <div className="card-actions">
          <button className="subtle" onClick={onBack}>Back to Board</button>
          <button className="primary" onClick={onChooseCategory}>Choose Category</button>
        </div>
      </div>
      <div className="results-table">
        {TIERS.map((tier) => {
          const cards = category.cards.filter((card) => card.tier === tier.id);
          return (
            <div className="result-row" key={tier.id}>
              <div className="result-tier" style={{ '--tier-color': tier.color }}>
                <strong>{tier.id}</strong>
                <span>{tier.label}</span>
              </div>
              <div className="result-cards">
                {cards.length ? cards.map((card) => <span key={card.id}>{card.name}</span>) : <em>No picks</em>}
              </div>
            </div>
          );
        })}
      </div>
      <footer className="results-footer">{totalPlaced} placed. {category.cards.length - totalPlaced} still undecided.</footer>
    </section>
  );
}

function EmptyState({ resetAll }) {
  return (
    <main className="app">
      <section className="empty-app">
        <h1>No categories found</h1>
        <button className="primary" onClick={resetAll}>Restore Defaults</button>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
