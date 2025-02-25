
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <Link to="/" className="inline-block mb-4">
          <span className="text-2xl font-bold text-primary">AI Facilitator</span>
        </Link>
        <p className="text-sm text-gray-500">
          © 2025 All Rights Reserved
        </p>
      </div>
    </footer>
  );
};
