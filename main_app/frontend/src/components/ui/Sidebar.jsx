'use client';

import React, { useState, useRef, useEffect, createContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { IconUser, IconMenu2, IconX } from '@tabler/icons-react';
import { cn } from '../../utils/cn';

const SidebarContext = createContext();

export default function Sidebar({
  sections = [],
  bottomItems = [],
  defaultExpanded = false,
  navbarHeight = '4rem',
  className,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  // Check if mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Helper function to render icons consistently
  const renderIcon = (icon) => {
    if (React.isValidElement(icon)) {
      // Clone the icon and ensure consistent sizing
      return React.cloneElement(icon, {
        className: 'w-7 h-7',
        size: undefined // Remove size prop if it exists
      });
    }
    return icon;
  };

  return (
    <>
      {/* Hamburger Menu Button - Mobile only */}
      {isMobile && (
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow md:hidden"
          style={{ marginTop: navbarHeight }}
        >
          {mobileMenuOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
        </button>
      )}

      <SidebarContext.Provider value={{ expanded }}>
        <motion.div
          animate={{ width: expanded ? '300px' : '80px' }}
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => setExpanded(false)}
          className={cn(
            'fixed top-0 left-0 h-screen bg-white px-4 py-4 shadow-lg rounded-r-3xl flex flex-col justify-between sidebar',
            // Hide on mobile unless menu is open
            isMobile && !mobileMenuOpen ? 'hidden' : '',
            className
          )}
          style={{ marginTop: navbarHeight }}
        >
        <nav className="flex flex-col gap-8">
          {/* Logo */}
          <Link
            href={isAdmin ? '/admin/dashboard' : '/'}
            className={cn(
              'flex items-center gap-4 p-3 text-black',
              !expanded && 'justify-center'
            )}
          >
            <div className="flex-shrink-0 text-2xl font-bold">
              {!expanded ? 'D' : null}
            </div>
            {expanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-2xl font-bold whitespace-nowrap"
              >
                DevCorp
              </motion.span>
            )}
          </Link>

          {/* Render top sections */}
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="bg-gray-50 rounded-xl p-2">
              <AnimatePresence>
                {section.items.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-4 p-3 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors',
                      !expanded && 'justify-center'
                    )}
                  >
                    <div className="flex-shrink-0 flex items-center justify-center">
                      {renderIcon(item.icon)}
                    </div>
                    {expanded && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-base font-bold whitespace-nowrap"
                      >
                        {item.title}
                      </motion.span>
                    )}
                  </Link>
                ))}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        {/* Bottom Items */}
        {bottomItems.length > 0 && (
          <div className="mt-6">
            {bottomItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className={cn(
                  'flex items-center gap-4 p-3 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors mb-2',
                  !expanded && 'justify-center'
                )}
              >
                <div className="flex-shrink-0 flex items-center justify-center">
                  {renderIcon(item.icon)}
                </div>
                {expanded && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-base font-bold whitespace-nowrap"
                  >
                    {item.title}
                  </motion.span>
                )}
              </Link>
            ))}
          </div>
        )}
        </motion.div>
      </SidebarContext.Provider>
    </>
  );
}

export function MenuBar({ menuItems = [], onItemClick }) {
  const [selectedItem, setSelectedItem] = useState(menuItems[0]?.label);

  const handleClick = (item) => {
    setSelectedItem(item.label);
    onItemClick?.(item);
  };

  return (
    <div className="w-48 bg-white h-full rounded-xl overflow-auto border-r">
      <ul className="space-y-6 p-6">
        {menuItems.map((item, index) => (
          <li
            key={index}
            className="cursor-pointer text-gray-700 text-lg 
                       hover:text-blue-500 hover:scale-105 
                       transition-transform duration-200"
            onClick={() => onItemClick?.(item)}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
