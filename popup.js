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

    // Flood zone checking functionality
    await checkFloodZone(listingId);
});

async function checkFloodZone(listingId) {
    const floodLoadingEl = document.getElementById('flood-loading');
    const floodTextEl = document.getElementById('flood-text');
    const floodResultEl = document.getElementById('flood-result');
    
    console.log('🌊 Starting flood zone check for listing:', listingId);
    
    try {
        // Show loading state
        floodLoadingEl.style.display = 'block';
        floodTextEl.textContent = 'Checking flood zone...';
        floodResultEl.className = 'flood-result';
        
        // Get stored address for this listing
        const addressKey = `address_${listingId}`;
        console.log('🔍 Looking for address with key:', addressKey);
        
        const result = await chrome.storage.local.get([addressKey]);
        console.log('💾 Storage result:', result);
        
        const address = result[addressKey];
        console.log('🏠 Retrieved address:', address);
        
        if (!address) {
            // Try to trigger address extraction by sending message to content script
            console.log('📨 No address found, trying to extract from page...');
            
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: () => {
                        // Try to extract address again
                        console.log('🔄 Re-running address extraction...');
                        if (typeof storePropertyDataWithRetry === 'function') {
                            storePropertyDataWithRetry();
                        }
                    }
                });
                
                // Wait a moment and try again
                await new Promise(resolve => setTimeout(resolve, 2000));
                const retryResult = await chrome.storage.local.get([addressKey]);
                const retryAddress = retryResult[addressKey];
                
                if (retryAddress) {
                    console.log('✅ Address found on retry:', retryAddress);
                    return await processFloodCheck(retryAddress);
                }
            } catch (scriptError) {
                console.error('❌ Script execution error:', scriptError);
            }
            
            throw new Error('Property address not found. Try refreshing the listing page and waiting a moment before opening the extension.');
        }
        
        return await processFloodCheck(address);
        
    } catch (error) {
        console.error('❌ Flood zone check error:', error);
        floodTextEl.textContent = error.message || 'Unable to check flood zone';
        floodResultEl.className = 'flood-result flood-error';
        
        // Add debug button for development
        if (floodResultEl.querySelector('.debug-info')) return;
        
        const debugButton = document.createElement('button');
        debugButton.textContent = '🔧 Debug Info';
        debugButton.className = 'debug-info';
        debugButton.style.cssText = 'margin-top:8px;padding:4px 8px;font-size:11px;background:#6c757d;color:white;border:none;border-radius:4px;cursor:pointer;';
        debugButton.onclick = () => showDebugInfo(listingId);
        floodResultEl.appendChild(debugButton);
        
    } finally {
        floodLoadingEl.style.display = 'none';
    }
}

async function processFloodCheck(address) {
    const floodTextEl = document.getElementById('flood-text');
    
    console.log('🌍 Starting geocoding for address:', address);
    floodTextEl.textContent = 'Locating property...';
    
    // Geocode the address to get coordinates
    const coordinates = await geocodeAddress(address);
    
    if (!coordinates) {
        throw new Error('Could not locate the property address. The address might be incomplete or invalid.');
    }
    
    console.log('📍 Coordinates found:', coordinates);
    floodTextEl.textContent = 'Checking flood mapping data...';
    
    // Check flood zone using coordinates
    const floodStatus = await queryFloodZone(coordinates);
    
    // Display results
    displayFloodResult(floodStatus, address);
}

async function showDebugInfo(listingId) {
    const debugInfo = [];
    
    // Get current tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    debugInfo.push(`Tab URL: ${tab.url}`);
    debugInfo.push(`Listing ID: ${listingId}`);
    
    // Check storage
    const addressKey = `address_${listingId}`;
    const stored = await chrome.storage.local.get([addressKey]);
    debugInfo.push(`Stored address: ${JSON.stringify(stored)}`);
    
    // Check all storage
    const allStorage = await chrome.storage.local.get();
    const addressKeys = Object.keys(allStorage).filter(key => key.startsWith('address_'));
    debugInfo.push(`All address keys: ${addressKeys.join(', ')}`);
    
    alert(debugInfo.join('\n\n'));
}

async function geocodeAddress(address) {
    try {
        console.log('🌐 Geocoding address via Nominatim:', address);
        
        // Clean up the address for better geocoding
        const cleanAddress = address.replace(/\s+/g, ' ').trim();
        
        // Try OpenStreetMap Nominatim first (free, no API key required)
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=nz&limit=1&q=${encodeURIComponent(cleanAddress)}`;
        console.log('📡 Nominatim URL:', nominatimUrl);
        
        const response = await fetch(nominatimUrl, {
            headers: {
                'User-Agent': 'TradeMe Property Notes Extension'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Geocoding service error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📊 Nominatim response:', data);
        
        if (data && data.length > 0) {
            const result = {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon),
                display_name: data[0].display_name
            };
            console.log('✅ Geocoding successful:', result);
            return result;
        }
        
        console.log('❌ No geocoding results found');
        return null;
        
    } catch (error) {
        console.error('❌ Geocoding error:', error);
        throw new Error(`Address geocoding failed: ${error.message}`);
    }
}

async function queryFloodZone(coordinates) {
    try {
        console.log('🗺️ Querying flood zone for coordinates:', coordinates);
        
        // First, let's try to identify flood zone using a simplified approach
        // This is a placeholder implementation - we'll need the actual NIWA service URLs
        
        // For demonstration, I'll implement a basic coastal proximity check
        // and add framework for when we get the actual flood service URLs
        
        const { latitude, longitude } = coordinates;
        
        // Check if coordinates are within New Zealand bounds
        if (latitude < -47.3 || latitude > -34.0 || longitude < 166.0 || longitude > 179.0) {
            return {
                status: 'outside_nz',
                message: 'Property appears to be outside New Zealand',
                risk_level: 'unknown'
            };
        }
        
        // Placeholder for actual flood service query
        // TODO: Replace with actual NIWA flood mapping service calls
        const mockFloodCheck = await checkMockFloodService(coordinates);
        
        return mockFloodCheck;
        
    } catch (error) {
        console.error('❌ Flood zone query error:', error);
        return {
            status: 'error',
            message: 'Error checking flood zone data',
            risk_level: 'unknown'
        };
    }
}

async function checkMockFloodService(coordinates) {
    // This is a placeholder function that simulates flood zone checking
    // In reality, this would query the NIWA ArcGIS REST services
    
    const { latitude, longitude } = coordinates;
    console.log('🌊 Running mock flood check for:', { latitude, longitude });
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Basic heuristic: properties very close to sea level or near known coastal areas
    // This is just for demonstration - replace with actual service calls
    const coastalProximity = checkCoastalProximity(latitude, longitude);
    
    if (coastalProximity.isCoastal) {
        return {
            status: 'potential_risk',
            message: 'Property may be in a coastal area. Check local council flood maps for detailed information.',
            risk_level: 'medium',
            details: `Located ${coastalProximity.description}. NIWA flood mapping data would provide precise flood zone classification.`,
            recommendation: 'Consult local council flood hazard maps and consider professional flood risk assessment.'
        };
    }
    
    return {
        status: 'low_risk',
        message: 'Property appears to be inland with lower coastal flood risk.',
        risk_level: 'low',
        details: 'Based on location analysis. Local flooding from rivers or stormwater may still be possible.',
        recommendation: 'Check local council flood maps for comprehensive flood risk information.'
    };
}

function checkCoastalProximity(latitude, longitude) {
    // Very basic coastal proximity check for major NZ cities
    // This is simplified - real implementation would use actual coastline data
    
    const coastalAreas = [
        { name: 'Auckland', lat: -36.8485, lng: 174.7633, radius: 0.3 },
        { name: 'Wellington', lat: -41.2865, lng: 174.7762, radius: 0.2 },
        { name: 'Christchurch coastal', lat: -43.5321, lng: 172.6362, radius: 0.3 },
        { name: 'Tauranga', lat: -37.6871, lng: 176.1654, radius: 0.2 },
        { name: 'Napier', lat: -39.4928, lng: 176.9120, radius: 0.15 },
    ];
    
    for (const area of coastalAreas) {
        const distance = Math.sqrt(
            Math.pow(latitude - area.lat, 2) + Math.pow(longitude - area.lng, 2)
        );
        
        if (distance <= area.radius) {
            return {
                isCoastal: true,
                description: `near ${area.name} coastal area`
            };
        }
    }
    
    return {
        isCoastal: false,
        description: 'inland location'
    };
}

function displayFloodResult(floodStatus, address) {
    const floodTextEl = document.getElementById('flood-text');
    const floodResultEl = document.getElementById('flood-result');
    
    console.log('📋 Displaying flood result:', floodStatus);
    
    // Clear previous classes
    floodResultEl.className = 'flood-result';
    
    let statusClass = '';
    let icon = '';
    
    switch (floodStatus.risk_level) {
        case 'high':
            statusClass = 'flood-risk';
            icon = '⚠️';
            break;
        case 'medium':
            statusClass = 'flood-warning';
            icon = '⚠️';
            break;
        case 'low':
            statusClass = 'flood-safe';
            icon = '✅';
            break;
        default:
            statusClass = 'flood-error';
            icon = '❓';
    }
    
    floodResultEl.classList.add(statusClass);
    
    let html = `
        <div>
            <span>${icon} ${floodStatus.message}</span>
        </div>
    `;
    
    if (floodStatus.details) {
        html += `<div class="flood-details">${floodStatus.details}</div>`;
    }
    
    if (floodStatus.recommendation) {
        html += `<div class="flood-details"><strong>Recommendation:</strong> ${floodStatus.recommendation}</div>`;
    }
    
    // Add address info
    html += `<div class="flood-details"><strong>Address:</strong> ${address}</div>`;
    
    // Add note about service limitations
    html += `<div class="flood-details"><em>Note: This is a preliminary check. Always consult official council flood maps and consider professional assessment for detailed flood risk analysis.</em></div>`;
    
    floodResultEl.innerHTML = html;
}
