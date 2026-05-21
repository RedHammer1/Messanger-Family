import { useNavigate } from 'react-router-dom';
import './PageHeader.css';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

const PageHeader = ({ title, subtitle }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="page-header">
      <button className="back-button" onClick={() => navigate('/chats')}>
        ←
      </button>
      <div className="page-header-text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
  );
};

export default PageHeader;