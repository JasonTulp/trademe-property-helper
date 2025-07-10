function getEmojiForNote(note) {
    const emojiMap = {
        'Too Expensive': '💰',
        'Flood Zone': '🌊',
        'Bad Area': '🚫',
        'Bad Zoning': '🏗️',
        'Attached': '📎',
        'Shared Drive': '🚗'
    };
    return emojiMap[note] || '📝';
}

function injectNotes() {
    // Select search result cards
    const searchCards = document.querySelectorAll('[href*="/listing/"]');
    const isWatchlistPage = window.location.pathname.includes('/my-trade-me/watchlist');

    // Handle search cards
    searchCards.forEach(card => {
        const match = card.href.match(/listing\/(\d+)/);
        if (!match) return;
        const id = match[1];
        injectBadge(card, id, isWatchlistPage ? '40px': '100px');
    });
}

function injectBadge(container, id, bottom) {
    if (container.querySelector('.trademe-note-badge')) return;
    if (container.querySelector('.tm-property-watchlist-card__listing-note-wrapper')) return;


    chrome.storage.local.get([id], result => {
        const note = result[id];
        if (note) {
            const badge = document.createElement('div');
            badge.className = 'trademe-note-badge';

            const emoji = getEmojiForNote(note);
            badge.textContent = `${note} ${emoji}`;
            badge.title = note;

            badge.style.color = 'white';
            badge.style.position = 'absolute';
            badge.style.bottom = bottom;
            badge.style.right = '10px';
            badge.style.background = '#007acd';
            badge.style.padding = '6px 10px';
            badge.style.fontSize = '13px';
            badge.style.fontWeight = '500';
            badge.style.borderRadius = '24px';
            badge.style.zIndex = '1000';
            badge.style.cursor = 'pointer';

            // Ensure container has relative positioning
            container.style.position = 'relative';
            container.appendChild(badge);
        }
    });
}

const observer = new MutationObserver(() => {
    injectNotes();
});
observer.observe(document.body, { childList: true, subtree: true });

injectNotes(); // Run once immediately