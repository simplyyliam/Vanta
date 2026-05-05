// This runs for EVERY pixel simultaneously on the GPU
precision mediump float;

uniform sampler2D u_image;    // your photo
uniform sampler2D u_lut;      // the LUT as a texture
uniform vec2 u_resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.y = 1.0 - uv.y; // flip Y (WebGL is upside down vs Canvas)

  vec4 color = texture2D(u_image, uv);

  // Map the color through the LUT
  // LUT is a 512x512 texture representing a 3D 64³ color cube
  float lutSize = 33.0;
  float r = color.r * (lutSize - 1.0) / lutSize;
  float g = color.g * (lutSize - 1.0) / lutSize;
  float b = color.b * (lutSize - 1.0) / lutSize;

  float sliceSize = 1.0 / lutSize;
  float sliceRow = floor(b * lutSize);
  vec2 lutUV = vec2(
    (r + mod(sliceRow, 8.0)) / 8.0,
    (g + floor(sliceRow / 8.0)) / 8.0
  );

  gl_FragColor = texture2D(u_lut, lutUV);
}