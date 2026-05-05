// src/hooks/useWebGLLut.ts
import { useRef, useEffect } from 'react';
import { buildProgram } from '../utils/buildProgram';

export function useWebGLLut() {
  const glCanvasRef = useRef<OffscreenCanvas | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);

  // Initialize WebGL program on mount
  useEffect(() => {
    const offscreen = new OffscreenCanvas(1, 1);
    const gl = offscreen.getContext('webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    const ext = gl.getExtension('RENDERER');
    console.log(
      'WebGL renderer:',
      gl.getParameter(ext?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER),
    );

    glCanvasRef.current = offscreen;
    glRef.current = gl;
    programRef.current = buildProgram(gl);
  }, []);

  // Render an image through the shader pipeline
  const renderImage = async (
    img: HTMLImageElement,
    mode: 0 | 1,
  ): Promise<ImageBitmap | null> => {
    const gl = glRef.current;
    const offscreen = glCanvasRef.current;
    const program = programRef.current;
    if (!gl || !offscreen || !program) return null;

    offscreen.width = img.width;
    offscreen.height = img.height;
    gl.viewport(0, 0, img.width, img.height);
    gl.useProgram(program);

    // upload the image as a texture
    const imgTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, imgTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0);
    gl.uniform1f(gl.getUniformLocation(program, 'u_mode'), mode);

    // draw a full screen quad
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    return createImageBitmap(offscreen);
  };

  const applyPassthrough = (img: HTMLImageElement) => renderImage(img, 0);
  const applyLogPreview = (img: HTMLImageElement) => renderImage(img, 1); 

  return { applyPassthrough, applyLogPreview };
}
