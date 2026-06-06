/**
 * Footer
 *
 * Component for the AIfacilitator application.
 */

import { Link } from "react-router-dom";
import { Zap, Twitter, Linkedin, Github } from "lucide-react";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">AIfacilitator</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              AI-powered facilitation for workshops, brainstorming sessions, and team discussions. Run better meetings, every time.
            </p>
            <div className="flex gap-4 pt-1">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Follow AIfacilitator on X" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-300 hover:text-indigo-300 hover:bg-white/5 transition-colors">
                <Twitter className="h-5 w-5" aria-hidden="true" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="Follow AIfacilitator on LinkedIn" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-300 hover:text-indigo-300 hover:bg-white/5 transition-colors">
                <Linkedin className="h-5 w-5" aria-hidden="true" />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="View AIfacilitator on GitHub" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-300 hover:text-indigo-300 hover:bg-white/5 transition-colors">
                <Github className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-gray-200 uppercase tracking-widest">Product</h2>
            <div className="flex flex-col space-y-2.5">
              <Link to="/pricing" className="text-sm text-gray-400 hover:text-indigo-400 transition-colors">Pricing</Link>
              <Link to="/faqs" className="text-sm text-gray-400 hover:text-indigo-400 transition-colors">FAQs</Link>
              <Link to="/contact" className="text-sm text-gray-400 hover:text-indigo-400 transition-colors">Contact Us</Link>
              <Link to="/signup" className="text-sm text-gray-400 hover:text-indigo-400 transition-colors">Get Started Free</Link>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-gray-200 uppercase tracking-widest">Legal</h2>
            <div className="flex flex-col space-y-2.5">
              <Link to="/privacy" className="text-sm text-gray-400 hover:text-indigo-400 transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-sm text-gray-400 hover:text-indigo-400 transition-colors">Terms of Service</Link>
              <button
                onClick={() => window.dispatchEvent(new Event("open-cookie-settings"))}
                className="text-sm text-gray-400 hover:text-indigo-400 transition-colors text-left"
              >
                Cookie Settings
              </button>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-gray-400">
              &copy; {currentYear} AIfacilitator. All Rights Reserved.
            </p>
            <p className="text-xs text-gray-400">
              Built with AI &nbsp;·&nbsp; Powered by innovation
            </p>
        </div>
      </div>
    </footer>
  );
};
