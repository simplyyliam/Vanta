import React, { useCallback, useRef, useState } from "react"


type ImageEditorProps = {
    onImageLoad: (img: HTMLImageElement) => void
}

export default function ImageEditor({onImageLoad}: ImageEditorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const imgRef = useRef<HTMLImageElement | null>(null)
    const posRef = useRef({ x: 0, y: 0 })
    const dragState = useRef({dragging: false, startX: 0, startY: 0})
    
    const [isDragging, setIsDragging] = useState(false)
    const [cursor, setCursor] = useState<'grab' | 'grabbing'>('grab')
    
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

        const redraw = () => {
        const canvas = canvasRef.current
        const img = imgRef.current
        if(!canvas || !img) return

        const ctx = canvas.getContext('2d')
        if(!ctx) return 

        const scale = Math.min(
            canvas.width / img.width,
            canvas.height / img.height
        ) * 0.75

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(
            img,
            posRef.current.x,
            posRef.current.y,
            img.width * scale,
            img.height * scale,
        )
        
    }

    const handleFile = useCallback((file: File) => {
        const canvas = canvasRef.current
        if(!canvas) return

        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
            canvas.width = canvas.offsetWidth
            canvas.height = canvas.offsetHeight
            const ctx = canvas.getContext('2d')
            if(!ctx) return

            const scale = Math.min(
                canvas.width / img.width,
                canvas.height / img.height
            ) * 0.5

            posRef.current = {
                x: (canvas.width - img.width * scale) / 2,
                y: (canvas.height - img.height * scale) / 2
            }
            imgRef.current = img

            redraw()

            // ctx?.clearRect(0, 0, canvas.width, canvas.height)
            // ctx?.drawImage(img, x, y, img.width * scale, img.height * scale)
            onImageLoad(img)
            URL.revokeObjectURL(url)
            
        }
        img.src = url
    }, [onImageLoad])





    const handleMouseDown = (e: React.MouseEvent) => {
        dragState.current = {
            dragging: true,
            startX: e.clientX - posRef.current.x,
            startY: e.clientY - posRef.current.y
        }
        setCursor('grabbing')
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if(!dragState.current.dragging) return
        posRef.current = {
            x: e.clientX - dragState.current.startX,
            y: e.clientY - dragState.current.startY
        }

        redraw()
    }

    const handleMouseUp = () => {
        dragState.current.dragging = false
        setCursor('grab')
    }
    
    
    
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const file = e.dataTransfer.files[0]
        if(file?.type.startsWith('image/')) handleFile(file)
    }
    
    return (
        <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}

        className="w-screen h-screen relative">
            <canvas 
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            ref={canvasRef} 
            className={` block w-full h-full `}
                style={{
                    cursor: cursor,
                    outline: isDragging ? "2px solid #8B7FF5" : "none",
                    outlineOffset: "-2px",
                    transition: "outline 0.15s ease"
                }}
                />
        </div>
    )
}