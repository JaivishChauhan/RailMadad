import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import Logo from "../ui/Logo";

const footerIconLinks = [
  {
    href: "https://www.irctc.co.in/nget/",
    imgSrc: "https://i.ibb.co/RCHY1zh/image135112-343g-200h.png",
    alt: "Ticket Booking",
    text: "Ticket<br>Booking",
  },
  {
    href: "https://enquiry.indianrail.gov.in/",
    imgSrc: "https://i.ibb.co/nRPj422/image175112-48wp-200h.png",
    alt: "Train Inquiry",
    text: "Train<br>Inquiry",
  },
  {
    href: "http://www.indianrail.gov.in/",
    imgSrc: "https://i.ibb.co/p4Dh6Fp/image155112-ghl-200h.png",
    alt: "Reservation Inquiry",
    text: "Reservation<br>Inquiry",
  },
  {
    href: "https://rr.irctc.co.in/#/home",
    imgSrc: "https://i.ibb.co/8bGqSSs/image165112-ao3-200h.png",
    alt: "Retiring Room Booking",
    text: "Retiring<br>Room Booking",
  },
  {
    href: "http://www.indianrailways.gov.in/",
    imgSrc: "https://i.ibb.co/nRPj422/image175112-48wp-200h.png",
    alt: "Indian Railways",
    text: "Indian<br>Railways",
  },
  {
    href: "https://play.google.com/store/apps/details?id=com.cris.utsmobile&hl=en_IN",
    imgSrc: "https://i.ibb.co/wY1sP5J/image145112-955o-200h.png",
    alt: "UTS Ticketing",
    text: "UTS<br>Ticketing",
  },
  {
    href: "https://www.fois.indianrail.gov.in/RailSAHAY/index.jsp",
    imgSrc: "https://i.ibb.co/nRPj422/image175112-48wp-200h.png",
    alt: "Freight Business",
    text: "Freight<br>Business",
  },
  {
    href: "https://parcel.indianrail.gov.in/",
    imgSrc: "https://i.ibb.co/wY1sP5J/image145112-955o-200h.png",
    alt: "Railway Parcel Website",
    text: "Railway Parcel<br>Website",
  },
];

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-50 text-gray-800 py-10 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <Link
            to="/"
            className="flex items-center text-gray-800 no-underline mb-4 md:mb-0"
          >
            <Logo size="lg" className="mr-4" />
            <div>
              <h5 className="text-2xl font-bold m-0 text-red-700">
                <b>RailMadad</b>
              </h5>
              <p className="m-0 text-sm text-gray-600">
                For Inquiry, Assistance & Grievance Redressal
              </p>
            </div>
          </Link>
          <nav className="flex gap-x-8 text-sm">
            <Link
              to="/faq"
              className="text-gray-800 font-medium hover:text-red-700"
            >
              FAQs
            </Link>
            <Link
              to="/admin-login"
              className="text-gray-800 font-medium hover:text-red-700"
            >
              Railway Admin Login
            </Link>
            <Link
              to="/admin-login"
              className="text-gray-800 font-medium hover:text-red-700"
            >
              MIS Report Login
            </Link>
          </nav>
        </div>
        <div className="flex justify-around flex-wrap mb-8">
          {footerIconLinks.map((link) => (
            <div
              key={link.alt}
              className="text-center m-2 transition-transform duration-300 hover:-translate-y-1"
            >
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-600 no-underline hover:text-gray-900"
              >
                <img
                  src={link.imgSrc}
                  alt={link.alt}
                  className="w-12 h-12 mb-2 mx-auto"
                />
                <p dangerouslySetInnerHTML={{ __html: link.text }}></p>
              </a>
            </div>
          ))}
        </div>

        {/* Prototype Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 max-w-4xl mx-auto">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 text-left">
              <p className="font-semibold mb-1">Prototype Disclaimer:</p>
              <p className="mb-2">
                This is a demonstrative build of a past Smart India Hackathon
                project. It has been partially refactored to highlight the core
                logic and backend architecture, but remains an experimental
                prototype provided "as-is."
              </p>
              <p>
                While critical paths have been patched for demonstration, you
                will encounter bugs, unoptimized workflows, and responsive
                layout issues. This project is intended for archival and
                portfolio purposes only and is not optimized for user experience
                or commercial deployment.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center pt-5 border-t border-gray-200">
          <p className="m-1 text-sm text-gray-600">
            &copy; {new Date().getFullYear()}{" "}
            <Link
              to="#"
              className="text-red-700 font-medium no-underline hover:underline"
            >
              RailMadad
            </Link>
          </p>
          <p className="m-1 text-xs text-gray-400 mt-2">
            Prototype developed with <span className="text-red-500">❤</span> by{" "}
            <a
              href="https://github.com/JaivishChauhan"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-700 font-medium no-underline hover:underline"
            >
              Jaivish Chauhan
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
