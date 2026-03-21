export interface RobotComponent {
  id: string;
  name: string;
  category: 'chassis' | 'motor' | 'sensor' | 'controller' | 'power' | 'wheel' | 'accessory';
  price: number;
  specs: string;
  imageUrl: string;
  modelPath?: string; // 3D model path
  dimensions: { width: number; height: number; depth: number };
}

export const ROBOT_COMPONENTS: RobotComponent[] = [
  // Chassis
  {
    id: 'chassis-1',
    name: 'Acrylic Chassis 2WD',
    category: 'chassis',
    price: 250,
    specs: '20cm x 15cm x 5cm',
    imageUrl: '/robots/chassis-2wd.png',
    dimensions: { width: 20, height: 5, depth: 15 },
  },
  {
    id: 'chassis-2',
    name: 'Acrylic Chassis 4WD',
    category: 'chassis',
    price: 450,
    specs: '25cm x 20cm x 6cm',
    imageUrl: '/robots/chassis-4wd.png',
    dimensions: { width: 25, height: 6, depth: 20 },
  },

  // Motors
  {
    id: 'motor-1',
    name: 'DC Motor 12V 100RPM',
    category: 'motor',
    price: 120,
    specs: '12V, 100RPM, 1.2A',
    imageUrl: '/robots/motor-dc.png',
    dimensions: { width: 3, height: 5, depth: 3 },
  },
  {
    id: 'motor-2',
    name: 'Servo Motor SG90',
    category: 'motor',
    price: 80,
    specs: '5V, 180° rotation',
    imageUrl: '/robots/servo-sg90.png',
    dimensions: { width: 2, height: 3, depth: 2 },
  },
  {
    id: 'motor-3',
    name: 'Stepper Motor NEMA 17',
    category: 'motor',
    price: 350,
    specs: '12V, 1.8° step angle',
    imageUrl: '/robots/stepper.png',
    dimensions: { width: 4, height: 4, depth: 4 },
  },

  // Sensors
  {
    id: 'sensor-1',
    name: 'Ultrasonic Sensor HC-SR04',
    category: 'sensor',
    price: 60,
    specs: '2cm-400cm range',
    imageUrl: '/robots/ultrasonic.png',
    dimensions: { width: 4, height: 2, depth: 1.5 },
  },
  {
    id: 'sensor-2',
    name: 'IR Sensor Module',
    category: 'sensor',
    price: 40,
    specs: '2cm-30cm detection',
    imageUrl: '/robots/ir-sensor.png',
    dimensions: { width: 3, height: 1.5, depth: 1 },
  },
  {
    id: 'sensor-3',
    name: 'Line Follower Sensor',
    category: 'sensor',
    price: 100,
    specs: '5-channel array',
    imageUrl: '/robots/line-sensor.png',
    dimensions: { width: 10, height: 1, depth: 2 },
  },

  // Controllers
  {
    id: 'controller-1',
    name: 'Arduino Uno R3',
    category: 'controller',
    price: 450,
    specs: 'ATmega328P, 14 I/O pins',
    imageUrl: '/robots/arduino-uno.png',
    dimensions: { width: 6.8, height: 1.5, depth: 5.3 },
  },
  {
    id: 'controller-2',
    name: 'Arduino Nano',
    category: 'controller',
    price: 280,
    specs: 'ATmega328P, compact',
    imageUrl: '/robots/arduino-nano.png',
    dimensions: { width: 4.3, height: 1, depth: 1.8 },
  },
  {
    id: 'controller-3',
    name: 'Raspberry Pi 4B 4GB',
    category: 'controller',
    price: 4500,
    specs: '1.5GHz quad-core, 4GB RAM',
    imageUrl: '/robots/raspberry-pi.png',
    dimensions: { width: 8.5, height: 1.5, depth: 5.6 },
  },

  // Power
  {
    id: 'power-1',
    name: 'Li-ion Battery 11.1V 2200mAh',
    category: 'power',
    price: 650,
    specs: '11.1V, 2200mAh, rechargeable',
    imageUrl: '/robots/battery.png',
    dimensions: { width: 10, height: 2, depth: 3 },
  },
  {
    id: 'power-2',
    name: '9V Battery Holder',
    category: 'power',
    price: 30,
    specs: 'For 6 AA batteries',
    imageUrl: '/robots/battery-holder.png',
    dimensions: { width: 8, height: 3, depth: 4 },
  },
  {
    id: 'power-3',
    name: 'Motor Driver L298N',
    category: 'power',
    price: 180,
    specs: 'Dual H-bridge, 2A per channel',
    imageUrl: '/robots/l298n.png',
    dimensions: { width: 5, height: 1.5, depth: 4 },
  },

  // Wheels
  {
    id: 'wheel-1',
    name: 'Rubber Wheel 65mm',
    category: 'wheel',
    price: 50,
    specs: '65mm diameter, rubber tire',
    imageUrl: '/robots/wheel.png',
    dimensions: { width: 6.5, height: 2, depth: 6.5 },
  },
  {
    id: 'wheel-2',
    name: 'Omni Wheel 60mm',
    category: 'wheel',
    price: 150,
    specs: '60mm, multi-directional',
    imageUrl: '/robots/omni-wheel.png',
    dimensions: { width: 6, height: 3, depth: 6 },
  },

  // Accessories
  {
    id: 'accessory-1',
    name: 'Jumper Wires (40pcs)',
    category: 'accessory',
    price: 50,
    specs: 'Male-to-Male, 20cm',
    imageUrl: '/robots/jumper-wires.png',
    dimensions: { width: 0.1, height: 20, depth: 0.1 },
  },
  {
    id: 'accessory-2',
    name: 'Breadboard 830 Points',
    category: 'accessory',
    price: 120,
    specs: '830 tie points',
    imageUrl: '/robots/breadboard.png',
    dimensions: { width: 16, height: 1, depth: 5.5 },
  },
  {
    id: 'accessory-3',
    name: 'Bluetooth Module HC-05',
    category: 'accessory',
    price: 250,
    specs: 'Bluetooth 2.0, 10m range',
    imageUrl: '/robots/bluetooth.png',
    dimensions: { width: 3, height: 1.5, depth: 1.5 },
  },
];

export const COMPONENT_CATEGORIES = [
  { id: 'all', name: 'All Components', icon: '🔧' },
  { id: 'chassis', name: 'Chassis', icon: '🚗' },
  { id: 'motor', name: 'Motors', icon: '⚙️' },
  { id: 'sensor', name: 'Sensors', icon: '📡' },
  { id: 'controller', name: 'Controllers', icon: '🧠' },
  { id: 'power', name: 'Power', icon: '🔋' },
  { id: 'wheel', name: 'Wheels', icon: '⚪' },
  { id: 'accessory', name: 'Accessories', icon: '🔌' },
];

export function getComponentsByCategory(category: string): RobotComponent[] {
  if (category === 'all') return ROBOT_COMPONENTS;
  return ROBOT_COMPONENTS.filter((c) => c.category === category);
}

export function calculateTotalPrice(componentIds: string[]): number {
  return componentIds.reduce((total, id) => {
    const component = ROBOT_COMPONENTS.find((c) => c.id === id);
    return total + (component?.price || 0);
  }, 0);
}

export function validateDesign(components: any[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const hasController = components.some((c) => c.category === 'controller');
  const hasPower = components.some((c) => c.category === 'power');
  const hasChassis = components.some((c) => c.category === 'chassis');

  if (!hasController) errors.push('Missing controller (Arduino/Raspberry Pi)');
  if (!hasPower) errors.push('Missing power source (battery/motor driver)');
  if (!hasChassis) errors.push('Missing chassis');

  return { valid: errors.length === 0, errors };
}
