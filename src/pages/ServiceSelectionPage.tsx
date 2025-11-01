import { useEffect, useRef, useState } from 'react';
import { Camera, Users, Baby, Landmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  {
    id: 'civil',
    title: 'Cas. Civil',
    description: 'Pacotes pensados para cerimônias civis no cartório, com cobertura elegante e objetiva.',
    icon: Landmark,
    to: '/events/civil',
  },
];

const ServiceSelectionPage = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const children = Array.from(el.children) as HTMLElement[];
      let bestIdx = 0;
      let bestDist = Infinity;
      children.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const cCenter = r.left + r.width / 2;
        const dist = Math.abs(centerX - cCenter);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      });
      setActive(bestIdx);
    };

    // initial
    onScroll();

    el.addEventListener('scroll', onScroll, { passive: true });
    const onResize = () => onScroll();
    window.addEventListener('resize', onResize);

    // enable wheel to scroll horizontally
    const onWheel = (e: WheelEvent) => {
      if (!el) return;
      if (Math.abs(e.deltaX) > 0 || Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        el.scrollBy({ left: e.deltaY || e.deltaX, behavior: 'smooth' });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      el.removeEventListener('wheel', onWheel as any);
    };
  }, []);

  const handleClick = (idx: number, to?: string) => {
    if (idx === active && to) navigate(to);
    else if (containerRef.current) {
      const child = containerRef.current.children[idx] as HTMLElement;
      child?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-6xl w-full">
        <h1 className="text-4xl md:text-5xl font-playfair text-center mb-6">Nossos Serviços</h1>
        <p className="text-center text-gray-300 mb-8">Oferecemos uma variedade de serviços fotográficos profissionais para capturar seus momentos mais especiais com qualidade e sensibilidade.</p>

        <div className="relative">
          <div ref={containerRef} className="services-carousel flex gap-6 overflow-x-auto no-scrollbar px-6 py-10 snap-x snap-mandatory">
            {services.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === active;
              return (
                <div
                  key={s.id}
                  onClick={() => handleClick(i, s.to)}
                  className={`snap-center flex-shrink-0 w-72 md:w-96 lg:w-[420px] transform transition-all duration-300 cursor-pointer select-none ${isActive ? 'scale-105 opacity-100' : 'scale-90 opacity-60'}`}
                  style={{
                    boxShadow: isActive ? '0 10px 40px rgba(200,200,200,0.12), 0 0 40px rgba(200,200,200,0.06) inset' : undefined,
                    borderRadius: 16,
                    background: isActive ? 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))' : 'transparent',
                    padding: 24,
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}
                >
                  <div className="flex flex-col items-center text-center h-full">
                    <div className={`p-4 rounded-full mb-4 ${isActive ? 'bg-white/10' : 'bg-white/3'}`} style={{ width: 80, height: 80 }}>
                      <Icon size={36} className="mx-auto" />
                    </div>
                    <h3 className={`text-2xl font-playfair mb-3 ${isActive ? 'text-white' : 'text-gray-200'}`}>{s.title}</h3>
                    <p className="text-sm text-gray-300 mb-6 leading-relaxed">{s.description}</p>
                    <div className="mt-auto">
                      <button className={`px-5 py-2 rounded-none border border-white text-sm ${isActive ? 'bg-white text-black' : 'bg-transparent text-white/90'}`}>
                        {isActive ? 'Seleccionar' : 'Ver más'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* subtle left/right gradients */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black to-transparent" />
        </div>
      </div>

      <style>{`
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }

        /* ensure the central card visually glows with a very light gray glow */
        .services-carousel > div { scroll-snap-align: center; }
      `}</style>
    </div>
  );
};

export default ServiceSelectionPage;
