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
    const cards = document.querySelectorAll('[href*="/listing/"]');

    cards.forEach(card => {
        const match = card.href.match(/listing\/(\d+)/);
        if (!match) return;
        const id = match[1];

        // Skip if badge already exists
        if (card.querySelector('.trademe-note-badge')) return;
        
        chrome.storage.local.get([id], result => {
            const note = result[id];
            if (note) {
                const badge = document.createElement('div');
                badge.className = 'trademe-note-badge';
                
                // Get the appropriate emoji for predefined options
                const emoji = getEmojiForNote(note);
                badge.textContent = note + " " + emoji;
                
                badge.title = note;
                badge.style.color = 'white';
                badge.style.position = 'absolute';
                badge.style.bottom = '100px';
                badge.style.right = '5px';
                badge.style.background = '#007acd';
                badge.style.padding = '6px 10px';
                badge.style.fontSize = '13px';
                badge.style.fontWeight = '500';
                badge.style.borderRadius = '24px';
                badge.style.zIndex = '1000';
                badge.style.cursor = 'pointer';
                card.style.position = 'relative';
                card.appendChild(badge);
            }
        });
    });
}

injectNotes();
