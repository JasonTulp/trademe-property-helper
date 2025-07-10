// NIWA Flood Mapping Service Integration
// This file contains the actual flood zone checking logic using NIWA's ArcGIS services

class NIWAFloodService {
    constructor() {
        // NIWA flood mapping service URLs
        // These are placeholders - need to be updated with actual service endpoints
        this.baseUrl = 'https://services.arcgisonline.co.nz/arcgis/rest/services';
        this.floodServiceUrl = `${this.baseUrl}/NIWA/FloodMapping/MapServer`;
        
        // Alternative services to try
        this.alternativeServices = [
            'https://api.arcgis.com/arcgis/rest/services', // ArcGIS Online
        ];
    }

    async checkFloodZone(coordinates) {
        try {
            const { latitude, longitude } = coordinates;
            
            // Convert to NZTM (EPSG:2193) coordinates if needed
            const nztmCoords = await this.convertToNZTM(latitude, longitude);
            
            // Query the flood mapping service
            const floodData = await this.queryFloodLayers(nztmCoords);
            
            return this.interpretFloodData(floodData, coordinates);
            
        } catch (error) {
            console.error('NIWA flood service error:', error);
            throw new Error('Unable to check NIWA flood mapping data');
        }
    }

    async convertToNZTM(latitude, longitude) {
        // Convert WGS84 to NZTM (New Zealand Transverse Mercator)
        // This is a simplified conversion - in production, use proper projection library
        
        try {
            const geometryServiceUrl = 'https://services.arcgisonline.co.nz/arcgis/rest/services/Utilities/Geometry/GeometryServer/project';
            
            const params = new URLSearchParams({
                f: 'json',
                inSR: '4326', // WGS84
                outSR: '2193', // NZTM
                geometries: JSON.stringify({
                    geometryType: 'esriGeometryPoint',
                    geometries: [{
                        x: longitude,
                        y: latitude
                    }]
                })
            });
            
            const response = await fetch(geometryServiceUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params
            });
            
            const data = await response.json();
            
            if (data.geometries && data.geometries.length > 0) {
                return {
                    x: data.geometries[0].x,
                    y: data.geometries[0].y
                };
            }
            
            // Fallback to approximate conversion
            return { x: longitude, y: latitude };
            
        } catch (error) {
            console.error('Coordinate conversion error:', error);
            return { x: longitude, y: latitude };
        }
    }

    async queryFloodLayers(coordinates) {
        const floodLayers = [
            '0', // 1% AEP Current scenario
            '1', // 1% AEP + 0.1m sea level rise
            '10', // 1% AEP + 1.0m sea level rise
        ];
        
        const results = [];
        
        for (const layerId of floodLayers) {
            try {
                const layerResult = await this.querySpecificLayer(layerId, coordinates);
                results.push({
                    layerId,
                    scenario: this.getScenarioDescription(layerId),
                    inFloodZone: layerResult.features && layerResult.features.length > 0,
                    data: layerResult
                });
            } catch (error) {
                console.error(`Error querying layer ${layerId}:`, error);
            }
        }
        
        return results;
    }

    async querySpecificLayer(layerId, coordinates) {
        const queryUrl = `${this.floodServiceUrl}/${layerId}/query`;
        
        const params = new URLSearchParams({
            f: 'json',
            where: '1=1',
            geometry: `${coordinates.x},${coordinates.y}`,
            geometryType: 'esriGeometryPoint',
            spatialRel: 'esriSpatialRelIntersects',
            outFields: '*',
            returnGeometry: 'false'
        });
        
        const response = await fetch(`${queryUrl}?${params}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    }

    getScenarioDescription(layerId) {
        const scenarios = {
            '0': 'Current conditions (1% AEP)',
            '1': '1% AEP + 0.1m sea level rise',
            '2': '1% AEP + 0.2m sea level rise',
            '3': '1% AEP + 0.3m sea level rise',
            '4': '1% AEP + 0.4m sea level rise',
            '5': '1% AEP + 0.5m sea level rise',
            '10': '1% AEP + 1.0m sea level rise',
            '15': '1% AEP + 1.5m sea level rise',
            '20': '1% AEP + 2.0m sea level rise',
        };
        
        return scenarios[layerId] || `Scenario ${layerId}`;
    }

    interpretFloodData(floodLayers, originalCoords) {
        if (!floodLayers || floodLayers.length === 0) {
            return {
                status: 'no_data',
                message: 'No flood mapping data available for this location',
                risk_level: 'unknown'
            };
        }
        
        // Check current conditions first
        const currentScenario = floodLayers.find(layer => layer.layerId === '0');
        const futureScenario = floodLayers.find(layer => layer.layerId === '10');
        
        if (currentScenario && currentScenario.inFloodZone) {
            return {
                status: 'current_risk',
                message: 'Property is in a 1% annual flood zone under current conditions',
                risk_level: 'high',
                details: 'This property is currently at risk of coastal flooding during extreme weather events (1 in 100 year flood).',
                recommendation: 'Consider flood insurance and evacuation planning. Consult with local council about flood mitigation measures.',
                scenarios: this.summarizeScenarios(floodLayers)
            };
        }
        
        if (futureScenario && futureScenario.inFloodZone) {
            return {
                status: 'future_risk',
                message: 'Property may be at risk with 1m sea level rise (projected by 2100)',
                risk_level: 'medium',
                details: 'While not currently in a flood zone, this property could be affected by coastal flooding with projected sea level rise.',
                recommendation: 'Monitor sea level rise projections and consider long-term flood risk in property decisions.',
                scenarios: this.summarizeScenarios(floodLayers)
            };
        }
        
        return {
            status: 'low_risk',
            message: 'Property not currently identified in NIWA coastal flood mapping',
            risk_level: 'low',
            details: 'Based on NIWA extreme coastal flood mapping, this property is not in mapped coastal flood zones.',
            recommendation: 'Still check local council flood maps for river and stormwater flooding risks.',
            scenarios: this.summarizeScenarios(floodLayers)
        };
    }

    summarizeScenarios(floodLayers) {
        return floodLayers.map(layer => ({
            scenario: layer.scenario,
            inFloodZone: layer.inFloodZone
        }));
    }

    // Alternative method using identify service
    async identifyFloodZone(coordinates) {
        const identifyUrl = `${this.floodServiceUrl}/identify`;
        
        const params = new URLSearchParams({
            f: 'json',
            geometry: `${coordinates.x},${coordinates.y}`,
            geometryType: 'esriGeometryPoint',
            mapExtent: `${coordinates.x-1000},${coordinates.y-1000},${coordinates.x+1000},${coordinates.y+1000}`,
            imageDisplay: '400,400,96',
            tolerance: 5,
            layers: 'all',
            sr: '2193'
        });
        
        const response = await fetch(`${identifyUrl}?${params}`);
        
        if (!response.ok) {
            throw new Error(`Identify service error: ${response.status}`);
        }
        
        return await response.json();
    }
}

// Export for use in popup.js
if (typeof window !== 'undefined') {
    window.NIWAFloodService = NIWAFloodService;
}

// For Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NIWAFloodService;
} 