import { createClient } from '@stashinn/lib/supabase/server';
import { notFound } from 'next/navigation';
import PrintButton from './PrintButton';
import { getKycDocs } from '../../../dashboard/partners/actions';
import { fillLegal, loadLegal } from '@stashinn/lib/services/legal';
import { LegalDocument } from '@repo/ui/legalDocument';

const IST = 'Asia/Kolkata';
const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: IST }) : '—';
const fmtDateTime = (d: Date) =>
  d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST });
const inr = (n: number | string | null | undefined) =>
  n == null || n === '' ? '—' : `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const isImage = (url: string) => /\.(png|jpe?g|webp|gif)$/i.test(url.split('?')[0] ?? '');
// Onboarding file names end in a millisecond timestamp, e.g. kyc_proof_1730368123456.pdf
const uploadedOn = (name: string) => {
  const ms = Number(name.match(/_(\d{13})\./)?.[1]);
  return ms ? fmtDate(new Date(ms).toISOString()) : null;
};

const hoursOpen = (oh: any): number | null => {
  const toMin = (t?: string) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(t || '');
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const open = toMin(oh?.open), close = toMin(oh?.close);
  if (open == null || close == null) return null;
  const mins = close > open ? close - open : close + 1440 - open; // equal times = open 24h
  return mins / 60;
};
const fmtHours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)} h`;
const TRANSIT_LABEL: Record<string, string> = { under_1km: 'Under 1 km', '1_to_3km': '1–3 km', over_3km: 'Over 3 km' };

// Small layout helpers so every section looks the same
function Section({ n, title, children, className = '' }: { n: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`mt-7 ${className}`}>
      <h2 className="flex items-baseline gap-2 border-b-2 border-orange-600 pb-1 mb-3 text-[13px] font-bold uppercase tracking-wider text-gray-900 break-after-avoid">
        <span className="text-orange-600">{n}</span>{title}
      </h2>
      {children}
    </section>
  );
}

function Fields({ rows, cols = 2 }: { rows: [string, React.ReactNode][]; cols?: 2 | 3 }) {
  return (
    <dl className={`grid ${cols === 3 ? 'grid-cols-3' : 'grid-cols-2'} border-l border-t border-gray-300 text-[11.5px]`}>
      {rows.map(([k, v]) => (
        <div key={k} className="border-r border-b border-gray-300 px-2.5 py-1.5 break-inside-avoid">
          <dt className="text-[9.5px] font-semibold uppercase tracking-wide text-gray-500">{k}</dt>
          <dd className="mt-0.5 font-medium text-gray-900 break-words">{v || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function SignatureBox({ title, name }: { title: string; name?: string }) {
  return (
    <div className="border border-gray-300 p-3 break-inside-avoid">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-700">{title}</p>
      <div className="h-16" />
      <div className="border-t border-gray-400 pt-1 text-[10px] text-gray-500">Signature{title.startsWith('Partner') ? ' & stamp' : ''}</div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-[10.5px]">
        <div className="border-b border-gray-300 pb-0.5"><span className="text-gray-500">Name: </span>{name || ''}</div>
        <div className="border-b border-gray-300 pb-0.5"><span className="text-gray-500">Designation: </span></div>
        <div className="border-b border-gray-300 pb-0.5"><span className="text-gray-500">Date: </span></div>
        <div className="border-b border-gray-300 pb-0.5"><span className="text-gray-500">Place: </span></div>
      </div>
    </div>
  );
}

export default async function PartnerRegistrationFormPage(props: { params: Promise<{ id: string }> }) {
  const { id: partnerId } = await props.params;
  const supabase = await createClient();

  const { data: partner } = await supabase
    .from('partners')
    .select('*, users!partners_user_id_fkey(full_name, email, phone)')
    .eq('id', partnerId)
    .single();
  if (!partner) notFound();

  const [{ data: locationRows }, { data: pocRows }, kycDocs, legal] = await Promise.all([
    supabase.from('partner_locations').select('*, vehicle_pricing(*)').eq('partner_id', partnerId).order('created_at', { ascending: true }),
    supabase.from('partner_pocs').select('*').eq('partner_id', partnerId).order('created_at', { ascending: true }),
    getKycDocs(partnerId),
    loadLegal(supabase),
  ]);

  const sign = async (path: string | null) => {
    if (!path) return null;
    const { data } = await supabase.storage.from('kyc-documents').createSignedUrl(path, 3600);
    return data?.signedUrl || null;
  };

  // Onboarding saves the same contact once per location, so list each person once
  const contacts: { poc: any; photo: string | null; idProof: string | null; locationIds: string[]; verified: boolean; primary: boolean }[] = [];
  for (const poc of pocRows || []) {
    const existing = contacts.find(c => c.poc.phone === poc.phone);
    if (existing) {
      if (poc.location_id) existing.locationIds.push(poc.location_id);
      existing.verified = existing.verified && poc.is_verified;
      existing.primary = existing.primary || poc.is_primary;
      continue;
    }
    contacts.push({
      poc,
      photo: await sign(poc.photo_url),
      idProof: await sign(poc.id_document_url),
      locationIds: poc.location_id ? [poc.location_id] : [],
      verified: poc.is_verified,
      primary: poc.is_primary,
    });
  }

  const isPrimary = (locId: string) => (pocRows || []).some(p => p.location_id === locId && p.is_primary);
  // Primary (onboarding) locations first, then additional ones in the order they were added
  const locations = [...(locationRows || [])].sort((a, b) => Number(isPrimary(b.id)) - Number(isPrimary(a.id)));

  const owner = (partner.users as any) || {};
  const isIndividual = partner.business_type === 'Individual';
  const ownerDocs = kycDocs.filter(d => d.name.startsWith('kyc_proof'));
  const otherDocs = kycDocs.filter(d => !d.name.startsWith('kyc_proof') && !d.name.startsWith('poc_'));
  const termsDoc = legal.docs.partner_terms_and_conditions;
  const terms = fillLegal(termsDoc.text, { details: legal.details, live: legal.live }, termsDoc.updatedAt);
  const generatedAt = new Date();

  // Page size, margins and the running footer (page numbers need Chrome 131+; ignored elsewhere)
  const pageCss = `
    @page {
      size: A4;
      margin: 14mm 14mm 16mm;
      @bottom-left { content: "StashInn Partner Registration Form · Partner ID ${partnerId}"; font: 8px sans-serif; color: #6b7280; }
      @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8px sans-serif; color: #6b7280; }
    }
    @media print { html, body { background: #fff !important; } }
    .print-exact { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  `;

  return (
    <div className="neutral-gray print-exact min-h-screen bg-gray-200 py-8 print:bg-white print:py-0 text-gray-900 font-sans">
      <style dangerouslySetInnerHTML={{ __html: pageCss }} />

      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-1 print:hidden">
        <p className="text-sm text-gray-600">A4 · use <span className="font-semibold">Save as PDF</span> or print, then upload the signed copy on the partner page.</p>
        <PrintButton />
      </div>

      {/* A4 sheet on screen; plain page when printed */}
      <article className="mx-auto w-full max-w-[210mm] bg-white px-[14mm] py-[12mm] shadow-xl print:max-w-none print:p-0 print:shadow-none">
        {/* Letterhead */}
        <header className="flex items-start justify-between gap-6 border-b-4 border-orange-600 pb-4">
          <div className="flex items-center gap-3">
            <img src="/StashInn_Light_no_text.png" alt="" className="h-14 w-auto" />
            <div>
              <p className="text-2xl font-black tracking-tight leading-none"><span className="text-gray-900">Stash</span><span className="text-orange-600">Inn</span></p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-gray-500">Luggage & vehicle storage · Goa</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-lg font-black uppercase tracking-wide">Partner Registration Form</h1>
            <p className="text-[10px] text-gray-500 mt-0.5">Generated {fmtDateTime(generatedAt)} IST</p>
          </div>
        </header>

        <div className="mt-3 grid grid-cols-[1fr_auto] gap-4 items-center rounded-sm bg-orange-50 border border-orange-200 px-3 py-2">
          <div>
            <p className="text-[9.5px] font-semibold uppercase tracking-wide text-orange-800">Partner ID</p>
            <p className="font-mono text-[13px] font-bold tracking-wide text-gray-900">{partnerId}</p>
          </div>
          <div className="text-right text-[11px]">
            <p><span className="text-gray-500">Application date:</span> <span className="font-semibold">{fmtDate(partner.created_at)}</span></p>
          </div>
        </div>

        {/* 1. Partner */}
        <Section n="1." title="Partner details">
          <Fields rows={[
            ['Partner type', isIndividual ? 'Individual' : 'Business'],
            [isIndividual ? 'Partner name' : 'Business name', partner.business_name],
            ...(!isIndividual ? [['Business type', partner.business_type || '—'] as [string, React.ReactNode]] : []),
            ['Account holder', owner.full_name],
            ['Registered email', owner.email],
            ['Registered mobile', owner.phone],
            ['PAN', <span key="pan" className="font-mono">{partner.pan || '—'}</span>],
            ['GSTIN', <span key="gst" className="font-mono">{partner.gstin || (isIndividual ? 'Not applicable' : 'Not registered')}</span>],
            ['GST on bookings', partner.gst_applicable === false ? 'Not applicable' : partner.gst_applicable ? 'Applicable' : 'Not decided yet'],
            ['Contacts verified', `${contacts.filter(c => c.verified).length} of ${contacts.length}`],
            ['Locations', `${locations.length} (${locations.filter(l => l.location_type !== 'garage').length} luggage, ${locations.filter(l => l.location_type === 'garage').length} vehicle)`],
          ]} />
        </Section>

        {/* 2. Contacts */}
        <Section n="2." title="Authorised point(s) of contact">
          {contacts.length === 0 ? <p className="text-[11.5px] text-gray-500">No contact on file.</p> : (
            <div className="space-y-3">
              {contacts.map((c, i) => (
                <div key={c.poc.id} className="grid grid-cols-[30mm_1fr_44mm] gap-3 border border-gray-300 p-2.5 break-inside-avoid">
                  <div className="h-[36mm] w-[30mm] bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                    {c.photo ? <img src={c.photo} alt={`${c.poc.name} photo`} className="h-full w-full object-cover" /> : <span className="text-[10px] text-gray-400">No photo</span>}
                  </div>
                  <div className="text-[11.5px] min-w-0">
                    <p className="text-[9.5px] font-semibold uppercase tracking-wide text-gray-500">Contact {i + 1}{c.primary ? ' · Primary' : ''}</p>
                    <p className="text-[14px] font-bold">{c.poc.name}</p>
                    <table className="mt-1.5 w-full">
                      <tbody>
                        <tr><td className="pr-2 text-gray-500 w-20 align-top">Mobile</td><td className="font-medium">{c.poc.phone}</td></tr>
                        <tr><td className="pr-2 text-gray-500 align-top">Email</td><td className="font-medium break-all">{c.poc.email || '—'}</td></tr>
                        <tr><td className="pr-2 text-gray-500 align-top">Verified</td><td className="font-medium">{c.verified ? 'Yes' : 'No'}</td></tr>
                        <tr>
                          <td className="pr-2 text-gray-500 align-top">Covers</td>
                          <td className="font-medium">{locations.filter(l => c.locationIds.includes(l.id)).map(l => `Location ${locations.indexOf(l) + 1}`).join(', ') || '—'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="h-[36mm] w-[44mm] bg-gray-50 border border-gray-200 overflow-hidden flex flex-col">
                    <p className="px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200 bg-white">ID proof</p>
                    <div className="flex-1 flex items-center justify-center min-h-0">
                      {c.idProof && isImage(c.idProof)
                        ? <img src={c.idProof} alt="ID proof" className="max-h-full max-w-full object-contain" />
                        : <span className="px-2 text-center text-[10px] text-gray-500">{c.idProof ? 'PDF on file (see partner record)' : 'Not provided'}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* 3. Locations */}
        <Section n="3." title="Storage locations">
          {locations.length === 0 ? <p className="text-[11.5px] text-gray-500">No locations on file.</p> : (
            <div className="space-y-5">
              {locations.map((loc, i) => {
                const garage = loc.location_type === 'garage';
                const vp = (Array.isArray(loc.vehicle_pricing) ? loc.vehicle_pricing[0] : loc.vehicle_pricing) || {};
                const contact = contacts.find(c => c.locationIds.includes(loc.id));
                const amenities = [
                  ...(loc.amenities || []).map((a: string) => a.replace(/_/g, ' ')),
                  ...(loc.has_cctv ? ['CCTV'] : []), ...(loc.has_security_guard ? ['Security guard'] : []),
                  ...(loc.has_ev_charging ? ['EV charging'] : []), ...(loc.has_lockable_gate ? ['Lockable gate'] : []),
                ];
                const photos: string[] = loc.photos || [];
                // Day rate = hourly rate × hours open per day
                const hours = hoursOpen(loc.operating_hours);
                const perDay = (hourly: any) => (hours && hourly != null && hourly !== '' ? inr(Number(hourly) * hours) : '—');
                return (
                  <div key={loc.id} className="border border-gray-300">
                    <div className="flex items-center justify-between gap-3 bg-gray-100 px-3 py-1.5 border-b border-gray-300 break-after-avoid">
                      <p className="text-[12.5px] font-bold">Location {i + 1}: {loc.name}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                        {garage ? 'Vehicle parking' : 'Luggage storage'} · {isPrimary(loc.id) ? 'Primary' : 'Additional'}
                      </p>
                    </div>
                    <div className="p-2.5 space-y-2.5">
                      <Fields cols={3} rows={[
                        ['Location ID', <span key="id" className="font-mono text-[10px]">{loc.id}</span>],
                        ['Open per day', hours ? fmtHours(hours) : 'Hours not set'],
                        ['Commission', `${loc.commission_rate ?? partner.commission_rate ?? 15}% of booking value (excl. GST)`],
                      ]} />
                      <Fields rows={[
                        ['Address', [loc.address_line1, loc.address_line2, `${loc.city}, ${loc.state} ${loc.pincode}`, loc.country].filter(Boolean).join(', ')],
                        ['Map coordinates', <span key="geo" className="font-mono">{Number(loc.latitude).toFixed(6)}, {Number(loc.longitude).toFixed(6)}</span>],
                        ['Operating hours', loc.operating_hours?.open && loc.operating_hours?.close ? `${loc.operating_hours.open} – ${loc.operating_hours.close}` : 'Not set'],
                        ['Contact at location', contact ? `${contact.poc.name} (${contact.poc.phone})` : 'None assigned'],
                        ['Distance to transit', TRANSIT_LABEL[loc.transit_proximity] ?? '—'],
                        ['Amenities', amenities.length ? <span key="am" className="capitalize">{amenities.join(', ')}</span> : 'None listed'],
                      ]} />

                      {/* Capacity & rates differ by type */}
                      <table className="w-full border-collapse text-[11px] break-inside-avoid">
                        <thead>
                          <tr className="bg-gray-50 text-[9.5px] uppercase tracking-wide text-gray-600">
                            <th className="border border-gray-300 px-2 py-1 text-left">{garage ? 'Vehicle' : 'Storage'}</th>
                            <th className="border border-gray-300 px-2 py-1 text-right">Capacity</th>
                            <th className="border border-gray-300 px-2 py-1 text-right">Rate / hour (excl. GST)</th>
                            <th className="border border-gray-300 px-2 py-1 text-right">Rate / day{hours ? ` (${fmtHours(hours)})` : ''}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {garage ? (
                            // SUVs pay the car rate; cars may also use free SUV slots
                            [['Two-wheeler (bike / scooter)', 'bike', 'bike'], ['Car (hatchback / sedan)', 'sedan', 'sedan'], ['SUV / MUV (car rate; cars may also use)', 'suv', 'sedan']].map(([label, k, rateKey]) => (
                              <tr key={k}>
                                <td className="border border-gray-300 px-2 py-1">{label}</td>
                                <td className="border border-gray-300 px-2 py-1 text-right tabular-nums">{vp[`${k}_capacity`] ?? 0}</td>
                                <td className="border border-gray-300 px-2 py-1 text-right tabular-nums">{inr(vp[`${rateKey}_rate_hr`])}</td>
                                <td className="border border-gray-300 px-2 py-1 text-right tabular-nums">{perDay(vp[`${rateKey}_rate_hr`])}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="border border-gray-300 px-2 py-1">Bags / suitcases</td>
                              <td className="border border-gray-300 px-2 py-1 text-right tabular-nums">{loc.max_bags}</td>
                              <td className="border border-gray-300 px-2 py-1 text-right tabular-nums">{inr(loc.price_per_hour)}</td>
                              <td className="border border-gray-300 px-2 py-1 text-right tabular-nums">{perDay(loc.price_per_hour)}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      <div>
                        <p className="text-[9.5px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Photos ({photos.length})</p>
                        {photos.length === 0 ? (
                          <p className="text-[11px] text-gray-500">No photos submitted.</p>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {photos.map((src, p) => (
                              <figure key={p} className="break-inside-avoid">
                                <div className="h-[38mm] w-full overflow-hidden border border-gray-200 bg-gray-100">
                                  <img src={src} alt={`Location ${i + 1} photo ${p + 1}`} className="h-full w-full object-cover" />
                                </div>
                                <figcaption className="mt-0.5 text-[8.5px] text-gray-500">Photo {p + 1}</figcaption>
                              </figure>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* 4. Documents */}
        <Section n="4." title="KYC documents on file">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-gray-50 text-[9.5px] uppercase tracking-wide text-gray-600">
                <th className="border border-gray-300 px-2 py-1 text-left">Document</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Belongs to</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Uploaded</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {ownerDocs.map(d => (
                <tr key={d.name}>
                  <td className="border border-gray-300 px-2 py-1">{isIndividual ? 'Owner ID proof' : 'Business registration document'}</td>
                  <td className="border border-gray-300 px-2 py-1">{partner.business_name}</td>
                  <td className="border border-gray-300 px-2 py-1">{uploadedOn(d.name) ?? '—'}</td>
                  <td className="border border-gray-300 px-2 py-1">On file</td>
                </tr>
              ))}
              {isIndividual && ownerDocs.length === 0 && (
                <tr>
                  <td className="border border-gray-300 px-2 py-1">Owner ID proof</td>
                  <td className="border border-gray-300 px-2 py-1">{partner.business_name}</td>
                  <td className="border border-gray-300 px-2 py-1">—</td>
                  <td className="border border-gray-300 px-2 py-1">Owner is the contact; contact ID proof used</td>
                </tr>
              )}
              {contacts.map(c => (
                <tr key={c.poc.id}>
                  <td className="border border-gray-300 px-2 py-1">Contact ID proof &amp; photo</td>
                  <td className="border border-gray-300 px-2 py-1">{c.poc.name}</td>
                  <td className="border border-gray-300 px-2 py-1">{uploadedOn(c.poc.id_document_url || '') ?? fmtDate(c.poc.created_at)}</td>
                  <td className="border border-gray-300 px-2 py-1">{c.idProof ? (c.verified ? 'Verified' : 'On file, not yet verified') : 'Missing'}</td>
                </tr>
              ))}
              {otherDocs.map(d => (
                <tr key={d.name}>
                  <td className="border border-gray-300 px-2 py-1">Other document</td>
                  <td className="border border-gray-300 px-2 py-1 font-mono text-[10px]">{d.name}</td>
                  <td className="border border-gray-300 px-2 py-1">{uploadedOn(d.name) ?? '—'}</td>
                  <td className="border border-gray-300 px-2 py-1">On file</td>
                </tr>
              ))}
            </tbody>
          </table>
          {ownerDocs.filter(d => d.url && isImage(d.url)).length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {ownerDocs.filter(d => d.url && isImage(d.url)).map(d => (
                <figure key={d.name} className="break-inside-avoid border border-gray-200 bg-gray-50">
                  <div className="h-[55mm] flex items-center justify-center"><img src={d.url!} alt="" className="max-h-full max-w-full object-contain" /></div>
                  <figcaption className="px-1.5 py-0.5 text-[8.5px] text-gray-500 border-t border-gray-200 bg-white">{isIndividual ? 'Owner ID proof' : 'Business registration'}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </Section>

        {/* 5. Declaration and signatures */}
        <Section n="5." title="Declaration" className="break-inside-avoid">
          <p className="text-[11.5px] leading-relaxed text-justify">
            I/We, the undersigned, confirm that the information and documents in this form are true, complete and correct, and that I/we
            am/are authorised to offer the storage locations listed above. I/We have read and agree to the StashInn Partner Terms and
            Conditions (Annexure A), including the platform commission stated for each location. I/We will inform StashInn promptly of any
            change to these details.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <SignatureBox title="Partner (authorised signatory)" name={isIndividual ? partner.business_name : owner.full_name} />
            <SignatureBox title="For StashInn" />
          </div>
        </Section>

        <section className="mt-5 border-2 border-dashed border-gray-300 p-3 break-inside-avoid">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600">For office use only</p>
          <div className="mt-2 grid grid-cols-4 gap-3 text-[10.5px]">
            {['KYC checked by', 'Locations inspected by', 'Approved on', 'Remarks'].map(k => (
              <div key={k} className="border-b border-gray-300 pb-4"><span className="text-gray-500">{k}</span></div>
            ))}
          </div>
        </section>

        {/* Annexure */}
        <section className="mt-8 break-before-page">
          <h2 className="border-b-2 border-orange-600 pb-1 mb-3 text-[13px] font-bold uppercase tracking-wider">Annexure A · Partner Terms and Conditions</h2>
          {termsDoc.isDraft && (
            <p className="mb-2 text-[10.5px] text-red-700 font-semibold">Draft terms: these have not been saved in Admin → Configuration → Legal documents yet.</p>
          )}
          <LegalDocument text={terms} variant="print" hideTitle />
        </section>
      </article>
    </div>
  );
}
