import NotificationList from './NotificationList';

export default function AdminNotificationsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white">System Notifications</h1>
          <p className="text-gray-500 mt-1">Review alerts, dispute escalations, and system events.</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <NotificationList />
      </div>
    </div>
  );
}
