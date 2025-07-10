document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const match = tab.url.match(/listing\/(\d+)/);
    if (!match) return;

    const listingId = match[1];
    const noteBox = document.getElementById('note');

    chrome.storage.local.get([listingId], (result) => {
        if (result[listingId]) {
            noteBox.value = result[listingId];
            updateSelectedOption(result[listingId]);
        }
    });

    // Handle quick option button clicks
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const noteText = btn.getAttribute('data-note');
            noteBox.value = noteText;
            updateSelectedOption(noteText);
        });
    });

    // Handle textarea changes to update button selection
    noteBox.addEventListener('input', () => {
        updateSelectedOption(noteBox.value);
    });

    function updateSelectedOption(currentNote) {
        document.querySelectorAll('.option-btn').forEach(btn => {
            const optionText = btn.getAttribute('data-note');
            if (currentNote === optionText) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }

    document.getElementById('save').addEventListener('click', () => {
        const note = noteBox.value;
        chrome.storage.local.set({ [listingId]: note }, () => {
            window.close();
        });
    });
});