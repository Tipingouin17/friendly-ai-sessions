
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold mb-4">About</h3>
            <p className="text-sm text-gray-600">
              AI Facilitator helps teams achieve their goals through AI-powered facilitation.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-gray-600 hover:text-primary">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-sm text-gray-600 hover:text-primary">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-gray-600 hover:text-primary">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Connect</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-primary">
                  Twitter
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-primary">
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-gray-100">
          <p className="text-center text-sm text-gray-600">
            © {new Date().getFullYear()} AI Facilitator. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
