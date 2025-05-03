'use client';
import React, { useRef, useState, useEffect } from "react";
import styles from "./page.module.css";
import { supabase } from "./supabaseClient";

const CAPS = [
  { key: "none", label: "No Cap", src: null },
  { key: "succinctHat2", label: "Pink Cap", src: "/succinctHat2.png" },
  { key: "juniorprover", label: "Blue Cap", src: "/juniorprover.png" },
];

const LOGOS = [
  { key: "none", label: "No Logo", src: null },
  { key: "logo1", label: "Logo 1", src: "/1.png" },
  { key: "logo2", label: "Logo 2", src: "/2.png" },
];

type CapType = typeof CAPS[number]["key"];
type LogoType = typeof LOGOS[number]["key"];

// Типы для мульти-элементов
type CapInstance = {
  id: string;
  key: CapType;
  x: number;
  y: number;
  size: number;
  angle: number;
  flipX?: boolean;
};
type LogoInstance = {
  id: string;
  key: LogoType;
  x: number;
  y: number;
  size: number;
  angle: number;
  flipX?: boolean;
};

export default function Home() {
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cap, setCap] = useState<CapType>("none");
  const [capPos, setCapPos] = useState({ x: 50, y: 20 });
  const [capSize, setCapSize] = useState(80);
  const [draggingCap, setDraggingCap] = useState(false);
  const [resizingCap, setResizingCap] = useState(false);
  const capDragOffset = useRef({ x: 0, y: 0 });
  const [capAngle, setCapAngle] = useState(0);
  const [rotatingCap, setRotatingCap] = useState(false);
  const capRotateStart = useRef({ x: 0, angle: 0 });

  const [logo, setLogo] = useState<LogoType>("none");
  const [logoPos, setLogoPos] = useState({ x: 120, y: 120 });
  const [logoSize, setLogoSize] = useState(80);
  const [draggingLogo, setDraggingLogo] = useState(false);
  const [resizingLogo, setResizingLogo] = useState(false);
  const logoDragOffset = useRef({ x: 0, y: 0 });
  const [logoAngle, setLogoAngle] = useState(0);
  const [rotatingLogo, setRotatingLogo] = useState(false);
  const logoRotateStart = useRef({ x: 0, angle: 0 });

  const [gallery, setGallery] = useState<string[]>([]);

  // Для плавного resize: сохраняем стартовый размер и координату
  const capResizeStart = useRef({ x: 0, size: 0 });
  const logoResizeStart = useRef({ x: 0, size: 0 });

  // Сохраняем последний добавленный URL для анимации и синхронизации
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  // Состояния для hover/active cap/logo
  const [hoveredCap, setHoveredCap] = useState(false);
  const [activeCap, setActiveCap] = useState(false);
  const [hoveredLogo, setHoveredLogo] = useState(false);
  const [activeLogo, setActiveLogo] = useState(false);

  // Состояние для последнего сохранённого URL (для шаринга)
  const [lastSavedUrl, setLastSavedUrl] = useState<string | null>(null);

  // Массивы кепок и логотипов
  const [caps, setCaps] = useState<CapInstance[]>([]);
  const [logos, setLogos] = useState<LogoInstance[]>([]);
  // id активного элемента
  const [activeCapId, setActiveCapId] = useState<string | null>(null);
  const [activeLogoId, setActiveLogoId] = useState<string | null>(null);

  // Вместо общих dragging/resizing/rotating:
  const [draggingCapId, setDraggingCapId] = useState<string | null>(null);
  const [resizingCapId, setResizingCapId] = useState<string | null>(null);
  const [rotatingCapId, setRotatingCapId] = useState<string | null>(null);
  const [draggingLogoId, setDraggingLogoId] = useState<string | null>(null);
  const [resizingLogoId, setResizingLogoId] = useState<string | null>(null);
  const [rotatingLogoId, setRotatingLogoId] = useState<string | null>(null);

  // Состояния для drag/resize/rotate активного элемента
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<null | { dir: 'nw'|'ne'|'sw'|'se' }>(null);
  const [rotating, setRotating] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, size: 0 });
  const rotateStart = useRef({ x: 0, angle: 0 });

  // ДОБАВИТЬ в Home:
  const [hoveredCapBoxId, setHoveredCapBoxId] = useState<string | null>(null);
  const [hoveredLogoBoxId, setHoveredLogoBoxId] = useState<string | null>(null);

  // Добавить кепку
  const addCap = (key: CapType) => {
    if (key === 'none') return;
    setCaps(caps => [
      ...caps,
      {
        id: Math.random().toString(36).slice(2),
        key,
        x: 60 + caps.length * 30,
        y: 40 + caps.length * 30,
        size: 100,
        angle: 0,
      },
    ]);
  };
  // Добавить логотип
  const addLogo = (key: LogoType) => {
    if (key === 'none') return;
    setLogos(logos => [
      ...logos,
      {
        id: Math.random().toString(36).slice(2),
        key,
        x: 120 + logos.length * 40,
        y: 120 + logos.length * 40,
        size: 80,
        angle: 0,
      },
    ]);
  };
  // Удалить кепку/лого
  const removeCap = (id: string) => setCaps(caps => caps.filter(c => c.id !== id));
  const removeLogo = (id: string) => setLogos(logos => logos.filter(l => l.id !== id));

  // Загрузка галереи из Supabase при старте и после добавления
  useEffect(() => {
    const fetchGallery = async () => {
      const { data, error } = await supabase
        .from('gallery')
        .select('url')
        .order('created_at', { ascending: false })
        .limit(30);
      if (data) {
        // Если есть pendingUrl, не дублируем его
        setGallery(g => {
          if (pendingUrl && data[0]?.url === pendingUrl) {
            return data.map((item: any) => item.url);
          } else if (pendingUrl && !data.some((item: any) => item.url === pendingUrl)) {
            // Если pendingUrl не найден в Supabase, оставляем его в начале
            return [pendingUrl, ...data.map((item: any) => item.url)];
          } else {
            return data.map((item: any) => item.url);
          }
        });
        setPendingUrl(null);
      }
    };
    fetchGallery();
  }, [pendingUrl]);

  // Сохранение в Supabase Storage и Database
  const handleSaveAvatar = async () => {
    if (!avatar) return;
    const canvas = document.createElement('canvas');
    canvas.width = 560;
    canvas.height = 560;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const baseImg = new window.Image();
    baseImg.src = avatar;
    await new Promise(res => { baseImg.onload = res; });
    ctx.drawImage(baseImg, 0, 0, 560, 560);
    if (cap !== 'none') {
      const capObj = CAPS.find(c => c.key === cap);
      if (capObj?.src) {
        const capImg = new window.Image();
        capImg.src = capObj.src;
        await new Promise(res => { capImg.onload = res; });
        ctx.save();
        ctx.translate(capPos.x + capSize/2, capPos.y + capImg.height/2 * (capSize/capImg.width));
        ctx.rotate(capAngle * Math.PI / 180);
        ctx.drawImage(capImg, -capSize/2, -capImg.height/2 * (capSize/capImg.width), capSize, capImg.height * (capSize/capImg.width));
        ctx.restore();
      }
    }
    if (logo !== 'none') {
      const logoObj = LOGOS.find(l => l.key === logo);
      if (logoObj?.src) {
        const logoImg = new window.Image();
        logoImg.src = logoObj.src;
        await new Promise(res => { logoImg.onload = res; });
        ctx.save();
        ctx.translate(logoPos.x + logoSize/2, logoPos.y + logoImg.height/2 * (logoSize/logoImg.width));
        ctx.rotate(logoAngle * Math.PI / 180);
        ctx.drawImage(logoImg, -logoSize/2, -logoImg.height/2 * (logoSize/logoImg.width), logoSize, logoImg.height * (logoSize/logoImg.width));
        ctx.restore();
      }
    }
    const url = canvas.toDataURL('image/png');
    const fileName = `avatar_${Date.now()}.png`;
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    const pngFile = new File([arrayBuffer], fileName, { type: 'image/png' });
    const { data: storageData, error: storageError } = await supabase.storage.from('avatars').upload(fileName, pngFile, { upsert: true });
    if (!storageError) {
      const publicUrl = `https://exhskzlqczlrnoitfuij.supabase.co/storage/v1/object/public/avatars/${fileName}`;
      await supabase.from('gallery').insert({ url: publicUrl });
      setGallery(g => [publicUrl, ...g].slice(0, 30));
      setPendingUrl(publicUrl);
      setLastSavedUrl(publicUrl); // Для шаринга
    } else {
      alert('Ошибка загрузки: ' + storageError.message);
    }
  };

  // Handle avatar upload
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAvatar(ev.target?.result as string);
        setCap("none");
        setLogo("none");
      };
      reader.readAsDataURL(file);
    }
  };

  // Cap drag logic
  const onCapMouseDown = (e: React.MouseEvent) => {
    setDraggingCap(true);
    capDragOffset.current = {
      x: e.clientX - capPos.x,
      y: e.clientY - capPos.y,
    };
    e.stopPropagation();
  };
  const onCapMouseMove = (e: React.MouseEvent) => {
    if (draggingCap) {
      setCapPos({
        x: e.clientX - capDragOffset.current.x,
        y: e.clientY - capDragOffset.current.y,
      });
    }
    if (resizingCap) {
      const delta = e.clientX - capResizeStart.current.x;
      setCapSize(Math.max(30, capResizeStart.current.size + delta));
    }
    if (rotatingCap) {
      setCapAngle(capRotateStart.current.angle + (e.clientX - capRotateStart.current.x));
    }
    if (draggingLogo) {
      setLogoPos({
        x: e.clientX - logoDragOffset.current.x,
        y: e.clientY - logoDragOffset.current.y,
      });
    }
    if (resizingLogo) {
      const delta = e.clientX - logoResizeStart.current.x;
      setLogoSize(Math.max(20, logoResizeStart.current.size + delta));
    }
    if (rotatingLogo) {
      setLogoAngle(logoRotateStart.current.angle + (e.clientX - logoRotateStart.current.x));
    }
  };
  const onCapMouseUp = () => {
    setDraggingCap(false);
    setResizingCap(false);
    setDraggingLogo(false);
    setResizingLogo(false);
    setRotatingCap(false);
    setRotatingLogo(false);
  };
  const onCapResizeHandleDown = (e: React.MouseEvent) => {
    setResizingCap(true);
    capResizeStart.current = { x: e.clientX, size: capSize };
    e.stopPropagation();
  };

  // Logo drag logic
  const onLogoMouseDown = (e: React.MouseEvent) => {
    setDraggingLogo(true);
    logoDragOffset.current = {
      x: e.clientX - logoPos.x,
      y: e.clientY - logoPos.y,
    };
    e.stopPropagation();
  };
  const onLogoResizeHandleDown = (e: React.MouseEvent) => {
    setResizingLogo(true);
    logoResizeStart.current = { x: e.clientX, size: logoSize };
    e.stopPropagation();
  };

  // Cap rotation logic
  const onCapRotateHandleDown = (e: React.MouseEvent) => {
    setRotatingCap(true);
    capRotateStart.current = { x: e.clientX, angle: capAngle };
    e.stopPropagation();
  };
  // Logo rotation logic
  const onLogoRotateHandleDown = (e: React.MouseEvent) => {
    setRotatingLogo(true);
    logoRotateStart.current = { x: e.clientX, angle: logoAngle };
    e.stopPropagation();
  };

  // Сброс activeCap/activeLogo при клике вне элемента
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      setActiveCap(false);
      setActiveLogo(false);
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, []);

  // Mouse events:
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingCapId) {
        setCaps(caps => caps.map(c => c.id === draggingCapId ? { ...c, x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y } : c));
      }
      if (resizingCapId) {
        const delta = Math.max(e.clientX - resizeStart.current.x, e.clientY - resizeStart.current.y);
        setCaps(caps => caps.map(c => c.id === resizingCapId ? { ...c, size: Math.max(30, resizeStart.current.size + delta) } : c));
      }
      if (rotatingCapId) {
        setCaps(caps => caps.map(c => c.id === rotatingCapId ? { ...c, angle: rotateStart.current.angle + (e.clientX - rotateStart.current.x) } : c));
      }
      if (draggingLogoId) {
        setLogos(logos => logos.map(l => l.id === draggingLogoId ? { ...l, x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y } : l));
      }
      if (resizingLogoId) {
        const delta = Math.max(e.clientX - resizeStart.current.x, e.clientY - resizeStart.current.y);
        setLogos(logos => logos.map(l => l.id === resizingLogoId ? { ...l, size: Math.max(20, resizeStart.current.size + delta) } : l));
      }
      if (rotatingLogoId) {
        setLogos(logos => logos.map(l => l.id === rotatingLogoId ? { ...l, angle: rotateStart.current.angle + (e.clientX - rotateStart.current.x) } : l));
      }
    };
    const onUp = () => {
      setDraggingCapId(null);
      setResizingCapId(null);
      setRotatingCapId(null);
      setDraggingLogoId(null);
      setResizingLogoId(null);
      setRotatingLogoId(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [draggingCapId, resizingCapId, rotatingCapId, draggingLogoId, resizingLogoId, rotatingLogoId]);

  console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const toolBtnStyle = {
    width: 40,
    height: 40,
    background: '#fff',
    borderRadius: '50%',
    border: '2px solid #f06acd',
    boxShadow: '0 2px 12px #f06acd44',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    color: '#f06acd',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'box-shadow 0.2s, border 0.2s, background 0.2s',
  };

  const handleRotate = () => {
    if (activeCapId) setCaps(caps => caps.map(c => c.id === activeCapId ? { ...c, angle: c.angle + 15 } : c));
    if (activeLogoId) setLogos(logos => logos.map(l => l.id === activeLogoId ? { ...l, angle: l.angle + 15 } : l));
  };
  const handleFlip = () => {
    if (activeCapId) setCaps(caps => caps.map(c => c.id === activeCapId ? { ...c, flipX: !c.flipX } : c));
    if (activeLogoId) setLogos(logos => logos.map(l => l.id === activeLogoId ? { ...l, flipX: !l.flipX } : l));
  };
  const handleDelete = () => {
    if (activeCapId) setCaps(caps => caps.filter(c => c.id !== activeCapId));
    if (activeLogoId) setLogos(logos => logos.filter(l => l.id !== activeLogoId));
    setActiveCapId(null);
    setActiveLogoId(null);
  };
  const activeElementSize = activeCapId
    ? caps.find(c => c.id === activeCapId)?.size ?? 100
    : activeLogoId
    ? logos.find(l => l.id === activeLogoId)?.size ?? 100
    : 100;
  const handleResize = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = Number(e.target.value);
    if (activeCapId) setCaps(caps => caps.map(c => c.id === activeCapId ? { ...c, size: newSize } : c));
    if (activeLogoId) setLogos(logos => logos.map(l => l.id === activeLogoId ? { ...l, size: newSize } : l));
  };

  // ВРЕМЕННАЯ ФУНКЦИЯ ДЛЯ ПОЛНОЙ ОЧИСТКИ ГАЛЕРЕИ (ТОЛЬКО ДЛЯ РАЗРАБОТЧИКА)
  const handleFullClearGallery = async () => {
    // Получаем все записи из gallery
    const { data, error } = await supabase.from('gallery').select('url');
    if (error) {
      alert('Ошибка получения галереи: ' + error.message);
      return;
    }
    // Извлекаем имена файлов из url
    const files = (data || []).map((item: any) => {
      const match = item.url.match(/avatars\/(.*)$/);
      return match ? match[1] : null;
    }).filter(Boolean);
    // Удаляем файлы из storage
    if (files.length > 0) {
      const { error: storageError } = await supabase.storage.from('avatars').remove(files);
      if (storageError) {
        alert('Ошибка удаления файлов из storage: ' + storageError.message);
        return;
      }
    }
    // Удаляем все записи из gallery
    const { error: deleteError } = await supabase.from('gallery').delete().neq('url', '');
    if (deleteError) {
      alert('Ошибка удаления записей из gallery: ' + deleteError.message);
      return;
    }
    setGallery([]);
    alert('Галерея полностью очищена!');
  };

  return (
    <div className={styles.pageCustomLayout} onMouseMove={onCapMouseMove} onMouseUp={onCapMouseUp}>
      <section className={styles.editorSection}>
        <h2 style={{ marginTop: 32, fontSize: 40, textAlign: 'center', letterSpacing: 2, textShadow: '0 0 18px #fff, 0 0 32px #f06acd' }}>Succinct Avatar Editor</h2>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%' }}>
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={handleAvatarChange}
          />
          <div
            className={styles.avatarPreview}
            title="Avatar preview area"
            style={{ position: 'relative', width: 560, height: 560, margin: '0 auto', cursor: !avatar ? 'pointer' : 'default' }}
            onClick={e => {
              if (!avatar) {
                fileInputRef.current?.click();
              } else if (e.target === e.currentTarget) {
                setActiveCapId(null);
                setActiveLogoId(null);
              }
            }}
            onMouseEnter={e => {
              if (!avatar) e.currentTarget.classList.add(styles.avatarPreviewHover);
            }}
            onMouseLeave={e => {
              if (!avatar) e.currentTarget.classList.remove(styles.avatarPreviewHover);
            }}
          >
            {!avatar && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(40,0,60,0.18)',
                color: '#fff',
                fontSize: 28,
                fontWeight: 700,
                textShadow: '0 0 16px #f06acd, 0 0 32px #fff',
                borderRadius: 24,
                zIndex: 2,
                pointerEvents: 'none',
                transition: 'background 0.2s',
              }}>
                Click to upload avatar
              </div>
            )}
            {avatar && (
              <>
                <img
                  src={avatar}
                  alt="Avatar preview"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: 560,
                    height: 560,
                    objectFit: 'cover',
                    zIndex: 1,
                    borderRadius: 24,
                    pointerEvents: 'none',
                  }}
                />
                {caps.map(capInst => {
                  const capObj = CAPS.find(c => c.key === capInst.key);
                  if (!capObj?.src) return null;
                  const isActive = activeCapId === capInst.id;
                  const isHovered = hoveredCapBoxId === capInst.id;
                  const centerX = capInst.x + capInst.size / 2;
                  const centerY = capInst.y + capInst.size / 2;
                  return (
                    <React.Fragment key={capInst.id}>
                      <div
                        style={{
                          position: 'absolute',
                          left: centerX,
                          top: centerY,
                          width: capInst.size,
                          height: capInst.size,
                          transform: `rotate(${capInst.angle}deg) translate(-50%, -50%)`,
                          transformOrigin: 'center center',
                          zIndex: isActive ? 30 : 2,
                          pointerEvents: 'auto',
                        }}
                      >
                        {/* Сам элемент (картинка) */}
                        <img
                          src={capObj.src}
                          alt="Cap"
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: capInst.size,
                            height: 'auto',
                            cursor: isActive ? 'move' : 'pointer',
                            zIndex: 3,
                            pointerEvents: 'auto',
                            transform: `scaleX(${capInst.flipX ? -1 : 1})`,
                            transition: 'box-shadow 0.2s',
                            boxShadow: 'none',
                          }}
                          onMouseDown={e => {
                            setActiveCapId(capInst.id);
                            setActiveLogoId(null);
                            setDraggingCapId(capInst.id);
                            dragOffset.current = { x: e.clientX - capInst.x, y: e.clientY - capInst.y };
                            e.stopPropagation();
                          }}
                          draggable={false}
                        />
                      </div>
                    </React.Fragment>
                  );
                })}
                {logos.map(logoInst => {
                  const logoObj = LOGOS.find(l => l.key === logoInst.key);
                  if (!logoObj?.src) return null;
                  const isActive = activeLogoId === logoInst.id;
                  const isHovered = hoveredLogoBoxId === logoInst.id;
                  const centerX = logoInst.x + logoInst.size / 2;
                  const centerY = logoInst.y + logoInst.size / 2;
                  return (
                    <React.Fragment key={logoInst.id}>
                      <div
                        style={{
                          position: 'absolute',
                          left: centerX,
                          top: centerY,
                          width: logoInst.size,
                          height: logoInst.size,
                          transform: `rotate(${logoInst.angle}deg) translate(-50%, -50%)`,
                          transformOrigin: 'center center',
                          zIndex: isActive ? 30 : 2,
                          pointerEvents: 'auto',
                        }}
                      >
                        {/* Сам элемент (картинка) */}
                        <img
                          src={logoObj.src}
                          alt="Logo"
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: logoInst.size,
                            height: 'auto',
                            cursor: isActive ? 'move' : 'pointer',
                            zIndex: 3,
                            pointerEvents: 'auto',
                            transform: `scaleX(${logoInst.flipX ? -1 : 1})`,
                            transition: 'box-shadow 0.2s',
                            boxShadow: 'none',
                          }}
                          onMouseDown={e => {
                            setActiveLogoId(logoInst.id);
                            setActiveCapId(null);
                            setDraggingLogoId(logoInst.id);
                            dragOffset.current = { x: e.clientX - logoInst.x, y: e.clientY - logoInst.y };
                            e.stopPropagation();
                          }}
                          draggable={false}
                        />
                      </div>
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </div>
          <div style={{
            marginTop: 32,
            display: 'flex',
            gap: 32,
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            width: '100%'
          }}>
            {CAPS.filter(c => c.key !== 'none').map((c) => (
              <span
                key={c.key}
                style={{
                  display: 'inline-block',
                  border: cap === c.key ? '3px solid #f06acd' : '3px solid transparent',
                  borderRadius: 16,
                  background: cap === c.key ? '#fff2' : 'transparent',
                  padding: 4,
                  cursor: 'pointer',
                  boxShadow: cap === c.key ? '0 0 24px #f06acd, 0 0 32px #fff' : '0 0 0 transparent',
                  transition: 'box-shadow 0.2s, border 0.2s',
                  marginRight: 0,
                }}
                onClick={() => addCap(c.key as CapType)}
              >
                {c.src ? (
                  <img src={c.src} alt={c.label} style={{ width: 64, height: 64, objectFit: 'contain', opacity: cap === c.key ? 1 : 0.7, borderRadius: 12 }} />
                ) : null}
              </span>
            ))}
            {LOGOS.filter(l => l.key !== 'none').map((l, idx, arr) => (
              <span
                key={l.key}
                style={{
                  border: logo === l.key ? '3px solid #f06acd' : '3px solid transparent',
                  borderRadius: 16,
                  background: logo === l.key ? '#fff2' : 'transparent',
                  padding: 4,
                  cursor: 'pointer',
                  boxShadow: logo === l.key ? '0 0 24px #f06acd, 0 0 32px #fff' : '0 0 0 transparent',
                  transition: 'box-shadow 0.2s, border 0.2s',
                  marginRight: 0,
                  width: idx === arr.length - 1 ? 96 : 64,
                  height: idx === arr.length - 1 ? 96 : 64,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={() => addLogo(l.key as LogoType)}
              >
                {l.src ? (
                  <img src={l.src} alt={l.label} style={{ width: idx === arr.length - 1 ? 80 : 64, height: idx === arr.length - 1 ? 80 : 64, objectFit: 'contain', opacity: logo === l.key ? 1 : 0.7, borderRadius: 12 }} />
                ) : null}
              </span>
            ))}
          </div>
          <button
            className={styles.neonButton}
            style={{ marginTop: 40, fontSize: 22, padding: '18px 56px', width: 320, alignSelf: 'center' }}
            onClick={async () => {
              if (!avatar) return;
              const canvas = document.createElement('canvas');
              canvas.width = 560;
              canvas.height = 560;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;
              ctx.fillStyle = '#fff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              const baseImg = new window.Image();
              baseImg.src = avatar;
              await new Promise(res => { baseImg.onload = res; });
              ctx.drawImage(baseImg, 0, 0, 560, 560);
              if (cap !== 'none') {
                const capObj = CAPS.find(c => c.key === cap);
                if (capObj?.src) {
                  const capImg = new window.Image();
                  capImg.src = capObj.src;
                  await new Promise(res => { capImg.onload = res; });
                  ctx.save();
                  ctx.translate(capPos.x + capSize/2, capPos.y + capImg.height/2 * (capSize/capImg.width));
                  ctx.rotate(capAngle * Math.PI / 180);
                  ctx.drawImage(capImg, -capSize/2, -capImg.height/2 * (capSize/capImg.width), capSize, capImg.height * (capSize/capImg.width));
                  ctx.restore();
                }
              }
              if (logo !== 'none') {
                const logoObj = LOGOS.find(l => l.key === logo);
                if (logoObj?.src) {
                  const logoImg = new window.Image();
                  logoImg.src = logoObj.src;
                  await new Promise(res => { logoImg.onload = res; });
                  ctx.save();
                  ctx.translate(logoPos.x + logoSize/2, logoPos.y + logoImg.height/2 * (logoSize/logoImg.width));
                  ctx.rotate(logoAngle * Math.PI / 180);
                  ctx.drawImage(logoImg, -logoSize/2, -logoImg.height/2 * (logoSize/logoImg.width), logoSize, logoImg.height * (logoSize/logoImg.width));
                  ctx.restore();
                }
              }
              const url = canvas.toDataURL('image/png');
              // Скачивание
              const a = document.createElement('a');
              a.href = url;
              a.download = 'succinct_avatar.png';
              a.click();
              // Сохраняем в Supabase Storage и галерею
              const fileName = `avatar_${Date.now()}.png`;
              const res = await fetch(url);
              const arrayBuffer = await res.arrayBuffer();
              const pngFile = new File([arrayBuffer], fileName, { type: 'image/png' });
              const { data: storageData, error: storageError } = await supabase.storage.from('avatars').upload(fileName, pngFile, { upsert: true });
              if (!storageError) {
                const publicUrl = `https://exhskzlqczlrnoitfuij.supabase.co/storage/v1/object/public/avatars/${fileName}`;
                await supabase.from('gallery').insert({ url: publicUrl });
                setGallery(g => [publicUrl, ...g].slice(0, 30));
                setPendingUrl(publicUrl);
                setLastSavedUrl(publicUrl); // Для шаринга
              } else {
                alert('Ошибка загрузки: ' + storageError.message);
              }
            }}
            disabled={!avatar}
          >
            Download avatar
          </button>
          {lastSavedUrl && (
            <button
              className={styles.neonButton}
              style={{ marginTop: 24, fontSize: 20, padding: '12px 32px', width: 260, alignSelf: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}
              onClick={() => {
                const tweetText = encodeURIComponent('I upgraded my avatar Succinct-style at succinct-avatar-editor.com! Try it yourself 🚀');
                const tweetUrl = encodeURIComponent(lastSavedUrl);
                window.open(`https://twitter.com/intent/tweet?text=${tweetText}&url=${tweetUrl}`, '_blank');
              }}
            >
              <svg width="28" height="28" viewBox="0 0 1200 1227" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle' }}>
                <rect width="1200" height="1227" rx="240" fill="#fff"/>
                <path d="M299 1027L700 613.5L299 200H500.5L901 613.5L500.5 1027H299Z" fill="#19191A"/>
              </svg>
              Share to X
            </button>
          )}
        </div>
      </section>
      <section className={styles.gallerySection}>
        <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 32, margin: '48px 0 32px 0', textShadow: '0 0 12px #f06acd', textAlign: 'center' }}>Gallery</h3>
        {process.env.NODE_ENV === 'development' && (
          <button
            className={styles.neonButton}
            style={{ margin: '0 auto 24px auto', display: 'block', background: '#fff0', color: '#f06acd', border: '2px solid #f06acd', fontWeight: 700 }}
            onClick={handleFullClearGallery}
          >
            Полная очистка галереи (dev)
          </button>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'center', alignItems: 'flex-start', maxHeight: '80vh', overflowY: 'auto' }}>
          {gallery.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`gallery_${i}`}
              className={i === 0 && pendingUrl ? styles.galleryImgAnimated : ''}
              style={{ width: 180, height: 180, borderRadius: 20, boxShadow: '0 0 24px #f06acd', objectFit: 'cover', background: '#fff2', transition: 'box-shadow 0.2s, transform 0.2s, opacity 0.2s' }}
            />
          ))}
        </div>
      </section>
      {/* Панель инструментов над выбором элементов: */}
      {(activeCapId || activeLogoId) && (
        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: 120, // чуть выше панели выбора
          transform: 'translateX(-50%)',
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 4px 32px #f06acd22',
          padding: '18px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          zIndex: 100,
          minWidth: 220,
        }}>
          {/* Предпросмотр элемента */}
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            overflow: 'hidden',
            background: '#f6e6fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 18,
          }}>
            <img
              src={
                activeCapId
                  ? CAPS.find(c => c.key === caps.find(c => c.id === activeCapId)?.key)?.src || ''
                  : activeLogoId
                  ? LOGOS.find(l => l.key === logos.find(l => l.id === activeLogoId)?.key)?.src || ''
                  : ''
              }
              alt="preview"
              style={{ width: 56, height: 56, objectFit: 'contain' }}
            />
          </div>
          {/* Кнопки инструментов */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Поворот */}
            <div style={toolBtnStyle} onClick={handleRotate}>⟳</div>
            {/* Отзеркалить */}
            <div style={toolBtnStyle} onClick={handleFlip}>⇄</div>
            {/* Удалить */}
            <div style={toolBtnStyle} onClick={handleDelete}>✕</div>
            {/* Слайдер размера */}
            <input
              type="range"
              min={32}
              max={320}
              value={activeElementSize}
              onChange={handleResize}
              style={{ marginLeft: 24, width: 120 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
