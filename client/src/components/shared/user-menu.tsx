import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, logoutMutation } = useAuth();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Close the menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (!user) return null;

  // Get user initials for avatar
  const getInitials = () => {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="flex items-center gap-2 text-sm px-2 py-1 rounded-md hover:bg-slate-100"
        onClick={toggleMenu}
      >
        <div className="h-8 w-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-600 font-medium">
          {getInitials()}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-slate-700">{`${user.firstName} ${user.lastName}`}</p>
          <p className="text-xs text-slate-500 capitalize">{user.role}</p>
        </div>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-40 border border-slate-200">
          <a href="#" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Profile</a>
          <a href="#" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Settings</a>
          <div className="border-t border-slate-200 my-1"></div>
          <button
            className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-slate-100"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
