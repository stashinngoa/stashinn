import type { Metadata } from 'next';
import LegalPage from '../../components/LegalPage';

export const metadata: Metadata = { title: 'Privacy Policy · StashInn' };
export const revalidate = 300; // picks up edits from Admin → Legal documents within 5 minutes

export default function PrivacyPage() {
  return <LegalPage docKey="customer_privacy_policy" title="Privacy Policy" />;
}
