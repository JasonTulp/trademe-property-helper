# Trade Me Property Notes with Flood Zone Checking

A Chrome extension that allows you to add personal notes to Trade Me property listings and automatically check flood zone information for properties.

## Features

- **Property Notes**: Add and save personal notes for Trade Me property listings
- **Quick Note Options**: Pre-defined buttons for common property concerns
- **Automatic Flood Zone Checking**: Automatically checks NIWA flood mapping data when viewing properties
- **Visual Indicators**: Color-coded flood risk levels and detailed information
- **Persistent Storage**: Notes and data are stored locally in the browser

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension should now appear in your Chrome toolbar

## How It Works

### Property Notes
1. Navigate to any Trade Me property listing
2. Click the extension icon to open the popup
3. Use the quick option buttons or type custom notes
4. Click "Save Note" to store your notes
5. Saved notes will appear as badges on property cards in search results

### Flood Zone Checking
When you open the popup on a property listing, the extension will:
1. Extract the property address from the Trade Me listing
2. Geocode the address to get coordinates
3. Query flood mapping services to check flood risk
4. Display color-coded results:
   - 🟢 **Green**: Low flood risk
   - 🟡 **Yellow**: Medium/future flood risk  
   - 🔴 **Red**: High/current flood risk
   - ❓ **Gray**: Unable to determine or no data

## Current Implementation Status

### ✅ Working Features
- Property address extraction from Trade Me listings
- Address geocoding using OpenStreetMap Nominatim
- Basic coastal proximity flood risk assessment
- User interface and visual indicators
- Integration with existing notes functionality

### 🚧 In Development
The extension currently uses a **mock flood checking service** for demonstration. To enable real NIWA flood mapping:

1. **Identify the exact NIWA service URLs**: The current implementation includes placeholders for the actual NIWA ArcGIS REST service endpoints
2. **Update service URLs** in `flood-service.js`:
   ```javascript
   // Update these URLs with the actual NIWA service endpoints
   this.baseUrl = 'https://services.arcgisonline.co.nz/arcgis/rest/services';
   this.floodServiceUrl = `${this.baseUrl}/NIWA/FloodMapping/MapServer`;
   ```

## Getting the Real Flood Service URLs

To find the actual NIWA flood mapping service URLs:

1. **Visit the NIWA flood mapping tool**: https://experience.arcgis.com/experience/cbde7f2134404f4d90adce5396a0a630
2. **Inspect network requests** in browser developer tools while using the map
3. **Look for REST service calls** to ArcGIS endpoints
4. **Extract the service URLs** and layer IDs from the network requests
5. **Update** `flood-service.js` with the correct URLs

Alternatively, you can:
- Contact NIWA directly for API documentation
- Search ArcGIS Online for published NIWA flood mapping services
- Check the ArcGIS REST Services Directory at https://services.arcgisonline.co.nz/arcgis/rest/services

## Technical Architecture

```
Trade Me Listing Page
        ↓
Content Script (content.js)
├── Extracts property address
├── Stores in Chrome storage
└── Injects note badges

Extension Popup (popup.js)
├── Retrieves stored address
├── Calls geocoding service
├── Queries flood mapping service
└── Displays results

Flood Service (flood-service.js)
├── Geocoding via OpenStreetMap
├── Coordinate conversion (WGS84 → NZTM)
├── ArcGIS REST API queries
└── Risk level interpretation
```

## File Structure

```
trademe-notes/
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup interface
├── popup.js               # Main popup logic and flood checking
├── content.js             # Trade Me page interaction
├── flood-service.js       # NIWA flood mapping service integration
├── style.css              # Popup styling
└── README.md              # This file
```

## API Dependencies

### Currently Used:
- **OpenStreetMap Nominatim**: Free geocoding service for New Zealand addresses
- **Chrome Storage API**: For saving notes and addresses locally

### Planned Integration:
- **NIWA ArcGIS Services**: Official New Zealand flood mapping data
- **ArcGIS Geometry Service**: Coordinate transformation (WGS84 ↔ NZTM)

## Permissions

The extension requires these permissions:
- `storage`: Save notes and addresses locally
- `tabs`: Access current tab URL to identify Trade Me listings  
- `scripting`: Inject content scripts into Trade Me pages
- `host_permissions`: Access Trade Me and mapping services

## Limitations and Disclaimers

⚠️ **Important**: This extension provides preliminary flood risk information only. Always:
- Consult official council flood maps
- Get professional flood risk assessments for property purchases
- Check insurance requirements and availability
- Consider local factors not captured in regional mapping

The flood checking feature:
- Uses publicly available data sources
- May not reflect the most current flood mapping
- Does not account for river flooding, stormwater, or local drainage issues
- Should not be the sole basis for property decisions

## Contributing

To contribute to this project:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on Trade Me listings
5. Submit a pull request

Priority areas for contribution:
- Finding the actual NIWA service URLs
- Improving address extraction accuracy
- Adding support for other flood mapping sources (council data)
- Enhanced error handling and user feedback

## Support

For issues or questions:
1. Check existing issues in the repository
2. Verify all permissions are granted in Chrome extensions
3. Test with multiple Trade Me listings to isolate problems
4. Create a new issue with:
   - Chrome version
   - Extension version  
   - Steps to reproduce
   - Screenshots if helpful

## License

This project is provided as-is for educational and personal use. Please respect Trade Me's terms of service and use responsibly.

---

**Disclaimer**: This extension is not affiliated with Trade Me or NIWA. Property flood risk assessment should always involve professional consultation and official data sources. 