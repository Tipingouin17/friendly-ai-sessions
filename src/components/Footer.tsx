
import { Link } from "react-router-dom";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-100 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <Link to="/" className="inline-block">
              <span className="text-xl font-bold text-primary">MyFacilitator</span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed">
              AI-powered facilitation for workshops, brainstorming sessions, and team discussions.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Quick Links</h4>
            <div className="flex flex-col space-y-2">
              <Link to="/pricing" className="text-sm text-gray-500 hover:text-primary transition-colors">Pricing</Link>
              <Link to="/faqs" className="text-sm text-gray-500 hover:text-primary transition-colors">FAQs</Link>
              <Link to="/contact" className="text-sm text-gray-500 hover:text-primary transition-colors">Contact Us</Link>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Legal</h4>
            <div className="flex flex-col space-y-2">
              <Link to="/privacy" className="text-sm text-gray-500 hover:text-primary transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-sm text-gray-500 hover:text-primary transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-400">
            &copy; {currentYear} MyFacilitator. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
