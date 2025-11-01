import React, { useEffect, useRef, useState } from 'react';
import { Camera, Users, Baby, Landmark, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

type Service = {
  id: string;
  title: string;
  description: string;
  icon: any;
  to?: string;
};

const services: Service[] = [
  {
    id: 'portraits',
    title: 'Retratos',
    description: 'Sessões individuais e familiares que capturam sua essência com um olhar único e sensível.',
    icon: Camera,
    to: '/portrait',
  },
  {
    id: 'maternity',
    title: 'Gestantes',
    description: 'Eternize o momento mais especial da maternidade com fotos delicadas e emocionantes.',
    icon: Baby,
    to: '/maternity',
  },
  {
    id: 'events',
    title: 'Eventos',
    description: 'Cobertura completa para casamentos e celebrações com profissionalismo e criatividade.',
    icon: Users,
    to: '/events',
  },
];

const ServiceSelectionPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const [dists, setDists] = useState<number[]>(services.map(() => 1));
  const navigate = useNavigate();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let raf = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const children = Array.from(el.children) as HTMLElement[];
      const newDists: number[] = [];
      let bestIdx = 0;
      let bestDist = Infinity;
      children.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const cCenter = r.left + r.width / 2;
        const raw = Math.abs(centerX - cCenter);
        const norm = Math.min(1, raw / (rect.width / 2));
        newDists[i] = norm;
        if (raw < bestDist) {
          bestDist = raw;
          bestIdx = i;
        }
      });
      setDists(newDists);
      setActive(bestIdx);
    };

    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    // drag to scroll with mouse/touch
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const onDown = (e: MouseEvent | TouchEvent) => {
      isDown = true;
      startX = 'touches' in e ? e.touches[0].pageX : (e as MouseEvent).pageX;
      scrollLeft = el.scrollLeft;
      el.classList.add('dragging');
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDown) return;
      const x = 'touches' in e ? e.touches[0].pageX : (e as MouseEvent).pageX;
      const walk = (startX - x);
      el.scrollLeft = scrollLeft + walk;
    };
    const onUp = () => { isDown = false; el.classList.remove('dragging'); };

    el.addEventListener('mousedown', onDown);
    el.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      el.removeEventListener('scroll', onScroll as any);
      window.removeEventListener('resize', onScroll as any);
      el.removeEventListener('mousedown', onDown as any);
      el.removeEventListener('touchstart', onDown as any);
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('touchmove', onMove as any);
      window.removeEventListener('mouseup', onUp as any);
      window.removeEventListener('touchend', onUp as any);
    };
  }, []);

  const scrollToIndex = (idx: number) => {
    const el = containerRef.current;
    if (!el) return;
    const child = el.children[idx] as HTMLElement;
    child?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  const handleClick = (idx: number, to?: string) => {
    if (idx === active && to) navigate(to);
    else scrollToIndex(idx);
  };

  return (
    <div className="min-h-screen w-full bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-6xl w-full">
        <h1 className="text-4xl md:text-5xl font-playfair text-center mb-6">Nossos Serviços</h1>
        <p className="text-center text-gray-300 mb-8">Oferecemos uma variedade de serviços fotográficos profissionais para capturar seus momentos mais especiais com qualidade e sensibilidade.</p>

        <div className="relative">
          <button
            aria-label="Previous"
            onClick={() => scrollToIndex(Math.max(0, active - 1))}
            className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-white/6 rounded-full hover:bg-white/10 transition-colors"
          >
            <ChevronLeft />
          </button>

          <div ref={containerRef} className="services-carousel flex gap-6 overflow-x-auto no-scrollbar px-6 py-6 snap-x snap-mandatory">
            {services.map((s, i) => {
              const Icon = s.icon;
              const dist = dists[i] ?? 1;
              const scale = 1.15 - 0.25 * Math.min(1, dist);
              const opacity = 1 - 0.4 * Math.min(1, dist);
              const shadow = 12 - 8 * Math.min(1, dist);
              return (
                <motion.div
                  key={s.id}
                  onClick={() => handleClick(i, s.to)}
                  className="snap-center flex-shrink-0 w-[80%] sm:w-80 md:w-96 lg:w-[32%] rounded-2xl p-8 mx-2 cursor-pointer select-none"
                  style={{
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}
                  animate={{ scale, opacity }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <div style={{
                    boxShadow: `0 ${shadow}px ${Math.max(20, shadow * 4)}px rgba(200,200,200,${0.06 + (0.15 * (1 - dist))})`,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))'
                  }} className="h-full rounded-2xl flex flex-col">
                    <div className="flex-1 flex flex-col items-center text-center">
                      <div className="p-4 rounded-full mb-4 bg-white/10" style={{ width: 88, height: 88 }}>
                        <Icon size={36} className="mx-auto" />
                      </div>
                      <h3 className="text-2xl font-playfair mb-3">{s.title}</h3>
                      <p className="text-sm text-gray-300 mb-6 leading-relaxed">{s.description}</p>
                    </div>

                    <div className="mt-4 flex justify-center">
                      <button className={`px-6 py-2 rounded-xl border border-white text-sm transition-transform ${dist < 0.25 ? 'bg-white text-black' : 'bg-transparent text-white/90 hover:scale-105 hover:bg-white/10'}`}>
                        {dist < 0.25 ? 'Selecionar' : 'Ver mais'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <button
            aria-label="Next"
            onClick={() => scrollToIndex(Math.min(services.length - 1, active + 1))}
            className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-white/6 rounded-full hover:bg-white/10 transition-colors"
          >
            <ChevronRight />
          </button>

          {/* gradients */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black to-transparent" />
        </div>
      </div>

      <style>{`
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .services-carousel > div { scroll-snap-align: center; }
        .services-carousel.dragging { cursor: grabbing; cursor: -webkit-grabbing; }
      `}</style>
    </div>
  );
};

export default ServiceSelectionPage;
