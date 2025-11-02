import React, { useEffect, useRef, useState } from 'react';
import { Camera, Users, Baby, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

type Service = {
  id: string;
  title: string;
  description: string;
  icon: any;
  to?: string;
};

export const services: Service[] = [
  { id: 'portraits', title: 'Retratos', description: 'Sessões individuais e familiares que capturam sua essência com um olhar único e sensível.', icon: Camera, to: '/portrait' },
  { id: 'maternity', title: 'Gestantes', description: 'Eternize o momento mais especial da maternidade com fotos delicadas e emocionantes.', icon: Baby, to: '/maternity' },
  { id: 'events', title: 'Eventos', description: 'Cobertura completa para casamentos e celebrações com profissionalismo e criatividade.', icon: Users, to: '/events' },
  { id: 'civil', title: 'Cas. Civil', description: 'Pacotes pensados para cerimônias civis no cartório, com cobertura elegante e objetiva.', icon: Camera, to: '/events/civil' },
];

const clampIndex = (i: number, len: number) => ((i % len) + len) % len;

const ServiceSelectionPage: React.FC = () => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();

  // Pointer drag to change active (circular)
  const pointer = useRef<{ startX: number; dx: number; dragging: boolean }>({ startX: 0, dx: 0, dragging: false });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onPointerDown = (e: PointerEvent) => {
      pointer.current.dragging = true;
      pointer.current.startX = e.clientX;
      pointer.current.dx = 0;
      try { track.setPointerCapture(e.pointerId); } catch (err) {}
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointer.current.dragging) return;
      pointer.current.dx = e.clientX - pointer.current.startX;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!pointer.current.dragging) return;
      pointer.current.dragging = false;
      const dx = pointer.current.dx;
      pointer.current.dx = 0;
      if (dx > 60) {
        // swipe right -> previous
        setActive(a => clampIndex(a - 1, services.length));
      } else if (dx < -60) {
        // swipe left -> next
        setActive(a => clampIndex(a + 1, services.length));
      }
      try { track.releasePointerCapture(e.pointerId); } catch (err) {}
    };

    track.addEventListener('pointerdown', onPointerDown as any);
    track.addEventListener('pointermove', onPointerMove as any);
    track.addEventListener('pointerup', onPointerUp as any);
    track.addEventListener('pointercancel', onPointerUp as any);

    return () => {
      track.removeEventListener('pointerdown', onPointerDown as any);
      track.removeEventListener('pointermove', onPointerMove as any);
      track.removeEventListener('pointerup', onPointerUp as any);
      track.removeEventListener('pointercancel', onPointerUp as any);
    };
  }, []);

  const goNext = () => setActive(a => clampIndex(a + 1, services.length));
  const goPrev = () => setActive(a => clampIndex(a - 1, services.length));

  const goto = (idx: number, to?: string) => {
    if (idx === active && to) navigate(to);
    else setActive(idx);
  };

  const len = services.length;

  return (
    <div className="w-full bg-black text-white relative">
      <div className="max-w-6xl w-full h-screen flex flex-col justify-start mx-auto px-4 md:px-8">
        <button onClick={() => navigate('/')} aria-label="Volver" className="absolute z-50" style={{ right: 16, top: 16, padding: '8px 12px', borderRadius: 6, borderColor: 'rgb(255,255,255)', borderWidth: 0.8, backgroundColor: 'rgba(0,0,0,0)', color: 'white', transitionDuration: '0.15s', transitionProperty: 'color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter' }}>Volver</button>

        <h1 className="text-center" style={{ margin: '60px 0 8px', font: '400 48px/48px "Playfair Display", serif' }}>Nossos Serviços</h1>
        <p className="text-center text-gray-300 mb-2">Oferecemos uma variedade de serviços fotográficos profissionais para capturar seus momentos más especiales com qualidade e sensibilidade.</p>

        <div className="relative flex-1">
          <button aria-label="Previous" onClick={goPrev} className="hidden md:flex items-center justify-center absolute left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-white/6 rounded-full hover:bg-white/10 transition-colors">
            <ChevronLeft />
          </button>

          <div ref={trackRef} className="relative flex items-center justify-center overflow-hidden pt-[2px] w-full h-full">
            <div className="relative w-full flex items-center justify-center items-center">
              {services.map((s, i) => {
                // circular offset calculation
                let raw = i - active;
                if (raw > len / 2) raw -= len;
                if (raw < -len / 2) raw += len;
                const offset = raw; // -1,0,1 etc

                // layout calculations (compute absolute left coordinate centered in container)
                const containerWidth = trackRef.current?.clientWidth ?? 1200;
                const cardWidth = Math.min(300, containerWidth * 0.6);
                const distance = Math.min(360, containerWidth * 0.35); // tighter spacing
                const maxVisible = 1.5; // show fewer off-center cards
                let clampedOffset = offset;
                if (Math.abs(clampedOffset) > maxVisible) {
                  clampedOffset = Math.sign(clampedOffset) * maxVisible;
                }
                const centerX = Math.max(24, Math.floor((containerWidth / 2) - (cardWidth / 2)));
                let x = centerX + clampedOffset * distance;
                // clamp between margins so card never leaves viewport
                const minX = 24;
                const maxX = Math.max(minX, Math.floor(containerWidth - cardWidth - 24));
                if (x < minX) x = minX;
                if (x > maxX) x = maxX;
                const scale = clampedOffset === 0 ? 1.08 : Math.max(0.82, 1 - Math.abs(clampedOffset) * 0.12);
                const z = 100 - Math.abs(clampedOffset);
                const opacity = clampedOffset === 0 ? 1 : Math.max(0.35, 1 - Math.abs(clampedOffset) * 0.35);
                const shadow = clampedOffset === 0 ? 24 : Math.max(3, 16 - Math.abs(clampedOffset) * 8);

                const Icon = s.icon;

                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, scale: 0.9, x }}
                    animate={{ x, scale, opacity }}
                    transition={{ type: 'spring', stiffness: 220, damping: 28 }}
                    style={{ zIndex: z, left: 0, position: 'absolute', top: 'calc(50% - 200px)' }}
                    className="absolute"
                  >
                    <div style={{ width: cardWidth }} className={`rounded-2xl p-6 mx-2 flex items-center justify-center ${offset === 0 ? 'bg-gradient-to-b from-white/5 to-white/3' : 'bg-transparent'}`}>
                      <div style={{
                        boxShadow: `0 ${Math.round(10 * (1 - Math.abs(offset)))}px ${Math.max(18, shadow)}px rgba(200,200,200,${0.06 + (0.15 * (1 - Math.abs(offset)))})`,
                        height: 400
                      }} className="max-h-[90vh] rounded-2xl flex flex-col items-center text-center px-4 py-6">
                        <div className="p-4 rounded-full mb-4 bg-white/10" style={{ width: 88, height: 88 }}>
                          <Icon size={36} className="mx-auto" />
                        </div>
                        <h3 className="text-2xl font-playfair mb-3">{s.title}</h3>
                        <p className="text-sm text-gray-300 mb-6 leading-relaxed">{s.description}</p>

                        <div className="mt-auto">
                          <button onClick={() => goto(i, s.to)} className={`px-6 py-2 rounded-xl border border-white text-sm transition-transform ${offset === 0 ? 'bg-white text-black' : 'bg-transparent text-white/90 hover:scale-105 hover:bg-white/10'}`}>
                            {offset === 0 ? 'Selecionar' : 'Ver mais'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <button aria-label="Next" onClick={goNext} className="hidden md:flex items-center justify-center absolute right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-white/6 rounded-full hover:bg-white/10 transition-colors">
            <ChevronRight />
          </button>

          {/* circular depth overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <radialGradient id="g" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.02)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.6)" />
                </radialGradient>
              </defs>
              <rect x="0" y="0" width="100%" height="100%" fill="url(#g)" />
            </svg>
          </div>
        </div>
      </div>

      <style>{` .font-playfair { font-family: 'Playfair Display', serif; } `}</style>
    </div>
  );
};

export default ServiceSelectionPage;
