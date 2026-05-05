export function buildProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vert = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0, 1);
    }
  `;

  const frag = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_mode; // 0 = passthrough, 1 = log preview
  varying vec2 v_uv;

  vec3 srgbToLinear(vec3 c) {
    vec3 cutoff = step(vec3(0.04045), c);
    vec3 low = c / 12.92;
    vec3 high = pow((c + 0.055) / 1.055, vec3(2.4));
    return mix(low, high, cutoff);
  }

  vec3 linearToLogStyle(vec3 linear) {
    vec3 x = max(linear, vec3(0.0));
    vec3 logish = log2(vec3(1.0) + x * 8.0) / log2(vec3(9.0));
    return 0.5 + (logish - 0.5) * 0.72;
  }

  void main() {
    vec4 color = texture2D(u_image, vec2(v_uv.x, 1.0 - v_uv.y));
    if (u_mode < 0.5) {
      gl_FragColor = color;
      return;
    }

    vec3 linear = srgbToLinear(clamp(color.rgb, 0.0, 1.0));
    vec3 logPreview = linearToLogStyle(linear);
    gl_FragColor = vec4(clamp(logPreview, 0.0, 1.0), color.a);
  }
`;

  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vs, vert);
  gl.compileShader(vs);

  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fs, frag);
  gl.compileShader(fs);

  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  return program;
}
