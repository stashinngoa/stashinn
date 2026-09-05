import re
with open('d:/stashinn/stashinn-portal/apps/partner/app/dashboard/locations/actions.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
content = content.replace(\"import { redirect } from 'next/navigation';\", \"import { redirect } from 'next/navigation';\\nimport { notifyAdmins } from '@stashinn/lib/services/notifications';\")

# Replace addLocation end
add_pattern = r\"\"\"      id_document_url: idDocUrl,
      photo_url: photoUrl
    }\);
  }

  revalidatePath\('/dashboard/locations'\);
  redirect\('/dashboard/locations'\);
}\"\"\"

add_replacement = r\"\"\"      id_document_url: idDocUrl,
      photo_url: photoUrl
    });
  }

  if (partner?.status === 'pending') {
    await notifyAdmins({
      title: 'Pending Partner Added Location',
      message: ${partner.business_name || 'A pending partner'} has added a new location while pending.,
      category: 'system',
      targetRoles: ['ops'],
      action_url: /dashboard/locations
    });
  }

  revalidatePath('/dashboard/locations');
  redirect('/dashboard/locations');
}\"\"\"
content = content.replace(add_pattern, add_replacement)


# Replace updateLocation end
upd_pattern = r\"\"\"    } else {
      await supabase.from\('vehicle_pricing'\).insert\(pricingData\);
    }
  }

  revalidatePath\('/dashboard/locations'\);
  redirect\('/dashboard/locations'\);
}\"\"\"

upd_replacement = r\"\"\"    } else {
      await supabase.from('vehicle_pricing').insert(pricingData);
    }
  }

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const { data: partnerRec } = await supabase.from('partners').select('business_name, status').eq('user_id', currentUser?.id).single();

  if (partnerRec?.status === 'pending') {
    await notifyAdmins({
      title: 'Pending Location Updated',
      message: ${partnerRec.business_name} has updated their pending location details.,
      category: 'system',
      targetRoles: ['ops'],
      action_url: /dashboard/locations
    });
  }

  revalidatePath('/dashboard/locations');
  redirect('/dashboard/locations');
}\"\"\"
content = content.replace(upd_pattern, upd_replacement)

with open('d:/stashinn/stashinn-portal/apps/partner/app/dashboard/locations/actions.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
