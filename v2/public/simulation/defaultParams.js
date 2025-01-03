const defaultParams = {
  // Game Parameters
  playfieldWidth: 10, // meters
  playfieldHeight: 20, // meters
  icicleWidth: 1, // meters
  icicleHeight: (Math.sqrt(3) * 1) / 2, // meters
  icicleAverageSpawnRate: 3, // 1/s
  playerRadius: 1/2, // meters
  playerMovementSpeed:10, // meters/s

  // Network Parameters
  numSensorRays: 91, // unitless
  sensorFOV: 90, // degrees
  sensorMaxDistance: 15, // meters
  numMotorNodes: 5, // unitless,
  // number of redundancy motor nodes
  // per side
  targetDataNodeCount: 120, // Rough estimate of
  targetDataNodeCountSigma: 5, // Standard deviation of targetDataNodeCount
  // how many nodes are needed
  // to achieve perfect game
  targetEdgeCount: 120*16, // Based on average expected node degree
  // to achieve perfect game
  targetEdgeCountSigma: 5,
  maxAbsoluteNodeValue: 1000, // A hard limit to prevent NaN and Inf
  maxAbsoluteEdgeStrength: 100, // A hard limit to prevent NaN and Inf

  // Learning Parameters
  firingThreshold:2.5, // Amount of input "value current" (1/s)
  // needed to fire
  spikeActivationLevel: 1, // Amount of value current
  // that a spike carries along an edge
  // upon fire
  visualActivationLevel: 0.75,
  spikeDecayTimeConstant: 0.2, // A spike potency drops to 1/e after tau seconds
  dischargeRate: 0.35,
  leakRate: 0.01,
  motorLeakRate: 0.15,
  // and then we cut it off after 5 tau
  spikeRefractoryPeriod: 0.2, // Time in seconds after a spike
  // before another can occur
  // It is wise to set this to N/M * tau,
  // Where N and M are integers
  // for now lets use 2/1 * tau
  survivalReward: 30, // (1/s) the amount of ambient fitness
  // gained per second while surviving
  speedReward: 3,
  successfulDodgeReward: 12,
  deathPunishment: 100, // The amount of ambient fitness
  // lost instantaneously on death
  // In the future we may add a damping parameter
  // different than the fitness decay time constant
  hebbianReinforcementTimeConstant: 0.75, // This variable name needs to be changed next factor
  edgeStrengthLeakFactor: 0.01,
  // Basically the degree to which "fire together wire together" applies drops off like a bell curve the further apart in time
  hebbianStrengthFactor: 0.0001, // Modules hebbian reinforcement.
  // The reinforcement each frame is related to the change in fitness since last frame, deltaTime, the hebbian time constant and strength factor
  nodeInactiveLifetime: 30, // If a node does not fire for N seconds, then it and any edges connected to it (in and out) are removed
  edgeInactiveLifetime: 30, // An edge is considered activated when either of its connected nodes fires. If an edge is not active for N seconds, then it is removed
  nodeSpawnRate: 10, // The average number of nodes that will spawn per second in order to get close to `targetDataNodeCount`
  // To hover around `targetDataNodeCount` the rate is modulated by a bell curve with sigma=1 centered at `targetDataNodeCount`
  edgeSpawnRate: 100, // The average number of edges that will spawn per second in order to get close to `targetEdgeCount`
  // To hover around `targetEdgeCount` the rate is modulated by a bell curve with sigma=1 centered at `targetEdgeCount` * 2/3
  edgeExcToInhSpawnRatio: 0.85, // The fraction of all edges spawned that start with strength +1 as opposed to -1
};

export default defaultParams;
