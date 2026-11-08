import { getScoringRules } from './actions';
import ScoringForm from './ScoringForm';
import { createClient } from '@stashinn/lib/supabase/server';
import { getAmenities } from '@stashinn/lib/services/amenities';

export default async function ScoringPage() {
  const rules = await getScoringRules();

  if (!rules) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Scoring System</h1>
        <p className="mt-4 text-sm font-medium text-red-600 dark:text-red-400">Failed to load scoring rules. Ensure the database is seeded.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Scoring System</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          How locations earn their score, and how that score sets their rates. Existing locations keep their rates until you press Apply on their scoring panel.
        </p>
      </div>
      <ScoringForm initialRules={rules} amenities={await getAmenities(await createClient())} />
    </div>
  );
}
