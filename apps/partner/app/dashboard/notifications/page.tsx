import NotificationList from './NotificationList';

export default function PartnerNotificationsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Notifications</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Booking requests, payments, claims and messages from StashInn. Choose how you’re alerted in Business profile.</p>
      </div>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
        <NotificationList />
      </div>
    </div>
  );
}
