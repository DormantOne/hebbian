import TabView from "../ui/TabView.js";
import DebugConsole from "../ui/DebugConsole.js";
import Simulation from "../simulation/Simulation.js";
import { constrainElementFractionOfWindowSize } from "../ui/layout.js";
import { capitalizeFirstLetter } from "../utils/text.js";
import PageLoadingOverlay from "../ui/PageLoadingOverlay.js";
import defaultParams from "../simulation/defaultParams.js";

window.onload = () => {
  new TabView("parameterTabContainer", 0)
    .constrainToFractionOfWindowHeight(() => {
      let total = 0;
      for (let n = 1; n <= 4; n++) {
        const elem = document.querySelector(`.height-item-${n}`);

        total += elem.clientHeight;
      }
      return total;
    })
    .start();
  document.querySelectorAll(".katex").forEach((element) => {
    let displayMode = undefined;
    const hasKatexBlock = element.classList.contains("katex-block");
    const hasKatexInline = element.classList.contains("katex-inline");
    const defaultOrExplicitDisplay = window.getComputedStyle(element).display;
    const defaultOrExplicitDisplayIsFormOfInline =
      defaultOrExplicitDisplay === "inline" ||
      defaultOrExplicitDisplay === "inline-block";
    if (hasKatexBlock && hasKatexInline) {
      throw new Error(
        "Using katex-block and katex-inline on the same element does not make sense."
      );
    }
    if (!hasKatexBlock && !hasKatexInline) {
      displayMode = !defaultOrExplicitDisplayIsFormOfInline;
    } else {
      displayMode = hasKatexBlock;
    }
    const content = element.textContent || element.innerText;
    // Just for proper type safety
    // Since I don't feel like ensuring exhaustive handling of all cases
    if (typeof displayMode === "undefined") {
      throw new Error(
        "Could not determine or infer math display mode. This should never occur."
      );
    }
    katex.render(content, element, {
      throwOnError: false,
      displayMode: displayMode,
    });
    document.querySelectorAll(".language-javascript").forEach((element) => {
      if (!element.getAttribute("data-highlighted")) {
        hljs.highlightElement(element);
      }
    });
  });

  constrainElementFractionOfWindowSize(document.querySelector(".DebugConsole"));

  function getPrettyMetric(value) {
    if (value === null) {
      return "N/A";
    }
    if (typeof value === "string") {
      return capitalizeFirstLetter(value);
    }
    if (typeof value === "number") {
      return value.toString();
    }
    if (Array.isArray(value)) {
      return value.map(getPrettyMetric).join("\n");
    }
    return value.toString();
  }

  window.prettyUpdateMetric = function (id, value) {
    const element = document.getElementById(id);
    if (typeof value === "object" && value !== null) {
      if (value.widget === "fraction-bar") {
        const barContainerDiv = document.createElement("div");
        barContainerDiv.style.width = "100%";
        barContainerDiv.style.height = "1em";
        barContainerDiv.style.border = "2px solid black";
        barContainerDiv.style.position = "relative";
        const barDiv = document.createElement("div");
        barDiv.style.width = `${value.value * 100}%`;
        barDiv.style.position = "absolute";
        barDiv.style.height = "100%";
        barDiv.style.background = value.getColor
          ? value.getColor(value.value)
          : "grey";
        barContainerDiv.appendChild(barDiv);
        element.innerHTML = "";
        element.appendChild(barContainerDiv);
      }
    } else {
      element.textContent = getPrettyMetric(value);
    }
  };

  function updateUIForSimulationState(state) {
    function setThemeColor(element, themeColor) {
      // Get the class list of the element
      const classList = element.classList;

      // Remove any existing classes with the 'theme-' prefix
      classList.forEach((className) => {
        if (className.startsWith("theme-")) {
          classList.remove(className);
        }
      });

      // Add the new class with the 'theme-' prefix according to themeColor
      classList.add(`theme-${themeColor}`);
    }

    function clearThemeColor(element) {
      const classList = element.classList;
      classList.forEach((className) => {
        if (className.startsWith("theme-")) {
          classList.remove(className);
        }
      });
    }

    // Enable/disable human vs AI radio buttons based on the simulation state
    const radioButtons = document.querySelectorAll(
      'input[name="controlledBy"]'
    );
    const enableRadioButtons = state === "stopped"; // Enable only if the simulation is stopped
    radioButtons.forEach((button) => {
      button.disabled = !enableRadioButtons;
    });

    const allParameterInputs = document.querySelectorAll(
      ".ParameterControl input"
    );
    if (state === "stopped") {
      allParameterInputs.forEach((input) => {
        input.disabled = false;
      });
    } else {
      allParameterInputs.forEach((input) => {
        input.disabled = true;
      });
    }

    // Update UI elements based on the simulation state
    window.prettyUpdateMetric("simulationState", state);

    switch (state) {
      case "running":
        startStopSimulation.textContent = "Stop";
        startStopSimulation.disabled = false;
        setThemeColor(startStopSimulation, "danger");
        pauseResumeSimulation.textContent = "Pause";
        pauseResumeSimulation.disabled = false;
        setThemeColor(pauseResumeSimulation, "warning");
        break;
      case "paused":
        startStopSimulation.textContent = "";
        startStopSimulation.disabled = true;
        clearThemeColor(startStopSimulation);
        pauseResumeSimulation.textContent = "Resume";
        pauseResumeSimulation.disabled = false;
        setThemeColor(pauseResumeSimulation, "action");
        break;
      case "stopped":
        startStopSimulation.textContent = "Start";
        startStopSimulation.disabled = false;
        setThemeColor(startStopSimulation, "success");
        pauseResumeSimulation.textContent = "";
        pauseResumeSimulation.disabled = true;
        clearThemeColor(pauseResumeSimulation);
        break;
      case "starting":
        startStopSimulation.textContent = "Starting...";
        startStopSimulation.disabled = true;
        setThemeColor(startStopSimulation, "info");
        pauseResumeSimulation.textContent = "";
        pauseResumeSimulation.disabled = true;
        clearThemeColor(pauseResumeSimulation);
        break;
      case "stopping":
        startStopSimulation.textContent = "Stopping...";
        startStopSimulation.disabled = true;
        setThemeColor(startStopSimulation, "info");
        pauseResumeSimulation.textContent = "";
        pauseResumeSimulation.disabled = true;
        clearThemeColor(pauseResumeSimulation);
        break;
      case "pausing":
        startStopSimulation.textContent = "";
        startStopSimulation.disabled = true;
        clearThemeColor(startStopSimulation);
        pauseResumeSimulation.textContent = "Pausing...";
        pauseResumeSimulation.disabled = true;
        setThemeColor(pauseResumeSimulation, "info");
        break;
      case "resuming":
        startStopSimulation.textContent = "";
        startStopSimulation.disabled = true;
        clearThemeColor(startStopSimulation);
        pauseResumeSimulation.textContent = "Resuming...";
        pauseResumeSimulation.disabled = true;
        setThemeColor(pauseResumeSimulation, "info");
        break;
      default:
        throw new Error(`Unknown simulation state: ${state}`);
    }
  }

  const simulation = new Simulation(updateUIForSimulationState);

  document
    .getElementById("startStopSimulation")
    .addEventListener("click", () => {
      try {
        simulation.handleStartStopButton();
      } catch (error) {
        DebugConsole.reportErrorObject(error);
      }
    });

  document
    .getElementById("pauseResumeSimulation")
    .addEventListener("click", () => {
      try {
        simulation.handlePauseResumeButton();
      } catch (error) {
        DebugConsole.reportErrorObject(error);
      }
    });

  const visCanvasContainer = document.querySelector(".VisCanvasContainer");
  const visCanvas = document.querySelector(".VisCanvas");

  function registerVisCanvas() {
    const { width, height } = visCanvasContainer.getBoundingClientRect();
    const smaller = Math.min(width, height);
    visCanvas.width = smaller;
    visCanvas.height = smaller;
    visCanvas.style.width = `${smaller}px`;
    visCanvas.style.height = `${smaller}px`;
    window.visCanvasCtx = visCanvas.getContext("2d");
    window.visCanvasWidth = smaller;
    window.visCanvasHeight = smaller;
  }

  registerVisCanvas();

  window.addEventListener("resize", () => {
    registerVisCanvas();
  });

  visCanvas.style.display = "block";

  const fitnessCanvasContainer = document.querySelector(
    ".FitnessCanvasContainer"
  );
  const fitnessCanvas = document.querySelector(".FitnessCanvas");

  function registerFitnessCanvas() {
    const { width, height } = fitnessCanvasContainer.getBoundingClientRect();
    fitnessCanvas.width = width;
    fitnessCanvas.height = height;
    fitnessCanvas.style.width = `${width}px`;
    fitnessCanvas.style.height = `${height}px`;
    window.fitnessCanvasCtx = fitnessCanvas.getContext("2d");
    window.fitnessCanvasWidth = width;
    window.fitnessCanvasHeight = height;
  }

  registerFitnessCanvas();

  window.addEventListener("resize", () => {
    registerFitnessCanvas();
  });

  window.fitnessPlotPerSimBoundHigh = document.querySelector(
    ".FitnessPlotPerSimBound.High"
  );
  window.fitnessPlotPerPlotBoundHigh = document.querySelector(
    ".FitnessPlotPerPlotBound.High"
  );
  window.fitnessPlotPerPlotBoundLow = document.querySelector(
    ".FitnessPlotPerPlotBound.Low"
  );
  window.fitnessPlotPerSimBoundLow = document.querySelector(
    ".FitnessPlotPerSimBound.Low"
  );

  window.fitnessPlotBounds = {
    perPlot: {
      high: {
        set: (value) => {
          window.fitnessPlotPerPlotBoundHigh.textContent = value.toFixed(3);
        },
      },
      low: {
        set: (value) => {
          window.fitnessPlotPerPlotBoundLow.textContent = value.toFixed(3);
        },
      },
    },
    perSim: {
      high: {
        set: (value) => {
          window.fitnessPlotPerSimBoundHigh.textContent = value.toFixed(3);
        },
      },
      low: {
        set: (value) => {
          window.fitnessPlotPerSimBoundLow.textContent = value.toFixed(3);
        },
      },
    },
  };

  fitnessCanvas.style.display = "block";

  for (const [key, value] of Object.entries(defaultParams)) {
    const elem = document.getElementById(key);
    if (!elem) {
      throw new Error(`No element found for parameter "${key}"`);
    }
    elem.value = typeof value === "number" ? value.toFixed(3) : value;
  }

  PageLoadingOverlay.hide();
};
