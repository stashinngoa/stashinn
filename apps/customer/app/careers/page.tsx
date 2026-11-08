'use client';

import { useState } from 'react';
import SupportHeader from '../../components/SupportHeader';
import SupportFooter from '../../components/SupportFooter';

interface Job {
  id: string;
  title: string;
  team: 'Engineering' | 'Operations' | 'Growth' | 'Support';
  location: string;
  type: string;
  description: string;
}

const JOBS: Job[] = [
  {
    id: '1',
    title: 'Senior Full Stack Engineer',
    team: 'Engineering',
    location: 'Bengaluru / Remote',
    type: 'Full-time',
    description: 'Lead architecture for our customer booking engine, partner mobile POS terminal, and real-time Razorpay settlement systems using Next.js, Supabase, and TypeScript.'
  },
  {
    id: '2',
    title: 'City Expansion & Partner Acquisition Lead',
    team: 'Growth',
    location: 'Delhi-NCR & Mumbai',
    type: 'Full-time',
    description: 'Spearhead the physical onboarding of high-reputation hotels, cafes, and transit-hub cloakrooms. Establish key geographic clusters near railway stations and airports.'
  },
  {
    id: '3',
    title: 'Customer Trust & Safety Specialist',
    team: 'Support',
    location: 'Remote / Hybrid (New Delhi)',
    type: 'Full-time',
    description: 'Ensure every traveler has a flawless storage experience. Arbitrate damage claims, coordinate on-site emergency check-in assistance, and uphold quality standards.'
  },
  {
    id: '4',
    title: 'Product Designer (UI/UX)',
    team: 'Engineering',
    location: 'Bengaluru / Remote',
    type: 'Full-time',
    description: 'Design intuitive, frictionless check-in and search interfaces for travelers on the go and high-efficiency operations interfaces for partner store attendants.'
  }
];

export default function CareersPage() {
  const [selectedTeam, setSelectedTeam] = useState<string>('All');
  const [applicationModal, setApplicationModal] = useState<Job | null>(null);
  const [applied, setApplied] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', portfolio: '', note: '' });

  const teams = ['All', 'Engineering', 'Operations', 'Growth', 'Support'];

  const filteredJobs = selectedTeam === 'All'
    ? JOBS
    : JOBS.filter(job => job.team === selectedTeam);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setApplied(true);
    setTimeout(() => {
      setApplicationModal(null);
      setApplied(false);
      setFormData({ name: '', email: '', portfolio: '', note: '' });
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col font-inter">
      <SupportHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-orange-500/10 via-transparent to-transparent dark:from-orange-500/5 py-16 md:py-24 border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 mb-4">
              Join Our Mission
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
              Build the Future of Hands-Free Travel
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              We are reimagining physical space and urban mobility in India. Help us turn millions of square feet of unused capacity into a nationwide luggage and vehicle storage network.
            </p>

            <a
              href="#openings"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-all shadow-md"
            >
              View Open Roles ({JOBS.length}) ↓
            </a>
          </div>
        </section>

        {/* Culture & Perks */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              Why Join StashInn?
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              We empower team members to take massive ownership and solve tangible travel problems.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-2xl mb-4">
                🚀
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">High Ownership & Equity</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Competitive salary packages paired with meaningful ESOP stock options so you participate directly in our long-term growth.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-2xl mb-4">
                🏖️
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Flexible & Travel-Friendly</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Hybrid and remote-friendly roles, flexible time-off, and complimentary StashInn storage and travel stipends.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-2xl mb-4">
                🏥
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Comprehensive Health Care</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Full health, outpatient medical, and parental insurance for you and your dependents, plus mental wellness coverage.
              </p>
            </div>
          </div>
        </section>

        {/* Open Job Listings */}
        <section id="openings" className="max-w-5xl mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Open Positions
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Find your next career chapter at StashInn.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {teams.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTeam(t)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                    selectedTeam === t
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredJobs.map(job => (
              <div
                key={job.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-orange-400 dark:hover:border-orange-600 transition-all shadow-sm"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                      {job.team}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{job.location}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{job.type}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {job.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {job.description}
                  </p>
                </div>

                <button
                  onClick={() => setApplicationModal(job)}
                  className="px-6 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-all shadow shrink-0"
                >
                  Apply Now →
                </button>
              </div>
            ))}
          </div>

          {/* Spontaneous Application */}
          <div className="mt-12 p-8 rounded-3xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Don&apos;t see a match for your skills?
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
              We are always excited to meet exceptional engineers, operations ninjas, and community builders.
            </p>
            <a
              href="mailto:careers@stashinn.in?subject=Spontaneous%20Application"
              className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
            >
              Email us directly at careers@stashinn.in →
            </a>
          </div>
        </section>

        {/* Application Modal */}
        {applicationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full p-8 shadow-2xl relative">
              <button
                onClick={() => setApplicationModal(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold"
              >
                ✕
              </button>

              {applied ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mx-auto flex items-center justify-center text-2xl font-bold">
                    ✓
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Application Received!</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Thank you for applying for the <strong>{applicationModal.title}</strong> role. Our talent team will review your profile and reach out.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleApply} className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase">Apply For</span>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {applicationModal.title}
                    </h3>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Snehal Sharma"
                      className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@example.com"
                      className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                      LinkedIn / Resume URL *
                    </label>
                    <input
                      type="url"
                      required
                      value={formData.portfolio}
                      onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                      placeholder="https://linkedin.com/in/... or drive link"
                      className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                      Brief Note / Why StashInn?
                    </label>
                    <textarea
                      rows={3}
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      placeholder="Tell us what excites you about this role..."
                      className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-all"
                  >
                    Submit Application
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      <SupportFooter />
    </div>
  );
}
