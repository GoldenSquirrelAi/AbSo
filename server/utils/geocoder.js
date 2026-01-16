
/**
 * Geocodes an address using OpenStreetMap (Nominatim).
 * Includes a delay helper to respect usage policies.
 */
async function geocodeAddress(address) {
    try {
        // Simple heuristic to append context if missing
        const query = address.toLowerCase().includes('nv') || address.toLowerCase().includes('nevada') 
            ? address 
            : `${address}, Las Vegas, NV`;
        
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
        
        // Use native global fetch (Node 18+)
        const response = await fetch(url, {
            headers: { 'User-Agent': 'AbSo-Logistics-App/1.0' }
        });
        
        const data = await response.json();

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }
        return null;
    } catch (error) {
        console.error(`Geocoding error for ${address}:`, error.message);
        return null;
    }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = { geocodeAddress, delay };
