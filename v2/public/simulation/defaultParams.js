const defaultParams = {
  // Game Parameters
  playfieldWidth: 10, // meters
  playfieldHeight: 20, // meters
  icicleWidth: 1, // meters
  icicleHeight: (Math.sqrt(3) * 1) / 2, // meters
  icicleAverageSpawnRate: 3, // 1/s
  playerRadius: 1/2, // meters
  playerMovementSpeed:15, // meters/s

  // Network Parameters
  numSensorRays: 136, // unitless
  sensorFOV: 135, // degrees
  sensorMaxDistance: 15, // meters
  numMotorNodes: 5, // unitless,
  // number of redundancy motor nodes
  // per side
  targetNodeCount: 20, // Rough estimate of
  // how many nodes are needed
  // to achieve perfect game
  targetEdgeCount: 400, // Based on average expected node degree
  // to achieve perfect game
  maxAbsoluteNodeValue: 10, // A hard limit to prevent NaN and Inf
  maxAbsoluteEdgeStrength: 10, // A hard limit to prevent NaN and Inf

  // Learning Parameters
  firingThreshold:5, // Amount of input "value current" (1/s)
  // needed to fire
  spikeActivationLevel: 1, // Amount of value current
  // that a spike carries along an edg
  //  on fire
  spikeDecayTimeConstant: 0.4, // A spike potency drops to 1/e after tau seconds
  dischargeRate: 0.2,
  leakRate: 0.02,
  // and then we cut it off after 5 tau
  spikeRefractoryPeriod: (0.4 * 10) / 1, // Time in seconds after a spike
  // before another can occur
  // It is wise to set this to N/M * tau,
  // Where N and M are integers
  // for now lets use 2/1 * tau
  survivalReward: 5, // (1/s) the amount of ambient fitness
  // gained per second while surviving
  deathPunishment: 50, // The amount of ambient fitness
  // lost instantaneously on death
  // In the future we may add a damping parameter
  // different than the fitness decay time constant
  threatBonusProximity: 0.75, // The fraction of the max sensor distance
  // at which our "threat bonus" algorithm comes into play
  fitnessDecayRatio: 0.1, // Emulate fitness decay (helps encourage network to keep improving)
  // See the below code
  /**
                             const nextFitness =
                             this.fitness * (1 - this.params.fitnessDecayRatio * deltaTime);
                            */
  hebbianReinforcementTimeConstant: (0.4 * 4) / 1, // This variable name needs to be changed next factor
  // Basically the degree to which "fire together wire together" applies drops off like a bell curve the further apart in time
  hebbianStrengthFactor: 2, // Modules hebbian reinforcement.
  // The reinforcement each frame is related to the change in fitness since last frame, deltaTime, the hebbian time constant and strength factor
  nodeInactiveLifetime: 2, // If a node does not fire for N seconds, then it and any edges connected to it (in and out) are removed
  edgeInactiveLifetime: 0.5, // An edge is considered activated when either of its connected nodes fires. If an edge is not active for N seconds, then it is removed
  nodeSpawnRate: 10, // The average number of nodes that will spawn per second in order to get close to `targetNodeCount`
  // To hover around `targetNodeCount` the rate is modulated by a bell curve with sigma=1 centered at `targetNodeCount`
  edgeSpawnRate: 20, // The average number of edges that will spawn per second in order to get close to `targetEdgeCount`
  // To hover around `targetEdgeCount` the rate is modulated by a bell curve with sigma=1 centered at `targetEdgeCount` * 2/3
  edgeExcToInhSpawnRatio: 0.75, // The fraction of all edges spawned that start with strength +1 as opposed to -1
};

export default defaultParams;
