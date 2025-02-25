
import { Link, useLocation } from "react-router-dom";

export const Navigation = () => {
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-primary">AI Facilitator</Link>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-gray-600 hover:text-primary">My Facilitators</a>
            <Link 
              to="/" 
              className={`${location.pathname === '/' ? 'text-primary font-medium' : 'text-gray-600'} hover:text-primary`}
            >
              Home
            </Link>
            <Link 
              to="/pricing" 
              className={`${location.pathname === '/pricing' ? 'text-primary font-medium' : 'text-gray-600'} hover:text-primary`}
            >
              Pricing
            </Link>
            <Link 
              to="/faqs" 
              className={`${location.pathname === '/faqs' ? 'text-primary font-medium' : 'text-gray-600'} hover:text-primary`}
            >
              FAQs
            </Link>
            <Link 
              to="/contact" 
              className={`${location.pathname === '/contact' ? 'text-primary font-medium' : 'text-gray-600'} hover:text-primary`}
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};
