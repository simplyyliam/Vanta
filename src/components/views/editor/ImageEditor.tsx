import React, { useCallback, useEffect, useRef, useState } from 'react';

type ImageEditorProps = {
  onImageLoad: (img: HTMLImageElement) => void;
};

export default function ImageEditor({ onImageLoad }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const isResizing = useRef(false);
  const activeCornerRef = useRef<string | null>(null);
  const startRef = useRef({
    mouseX: 0,
    mouseY: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
  });

  const dragState = useRef({ dragging: false, startX: 0, startY: 0 });
  const EDGE_THRESHOLD = 20;
  // const TARGET = { x: -50, y: 200 };
  // const TOLERANCE = 5;

  const [isDragging, setIsDragging] = useState(false);
  const [cursor, setCursor] = useState<'grab' | 'grabbing'>('grab');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  // const [isTarget, setIsTarget] = useState(false);
  const [quadrant, setQuadrant] = useState('quadrants');
  const [size, setSize] = useState({ width: 0, height: 0 });

  const redraw = (overrideSize?: {width: number, height: number}) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale =
      Math.min(canvas.width / img.width, canvas.height / img.height) * 0.75;
    const override = overrideSize || size
    const drawWidth = override.width || img.width * scale
    const drawHeight = override.height || img.height * scale

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      img,
      posRef.current.x,
      posRef.current.y,
      drawWidth,
      drawHeight,
    );
  };

  // ————————— Image File Conversion —————————

  const handleImage = useCallback(
    (file: File) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const scale =
          Math.min(canvas.width / img.width, canvas.height / img.height) * 0.5;

        posRef.current = {
          x: (canvas.width - img.width * scale) / 2,
          y: (canvas.height - img.height * scale) / 2,
        };
        imgRef.current = img;

        redraw();

        onImageLoad(img);
        URL.revokeObjectURL(url);
      };
      img.src = url;
      console.log('LOADED IMAGE:', img);
    },
    [onImageLoad],
  );

  // ————————— Drag Events —————————

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleImage(file);
    console.log('FILE:', e.dataTransfer.files[0]);
  };

  // ————————— Mouse Events —————————

  const handleMouseDown = (e: React.MouseEvent) => {
    const img = imgRef.current;
    if (!img) return;

    const isNearEdge = [
      'top-left',
      'top-right',
      'bottom-left',
      'bottom-right',
    ].includes(quadrant);

    if (isNearEdge) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const scale =
        Math.min(canvas.width / img.width, canvas.height / img.height) * 0.75;
      startRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        width: size.width || img.width * scale,
        height: size.height || img.height * scale,
        x: posRef.current.x,
        y: posRef.current.y,
      };
      isResizing.current = true;
      activeCornerRef.current = quadrant;
      dragState.current.dragging = false;
    } else {
      dragState.current = {
        dragging: true,
        startX: e.clientX - posRef.current.x,
        startY: e.clientY - posRef.current.y,
      };
      isResizing.current = false
      activeCornerRef.current = null
    }

    setCursor('grabbing');
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if(isResizing.current) return
    if (!dragState.current.dragging) return;
    posRef.current = {
      x: e.clientX - dragState.current.startX,
      y: e.clientY - dragState.current.startY,
    };

    redraw();
  };

  const handleMouseUp = () => {
    dragState.current.dragging = false;
    isResizing.current = false;
    setCursor('grab');
  };

  // ————————— Image Mouse Position & Edge Awareness —————————

useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return

  const handleMouseMove = (e: MouseEvent) => {
    const img = imgRef.current
    if (!img) return
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.75
    const imgWidth = size.width || img.width * scale
    const imgHeight = size.height || img.height * scale
    const cx = posRef.current.x + imgWidth / 2
    const cy = posRef.current.y + imgHeight / 2
    const x = Math.round(mouseX - cx)
    const y = Math.round(mouseY - cy)
    setMousePos({ x, y })

    // ——— Edge detection — always runs ———
    const nearLeft = Math.abs(x - (-imgWidth / 2)) < EDGE_THRESHOLD
    const nearRight = Math.abs(x - (imgWidth / 2)) < EDGE_THRESHOLD
    const nearTop = Math.abs(y - (-imgHeight / 2)) < EDGE_THRESHOLD
    const nearBottom = Math.abs(y - (imgHeight / 2)) < EDGE_THRESHOLD
    let quad = ''
    if (nearTop && nearLeft) quad = 'top-left'
    else if (nearTop && nearRight) quad = 'top-right'
    else if (nearBottom && nearLeft) quad = 'bottom-left'
    else if (nearBottom && nearRight) quad = 'bottom-right'
    setQuadrant(quad || 'none')

    // ——— Resize logic — only when resizing ———
    if (!isResizing.current) return
    const dx = e.clientX - startRef.current.mouseX
    const dy = e.clientY - startRef.current.mouseY
    let width = startRef.current.width
    let height = startRef.current.height
    let rx = startRef.current.x
    let ry = startRef.current.y

    switch (activeCornerRef.current) {
      case 'bottom-right': width += dx; height += dy; break
      case 'top-right':    width += dx; height -= dy; ry += dy; break
      case 'bottom-left':  width -= dx; height += dy; rx += dx; break
      case 'top-left':     width -= dx; height -= dy; rx += dx; ry += dy; break
    }

    const newSize = {
      width: Math.max(120, width),
      height: Math.max(120, height),
    };
    posRef.current = { x: rx, y: ry }
    setSize(newSize)
    redraw(newSize)
  }

  window.addEventListener('mousemove', handleMouseMove)
  return () => window.removeEventListener('mousemove', handleMouseMove)
}, [size])


  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="w-screen h-screen relative"
    >
      <canvas
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        ref={canvasRef}
        className={` block w-full h-full `}
        style={{
          cursor: cursor,
          outline: isDragging ? '2px solid #8B7FF5' : 'none',
          outlineOffset: '-2px',
          transition: 'outline 0.15s ease',
        }}
      />
      <div
        className="flex items-center justify-center gap-5 absolute z-10"
        style={{
          left: '50%',
          bottom: 40,
          transform: 'translateX(-50%)',
        }}
      >
        <span
          className={`flex flex-col gap-2.5  text-black bg-neutral-200/25 border border-white/20 backdrop-blur-md rounded-full py-2.5 px-3.5 w-fit transition-all`}
        >
          {mousePos.x} : {mousePos.y}
        </span>
        <span
          className={`flex text-black bg-neutral-200/25 border border-white/20 backdrop-blur-md rounded-full py-2.5 px-3.5 w-fit transition-all`}
        >
          {quadrant}
        </span>
      </div>
    </div>
  );
}
