import React, { useCallback, useEffect, useRef, useState } from 'react';

type ImageEditorProps = {
  onImageLoad: (img: HTMLImageElement) => void;
};

export default function ImageEditor({ onImageLoad }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<
    {
      img: HTMLImageElement;
      pos: { x: number; y: number };
      size: { width: number; height: number };
    }[]
  >([]);
  const isResizing = useRef(false);
  const activeCornerRef = useRef<string | null>(null);
  const selectedRef = useRef<number | null>(null);
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

  const [isDragging, setIsDragging] = useState(false);
  const [cursor, setCursor] = useState<'grab' | 'grabbing'>('grab');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [quadrant, setQuadrant] = useState('quadrants');

  const drawCornerHandles = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    activeQuadrant: string,
  ) => {
    const len = 14; // length of each arm
    const offset = 0; // distance from image corner

    const corners: Record<
      string,
      { cx: number; cy: number; dx: number; dy: number }
    > = {
      'top-left': { cx: x - offset, cy: y - offset, dx: 1, dy: 1 },
      'top-right': { cx: x + w + offset, cy: y - offset, dx: -1, dy: 1 },
      'bottom-left': { cx: x - offset, cy: y + h + offset, dx: 1, dy: -1 },
      'bottom-right': {
        cx: x + w + offset,
        cy: y + h + offset,
        dx: -1,
        dy: -1,
      },
    };

    const corner = corners[activeQuadrant];
    if (!corner) return;

    const { cx, cy, dx, dy } = corner;

    ctx.strokeStyle = '#0C0C0C';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(cx + dx * len, cy); // horizontal arm end
    ctx.lineTo(cx, cy); // corner point
    ctx.lineTo(cx, cy + dy * len); // vertical arm end
    ctx.stroke();
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    imgRef.current.forEach((entry, i) => {
      const { img, pos, size } = entry;
      ctx.drawImage(img, pos.x, pos.y, size.width, size.height);

      if (i === selectedRef.current) {
        drawCornerHandles(ctx, pos.x, pos.y, size.width, size.height, quadrant);
      }
    });
  };

  // ————————— Image File Conversion —————————

  const handleImage = useCallback(
    (file: File) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = canvas.offsetHeight * dpr;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.scale(dpr, dpr);

        const logicalWidth = canvas.offsetWidth;
        const logicalHeight = canvas.offsetHeight;

        const scale =
          Math.min(logicalWidth / img.width, logicalHeight / img.height) * 0.5;

        const offset = imgRef.current.length * 20;

        imgRef.current.push({
          img,
          pos: {
            x: (logicalWidth / dpr - img.width * scale) / 2 + offset,
            y: (logicalHeight / dpr - img.height * scale) / 2 + offset,
          },
          size: {
            width: img.width * scale,
            height: img.height * scale,
          },
        });
        selectedRef.current = imgRef.current.length - 1; // selecting the newest image in the list
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // ——— Find clicked image ———
    const hit = [...imgRef.current]
      .reverse()
      .findIndex(
        ({ pos, size }) =>
          mx >= pos.x &&
          mx <= pos.x + size.width &&
          my >= pos.y &&
          my <= pos.y + size.height,
      );

    if (hit !== -1) {
      selectedRef.current = imgRef.current.length - 1 - hit;
    }

    const selected = imgRef.current[selectedRef.current!];
    if (!selected) return;

    // ——— Recalculate quadrant fresh from the selected image ———
    
    const { pos, size } = selected;
    const cx = pos.x + size.width / 2;
    const cy = pos.y + size.height / 2;
    const x = mx - cx;
    const y = my - cy;

    const nearLeft = Math.abs(x - -size.width / 2) < EDGE_THRESHOLD;
    const nearRight = Math.abs(x - size.width / 2) < EDGE_THRESHOLD;
    const nearTop = Math.abs(y - -size.height / 2) < EDGE_THRESHOLD;
    const nearBottom = Math.abs(y - size.height / 2) < EDGE_THRESHOLD;

    let freshQuadrant = '';
    if (nearTop && nearLeft) freshQuadrant = 'top-left';
    else if (nearTop && nearRight) freshQuadrant = 'top-right';
    else if (nearBottom && nearLeft) freshQuadrant = 'bottom-left';
    else if (nearBottom && nearRight) freshQuadrant = 'bottom-right';

    const isNearEdge = freshQuadrant !== '';

    if (isNearEdge) {
      // ——— Resize mode ———
      startRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        width: selected.size.width,
        height: selected.size.height,
        x: selected.pos.x,
        y: selected.pos.y,
      };
      isResizing.current = true;
      activeCornerRef.current = freshQuadrant;
      dragState.current.dragging = false;
    } else {
      // ——— Drag mode ———
      dragState.current = {
        dragging: true,
        startX: e.clientX - selected.pos.x,
        startY: e.clientY - selected.pos.y,
      };
      isResizing.current = false;
      activeCornerRef.current = null;
    }

    redraw()
    setCursor('grabbing');
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isResizing.current) return;
    if (!dragState.current.dragging) return;
    const selected = imgRef.current[selectedRef.current!];
    if (!selected) return;

    selected.pos = {
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // ——— Get selected image ———
      const selected = imgRef.current[selectedRef.current!];
      if (!selected) return;

      const { pos, size } = selected;
      const imgWidth = size.width;
      const imgHeight = size.height;
      const cx = pos.x + imgWidth / 2;
      const cy = pos.y + imgHeight / 2;
      const x = Math.round(mouseX - cx);
      const y = Math.round(mouseY - cy);
      setMousePos({ x, y });

      // ——— Edge detection — always runs ———
      const nearLeft = Math.abs(x - -imgWidth / 2) < EDGE_THRESHOLD;
      const nearRight = Math.abs(x - imgWidth / 2) < EDGE_THRESHOLD;
      const nearTop = Math.abs(y - -imgHeight / 2) < EDGE_THRESHOLD;
      const nearBottom = Math.abs(y - imgHeight / 2) < EDGE_THRESHOLD;

      let quad = '';
      if (nearTop && nearLeft) quad = 'top-left';
      else if (nearTop && nearRight) quad = 'top-right';
      else if (nearBottom && nearLeft) quad = 'bottom-left';
      else if (nearBottom && nearRight) quad = 'bottom-right';
      setQuadrant(quad || 'none');

      // ——— Resize logic — only when resizing ———
      if (!isResizing.current) return;

      const dx = e.clientX - startRef.current.mouseX;
      const dy = e.clientY - startRef.current.mouseY;
      let width = startRef.current.width;
      let height = startRef.current.height;
      let rx = startRef.current.x;
      let ry = startRef.current.y;

      switch (activeCornerRef.current) {
        case 'bottom-right':
          width += dx;
          height += dy;
          break;
        case 'top-right':
          width += dx;
          height -= dy;
          ry += dy;
          break;
        case 'bottom-left':
          width -= dx;
          height += dy;
          rx += dx;
          break;
        case 'top-left':
          width -= dx;
          height -= dy;
          rx += dx;
          ry += dy;
          break;
      }

      // ——— Write back into selected entry ———
      selected.size = {
        width: Math.max(120, width),
        height: Math.max(120, height),
      };
      selected.pos = { x: rx, y: ry };

      redraw();
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    redraw();
  }, [quadrant]);

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
