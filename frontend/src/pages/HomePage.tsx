import { useAuth } from '../auth/AuthContext';
import { getGreeting, formatLongDate } from '../lib/greeting';
import { QuickLinks } from '../components/home/QuickLinks';
import { RecentItemsList } from '../components/home/RecentItemsList';
import { NotesSection } from '../components/home/NotesSection';

export function HomePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-100">
          {getGreeting()}, {user.fullName}
        </h1>
        <p className="mt-1 text-sm capitalize text-slate-500">{formatLongDate()}</p>
      </div>

      <div className="mb-8">
        <QuickLinks userId={user.id} />
      </div>

      <div className="mb-8">
        <RecentItemsList />
      </div>

      <NotesSection />
    </div>
  );
}
