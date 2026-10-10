import { createClient } from '@stashinn/lib/supabase/server';
import { notFound } from 'next/navigation';
import PrintButton from './PrintButton';
import AvatarImage from './AvatarImage';

export default async function PartnerDocumentPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const partnerId = params.id;
  const supabase = await createClient();

  const { data: partner } = await supabase
    .from('partners')
    .select('*, users!partners_user_id_fkey(full_name, email, phone)')
    .eq('id', partnerId)
    .single();

  if (!partner) notFound();

  const { data: locations } = await supabase
    .from('partner_locations')
    .select('*, vehicle_pricing(*)')
    .eq('partner_id', partnerId);

  const { data: pocsData } = await supabase
    .from('partner_pocs')
    .select('*')
    .eq('partner_id', partnerId);

  const pocs = await Promise.all(
    (pocsData || []).map(async (poc) => {
      let signedPhotoUrl = null;
      if (poc.photo_url) {
        const { data } = await supabase.storage.from('kyc-documents').createSignedUrl(poc.photo_url, 3600);
        signedPhotoUrl = data?.signedUrl || null;
      }
      return { ...poc, signed_photo_url: signedPhotoUrl };
    })
  );

  const { data: tcConf } = await supabase.from('system_config').select('value').eq('key', 'partner_terms_and_conditions').single();
  const terms = tcConf?.value || 'Partner Terms and Conditions not configured.';

  return (
    <div className="bg-white text-black min-h-screen flex flex-col font-sans print:bg-white print:m-0 print-color-adjust-exact">
      <div className="flex justify-end p-8 print:hidden">
        <PrintButton />
      </div>

      <table className="w-full h-full flex-grow">
        <thead className="table-header-group">
          <tr>
            <th className="px-4 md:px-12 pt-8 pb-4">
              <div className="flex justify-between items-center border-b-2 border-black pb-6 mb-4">
                <div className="flex items-center gap-4">
                  <img src="/StashInn_Light_no_text.png" alt="StashInn Logo" className="h-20 w-auto" />
                  <span className="text-4xl font-extrabold tracking-tight text-black">StashInn</span>
                </div>
                <div className="text-right text-black font-normal">
                  <h1 className="text-2xl font-bold uppercase tracking-wider text-black">Partner Agreement</h1>
                  <p className="mt-1 text-sm text-gray-500">Ref: {partnerId.split('-')[0]?.toUpperCase()} | Date: {new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </th>
          </tr>
        </thead>
        
        <tfoot className="table-footer-group hidden print:table-footer-group">
          <tr>
            <td className="px-4 md:px-12 pb-8 invisible">
              <div className="mt-8 pt-6 border-t-2 grid grid-cols-2 gap-12 mb-4">
                <div>
                  <p className="mb-24 text-xs">Spacer</p>
                  <div className="pt-2">Spacer</div>
                </div>
              </div>
            </td>
          </tr>
        </tfoot>

        <tbody>
          <tr>
            <td className="px-4 md:px-12 pb-4">
              <section className="mb-8 break-inside-avoid">
                <h3 className="text-lg font-bold bg-gray-200 px-3 py-1 mb-4 uppercase" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>1. Partner Business Details</h3>
                <div className="grid grid-cols-2 gap-4 px-3 text-sm">
                  <div><span className="font-bold">Business Name:</span> {partner.business_name}</div>
                  <div><span className="font-bold">Owner Name:</span> {(partner.users as any)?.full_name || 'N/A'}</div>
                  <div><span className="font-bold">Owner Phone:</span> {(partner.users as any)?.phone || 'N/A'}</div>
                  <div><span className="font-bold">Owner Email:</span> {(partner.users as any)?.email || 'N/A'}</div>
                  <div><span className="font-bold">GSTIN:</span> {partner.gstin || 'N/A'}</div>
                  <div><span className="font-bold">PAN:</span> {partner.pan || 'N/A'}</div>
                </div>
              </section>

              <section className="mb-8">
                <h3 className="text-lg font-bold bg-gray-200 px-3 py-1 mb-4 uppercase" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>2. Authorized Locations & POC Proofs</h3>
                {locations && locations.length > 0 ? locations.map((loc, idx) => (
                  <div key={loc.id} className="mb-8 px-3 border-l-4 border-gray-400 pl-4 break-inside-avoid">
                    <h4 className="font-bold text-base mb-2">Location {idx + 1}: {loc.name}</h4>
                    <div className="text-sm space-y-1 mb-4">
                      <p><span className="font-bold">Address:</span> {loc.address_line1}, {loc.city}, {loc.state} {loc.pincode}</p>
                      <p><span className="font-bold">Location Type:</span> <span className="capitalize">{loc.location_type || 'luggage'}</span></p>
                      <p><span className="font-bold">Commission Rate:</span> {loc.commission_rate ?? partner.commission_rate}%</p>
                      <p><span className="font-bold">Base Rates:</span> {loc.location_type === 'garage' && loc.vehicle_pricing && loc.vehicle_pricing.length > 0 ? (
                        <span>Bike: ₹{loc.vehicle_pricing[0].bike_rate_hr}/hr | Car: ₹{loc.vehicle_pricing[0].sedan_rate_hr ?? loc.vehicle_pricing[0].car_rate_hr ?? 0}/hr</span>
                      ) : (
                        <span>Luggage: ₹{loc.price_per_hour}/hr</span>
                      )}</p>
                    </div>
                    
                    {loc.photos && loc.photos.length > 0 && (
                      <div className="mb-4">
                        <p className="font-bold text-xs uppercase text-gray-500 mb-2">Location Photos</p>
                        <div className="grid grid-cols-2 gap-2">
                          {loc.photos.slice(0, 4).map((photo: string, pIdx: number) => (
                            <img key={pIdx} src={photo} className="w-full aspect-video object-contain bg-gray-50 rounded border border-gray-200" alt={`Location ${idx+1} photo ${pIdx+1}`} />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <p className="font-bold text-xs uppercase text-gray-500 mb-2">Points of Contact (POCs)</p>
                    <div className="grid grid-cols-2 gap-4">
                      {pocs?.filter((p) => p.location_id === loc.id).map((poc) => (
                        <div key={poc.id} className="flex gap-3 items-center border border-gray-200 p-2 rounded bg-gray-50 break-inside-avoid">
                          {poc.signed_photo_url ? (
                            <div className="relative w-12 h-12 rounded-full border border-gray-300 bg-white overflow-hidden flex-shrink-0">
                              <div className="absolute inset-0 bg-gray-200 flex items-center justify-center text-gray-400 font-bold">{poc.name.charAt(0)}</div>
                              <AvatarImage src={poc.signed_photo_url} alt={poc.name} />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold border border-gray-300 flex-shrink-0">{poc.name.charAt(0)}</div>
                          )}
                          <div className="text-sm">
                            <p className="font-bold">{poc.name} {poc.is_primary && <span className="text-[10px] uppercase bg-blue-100 text-blue-800 px-1 rounded ml-1">Primary</span>}</p>
                            <p className="text-gray-600">{poc.phone}</p>
                            <p className="text-xs text-gray-500">{poc.is_verified ? 'Verified' : 'Unverified'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )) : (
                  <p className="px-3 text-sm italic">No locations configured.</p>
                )}
              </section>

              <section className="mb-4 break-before-page">
                <h3 className="text-lg font-bold bg-gray-200 px-3 py-1 mb-4 uppercase" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>3. Terms and Conditions</h3>
                <div className="px-3 text-sm whitespace-pre-wrap text-justify leading-relaxed font-serif">
                  {terms}
                </div>
              </section>
            </td>
          </tr>
          <tr>
            <td className="h-full border-none p-0 m-0"></td>
          </tr>
        </tbody>
      </table>

      {/* Fixed Footer docked to bottom for Print */}
      <div className="print:fixed print:bottom-0 print:left-0 print:w-full print:bg-white px-4 md:px-12 pb-8 mt-auto break-inside-avoid">
        <div className="mt-8 pt-6 border-t-2 border-gray-300 grid grid-cols-2 gap-12 mb-4">
          <div>
            <p className="font-bold uppercase text-xs mb-24">Partner Authorized Signatory</p>
            <div className="flex justify-between text-[11px] text-gray-500 border-t border-dashed border-gray-400 pt-2">
              <span>Name & Date</span>
              <span>Signature & Stamp</span>
            </div>
          </div>
          <div>
            <p className="font-bold uppercase text-xs mb-24">StashInn Representative</p>
            <div className="flex justify-between text-[11px] text-gray-500 border-t border-dashed border-gray-400 pt-2">
              <span>Name & Date</span>
              <span>Signature</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
