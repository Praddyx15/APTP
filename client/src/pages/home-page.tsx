/**
 * Home page component
 */

import { useAuth } from '../hooks/use-auth';
import { Link } from 'wouter';

export default function HomePage() {
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-8 pb-4 border-b">
        <h1 className="text-2xl font-bold">Aviation Training Platform</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Welcome, {user?.firstName} {user?.lastName}
          </span>
          <button
            onClick={handleLogout}
            className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
          >
            Logout
          </button>
        </div>
      </header>

      <main>
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-card rounded-lg shadow-md p-6 border hover:border-primary transition-colors">
            <h2 className="text-xl font-semibold mb-2">Document Management</h2>
            <p className="text-muted-foreground mb-4">
              Upload, organize, and analyze your training documents.
            </p>
            <Link href="/documents">
              <a className="text-primary hover:underline">View Documents</a>
            </Link>
          </div>

          <div className="bg-card rounded-lg shadow-md p-6 border hover:border-primary transition-colors">
            <h2 className="text-xl font-semibold mb-2">Knowledge Graphs</h2>
            <p className="text-muted-foreground mb-4">
              Visualize connections between aviation concepts.
            </p>
            <Link href="/knowledge-graphs">
              <a className="text-primary hover:underline">Explore Knowledge Graphs</a>
            </Link>
          </div>

          <div className="bg-card rounded-lg shadow-md p-6 border hover:border-primary transition-colors">
            <h2 className="text-xl font-semibold mb-2">Training Programs</h2>
            <p className="text-muted-foreground mb-4">
              Create and manage comprehensive training syllabuses.
            </p>
            <Link href="/syllabuses">
              <a className="text-primary hover:underline">Manage Programs</a>
            </Link>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
          <div className="bg-card rounded-lg shadow-md p-6 border">
            <p className="text-muted-foreground">No recent activity to display.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
