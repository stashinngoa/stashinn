import { getScoringRules } from './actions';
import ScoringForm from './ScoringForm';

export default async function ScoringPage() {
  const rules = await getScoringRules();

  if (!rules) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Scoring System Configuration</h1>
        <p className="mt-4 text-red-500">Failed to load scoring rules. Ensure the database is seeded.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Scoring Engine Configuration</h1>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        Adjust the weightages and pricing logic for automated partner location scoring. Changes here affect all new location recalculations.
      </p>

      <div className="mt-8 bg-white dark:bg-gray-950 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <ScoringForm initialRules={rules} />
      </div>
    </div>
  );
}
