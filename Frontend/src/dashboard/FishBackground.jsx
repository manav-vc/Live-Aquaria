import React, { useEffect, useRef, useState, Suspense, useContext } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, useTexture } from "@react-three/drei";
import { ClownFishModel } from "../components/ClownFishComponent";
import { TroutFishModel } from "../components/TroutFishComponent";
import { CarpFishModel } from "../components/CarpFishComponent";
import { RepeatWrapping } from "three";
import * as THREE from "three";
import Corals from "../components/Corals";
import ClickableFish from "./ClickableFish";
import styles from './FishBackground.module.css';
import { UserContext } from '../UserContext';


// Subtle bubbles with sleek movement and dissipation (increased number)
function Bubbles() {
  const bubbleRef = useRef();
  const bubbles = Array.from({ length: 100 }, () => ({
    x: Math.random() * 10 - 5,
    y: -5,
    z: Math.random() * 10 - 5,
    size: Math.random() * 0.1 + 0.05,
    speed: Math.random() * 0.01 + 0.005,
  }));

  useFrame(() => {
    bubbles.forEach((bubble) => {
      bubble.y += bubble.speed;
      if (bubble.y > 5) bubble.y = -5;
    });
    bubbleRef.current.children.forEach((bubble, i) => {
      bubble.position.y = bubbles[i].y;
      bubble.scale.setScalar(Math.max(0.1, 1 - (bubble.position.y + 5) / 10));
    });
  });

  return (
    <group ref={bubbleRef}>
      {bubbles.map((bubble, i) => (
        <Sphere key={i} args={[bubble.size, 16, 16]} position={[bubble.x, bubble.y, bubble.z]}>
          <meshStandardMaterial color="lightblue" opacity={0.5} transparent />
        </Sphere>
      ))}
    </group>
  );
}

// Stronger light rays with a volumetric effect
function LightRays() {
  return (
    <spotLight
      position={[0, 70, 0]}  // Raised the light source higher for more spread
      angle={Math.PI / 3}  // Wider angle to illuminate the entire tank
      penumbra={1}  // Increase the softness of edges
      intensity={500}  // Increased intensity to make it more impactful
      distance={200}  // Light reaches further into the scene
      decay={2}  // Natural light decay
      castShadow
    />
  );
}


const fishModelMatcher = (fishName) => {
  const name = fishName.toLowerCase().replace(/[-\s]/g, '');
  
  if (name.includes('clown') || name.includes('anemone')) {
    return ClownFishModel;
  }
  
  if (name.includes('trout') || name.includes('salmon') || name.includes('char')) {
    return TroutFishModel;
  }

  if (name.includes('carp')) {
    return CarpFishModel;
  }
  
  
  // If no specific match, return a random model
  const models = [ClownFishModel, TroutFishModel, CarpFishModel]; // Add more models to this array as you create them
  return models[Math.floor(Math.random() * models.length)];
};

function OceanFloor() {
  // Load sand texture
  const texture = useTexture("./sand.jpg");

  // Ensure texture properties are set before use
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true; // Ensure changes take effect
  texture.repeat.set(5, 5); // Repeat the texture

  const oceanFloorRef = useRef();

  // Adjust opacity of the ocean floor based on camera distance
  useFrame(({ camera }) => {
    if (oceanFloorRef.current) {
      const distance = camera.position.length();
      oceanFloorRef.current.material.opacity = Math.max(0.1, 1 - (distance - 50) / 50);
    }
  });

  return (
    <mesh
      ref={oceanFloorRef}
      rotation={[-Math.PI / 2, 0, 0]} // Rotate to lay flat
      position={[0, -10, 0]} // Slightly below ground level
      receiveShadow
    >
      <planeGeometry args={[35, 30]} /> {/* Larger plane */}
      <meshStandardMaterial
        map={texture}
        metalness={0.2}
        roughness={0.9}
        color={new THREE.Color(0xffffff)} // Optional tint
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
// Ocean skybox wrapping the scene with one ocean texture
function OceanSkybox() {
  const oceanTexture = useTexture('./ocean.jpg'); // Load the ocean texture

  return (
    <mesh>
      <sphereGeometry args={[200, 32, 32]} />
      <meshBasicMaterial map={oceanTexture} side={THREE.BackSide} />
    </mesh>
  );
}

export default function FishBackground({ refreshSignal = 0 }) {
  const [fishCatches, setFishCatches] = useState([]);
  const { user } = useContext(UserContext);

  useEffect(() => {
    const fetchFishCatches = async () => {
      if (!user) return;
      try {
        const response = await fetch(`${import.meta.env.VITE_REACT_APP_API_URL}/get-all-fish-catches?username=${user.username}`);
        if (!response.ok) throw new Error('Failed to fetch fish catches');
        const data = await response.json();
        setFishCatches(data);
      } catch (error) {
        console.error('Error fetching fish catches:', error);
      }
    };

    fetchFishCatches();
  }, [user, refreshSignal]);


  return (
    <div className={styles.main}>
      <Canvas camera={{ position: [-4, 6, 15], fov: 50 }}>
        <OrbitControls
          autoRotate
          autoRotateSpeed={0.8}
          maxDistance={100}
          minDistance={23}
          maxPolarAngle={(4 * Math.PI) / 5}
          minPolarAngle={Math.PI / 5}
        />

        <LightRays />
        <OceanFloor />
        <Bubbles />
        <OceanSkybox />

        <ambientLight intensity={1.3} />
        <directionalLight intensity={1.5} position={[5, 15, 10]} castShadow />

        <Suspense fallback={null}>
          {fishCatches.map((fish, index) => (
            <ClickableFish
              key={fish._id}
              fish={fish}
              index={index}
              ModelComponent={fishModelMatcher(fish.fishName)}
            />
          ))}
          <Corals dimensions={[35, 19.8, 30]} num={100} />
        </Suspense>
      </Canvas>
    </div>
  );
}
