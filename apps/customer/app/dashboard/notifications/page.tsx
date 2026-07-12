import NotificationList from './NotificationList';

export default function CustomerNotificationsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Notifications</h1>
          <p className="text-gray-500 mt-1">Updates on your bookings and account.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <NotificationList />
      </div>
    </div>
  );
}
