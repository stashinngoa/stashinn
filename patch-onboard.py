import re
with open('d:/stashinn/stashinn-portal/apps/partner/app/onboarding/actions.ts', 'r', encoding='utf-8') as f:
    content = f.read()

helper = \"\"\"  // 2. Build Location Objects
  const uploadPhotos = async (files: File[], folderId: string) => {
    const urls = [];
    for (const file of files) {
      if (file.size > 0) {
        const ext = file.name.split('.').pop();
        const path = \\/loc_\_\.\\;
        const { error } = await supabase.storage.from('location-photos').upload(path, file);
        if (!error) {
          const { data } = supabase.storage.from('location-photos').getPublicUrl(path);
          urls.push(data.publicUrl);
        }
      }
    }
    return urls;
  };
  
  const locationsToInsert = [];\"\"\"
content = content.replace("  // 2. Build Location Objects\n  const locationsToInsert = [];", helper)

luggage_target = \"\"\"      latitude: coords.lat,
      longitude: coords.lng,
      location_type: 'luggage',
      max_bags: parseInt(formData.get('capacity_bags') as string || '0'),
      is_active: false
    }).select('id').single();\"\"\"

luggage_replace = \"\"\"      latitude: coords.lat,
      longitude: coords.lng,
      location_type: 'luggage',
      max_bags: parseInt(formData.get('capacity_bags') as string || '0'),
      is_active: false,
      photos: await uploadPhotos(formData.getAll('luggage_photos') as File[], partnerData.id)
    }).select('id').single();\"\"\"
content = content.replace(luggage_target, luggage_replace)

garage_target = \"\"\"      latitude: coords.lat,
      longitude: coords.lng,
      location_type: 'garage',
      max_bags: 0,
      is_active: false
    }).select('id').single();\"\"\"

garage_replace = \"\"\"      latitude: coords.lat,
      longitude: coords.lng,
      location_type: 'garage',
      max_bags: 0,
      is_active: false,
      photos: await uploadPhotos(formData.getAll('garage_photos') as File[], partnerData.id)
    }).select('id').single();\"\"\"
content = content.replace(garage_target, garage_replace)

with open('d:/stashinn/stashinn-portal/apps/partner/app/onboarding/actions.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
