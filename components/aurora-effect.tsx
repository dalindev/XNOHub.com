import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
varying vec3 vPosition;
void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
varying vec2 vUv;
varying vec3 vPosition;

mat2 mm2(in float a) {
    float c = cos(a), s = sin(a);
    return mat2(c,s,-s,c);
}

float tri(in float x) {
    return clamp(abs(fract(x)-.5), 0.01, 0.49);
}

vec2 tri2(in vec2 p) {
    return vec2(tri(p.x) + tri(p.y), tri(p.y + tri(p.x)));
}

float random(vec2 p) {
    vec3 p3  = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float fbmAurora(vec2 p, float spd) {
    float z = 1.8;
    float z2 = 2.5;
    float rz = 0.;
    p *= mm2(p.x * 0.06);
    vec2 bp = p;
    
    for (float i = 0.; i < 5.; i++ ) {
        vec2 dg = tri2(bp*1.85)*.75;
        dg *= mm2(uTime * spd);
        p -= dg/z2;

        bp *= 1.3;
        z2 *= .45;
        z *= .42;
        p *= 1.21 + (rz-1.0)*.02;
        
        rz += tri(p.x+tri(p.y))*z;
        p*= sin(uTime * 0.05) * cos(uTime * 0.01);
    }
    return clamp(1. / pow(rz * 20., 1.3), 0., 1.);
}

vec4 aurora(vec3 rd) {
    vec4 col = vec4(0);
    vec4 avgCol = vec4(0);    

    for (float i=0.; i < 30.; i++) {
        float of = 0.006*random(vUv * i)*smoothstep(0.,15., i);
        float pt = ((.8+pow(i,1.4)*.002)) / (rd.y * 2. + 0.4);
        pt -= of;
        vec3 bpos = 5.5 + pt * rd;
        vec2 p = bpos.xz;
        float rzt = fbmAurora(p, 0.06);
        vec4 col2 = vec4(0,0,0, rzt);
        col2.rgb = (sin(1.-vec3(2.15,-.5, 1.2) + i * 0.043) * 0.5 + 0.5)*rzt;
        avgCol = mix(avgCol, col2, .5);
        col += avgCol * exp2(-i*0.065 - 2.5) * smoothstep(0., 5., i);
    }
    
    col *= (clamp(rd.y*15.+.4,0.,1.));
    return smoothstep(0.,1.1,pow(col,vec4(1.))*1.5);
}

void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    vec3 rd = normalize(vec3(uv, 1.0));
    
    vec4 auroraColor = aurora(rd);
    
    // Enhance the green and blue components for more vibrant aurora
    auroraColor.rgb *= vec3(0.8, 1.2, 1.0);
    
    // Add some color variation
    float t = uTime * 0.2;
    vec3 color1 = vec3(0.1, 0.8, 0.4);
    vec3 color2 = vec3(0.1, 0.4, 0.8);
    vec3 mixedColor = mix(color1, color2, sin(t) * 0.5 + 0.5);
    
    auroraColor.rgb *= mixedColor;
    
    // Calculate curved shape
    float distFromCenter = length(vUv - vec2(0.5, 0.5));
    float xDist = abs(vUv.x - 0.5);
    
    // Create arch-like curve
    float archCurve = pow(4.0 * xDist * (1.0 - xDist), 0.5);
    float heightOffset = mix(0.3, 0.7, archCurve);
    
    // Vertical fade with curved shape
    float verticalFade = smoothstep(heightOffset - 0.1, heightOffset + 0.2, vUv.y);
    verticalFade *= smoothstep(1.0, 0.7, vUv.y);
    
    // Horizontal fade
    float horizontalFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
    
    // Combine fades
    float finalOpacity = verticalFade * horizontalFade * 0.5;
    finalOpacity *= smoothstep(0.8, 0.4, distFromCenter); // Fade out at edges
    
    gl_FragColor = vec4(auroraColor.rgb, auroraColor.a * finalOpacity);
}
`;

export function AuroraEffect() {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 }
    }),
    []
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }

    // Add smooth rotation to the group
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05; // Adjust speed by changing multiplier
    }
  });

  return (
    <group ref={groupRef} position={[0, 1.1, 0.7]} rotation={[Math.PI, 0, 0]}>
      <mesh ref={meshRef} rotation={[0, 0, 0]}>
        <planeGeometry args={[1.2, 0.7, 128, 128]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent={true}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Multiple planes for volumetric effect */}
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.2, 0.7, 128, 128]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent={true}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[0, Math.PI / 4, 0]}>
        <planeGeometry args={[1.2, 0.7, 128, 128]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent={true}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[0, -Math.PI / 4, 0]}>
        <planeGeometry args={[1.2, 0.7, 128, 128]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent={true}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
