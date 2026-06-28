'use server';

export async function getSearchSuggestions(query: string) {
  if (!query || query.length < 2) return [];

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=in`,
      {
        headers: {
          'User-Agent': 'StashInn/1.0',
        },
      }
    );
    
    if (!res.ok) return [];
    const data = await res.json();
    
    return data.map((item: any) => ({
      id: item.place_id,
      name: item.name,
      city: item.address?.city || item.address?.town || item.address?.state_district,
      address_line1: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    }));
  } catch (error) {
    console.error('Nominatim search error:', error);
    return [];
  }
}
