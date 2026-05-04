import React, { useCallback, useEffect, useRef, useState } from 'react';

type ImageEditorProps = {
  onImageLoad: (img: HTMLImageElement) => void;
};

export default function ImageEditor({ onImageLoad }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const dragState = useRef({ dragging: false, startX: 0, startY: 0 });
  const EDGE_THRESHOLD = 20;
  // const TARGET = { x: -50, y: 200 };
  // const TOLERANCE = 5;

  const [isDragging, setIsDragging] = useState(false);
  const [cursor, setCursor] = useState<'grab' | 'grabbing'>('grab');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  // const [isTarget, setIsTarget] = useState(false);
  const [quadrant, setQuadrant] = useState('quadrants');
  // ————————— Drag Events —————————

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // ————————— Image File Conversion —————————

  const redraw = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale =
      Math.min(canvas.width / img.width, canvas.height / img.height) * 0.75;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      img,
      posRef.current.x,
      posRef.current.y,
      img.width * scale,
      img.height * scale,
    );
  };

  const handleFile = useCallback(
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  };

  // ————————— Mouse Events —————————

  const handleMouseDown = (e: React.MouseEvent) => {
    dragState.current = {
      dragging: true,
      startX: e.clientX - posRef.current.x,
      startY: e.clientY - posRef.current.y,
    };
    setCursor('grabbing');
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current.dragging) return;
    posRef.current = {
      x: e.clientX - dragState.current.startX,
      y: e.clientY - dragState.current.startY,
    };

    redraw();
  };

  const handleMouseUp = () => {
    dragState.current.dragging = false;
    setCursor('grab');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const img = imgRef.current;
      if (!img) return;

      const rect = canvas.getBoundingClientRect();

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scale =
        Math.min(canvas.width / img.width, canvas.height / img.height) * 0.75;

      const imgX = posRef.current.x;
      const imgY = posRef.current.y;

      const imgWidth = img.width * scale;
      const imgHeight = img.height * scale;

      const cx = imgX + imgWidth / 2;
      const cy = imgY + imgHeight / 2;

      const x = Math.round(mouseX - cx);
      const y = Math.round(mouseY - cy);

      const leftEdge = -imgWidth / 2;
      const rightEdge = imgWidth / 2;
      const topEdge = -imgHeight / 2;
      const bottomEdge = imgHeight / 2;

      const nearLeft = Math.abs(x - leftEdge) < EDGE_THRESHOLD;
      const nearRight = Math.abs(x - rightEdge) < EDGE_THRESHOLD;
      const nearTop = Math.abs(y - topEdge) < EDGE_THRESHOLD;
      const nearBottom = Math.abs(y - bottomEdge) < EDGE_THRESHOLD;

      let quad = '';

      if (nearTop && nearLeft) quad = 'top-left';
      else if (nearTop && nearRight) quad = 'top-right';
      else if (nearBottom && nearLeft) quad = 'bottom-left';
      else if (nearBottom && nearRight) quad = 'bottom-right';

      setQuadrant(quad);
      setMousePos({ x, y });

      // if (Math.abs(x - TARGET.x) < TOLERANCE && Math.abs(y - TARGET.y) < TOLERANCE) {
      //   console.log('Mouse is on target area');
      // }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

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
