import { ReactNode, useEffect, useState } from 'react';
import Header from './Header';
import { Camera } from 'lucide-react';
import ImageAdminOverlay from '../admin/ImageAdminOverlay';
import FloatingWhatsApp from './FloatingWhatsApp';
import { fetchImageOverrides, applyImageOverrides } from '../../utils/siteImageOverrides';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [mounted, setMounted] = useState(false);
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  useEffect(() => {
    try {
      setTimeout(() => {
        setMounted(true);
      }, 1000);

      // Add intersection observer for fade-in animations
      try {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            try {
              if (entry.isIntersecting) {
                (entry.target as HTMLElement).classList.add('appear');
                observer.unobserve(entry.target);
              }
            } catch (e) {
              // ignore per-element errors
            }
          });
        }, { threshold: 0.1 });

        const fadeElements = document.querySelectorAll('.fade-in');
        fadeElements.forEach(element => {
          try { observer.observe(element); } catch (e) {}
        });

        return () => {
          fadeElements.forEach(element => {
            try { observer.unobserve(element); } catch (e) {}
          });
        };
      } catch (err) {
        // IntersectionObserver not available or failed
        return;
      }
    } catch (err) {
      // swallow any unexpected error in mount effect
    }
  }, []);

  // Admin image overlay: disable when site_admin_mode is set
  useEffect(() => {
    try {
      const handler = (e: any) => {
        try {
          const val = e?.detail ?? (sessionStorage.getItem('site_admin_mode') ? true : false);
          if (val) {
            ImageAdminOverlay.destroyImageAdminOverlay();
          } else {
            ImageAdminOverlay.initImageAdminOverlay();
          }
        } catch (inner) {
          // ignore overlay errors
        }
      };
      window.addEventListener('siteAdminModeChanged', handler as EventListener);
      // run once based on current value
      try {
        if (typeof window !== 'undefined' && sessionStorage.getItem('site_admin_mode')) {
          ImageAdminOverlay.destroyImageAdminOverlay();
        }
      } catch (inner) {}
      return () => {
        try { window.removeEventListener('siteAdminModeChanged', handler as EventListener); } catch (e) {}
        try { ImageAdminOverlay.initImageAdminOverlay(); } catch (e) {}
      };
    } catch (err) {
      // swallow
    }
  }, []);

  // Apply persisted image overrides for public site
  useEffect(() => {
    let obs: MutationObserver | null = null;
    const loadAndApply = async () => {
      try {
        const map = await fetchImageOverrides();
        try { applyImageOverrides(map); } catch (e) {}
        if (obs) try { obs.disconnect(); } catch (e) {}
        obs = new MutationObserver(() => {
          try { applyImageOverrides(map); } catch (e) {}
        });
        try { obs.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
      } catch (err) {
        // ignore fetch/apply errors
      }
    };
    loadAndApply();
    return () => { try { if (obs) obs.disconnect(); } catch (e) {} };
  }, []);

  // Ensure body background matches admin pages (white in light mode, dark when admin-dark is active)
  useEffect(() => {
    try {
      const prev = document.body.style.backgroundColor;
      let obs: MutationObserver | null = null;

      const applyAdminBg = () => {
        try {
          const isAdminDark = !!document.querySelector('.admin-dark');
          document.body.style.backgroundColor = isAdminDark ? '#0b0b0b' : '#ffffff';
        } catch (e) {}
      };

      if (isAdmin) {
        applyAdminBg();
        try {
          obs = new MutationObserver(() => applyAdminBg());
          obs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
        } catch (e) {}
      } else {
        document.body.style.backgroundColor = prev;
      }

      return () => {
        try { if (obs) obs.disconnect(); } catch (e) {}
        try { document.body.style.backgroundColor = prev; } catch (e) {}
      };
    } catch (err) {
      // swallow
    }
  }, [isAdmin]);

  if (!mounted) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          <Camera size={48} className="text-primary animate-pulse mx-auto mb-4" />
          <div className="text-primary font-playfair text-2xl">Wild Pictures Studio</div>
          <div className="text-primary/80 text-sm uppercase tracking-widest mt-1">Loading...</div>
        </div>
      </div>
    );
  }

  const isServices = location.pathname === '/services';

  return (
    <div className={`flex flex-col min-h-screen opacity-100 transition-opacity duration-500 ${isAdmin ? 'bg-white text-black' : 'bg-background text-primary'}`}>
      {!isAdmin && !isServices && <Header />}
      <main className="flex-grow">
        {children}
      </main>
      <FloatingWhatsApp />
    </div>
  );
};

export default Layout;
