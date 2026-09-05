import re

with open('d:/stashinn/stashinn-portal/apps/partner/app/dashboard/locations/actions.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target = \"\"\"  // Fetch existing photos to merge if we uploaded new ones, or just let them overwrite?
  // Since this is a simple implementation, if they upload new photos, we append to existing.
  const { data: existingLoc } = await supabase.from('partner_locations').select('photos').eq('id', locationId).single();
  const finalPhotos = photoUrls.length > 0 ? [...(existingLoc?.photos || []), ...photoUrls] : (existingLoc?.photos || []);\"\"\"

replacement = \"\"\"  const existingPhotos = formData.getAll('existing_photos') as string[];
  const finalPhotos = [...existingPhotos, ...photoUrls];\"\"\"

content = content.replace(target, replacement)

with open('d:/stashinn/stashinn-portal/apps/partner/app/dashboard/locations/actions.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done actions update")
