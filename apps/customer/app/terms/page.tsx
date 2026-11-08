import type { Metadata } from 'next';
import LegalPage from '../../components/LegalPage';

export const metadata: Metadata = { title: 'Terms & Conditions · StashInn' };
export const revalidate = 300; // picks up edits from Admin → Legal documents within 5 minutes

export default function TermsPage() {
  return <LegalPage docKey="customer_terms_and_conditions" title="Terms & Conditions" />;
}
