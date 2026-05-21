import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  isAllowed: boolean;
  isLoading: boolean;
  redirectTo: string;
  children?: React.ReactNode;
}

const ProtectedRoute = ({ isAllowed, isLoading, redirectTo, children }: ProtectedRouteProps) => {
  const location = useLocation();

  // Сохраняем текущий путь для последующего возврата после логина
  useEffect(() => {
    if (!isAllowed && !isLoading) {
      localStorage.setItem('redirectAfterLogin', location.pathname + location.search);
    }
  }, [isAllowed, isLoading, location]);

  if (isLoading) {
    return <div className="loading-screen">Загрузка...</div>;
  }

  if (!isAllowed) {
    return <Navigate to={redirectTo} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;