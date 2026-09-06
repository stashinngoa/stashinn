'use server';

export async function getSearchSuggestions(query: string) {
  if (!query || query.length < 2) return [];

  try {
    // Photon by Komoot — free, no API key, better autocomplete than Nominatim
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=7&lang=en&bbox=68.1,6.7,97.4,35.7`,
      {
        headers: {
          'User-Agent': 'StashInn/1.0',
        },
      }
    );
    
    if (!res.ok) return [];
    const data = await res.json();
    
    // Deduplicate by name + city to avoid showing "Mapusa" 3 times
    const seen = new Set<string>();
    return data.features
      .map((f: any) => {
        const props = f.properties;
        const name = props.name || '';
        const city = props.city || props.county || props.state || '';
        const state = props.state || '';
        const addressParts = [name, city, state, 'India'].filter(Boolean);
        const displayAddress = [...new Set(addressParts)].join(', ');
        
        return {
          id: props.osm_id || Math.random(),
          name: name,
          city: city,
          address_line1: displayAddress,
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
        };
      })
      .filter((item: any) => {
        const key = `${item.name.toLowerCase()}-${item.city?.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return item.name; // skip entries with no name
      });
  } catch (error) {
    console.error('Photon search error:', error);
    return [];
  }
}
