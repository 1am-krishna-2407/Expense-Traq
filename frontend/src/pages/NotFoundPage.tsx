import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/Feedback';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon="explore_off"
        title="Page not found"
        message="The page you’re looking for doesn’t exist or has moved."
        action={
          <Link to="/dashboard">
            <Button icon="dashboard">Back to dashboard</Button>
          </Link>
        }
      />
    </div>
  );
}
